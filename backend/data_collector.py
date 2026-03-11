"""
Stock data collector with configurable timeframe support.
Downloads OHLCV data from Yahoo Finance and saves CSVs keyed by ticker and period.
"""
import argparse
import os
import pandas as pd
import yfinance as yf


# Timeframes supported by yfinance (period parameter)
# See: https://github.com/ranaroussi/yfinance#period
SUPPORTED_PERIODS = ["1mo", "3mo", "6mo", "1y", "2y", "5y"]
DEFAULT_PERIOD = "1y"
DEFAULT_INTERVAL = "1d"


def _normalize_columns(df):
    """
    Flatten MultiIndex columns from yfinance so we get simple 'Close', 'Open', etc.
    When downloading a single ticker, yfinance may return columns like ('Close', 'AAPL').
    """
    if isinstance(df.columns, pd.MultiIndex):
        df = df.copy()
        df.columns = df.columns.get_level_values(0)
    return df


def download_stock_data(
    ticker: str,
    period: str = DEFAULT_PERIOD,
    interval: str = DEFAULT_INTERVAL,
    out_dir: str = "data",
) -> str:
    """
    Download historical stock data for a ticker and save as CSV.

    Args:
        ticker: Stock symbol (e.g. AAPL, MSFT).
        period: Data range: 1mo, 3mo, 6mo, 1y, 2y, 5y.
        interval: Candle interval: 1d, 1wk, etc.
        out_dir: Directory to save CSV files.

    Returns:
        Path to the saved CSV file.

    Raises:
        ValueError: If period is not supported or no data is returned.
    """
    if period not in SUPPORTED_PERIODS:
        raise ValueError(
            f"Unsupported period '{period}'. Use one of: {', '.join(SUPPORTED_PERIODS)}"
        )

    os.makedirs(out_dir, exist_ok=True)
    print(f"Downloading {ticker} ({period})...")
    df = yf.download(ticker, period=period, interval=interval, progress=False, auto_adjust=True)

    if df.empty:
        raise ValueError(f"No data for {ticker} — check ticker or network.")

    df = _normalize_columns(df)
    # Ensure we have a standard column set; yfinance with auto_adjust=True may drop 'Adj Close'
    if "Close" not in df.columns:
        raise ValueError(f"Download for {ticker} did not return a 'Close' column.")

    # File name includes period so different timeframes don't overwrite each other
    safe_period = period.replace(" ", "_")
    file_name = f"{ticker}_{safe_period}.csv"
    out_path = os.path.join(out_dir, file_name)
    df.to_csv(out_path)
    print(f"  Saved to {out_path}")
    return out_path


def download_multiple(
    tickers: list[str],
    period: str = DEFAULT_PERIOD,
    interval: str = DEFAULT_INTERVAL,
    out_dir: str = "data",
) -> list[str]:
    """Download data for multiple tickers with the same period. Returns list of saved paths."""
    paths = []
    for ticker in tickers:
        try:
            path = download_stock_data(ticker, period=period, interval=interval, out_dir=out_dir)
            paths.append(path)
        except ValueError as e:
            print(f"  Skip {ticker}: {e}")
    return paths


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Download stock data from Yahoo Finance for given tickers and timeframe."
    )
    parser.add_argument(
        "--tickers",
        nargs="+",
        default=["AAPL", "MSFT", "GOOGL"],
        help="Stock symbols to download (default: AAPL MSFT GOOGL)",
    )
    parser.add_argument(
        "--period",
        choices=SUPPORTED_PERIODS,
        default=DEFAULT_PERIOD,
        help=f"Data range to download (default: {DEFAULT_PERIOD})",
    )
    parser.add_argument(
        "--interval",
        default=DEFAULT_INTERVAL,
        help="Candle interval, e.g. 1d, 1wk (default: 1d)",
    )
    parser.add_argument(
        "--out-dir",
        default="data",
        help="Output directory for CSV files (default: data)",
    )
    args = parser.parse_args()

    download_multiple(
        tickers=args.tickers,
        period=args.period,
        interval=args.interval,
        out_dir=args.out_dir,
    )
