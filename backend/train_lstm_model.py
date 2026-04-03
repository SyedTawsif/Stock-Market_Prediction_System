import json
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.layers import LSTM, Dense
from tensorflow.keras.models import Sequential


BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BACKEND_DIR, "data")
MODEL_DIR = os.path.join(BACKEND_DIR, "models")
METADATA_DIR = os.path.join(MODEL_DIR, "metadata")

TRAIN_RATIO = 0.8
SEQUENCE_LENGTH = 10
EPOCHS = 25
BATCH_SIZE = 16

os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(METADATA_DIR, exist_ok=True)


def create_sequences(values: np.ndarray, sequence_length: int):
    X_seq, y_seq = [], []
    for i in range(sequence_length, len(values)):
        X_seq.append(values[i - sequence_length:i, 0])
        y_seq.append(values[i, 0])
    if not X_seq:
        return np.empty((0, sequence_length, 1)), np.empty((0,))
    X_arr = np.array(X_seq).reshape(-1, sequence_length, 1)
    y_arr = np.array(y_seq)
    return X_arr, y_arr


for file_name in os.listdir(DATA_DIR):
    if not file_name.endswith(".csv"):
        continue

    ticker = file_name.split(".")[0]
    file_path = os.path.join(DATA_DIR, file_name)
    print(f"\nTraining LSTM model for {ticker}...")

    data = pd.read_csv(file_path)
    if "Date" in data.columns:
        data["Date"] = pd.to_datetime(data["Date"], errors="coerce")
        data = data.sort_values("Date")
    data = data[["Close"]].dropna()

    if len(data) <= SEQUENCE_LENGTH + 2:
        print(f"{ticker} - Not enough rows for LSTM sequence length {SEQUENCE_LENGTH}. Skipping.")
        continue

    split_index = int(len(data) * TRAIN_RATIO)
    train_close = data.iloc[:split_index][["Close"]].values
    test_close = data.iloc[split_index:][["Close"]].values

    if len(train_close) <= SEQUENCE_LENGTH or len(test_close) == 0:
        print(f"{ticker} - Not enough train/test rows after split. Skipping.")
        continue

    scaler = MinMaxScaler()
    train_scaled = scaler.fit_transform(train_close)

    # Build test sequences from historical context + test window (no future leakage).
    test_with_context = np.concatenate([train_close[-SEQUENCE_LENGTH:], test_close], axis=0)
    test_scaled = scaler.transform(test_with_context)

    X_train, y_train = create_sequences(train_scaled, SEQUENCE_LENGTH)
    X_test, y_test = create_sequences(test_scaled, SEQUENCE_LENGTH)

    if len(X_train) == 0 or len(X_test) == 0:
        print(f"{ticker} - Not enough sequence samples after preprocessing. Skipping.")
        continue

    model = Sequential(
        [
            LSTM(32, input_shape=(SEQUENCE_LENGTH, 1)),
            Dense(1),
        ]
    )
    model.compile(optimizer="adam", loss="mse")
    model.fit(X_train, y_train, epochs=EPOCHS, batch_size=BATCH_SIZE, verbose=0)

    y_pred_scaled = model.predict(X_test, verbose=0)
    y_pred = scaler.inverse_transform(y_pred_scaled).flatten()
    y_test_actual = scaler.inverse_transform(y_test.reshape(-1, 1)).flatten()

    mse = mean_squared_error(y_test_actual, y_pred)
    mae = mean_absolute_error(y_test_actual, y_pred)

    # Naive baseline on test: previous close in each sequence.
    naive_scaled = X_test[:, -1, 0].reshape(-1, 1)
    naive_pred = scaler.inverse_transform(naive_scaled).flatten()
    baseline_mse = mean_squared_error(y_test_actual, naive_pred)
    baseline_mae = mean_absolute_error(y_test_actual, naive_pred)

    print(f"{ticker} - LSTM Test MSE: {mse:.6f} | MAE: {mae:.6f}")
    print(f"{ticker} - Naive Baseline Test MSE: {baseline_mse:.6f} | MAE: {baseline_mae:.6f}")

    model_path = os.path.join(MODEL_DIR, f"{ticker}_lstm_model.keras")
    scaler_path = os.path.join(MODEL_DIR, f"{ticker}_lstm_scaler.pkl")
    model.save(model_path)
    joblib.dump(scaler, scaler_path)
    print(f"Model saved as {model_path}")
    print(f"Scaler saved as {scaler_path}")

    metadata = {
        "ticker": ticker,
        "source_file": file_name,
        "train_ratio": TRAIN_RATIO,
        "sequence_length": SEQUENCE_LENGTH,
        "epochs": EPOCHS,
        "batch_size": BATCH_SIZE,
        "total_rows": int(len(data)),
        "train_rows": int(len(train_close)),
        "test_rows": int(len(test_close)),
        "metrics": {
            "lstm_test_mse": float(mse),
            "lstm_test_mae": float(mae),
            "naive_baseline_test_mse": float(baseline_mse),
            "naive_baseline_test_mae": float(baseline_mae),
        },
    }
    metadata_path = os.path.join(METADATA_DIR, f"{ticker}_lstm_metrics.json")
    with open(metadata_path, "w", encoding="utf-8") as metadata_file:
        json.dump(metadata, metadata_file, indent=2)
    print(f"Metadata saved as {metadata_path}")
