import os
import json
from typing import Annotated

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODELS_DIR = os.path.join(BASE_DIR, "models")
METADATA_DIR = os.path.join(MODELS_DIR, "metadata")

app = FastAPI(title="Stock Prediction API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def extract_symbol_from_filename(file_name: str) -> str:
    """
    Extract symbol from filenames like:
    - AAPL_1y.csv -> AAPL
    - MSFT.csv -> MSFT
    """
    base_name = os.path.splitext(file_name)[0]
    return base_name.split("_")[0].upper()


def get_latest_csv_for_symbol(symbol: str) -> str | None:
    """Return a CSV path for the symbol from DATA_DIR, preferring *_1y.csv when available."""
    if not os.path.isdir(DATA_DIR):
        return None

    symbol = symbol.upper()
    matching_files = []
    for file_name in os.listdir(DATA_DIR):
        if not file_name.endswith(".csv"):
            continue
        if extract_symbol_from_filename(file_name) == symbol:
            matching_files.append(file_name)

    if not matching_files:
        return None

    # Prefer the common training filename when present.
    preferred = f"{symbol}_1y.csv"
    chosen = preferred if preferred in matching_files else sorted(matching_files)[-1]
    return os.path.join(DATA_DIR, chosen)


def find_model_path(symbol: str, model_suffix: str) -> str | None:
    """Find model path for a symbol, supporting optional timeframe suffixes."""
    if not os.path.isdir(MODELS_DIR):
        return None

    symbol = symbol.upper()
    candidates = []
    for file_name in os.listdir(MODELS_DIR):
        if not file_name.endswith(model_suffix):
            continue
        if extract_symbol_from_filename(file_name) == symbol:
            candidates.append(file_name)

    if not candidates:
        return None

    preferred = f"{symbol}_1y{model_suffix}"
    chosen = preferred if preferred in candidates else sorted(candidates)[-1]
    return os.path.join(MODELS_DIR, chosen)


def find_metrics_path(symbol: str) -> str | None:
    """Find metrics file path for a symbol, supporting optional timeframe suffixes."""
    if not os.path.isdir(METADATA_DIR):
        return None

    symbol = symbol.upper()
    candidates = []
    for file_name in os.listdir(METADATA_DIR):
        if not file_name.endswith("_metrics.json"):
            continue
        if extract_symbol_from_filename(file_name) == symbol:
            candidates.append(file_name)

    if not candidates:
        return None

    preferred = f"{symbol}_1y_metrics.json"
    chosen = preferred if preferred in candidates else sorted(candidates)[-1]
    return os.path.join(METADATA_DIR, chosen)


def build_linear_features(data: pd.DataFrame) -> pd.DataFrame:
    """Create the same features used during model training."""
    frame = data.copy()
    frame["Prev_Close"] = frame["Close"].shift(1)
    frame["Prev_2_Close"] = frame["Close"].shift(2)
    frame["MA_5"] = frame["Close"].rolling(window=5).mean()
    return frame.dropna()


def calculate_trend(prices: list[float]) -> str:
    if len(prices) < 10:
        return "neutral"
    recent_prices = prices[-10:]
    first_half = sum(recent_prices[:5]) / 5
    second_half = sum(recent_prices[-5:]) / 5
    if second_half > first_half * 1.02:
        return "bullish"
    if second_half < first_half * 0.98:
        return "bearish"
    return "neutral"


def load_metrics(symbol: str) -> dict:
    """Load saved model metrics for the symbol."""
    metrics_path = find_metrics_path(symbol)
    if not metrics_path or not os.path.isfile(metrics_path):
        return {"mse": None, "mae": None}

    with open(metrics_path, "r", encoding="utf-8") as metrics_file:
        metadata = json.load(metrics_file)

    model_metrics = metadata.get("metrics", {})
    return {
        "mse": model_metrics.get("linear_regression_test_mse"),
        "mae": model_metrics.get("linear_regression_test_mae"),
    }


MODEL_REGISTRY = {
    "linear": {
        "model_file_suffix": "_linear_model.pkl",
        "predictor": "linear",
    }
}


def load_stock_frame(symbol: str) -> pd.DataFrame:
    csv_path = get_latest_csv_for_symbol(symbol)
    if not csv_path:
        raise HTTPException(status_code=404, detail=f"Data file not found for symbol '{symbol.upper()}'.")

    data = pd.read_csv(csv_path)
    if "Close" not in data.columns:
        raise HTTPException(status_code=400, detail=f"Data for '{symbol.upper()}' is missing 'Close' column.")

    if "Date" in data.columns:
        data["Date"] = pd.to_datetime(data["Date"], errors="coerce")
        data = data.sort_values("Date")
    else:
        data = data.reset_index(drop=True)

    return data


def predict_symbol(symbol: str, model_name: str) -> dict:
    data = load_stock_frame(symbol)
    engineered = build_linear_features(data[["Close"]])
    if engineered.empty:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough rows to compute features for '{symbol.upper()}'. Need at least 5 valid rows.",
        )

    model_suffix = MODEL_REGISTRY[model_name]["model_file_suffix"]
    model_path = find_model_path(symbol, model_suffix)
    if not model_path or not os.path.isfile(model_path):
        raise HTTPException(status_code=404, detail=f"Model not found for symbol '{symbol.upper()}'.")

    feature_columns = ["Prev_Close", "Prev_2_Close", "MA_5"]
    latest_row = engineered.iloc[[-1]]
    current_price = float(latest_row["Close"].iloc[0])

    trained_model = joblib.load(model_path)
    predicted_price = float(trained_model.predict(latest_row[feature_columns])[0])
    change_percent = ((predicted_price - current_price) / current_price) * 100

    return {
        "current_price": round(current_price, 6),
        "predicted_price": round(predicted_price, 6),
        "change_percent": round(change_percent, 6),
    }


