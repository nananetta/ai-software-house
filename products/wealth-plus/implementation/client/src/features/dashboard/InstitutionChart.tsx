import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface InstitutionData {
  institution: string;
  total: number;
}

interface InstitutionChartProps {
  data: InstitutionData[];
}

function formatShort(value: number): string {
  if (value >= 1_000_000_000) return `฿${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `฿${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `฿${(value / 1_000).toFixed(0)}K`;
  return `฿${value.toFixed(0)}`;
}

const BAR_COLOR = '#3b82f6';

export function InstitutionChart({ data }: InstitutionChartProps) {
  const sorted = [...data].sort((a, b) => b.total - a.total);

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, sorted.length * 40)}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
      >
        <XAxis
          type="number"
          tickFormatter={formatShort}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="institution"
          width={120}
          tick={{ fontSize: 12, fill: '#374151' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number) => [formatShort(value), 'Total']}
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            fontSize: '12px',
          }}
        />
        <Bar dataKey="total" radius={[0, 4, 4, 0]}>
          {sorted.map((_, i) => (
            <Cell key={i} fill={BAR_COLOR} fillOpacity={1 - i * 0.07} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
