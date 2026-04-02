import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, mean_absolute_error
import joblib
import os
import json

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BACKEND_DIR, "data")
MODEL_DIR = os.path.join(BACKEND_DIR, "models")
METADATA_DIR = os.path.join(MODEL_DIR, "metadata")
TRAIN_RATIO = 0.8

# Create output directories if they don't exist.
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(METADATA_DIR, exist_ok=True)

# Loop through all CSV files in the data folder.
# Files may be named ticker.csv or ticker_period.csv (e.g. AAPL_1y.csv) when using timeframe-based collection.
for file_name in os.listdir(DATA_DIR):
    if file_name.endswith(".csv"):
        ticker = file_name.split(".")[0]  # e.g. "AAPL" or "AAPL_1y"
        file_path = os.path.join(DATA_DIR, file_name)
        print(f"\nTraining model for {ticker}...")

        # Load the data and ensure chronological order when a Date column exists.
        data = pd.read_csv(file_path)
        if "Date" in data.columns:
            data["Date"] = pd.to_datetime(data["Date"], errors="coerce")
            data = data.sort_values("Date")
        data = data[["Close"]]

        # Create time-series features using only past values (no future leakage).
        data["Prev_Close"] = data["Close"].shift(1)
        data["Prev_2_Close"] = data["Close"].shift(2)
        data["MA_5"] = data["Close"].rolling(window=5).mean()

        # Remove rows with incomplete feature values caused by shifting/rolling.
        data = data.dropna()

        # Define input features and target.
        feature_columns = ["Prev_Close", "Prev_2_Close", "MA_5"]
        X = data[feature_columns]
        y = data["Close"]

        # Time-ordered train/test split (80/20) with no shuffling.
        split_index = int(len(data) * TRAIN_RATIO)
        X_train = X.iloc[:split_index]
        X_test = X.iloc[split_index:]
        y_train = y.iloc[:split_index]
        y_test = y.iloc[split_index:]

        # Skip files that do not have enough rows after feature engineering.
        if len(X_train) == 0 or len(X_test) == 0:
            print(f"{ticker} - Not enough data after feature engineering. Skipping.")
            continue

        # Train model on training set only.
        model = LinearRegression()
        model.fit(X_train, y_train)

        # Evaluate model on test set only.
        predictions = model.predict(X_test)
        mse = mean_squared_error(y_test, predictions)
        mae = mean_absolute_error(y_test, predictions)

        # Naive baseline: predict next close as previous close.
        naive_predictions = X_test["Prev_Close"]
        baseline_mse = mean_squared_error(y_test, naive_predictions)
        baseline_mae = mean_absolute_error(y_test, naive_predictions)

        print(f"{ticker} - Linear Regression Test MSE: {mse:.6f} | MAE: {mae:.6f}")
        print(f"{ticker} - Naive Baseline Test MSE: {baseline_mse:.6f} | MAE: {baseline_mae:.6f}")

        # Save model
        model_path = os.path.join(MODEL_DIR, f"{ticker}_linear_model.pkl")
        joblib.dump(model, model_path)
        print(f"Model saved as {model_path}")

        # Save run metadata in a dedicated subfolder to keep the project tidy.
        metadata = {
            "ticker": ticker,
            "source_file": file_name,
            "train_ratio": TRAIN_RATIO,
            "total_rows_after_features": int(len(data)),
            "train_rows": int(len(X_train)),
            "test_rows": int(len(X_test)),
            "features": feature_columns,
            "metrics": {
                "linear_regression_test_mse": float(mse),
                "linear_regression_test_mae": float(mae),
                "naive_baseline_test_mse": float(baseline_mse),
                "naive_baseline_test_mae": float(baseline_mae),
            },
        }
        metadata_path = os.path.join(METADATA_DIR, f"{ticker}_metrics.json")
        with open(metadata_path, "w", encoding="utf-8") as metadata_file:
            json.dump(metadata, metadata_file, indent=2)
        print(f"Metadata saved as {metadata_path}")