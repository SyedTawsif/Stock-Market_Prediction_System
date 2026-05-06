import argparse
import json
import os
from typing import Optional

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BACKEND_DIR, "data")
MODEL_DIR = os.path.join(BACKEND_DIR, "models")
METADATA_DIR = os.path.join(MODEL_DIR, "metadata")
TRAIN_RATIO = 0.8

FEATURE_COLUMNS = [
    "Prev_Close",
    "Prev_2_Close",
    "Prev_3_Close",
    "MA_5",
    "MA_10",
    "MA_20",
    "Volatility_5",
    "Return",
    "Prev_Return",
]

os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(METADATA_DIR, exist_ok=True)


def _parse_args():
    p = argparse.ArgumentParser(
        description="Train random forest on CSVs in backend/data."
    )
    p.add_argument(
        "ticker",
        nargs="?",
        default=None,
        help="Stock symbol (use with period to train a single file, e.g. AAPL 1y)",
    )
    p.add_argument(
        "period",
        nargs="?",
        default=None,
        help="Time range matching CSV suffix from data_collector (e.g. 1mo, 1y)",
    )
    return p.parse_args()


def _csv_files_to_process(ticker: Optional[str], period: Optional[str]) -> list[str]:
    if (ticker is None) ^ (period is None):
        raise SystemExit("Provide both ticker and period, or neither.")

    if ticker and period:
        name = f"{ticker}_{period}.csv"
        path = os.path.join(DATA_DIR, name)
        if not os.path.isfile(path):
            print(f"No data file found: {name}. Skipping.")
            return []
        return [name]

    return sorted(f for f in os.listdir(DATA_DIR) if f.endswith(".csv"))


_args = _parse_args()
_csv_list = _csv_files_to_process(_args.ticker, _args.period)


def engineer_features(close_frame: pd.DataFrame) -> pd.DataFrame:
    """Build time-series-safe features from Close only (no future leakage)."""
    df = close_frame.copy()
    c = df["Close"]
    df["Prev_Close"] = c.shift(1)
    df["Prev_2_Close"] = c.shift(2)
    df["Prev_3_Close"] = c.shift(3)
    df["MA_5"] = c.rolling(window=5).mean()
    df["MA_10"] = c.rolling(window=10).mean()
    df["MA_20"] = c.rolling(window=20).mean()
    df["Volatility_5"] = c.rolling(window=5).std()
    df["Return"] = c.pct_change()
    df["Prev_Return"] = df["Return"].shift(1)
    return df.dropna()


def create_regressor() -> RandomForestRegressor:
    """Default regressor; swap implementation here to try other estimators later."""
    return RandomForestRegressor(
        n_estimators=100,
        max_depth=8,
        max_features="sqrt",
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )


def directional_accuracy(
    y_true: pd.Series, y_pred: np.ndarray, prev_close: pd.Series
) -> float:
    """
    Share of test rows where predicted move vs prev_close matches actual move vs prev_close.
    sign(pred - prev_close) vs sign(actual - prev_close)
    """
    actual_move = y_true.values - prev_close.values
    pred_move = y_pred - prev_close.values
    return float(np.mean(np.sign(pred_move) == np.sign(actual_move)))


for file_name in _csv_list:
    if not file_name.endswith(".csv"):
        continue

    ticker = file_name.split(".")[0]
    file_path = os.path.join(DATA_DIR, file_name)
    print(f"\nTraining Random Forest model for {ticker}...")

    data = pd.read_csv(file_path)
    if "Date" in data.columns:
        data["Date"] = pd.to_datetime(data["Date"], errors="coerce")
        data = data.sort_values("Date")
    data = data[["Close"]]

    data = engineer_features(data)
    if data.empty:
        print(f"{ticker} - No rows after feature engineering. Skipping.")
        continue

    feature_columns = FEATURE_COLUMNS
    X = data[feature_columns]
    y = data["Close"]

    split_index = int(len(data) * TRAIN_RATIO)
    X_train = X.iloc[:split_index]
    X_test = X.iloc[split_index:]
    y_train = y.iloc[:split_index]
    y_test = y.iloc[split_index:]

    if len(X_train) == 0 or len(X_test) == 0:
        print(f"{ticker} - Not enough data after feature engineering. Skipping.")
        continue

    model = create_regressor()
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    mse = mean_squared_error(y_test, predictions)
    mae = mean_absolute_error(y_test, predictions)

    naive_series = X_test["Prev_Close"]
    naive_predictions = naive_series.values
    baseline_mse = mean_squared_error(y_test, naive_predictions)
    baseline_mae = mean_absolute_error(y_test, naive_predictions)

    dir_acc = directional_accuracy(y_test, predictions, naive_series)

    print(f"{ticker} - Random Forest Test MSE: {mse:.6f} | MAE: {mae:.6f}")
    print(f"{ticker} - Naive Baseline Test MSE: {baseline_mse:.6f} | MAE: {baseline_mae:.6f}")
    print(f"{ticker} - Directional accuracy: {dir_acc:.4f}")

    model_path = os.path.join(MODEL_DIR, f"{ticker}_rf_model.pkl")
    joblib.dump(model, model_path)
    print(f"Model saved as {model_path}")

    predictions_df = pd.DataFrame(
        {
            "Actual": y_test.values,
            "Predicted": predictions,
            "Naive": naive_predictions,
        }
    )
    predictions_path = os.path.join(
        METADATA_DIR, f"{ticker}_random_forest_predictions.csv"
    )
    predictions_df.to_csv(predictions_path, index=False)
    print(f"Predictions saved as {predictions_path}")

    metadata = {
        "ticker": ticker,
        "source_file": file_name,
        "train_ratio": TRAIN_RATIO,
        "total_rows_after_features": int(len(data)),
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "features": feature_columns,
        "metrics": {
            "random_forest_test_mse": float(mse),
            "random_forest_test_mae": float(mae),
            "naive_baseline_test_mse": float(baseline_mse),
            "naive_baseline_test_mae": float(baseline_mae),
            "directional_accuracy": float(dir_acc),
        },
    }
    metadata_path = os.path.join(METADATA_DIR, f"{ticker}_rf_metrics.json")
    with open(metadata_path, "w", encoding="utf-8") as metadata_file:
        json.dump(metadata, metadata_file, indent=2)
    print(f"Metadata saved as {metadata_path}")
