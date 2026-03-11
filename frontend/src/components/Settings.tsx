import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { getAllStocks } from '../utils/mockData';
import { Calendar } from './ui/calendar';
import { Save, RefreshCw, Brain, CheckCircle2 } from 'lucide-react';

export function Settings() {
  const allStocks = getAllStocks();
  const [selectedStocks, setSelectedStocks] = useState<string[]>(
    allStocks.map(s => s.symbol)
  );
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [selectedModel, setSelectedModel] = useState<string>('linear-regression');
  
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
    // In a real app, this would save settings to backend/localStorage
    alert('Settings saved successfully!');
  };
  
  const handleReset = () => {
    setSelectedStocks(allStocks.map(s => s.symbol));
    setStartDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
    setEndDate(new Date());
    setSelectedModel('linear-regression');
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
              onClick={() => setSelectedModel('linear-regression')}
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
                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                  Active
                </span>
              </div>
            </div>
            
            {/* Random Forest - Coming Soon */}
            <div className="relative p-4 rounded-lg border-2 border-gray-200 bg-gray-50 opacity-60">
              <div className="flex items-center gap-3 mb-2">
                <RadioGroupItem value="random-forest" id="random-forest" disabled />
                <Label htmlFor="random-forest" className="text-gray-400">
                  Random Forest
                </Label>
              </div>
              <p className="text-sm text-gray-400 ml-7">
                Ensemble learning method for improved accuracy. Better for volatile markets.
              </p>
              <div className="mt-3 ml-7">
                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-200 text-gray-600">
                  Coming Soon
                </span>
              </div>
            </div>
            
            {/* LSTM - Coming Soon */}
            <div className="relative p-4 rounded-lg border-2 border-gray-200 bg-gray-50 opacity-60">
              <div className="flex items-center gap-3 mb-2">
                <RadioGroupItem value="lstm" id="lstm" disabled />
                <Label htmlFor="lstm" className="text-gray-400">
                  LSTM Neural Network
                </Label>
              </div>
              <p className="text-sm text-gray-400 ml-7">
                Deep learning model for complex patterns. Ideal for long-term predictions.
              </p>
              <div className="mt-3 ml-7">
                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-200 text-gray-600">
                  Coming Soon
                </span>
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
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Start Date</Label>
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  className="rounded-md border"
                />
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">End Date</Label>
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  className="rounded-md border"
                />
              </div>
            </div>
          </Card>
          
          {/* Date Range Summary */}
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4">Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Prediction Model:</span>
                <span className="text-gray-900">
                  {selectedModel === 'linear-regression' ? 'Linear Regression' : 
                   selectedModel === 'random-forest' ? 'Random Forest' : 
                   selectedModel === 'lstm' ? 'LSTM Neural Network' : 'None'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Selected Stocks:</span>
                <span className="text-gray-900">{selectedStocks.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Start Date:</span>
                <span className="text-gray-900">
                  {startDate?.toLocaleDateString() || 'Not set'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">End Date:</span>
                <span className="text-gray-900">
                  {endDate?.toLocaleDateString() || 'Not set'}
                </span>
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