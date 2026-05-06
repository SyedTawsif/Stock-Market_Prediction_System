import json
import math
import os
import subprocess
import sys
from typing import Dict, List, Optional, Tuple

import matplotlib.pyplot as plt
import pandas as pd


STOCKS = ["AAPL", "AMZN", "JPM"]
TIME_RANGES = ["1mo", "3mo", "6mo", "1y", "2y", "5y"]

TRAINING_SCRIPTS = [
    ("linear_regression", "train_linear_regression_model.py"),
    ("random_forest", "train_random_forest_model.py"),
    ("lstm", "train_lstm_model.py"),
]

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
METADATA_DIR = os.path.join(BACKEND_DIR, "models", "metadata")
EVAL_OUTPUT_DIR = os.path.join(BACKEND_DIR, "evaluation_outputs")
RESULTS_CSV_PATH = os.path.join(EVAL_OUTPUT_DIR, "evaluation_results.csv")


def run_training_for_all_combinations() -> None:
    """Run all training scripts for each stock/time-range pair."""
    total_jobs = len(STOCKS) * len(TIME_RANGES) * len(TRAINING_SCRIPTS)
    job_idx = 0

    print("=" * 80)
    print("Starting full training/evaluation automation")
    print(f"Stocks: {STOCKS}")
    print(f"Time ranges: {TIME_RANGES}")
    print(f"Total training calls to execute: {total_jobs}")
    print(
        "Each script receives ticker+period and trains only backend/data/{ticker}_{period}.csv "
        "(not every CSV in the folder)."
    )
    print("=" * 80)

    for stock in STOCKS:
        for time_range in TIME_RANGES:
            print(f"\n--- Combination: {stock} | {time_range} ---")
            for _, script_name in TRAINING_SCRIPTS:
                job_idx += 1
                cmd = [sys.executable, script_name, stock, time_range]
                print(f"[{job_idx}/{total_jobs}] Running: {' '.join(cmd)}")
                try:
                    subprocess.run(cmd, cwd=BACKEND_DIR, check=True)
                except subprocess.CalledProcessError as exc:
                    print(
                        f"  [WARN] Training failed for {stock}-{time_range} via {script_name}. "
                        f"Continuing. Exit code={exc.returncode}"
                    )


def _extract_metric(metrics: Dict, keys: List[str]) -> Optional[float]:
    for key in keys:
        if key in metrics and metrics[key] is not None:
            try:
                return float(metrics[key])
            except (TypeError, ValueError):
                return None
    return None


def _build_metrics_file_candidates(stock: str, time_range: str, model: str) -> List[str]:
    """
    Return candidate metric filenames supporting both:
    - expected format: {stock}_{range}_{model}_metrics.json
    - current project format: {stock}_{range}_metrics.json, etc.
    """
    base = f"{stock}_{time_range}"
    if model == "linear_regression":
        return [
            f"{base}_linear_regression_metrics.json",
            f"{base}_metrics.json",
        ]
    if model == "random_forest":
        return [
            f"{base}_random_forest_metrics.json",
            f"{base}_rf_metrics.json",
        ]
    if model == "lstm":
        return [
            f"{base}_lstm_metrics.json",
        ]
    return []


def _load_json(path: str) -> Optional[Dict]:
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError) as exc:
        print(f"  [WARN] Failed to read JSON: {path} ({exc})")
        return None


def collect_results() -> pd.DataFrame:
    """Collect model metrics for each stock/range/model into a DataFrame."""
    rows: List[Dict] = []
    os.makedirs(METADATA_DIR, exist_ok=True)

    print("\nCollecting metrics from metadata files...")
    for stock in STOCKS:
        for time_range in TIME_RANGES:
            for model, _ in TRAINING_SCRIPTS:
                metric_file_path = None
                metric_payload = None

                for candidate in _build_metrics_file_candidates(stock, time_range, model):
                    candidate_path = os.path.join(METADATA_DIR, candidate)
                    payload = _load_json(candidate_path)
                    if payload is not None:
                        metric_file_path = candidate_path
                        metric_payload = payload
                        break

                if metric_payload is None:
                    print(f"  [SKIP] Missing metrics JSON for {stock}-{time_range} ({model})")
                    continue

                metrics = metric_payload.get("metrics", {})
                test_mae = _extract_metric(
                    metrics,
                    ["test_mae", "linear_regression_test_mae", "random_forest_test_mae", "lstm_test_mae"],
                )
                test_mse = _extract_metric(
                    metrics,
                    ["test_mse", "linear_regression_test_mse", "random_forest_test_mse", "lstm_test_mse"],
                )
                baseline_mae = _extract_metric(metrics, ["naive_baseline_mae", "naive_baseline_test_mae"])
                baseline_mse = _extract_metric(metrics, ["naive_baseline_mse", "naive_baseline_test_mse"])

                rmse = math.sqrt(test_mse) if test_mse is not None and test_mse >= 0 else None
                baseline_rmse = (
                    math.sqrt(baseline_mse)
                    if baseline_mse is not None and baseline_mse >= 0
                    else None
                )

                rows.append(
                    {
                        "stock": stock,
                        "range": time_range,
                        "model": model,
                        "mae": test_mae,
                        "rmse": rmse,
                        "baseline_mae": baseline_mae,
                        "baseline_rmse": baseline_rmse,
                        "metrics_file": metric_file_path,
                    }
                )

    df = pd.DataFrame(
        rows,
        columns=[
            "stock",
            "range",
            "model",
            "mae",
            "rmse",
            "baseline_mae",
            "baseline_rmse",
            "metrics_file",
        ],
    )
    return df


