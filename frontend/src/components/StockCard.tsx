import { Link } from 'react-router';
import { ArrowUp, ArrowDown, TrendingUp } from 'lucide-react';
import { Card } from './ui/card';
import { MiniChart } from './MiniChart';
import { StockData } from '../utils/mockData';

interface StockCardProps {
  stock: StockData;
}

export function StockCard({ stock }: StockCardProps) {
  const isPositive = stock.percentageChange >= 0;
  const changeColor = isPositive ? 'text-green-600' : 'text-red-600';
  const bgColor = isPositive ? 'bg-green-50' : 'bg-red-50';
  
  return (
    <Link to={`/stock/${stock.symbol}`}>
      <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-gray-900">{stock.symbol}</h3>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${bgColor} ${changeColor}`}>
                {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                {Math.abs(stock.percentageChange).toFixed(2)}%
              </span>
            </div>
            <p className="text-sm text-gray-500">{stock.name}</p>
          </div>
          
          <div className={`p-2 rounded-lg ${bgColor}`}>
            <TrendingUp className={`w-5 h-5 ${changeColor}`} />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Current Price</p>
            <p className="text-gray-900">${stock.currentPrice.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Predicted Price</p>
            <p className={changeColor}>${stock.predictedPrice.toFixed(2)}</p>
          </div>
        </div>
        
        <div className="h-16 -mx-2">
          <MiniChart data={stock.historicalData} isPositive={isPositive} />
        </div>
      </Card>
    </Link>
  );
}
