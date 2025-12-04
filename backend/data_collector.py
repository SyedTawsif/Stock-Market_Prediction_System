import yfinance as yf
import os

def download_stock_data(ticker, period="1y", interval="1d", out_dir="data"):
    os.makedirs(out_dir, exist_ok=True)
    print(f"Downloading {ticker} data...")
    df = yf.download(ticker, period=period, interval=interval, progress=False)
    if df.empty:
        raise ValueError(f"No data for {ticker} — check ticker or network.")
    out_path = os.path.join(out_dir, f"{ticker}.csv")
    df.to_csv(out_path)
    print(f"{ticker} saved to {out_path}")

tickers = ["AAPL", "MSFT", "GOOGL"]  # scalable list

for ticker in tickers:
    download_stock_data(ticker)