def save_results(df: pd.DataFrame) -> None:
    os.makedirs(EVAL_OUTPUT_DIR, exist_ok=True)
    df_to_save = df.drop(columns=["metrics_file"], errors="ignore")
    df_to_save.to_csv(RESULTS_CSV_PATH, index=False)
    print(f"\nSaved evaluation results to: {RESULTS_CSV_PATH}")


def _plot_metric_comparison(df_subset: pd.DataFrame, metric: str, out_path: str, title: str) -> None:
    values = df_subset[metric].fillna(0)
    models = df_subset["model"]

    plt.figure(figsize=(8, 5))
    bars = plt.bar(models, values)
    plt.title(title)
    plt.xlabel("Model")
    plt.ylabel(metric.upper())
    plt.grid(axis="y", alpha=0.25)

    for bar, value in zip(bars, values):
        plt.text(
            bar.get_x() + bar.get_width() / 2.0,
            bar.get_height(),
            f"{value:.4f}",
            ha="center",
            va="bottom",
            fontsize=8,
        )

    plt.tight_layout()
    plt.savefig(out_path, dpi=150)
    plt.close()
    print(f"  Saved plot: {out_path}")


def generate_comparison_plots(df: pd.DataFrame) -> None:
    if df.empty:
        print("\nNo results available for model comparison plots.")
        return

    print("\nGenerating RMSE/MAE comparison plots...")
    os.makedirs(EVAL_OUTPUT_DIR, exist_ok=True)
    for stock in STOCKS:
        for time_range in TIME_RANGES:
            subset = df[(df["stock"] == stock) & (df["range"] == time_range)]
            if subset.empty:
                print(f"  [SKIP] No rows for {stock}-{time_range}")
                continue

            rmse_path = os.path.join(
                EVAL_OUTPUT_DIR, f"rmse_comparison_{stock}_{time_range}.png"
            )
            mae_path = os.path.join(
                EVAL_OUTPUT_DIR, f"mae_comparison_{stock}_{time_range}.png"
            )

            _plot_metric_comparison(
                df_subset=subset,
                metric="rmse",
                out_path=rmse_path,
                title=f"RMSE Comparison - {stock} ({time_range})",
            )
            _plot_metric_comparison(
                df_subset=subset,
                metric="mae",
                out_path=mae_path,
                title=f"MAE Comparison - {stock} ({time_range})",
            )


def _prediction_csv_candidates_for_model(
    stock: str, time_range: str, model: str
) -> List[str]:
    """Prefer per-model filenames; keep legacy RF paths for older runs."""
    base = f"{stock}_{time_range}"
    primary = os.path.join(METADATA_DIR, f"{base}_{model}_predictions.csv")
    if model == "random_forest":
        return [
            primary,
            os.path.join(METADATA_DIR, f"{base}_predictions.csv"),
            os.path.join(METADATA_DIR, f"{stock}_predictions.csv"),
        ]
    return [primary]


def generate_actual_vs_predicted_plots() -> None:
    print("\nGenerating Actual vs Predicted plots (if prediction files exist)...")
    os.makedirs(EVAL_OUTPUT_DIR, exist_ok=True)
    model_labels = {
        "linear_regression": "Linear regression",
        "random_forest": "Random forest",
        "lstm": "LSTM",
    }
    for stock in STOCKS:
        for time_range in TIME_RANGES:
            for model, _ in TRAINING_SCRIPTS:
                pred_path = None
                for candidate in _prediction_csv_candidates_for_model(
                    stock, time_range, model
                ):
                    if os.path.exists(candidate):
                        pred_path = candidate
                        break

                if pred_path is None:
                    print(
                        f"  [SKIP] Predictions CSV not found for "
                        f"{stock}-{time_range} ({model})"
                    )
                    continue

                try:
                    pred_df = pd.read_csv(pred_path)
                except Exception as exc:
                    print(f"  [WARN] Could not read predictions CSV {pred_path}: {exc}")
                    continue

                if "Actual" not in pred_df.columns or "Predicted" not in pred_df.columns:
                    print(f"  [SKIP] Missing required columns in {pred_path}")
                    continue

                label = model_labels.get(model, model)
                out_path = os.path.join(
                    EVAL_OUTPUT_DIR,
                    f"actual_vs_predicted_{stock}_{time_range}_{model}.png",
                )
                plt.figure(figsize=(10, 5))
                plt.plot(pred_df["Actual"].values, label="Actual", linewidth=1.7)
                plt.plot(pred_df["Predicted"].values, label="Predicted", linewidth=1.2)
                plt.title(
                    f"Actual vs Predicted — {label} — {stock} ({time_range})"
                )
                plt.xlabel("Test Sample Index")
                plt.ylabel("Close Price")
                plt.legend()
                plt.grid(alpha=0.25)
                plt.tight_layout()
                plt.savefig(out_path, dpi=150)
                plt.close()
                print(f"  Saved plot: {out_path}")


def print_summary(df: pd.DataFrame) -> None:
    print("\n" + "=" * 80)
    print("Evaluation Summary")
    print("=" * 80)
    if df.empty:
        print("No evaluation rows collected.")
        return

    summary = df[
        ["stock", "range", "model", "mae", "rmse", "baseline_mae", "baseline_rmse"]
    ].copy()
    print(summary.sort_values(["stock", "range", "model"]).to_string(index=False))


def main() -> None:
    print(f"\nPlots and evaluation_results.csv will be saved under:\n  {EVAL_OUTPUT_DIR}\n")
    run_training_for_all_combinations()
    results_df = collect_results()
    save_results(results_df)
    generate_comparison_plots(results_df)
    generate_actual_vs_predicted_plots()
    print_summary(results_df)


if __name__ == "__main__":
    main()
