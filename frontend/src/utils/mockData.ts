export interface StockData {
  symbol: string;
  name: string;
  currentPrice: number;
  predictedPrice: number;
  percentageChange: number;
  historicalData: HistoricalDataPoint[];
  stats: StockStats;
}

export interface HistoricalDataPoint {
  date: string;
  actual: number;
  predicted?: number;
}

export interface StockStats {
  mse: number;
  highest: number;
  lowest: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  avgPrice: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';
const ACTIVE_MODEL_KEY = 'activePredictionModel';
const SELECTED_RANGE_KEY = 'selectedHistoricalRange';
const ALLOWED_RANGES = new Set(['1mo', '3mo', '6mo', '1y', '2y', '5y']);

const STOCK_NAMES: Record<string, string> = {
  AAPL: 'Apple Inc.',
  MSFT: 'Microsoft Corporation',
  GOOGL: 'Alphabet Inc.',
  NVDA: 'NVIDIA Corporation',
  AMZN: 'Amazon.com Inc.',
  META: 'Meta Platforms Inc.',
  TSLA: 'Tesla Inc.',
  JPM: 'JPMorgan Chase & Co.',
  BAC: 'Bank of America Corporation',
  LLY: 'Eli Lilly and Company',
  UNH: 'UnitedHealth Group Inc.',
  XOM: 'Exxon Mobil Corporation',
  CVX: 'Chevron Corporation',
  WMT: 'Walmart Inc.',
  COST: 'Costco Wholesale Corporation',
  PLTR: 'Palantir Technologies Inc.',
  SNOW: 'Snowflake Inc.',
};

interface BackendStockResponse {
  symbol: string;
  name: string;
  current_price: number;
  predicted_price: number;
  change_percent: number;
  model: string;
  range?: string;
  metrics: { mse: number | null; mae: number | null };
  historical_data: HistoricalDataPoint[];
  stats: {
    mse: number;
    highest: number;
    lowest: number;
    trend: 'bullish' | 'bearish' | 'neutral';
    avg_price: number;
  };
}

const toStockData = (payload: BackendStockResponse): StockData => ({
  symbol: payload.symbol,
  name: STOCK_NAMES[payload.symbol] ?? payload.name ?? payload.symbol,
  currentPrice: payload.current_price,
  predictedPrice: payload.predicted_price,
  percentageChange: payload.change_percent,
  historicalData: payload.historical_data,
  stats: {
    mse: payload.metrics.mse ?? payload.stats.mse ?? 0,
    highest: payload.stats.highest,
    lowest: payload.stats.lowest,
    trend: payload.stats.trend,
    avgPrice: payload.stats.avg_price,
  },
});

const getApiModel = (): string => {
  const stored = localStorage.getItem(ACTIVE_MODEL_KEY) ?? 'linear-regression';
  if (stored === 'lstm') return 'lstm';
  if (stored === 'random-forest') return 'random_forest';
  return 'linear';
};

const getSelectedRange = (): string => {
  const stored = localStorage.getItem(SELECTED_RANGE_KEY) ?? '1y';
  return ALLOWED_RANGES.has(stored) ? stored : '1y';
};

export const getActiveModelLabel = (): string => {
  const stored = localStorage.getItem(ACTIVE_MODEL_KEY) ?? 'linear-regression';
  if (stored === 'lstm') return 'LSTM Neural Network';
  if (stored === 'random-forest') return 'Random Forest';
  return 'Linear Regression';
};

export const saveActiveModel = (model: 'linear-regression' | 'lstm' | 'random-forest') => {
  localStorage.setItem(ACTIVE_MODEL_KEY, model);
};

export const saveSelectedRange = (range: string) => {
  if (ALLOWED_RANGES.has(range)) {
    localStorage.setItem(SELECTED_RANGE_KEY, range);
  }
};

export const getStockBySymbol = async (symbol: string): Promise<StockData | undefined> => {
  const model = getApiModel();
  const range = getSelectedRange();
  const response = await fetch(`${API_BASE_URL}/api/stocks/${symbol}?model=${model}&range=${range}`);
  if (response.status === 404) {
    return undefined;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch stock ${symbol}`);
  }
  const payload = (await response.json()) as BackendStockResponse;
  return toStockData(payload);
};

export const getAllStocks = async (): Promise<StockData[]> => {
  const listResponse = await fetch(`${API_BASE_URL}/api/stocks`);
  if (!listResponse.ok) {
    throw new Error('Failed to fetch stock list');
  }

  const symbols = (await listResponse.json()) as string[];
  const model = getApiModel();
  const range = getSelectedRange();
  const stockRequests = symbols.map((symbol) =>
    fetch(`${API_BASE_URL}/api/stocks/${symbol}?model=${model}&range=${range}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch stock details for ${symbol}`);
        }
        return (await response.json()) as BackendStockResponse;
      })
      .then(toStockData)
  );

  return Promise.all(stockRequests);
};