@app.get("/api/stocks", responses={404: {"description": "Data directory not found"}})
def get_stocks() -> list[str]:
    """Return available stock symbols discovered from CSV files."""
    if not os.path.isdir(DATA_DIR):
        raise HTTPException(status_code=404, detail="Data directory not found.")

    symbols = set()
    for file_name in os.listdir(DATA_DIR):
        if file_name.endswith(".csv"):
            symbols.add(extract_symbol_from_filename(file_name))

    return sorted(symbols)


@app.get(
    "/api/stocks/{symbol}",
    responses={
        400: {"description": "Invalid request or insufficient data"},
        404: {"description": "Model/data not found"},
    },
)
def get_stock_details(symbol: str, model: Annotated[str, Query()] = "linear") -> dict:
    model_name = model.lower()
    if model_name not in MODEL_REGISTRY:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported model '{model}'. Available models: {', '.join(MODEL_REGISTRY.keys())}",
        )

    data = load_stock_frame(symbol)
    prediction = predict_symbol(symbol, model_name)

    history = []
    for _, row in data.iterrows():
        if pd.isna(row["Close"]):
            continue
        date_value = row["Date"] if "Date" in data.columns else None
        history.append(
            {
                "date": date_value.strftime("%Y-%m-%d") if pd.notna(date_value) else "",
                "actual": round(float(row["Close"]), 6),
            }
        )

    if not history:
        raise HTTPException(status_code=400, detail=f"No valid historical rows found for '{symbol.upper()}'.")

    history[-1]["predicted"] = prediction["predicted_price"]
    prices = [point["actual"] for point in history]
    avg_price = sum(prices) / len(prices)

    metrics = load_metrics(symbol.upper())
    return {
        "symbol": symbol.upper(),
        "name": symbol.upper(),
        "current_price": prediction["current_price"],
        "predicted_price": prediction["predicted_price"],
        "change_percent": prediction["change_percent"],
        "model": model_name,
        "metrics": metrics,
        "historical_data": history,
        "stats": {
            "mse": metrics.get("mse") or 0.0,
            "highest": max(prices),
            "lowest": min(prices),
            "trend": calculate_trend(prices),
            "avg_price": round(avg_price, 6),
        },
    }


@app.get(
    "/api/predictions/{symbol}",
    responses={
        400: {"description": "Invalid request or insufficient data"},
        404: {"description": "Model/data not found"},
    },
)
def get_prediction(symbol: str, model: Annotated[str, Query()] = "linear") -> dict:
    model_name = model.lower()
    if model_name not in MODEL_REGISTRY:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported model '{model}'. Available models: {', '.join(MODEL_REGISTRY.keys())}",
        )

    prediction = predict_symbol(symbol, model_name)
    metrics = load_metrics(symbol.upper())

    return {
        "symbol": symbol.upper(),
        "current_price": prediction["current_price"],
        "predicted_price": prediction["predicted_price"],
        "change_percent": prediction["change_percent"],
        "model": model_name,
        "metrics": metrics,
    }
