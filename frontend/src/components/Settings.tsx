import { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { getAllStocks, saveActiveModel, saveSelectedRange, type StockData } from '../utils/mockData';
import { Save, RefreshCw, Brain, CheckCircle2 } from 'lucide-react';

const ALLOWED_RANGES = ['1mo', '3mo', '6mo', '1y', '2y', '5y'] as const;
type AllowedRange = (typeof ALLOWED_RANGES)[number];
const RANGE_LABELS: Record<AllowedRange, string> = {
  '1mo': '1 Month',
  '3mo': '3 Months',
  '6mo': '6 Months',
  '1y': '1 Year',
  '2y': '2 Years',
  '5y': '5 Years',
};

export function Settings() {
  const [allStocks, setAllStocks] = useState<StockData[]>([]);
  const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<AllowedRange>(
    (localStorage.getItem('selectedHistoricalRange') as AllowedRange) ?? '1y'
  );
  const [selectedModel, setSelectedModel] = useState<string>(
    localStorage.getItem('activePredictionModel') ?? 'linear-regression'
  );

  useEffect(() => {
    let isMounted = true;
    getAllStocks()
      .then((stocks) => {
        if (!isMounted) return;
        setAllStocks(stocks);
        setSelectedStocks(stocks.map((s) => s.symbol));
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
  
  const handleStockToggle = (symbol: string) => {
    setSelectedStocks(prev =>
      prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };
  
  const handleSelectAll = () => {
    setSelectedStocks(allStocks.map(s => s.symbol));
  };
  
  const handleDeselectAll = () => {
    setSelectedStocks([]);
  };
  
  const handleSave = () => {
    if (
      selectedModel === 'linear-regression' ||
      selectedModel === 'lstm' ||
      selectedModel === 'random-forest'
    ) {
      saveActiveModel(selectedModel);
    }
    saveSelectedRange(selectedRange);
    alert('Settings saved successfully!');
  };
  
  const handleReset = () => {
    setSelectedStocks(allStocks.map(s => s.symbol));
    setSelectedRange('1y');
    setSelectedModel('linear-regression');
  };

  const handleModelTileSelect = (model: string, disabled = false) => {
    if (disabled) return;
    setSelectedModel(model);
  };

  const getSelectedModelLabel = () => {
    if (selectedModel === 'linear-regression') {
      return 'Linear Regression';
    }
    if (selectedModel === 'random-forest') {
      return 'Random Forest';
    }
    if (selectedModel === 'lstm') {
      return 'LSTM Neural Network';
    }
    return 'None';
  };
  
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-gray-900 mb-2">Prediction Settings</h2>
        <p className="text-gray-600">
          Configure which stocks to track and set date ranges for predictions
        </p>
      </div>
      
      {/* Model Selection - Full Width */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-blue-600" />
          <h3 className="text-gray-900">Prediction Model</h3>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Select the machine learning model that will be used to generate stock price predictions.
          Different models may provide varying levels of accuracy depending on market conditions.
        </p>
        
        <RadioGroup value={selectedModel} onValueChange={setSelectedModel}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Linear Regression */}
            <div
              className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
                selectedModel === 'linear-regression'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleModelTileSelect('linear-regression')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleModelTileSelect('linear-regression');
                }
              }}
              role="radio"
              aria-checked={selectedModel === 'linear-regression'}
              tabIndex={0}
            >
              {selectedModel === 'linear-regression' && (
                <CheckCircle2 className="absolute top-3 right-3 w-5 h-5 text-blue-600" />
              )}
              <div className="flex items-center gap-3 mb-2">
                <RadioGroupItem value="linear-regression" id="linear-regression" />
                <Label htmlFor="linear-regression" className="cursor-pointer">
                  Linear Regression
                </Label>
              </div>
              <p className="text-sm text-gray-600 ml-7">
                Fast and simple model based on linear trends. Best for stable markets.
              </p>
              <div className="mt-3 ml-7">
                {selectedModel === 'linear-regression' && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                    Active
                  </span>
                )}
              </div>
            </div>
            
            {/* Random Forest */}
            <div
              className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
                selectedModel === 'random-forest'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleModelTileSelect('random-forest')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleModelTileSelect('random-forest');
                }
              }}
              role="radio"
              aria-checked={selectedModel === 'random-forest'}
              tabIndex={0}
            >
              {selectedModel === 'random-forest' && (
                <CheckCircle2 className="absolute top-3 right-3 w-5 h-5 text-blue-600" />
              )}
              <div className="flex items-center gap-3 mb-2">
                <RadioGroupItem value="random-forest" id="random-forest" />
                <Label htmlFor="random-forest" className="cursor-pointer">
                  Random Forest
                </Label>
              </div>
              <p className="text-sm text-gray-600 ml-7">
                Ensemble learning method for improved accuracy. Better for volatile markets.
              </p>
              <div className="mt-3 ml-7">
                {selectedModel === 'random-forest' && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                    Active
                  </span>
                )}
              </div>
            </div>
            
            {/* LSTM */}
            <div
              className={`relative p-4 rounded-lg border-2 transition-all ${
                selectedModel === 'lstm'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              } cursor-pointer`}
              onClick={() => handleModelTileSelect('lstm')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleModelTileSelect('lstm');
                }
              }}
              role="radio"
              aria-checked={selectedModel === 'lstm'}
              tabIndex={0}
            >
              <div className="flex items-center gap-3 mb-2">
                <RadioGroupItem value="lstm" id="lstm" />
                <Label htmlFor="lstm">
                  LSTM Neural Network
                </Label>
              </div>
              <p className="text-sm text-gray-600 ml-7">
                Deep learning model for complex patterns. Ideal for long-term predictions.
              </p>
              <div className="mt-3 ml-7">
                {selectedModel === 'lstm' && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                    Active
                  </span>
                )}
              </div>
            </div>
          </div>
        </RadioGroup>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Selection */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-gray-900 mb-1">Tracked Stocks</h3>
              <p className="text-sm text-gray-500">
                {selectedStocks.length} of {allStocks.length} selected
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                Clear
              </Button>
            </div>
          </div>
          
          {isLoading && <p className="text-sm text-gray-500">Loading stocks...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="space-y-3">
            {allStocks.map((stock) => (
              <div key={stock.symbol} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                <Checkbox
                  id={stock.symbol}
                  checked={selectedStocks.includes(stock.symbol)}
                  onCheckedChange={() => handleStockToggle(stock.symbol)}
                />
                <Label htmlFor={stock.symbol} className="flex-1 cursor-pointer">
                  <div>
                    <p className="text-gray-900">{stock.symbol}</p>
                    <p className="text-sm text-gray-500">{stock.name}</p>
                  </div>
                </Label>
                <div className="text-right">
                  <p className="text-gray-900">${stock.currentPrice.toFixed(2)}</p>
                  <p className={`text-sm ${stock.percentageChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stock.percentageChange >= 0 ? '+' : ''}{stock.percentageChange.toFixed(2)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
        
        {/* Date Range Selection */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4">Historical Data Range</h3>
            <p className="text-sm text-gray-600 mb-4">
              Choose from supported model windows only.
            </p>
            <RadioGroup value={selectedRange} onValueChange={(value) => setSelectedRange(value as AllowedRange)}>
              <div className="grid grid-cols-2 gap-3">
                {ALLOWED_RANGES.map((range) => (
                  <div
                    key={range}
                    className={`rounded-lg border p-3 cursor-pointer transition-all ${
                      selectedRange === range
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedRange(range)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedRange(range);
                      }
                    }}
                    role="radio"
                    aria-checked={selectedRange === range}
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value={range} id={`range-${range}`} />
                      <Label htmlFor={`range-${range}`} className="cursor-pointer">
                        {RANGE_LABELS[range]}
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </Card>
          
          {/* Date Range Summary */}
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4">Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Prediction Model:</span>
                <span className="text-gray-900">
                  {getSelectedModelLabel()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Selected Stocks:</span>
                <span className="text-gray-900">{selectedStocks.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Historical Range:</span>
                <span className="text-gray-900">{RANGE_LABELS[selectedRange]}</span>
              </div>
            </div>
          </Card>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button onClick={handleSave} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
            <Button onClick={handleReset} variant="outline" className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}