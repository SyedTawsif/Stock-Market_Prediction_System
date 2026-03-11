import { useParams, Link } from 'react-router';
import { ArrowLeft, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getStockBySymbol } from '../utils/mockData';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

export function StockDetails() {
  const { symbol } = useParams<{ symbol: string }>();
  const stock = symbol ? getStockBySymbol(symbol) : undefined;
  
  if (!stock) {
    return (
      <div className="text-center py-12">
        <h3 className="text-gray-900 mb-2">Stock Not Found</h3>
        <p className="text-gray-600 mb-4">The stock you're looking for doesn't exist.</p>
        <Link to="/">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    );
  }
  
  const isPositive = stock.percentageChange >= 0;
  const changeColor = isPositive ? 'text-green-600' : 'text-red-600';
  const bgColor = isPositive ? 'bg-green-50' : 'bg-red-50';
  
  const handleDownloadCSV = () => {
    const headers = ['Date', 'Actual Price', 'Predicted Price'];
    const rows = stock.historicalData.map(d => [
      d.date,
      d.actual.toString(),
      d.predicted?.toString() || 'N/A'
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${stock.symbol}_historical_data.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  
  const getTrendIcon = () => {
    switch (stock.stats.trend) {
      case 'bullish':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'bearish':
        return <TrendingDown className="w-5 h-5 text-red-600" />;
      default:
        return <Minus className="w-5 h-5 text-gray-600" />;
    }
  };
  
  const getTrendColor = () => {
    switch (stock.stats.trend) {
      case 'bullish':
        return 'text-green-600';
      case 'bearish':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };
  
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-gray-900">{stock.symbol}</h2>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded ${bgColor} ${changeColor}`}>
                {isPositive ? '↑' : '↓'} {Math.abs(stock.percentageChange).toFixed(2)}%
              </span>
            </div>
            <p className="text-gray-600">{stock.name}</p>
          </div>
          
          <Button onClick={handleDownloadCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download CSV
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-6">
          <p className="text-sm text-gray-500 mb-1">Current Price</p>
          <p className="text-gray-900">${stock.currentPrice.toFixed(2)}</p>
        </Card>
        
        <Card className="p-6">
          <p className="text-sm text-gray-500 mb-1">Predicted Price</p>
          <p className={changeColor}>${stock.predictedPrice.toFixed(2)}</p>
        </Card>
        
        <Card className="p-6">
          <p className="text-sm text-gray-500 mb-1">52-Week High</p>
          <p className="text-gray-900">${stock.stats.highest.toFixed(2)}</p>
        </Card>
        
        <Card className="p-6">
          <p className="text-sm text-gray-500 mb-1">52-Week Low</p>
          <p className="text-gray-900">${stock.stats.lowest.toFixed(2)}</p>
        </Card>
      </div>
      
      {/* Chart and Data */}
      <Tabs defaultValue="chart" className="mb-8">
        <TabsList>
          <TabsTrigger value="chart">Price Chart</TabsTrigger>
          <TabsTrigger value="data">Data Table</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="chart" className="mt-6">
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4">Historical vs Predicted Prices</h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stock.historicalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 14 }}
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Actual Price"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Predicted Price"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="data" className="mt-6">
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4">Historical Data</h3>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Actual Price</TableHead>
                    <TableHead>Predicted Price</TableHead>
                    <TableHead>Difference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stock.historicalData.slice().reverse().map((data) => {
                    const diff = data.predicted ? data.predicted - data.actual : null;
                    return (
                      <TableRow key={data.date}>
                        <TableCell>{data.date}</TableCell>
                        <TableCell>${data.actual.toFixed(2)}</TableCell>
                        <TableCell>
                          {data.predicted ? `$${data.predicted.toFixed(2)}` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {diff !== null ? (
                            <span className={diff >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {diff >= 0 ? '+' : ''}${diff.toFixed(2)}
                            </span>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="stats" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-gray-900 mb-4">Model Performance</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Mean Squared Error (MSE)</p>
                  <p className="text-gray-900">{stock.stats.mse.toFixed(4)}</p>
                  <p className="text-xs text-gray-500 mt-1">Lower is better</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Average Price (90 days)</p>
                  <p className="text-gray-900">${stock.stats.avgPrice.toFixed(2)}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-6">
              <h3 className="text-gray-900 mb-4">Price Analysis</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Trend</p>
                  <div className="flex items-center gap-2">
                    {getTrendIcon()}
                    <span className={`capitalize ${getTrendColor()}`}>
                      {stock.stats.trend}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Price Range</p>
                  <p className="text-gray-900">
                    ${stock.stats.lowest.toFixed(2)} - ${stock.stats.highest.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Next Day Prediction</p>
                  <p className={changeColor}>
                    ${stock.predictedPrice.toFixed(2)} ({isPositive ? '+' : ''}{stock.percentageChange.toFixed(2)}%)
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
