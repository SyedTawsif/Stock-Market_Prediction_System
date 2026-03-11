import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { HistoricalDataPoint } from '../utils/mockData';

interface MiniChartProps {
  data: HistoricalDataPoint[];
  isPositive: boolean;
}

export function MiniChart({ data, isPositive }: MiniChartProps) {
  // Show only last 30 days for mini chart
  const recentData = data.slice(-30);
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={recentData}>
        <Line
          type="monotone"
          dataKey="actual"
          stroke={isPositive ? '#10b981' : '#ef4444'}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
