import { useEffect, useState } from 'react';
import { StockCard } from './StockCard';
import { getActiveModelLabel, getAllStocks, type StockData } from '../utils/mockData';
import { Search, Brain } from 'lucide-react';
import { Input } from './ui/input';

export function Dashboard() {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    getAllStocks()
      .then((data) => {
        if (!isMounted) return;
        setStocks(data);
      })
      .catch(() => {
        if (!isMounted) return;
        setError('Unable to load stocks from backend API.');
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);
  
  const currentModel = getActiveModelLabel();
  
  const filteredStocks = stocks.filter(stock =>
    stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Calculate summary stats
  const totalStocks = stocks.length;
  const positiveChanges = stocks.filter(s => s.percentageChange > 0).length;
  const avgChange = stocks.length > 0
    ? stocks.reduce((sum, s) => sum + s.percentageChange, 0) / stocks.length
    : 0;
  
  return (
    <div>
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-gray-900 mb-2">Stock Dashboard</h2>
            <p className="text-gray-600">
              Monitor your tracked stocks and view real-time predictions
            </p>
          </div>
          
          {/* Current Model Indicator */}
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <Brain className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-xs text-blue-600">Active Model</p>
              <p className="text-sm text-blue-900">{currentModel}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500 mb-1">Total Stocks</p>
          <p className="text-gray-900">{totalStocks}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500 mb-1">Positive Predictions</p>
          <p className="text-green-600">{positiveChanges} / {totalStocks}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500 mb-1">Average Change</p>
          <p className={avgChange >= 0 ? 'text-green-600' : 'text-red-600'}>
            {avgChange >= 0 ? '+' : ''}{avgChange.toFixed(2)}%
          </p>
        </div>
      </div>
      
      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search stocks by symbol or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      {/* Stock Grid */}
      {isLoading && (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading stock data...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {!isLoading && !error && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStocks.map((stock) => (
          <StockCard key={stock.symbol} stock={stock} />
        ))}
      </div>
      )}
      
      {!isLoading && !error && filteredStocks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No stocks found matching your search.</p>
        </div>
      )}
    </div>
  );
}