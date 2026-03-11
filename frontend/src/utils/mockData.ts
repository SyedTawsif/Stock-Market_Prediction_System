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

// Generate realistic historical data
const generateHistoricalData = (
  basePrice: number,
  days: number,
  volatility: number
): HistoricalDataPoint[] => {
  const data: HistoricalDataPoint[] = [];
  const today = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const randomChange = (Math.random() - 0.5) * volatility;
    const actual = basePrice + randomChange;
    
    // Add predicted values for recent data (last 30 days)
    const predicted = i <= 30 ? actual + (Math.random() - 0.5) * (volatility * 0.3) : undefined;
    
    data.push({
      date: date.toISOString().split('T')[0],
      actual: parseFloat(actual.toFixed(2)),
      predicted: predicted ? parseFloat(predicted.toFixed(2)) : undefined,
    });
    
    basePrice = actual;
  }
  
  return data;
};

// Calculate statistics
const calculateStats = (data: HistoricalDataPoint[]): StockStats => {
  const prices = data.map(d => d.actual);
  const highest = Math.max(...prices);
  const lowest = Math.min(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  
  // Calculate MSE for last 30 days where we have predictions
  const recentData = data.filter(d => d.predicted !== undefined);
  const mse = recentData.length > 0
    ? recentData.reduce((sum, d) => sum + Math.pow(d.actual - (d.predicted || 0), 2), 0) / recentData.length
    : 0;
  
  // Determine trend based on recent price movements
  const recentPrices = prices.slice(-10);
  const firstHalf = recentPrices.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
  const secondHalf = recentPrices.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const trend = secondHalf > firstHalf * 1.02 ? 'bullish' : secondHalf < firstHalf * 0.98 ? 'bearish' : 'neutral';
  
  return {
    mse: parseFloat(mse.toFixed(4)),
    highest: parseFloat(highest.toFixed(2)),
    lowest: parseFloat(lowest.toFixed(2)),
    trend,
    avgPrice: parseFloat(avgPrice.toFixed(2)),
  };
};

// Generate mock stock data
const createStockData = (
  symbol: string,
  name: string,
  basePrice: number,
  volatility: number
): StockData => {
  const historicalData = generateHistoricalData(basePrice, 90, volatility);
  const currentPrice = historicalData[historicalData.length - 1].actual;
  const predictedPrice = currentPrice * (1 + (Math.random() - 0.5) * 0.05);
  const percentageChange = ((predictedPrice - currentPrice) / currentPrice) * 100;
  
  return {
    symbol,
    name,
    currentPrice: parseFloat(currentPrice.toFixed(2)),
    predictedPrice: parseFloat(predictedPrice.toFixed(2)),
    percentageChange: parseFloat(percentageChange.toFixed(2)),
    historicalData,
    stats: calculateStats(historicalData),
  };
};

// Mock stock data
export const mockStocks: StockData[] = [
  createStockData('AAPL', 'Apple Inc.', 178, 8),
  createStockData('MSFT', 'Microsoft Corporation', 372, 12),
  createStockData('GOOGL', 'Alphabet Inc.', 140, 6),
  createStockData('AMZN', 'Amazon.com Inc.', 152, 10),
  createStockData('TSLA', 'Tesla Inc.', 242, 18),
  createStockData('META', 'Meta Platforms Inc.', 345, 14),
];

export const getStockBySymbol = (symbol: string): StockData | undefined => {
  return mockStocks.find(stock => stock.symbol === symbol);
};

export const getAllStocks = (): StockData[] => {
  return mockStocks;
};
