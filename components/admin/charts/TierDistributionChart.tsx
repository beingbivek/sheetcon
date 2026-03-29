// components/admin/charts/TierDistributionChart.tsx

'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

interface TierDistributionChartProps {
  data: {
    name: string;
    value: number;
    fill: string;
  }[];
}

export default function TierDistributionChart({ data }: TierDistributionChartProps) {
  if (!data || data.length === 0 || data.every(d => d.value === 0)) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400">
        No users yet
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            label={({ name, percent }) => 
              percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
            }
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#fff',
            }}
            formatter={(value: number, name: string) => [`${value} users`, name]}
          />
          <Legend
            wrapperStyle={{ color: '#94a3b8' }}
            formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}