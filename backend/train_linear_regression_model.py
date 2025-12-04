import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error
import joblib
import os

DATA_DIR = "data"
MODEL_DIR = "models"

# Create models directory if it doesn't exist
os.makedirs(MODEL_DIR, exist_ok=True)

# Loop through all CSV files in the data folder
for file_name in os.listdir(DATA_DIR):
    if file_name.endswith(".csv"):
        ticker = file_name.split(".")[0]
        file_path = os.path.join(DATA_DIR, file_name)
        print(f"\nTraining model for {ticker}...")

        # Load the data
        data = pd.read_csv(file_path)
        data = data[['Close']]

        # Create features and target
        data['Prev_Close'] = data['Close'].shift(1)
        data = data.dropna()
        X = data[['Prev_Close']]
        y = data['Close']

        # Train model
        model = LinearRegression()
        model.fit(X, y)

        # Evaluate
        predictions = model.predict(X)
        mse = mean_squared_error(y, predictions)
        print(f"{ticker} - Mean Squared Error: {mse}")

        # Save model
        model_path = os.path.join(MODEL_DIR, f"{ticker}_linear_model.pkl")
        joblib.dump(model, model_path)
        print(f"Model saved as {model_path}")