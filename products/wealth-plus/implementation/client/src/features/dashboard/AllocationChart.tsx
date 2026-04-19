import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatTHB } from '../../utils/formatCurrency';
import { INVESTMENT_TYPE_LABELS } from '../../types/index';
import type { AllocationData } from '../../types/index';

interface AllocationChartProps {
  data: AllocationData[];
}

const COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#ec4899', // pink-500
  '#84cc16', // lime-500
  '#6b7280', // gray-500
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: AllocationData;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0]!;
  const label =
    INVESTMENT_TYPE_LABELS[item.payload.investmentType as keyof typeof INVESTMENT_TYPE_LABELS] ??
    item.payload.label;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-sm">
      <p className="font-medium text-gray-900">{label}</p>
      <p className="text-gray-600">{formatTHB(item.value)}</p>
      <p className="text-gray-400">{item.payload.percent.toFixed(1)}%</p>
    </div>
  );
}

export function AllocationChart({ data }: AllocationChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    name:
      INVESTMENT_TYPE_LABELS[d.investmentType as keyof typeof INVESTMENT_TYPE_LABELS] ?? d.label,
    value: d.total,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={100}
              dataKey="value"
              label={false}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {chartData.map((item, index) => (
          <div
            key={item.investmentType}
            className="flex items-start justify-between gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2"
          >
            <div className="min-w-0 flex items-start gap-2">
              <span
                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-800">{item.name}</p>
                <p className="text-xs text-gray-500">{formatTHB(item.value)}</p>
              </div>
            </div>
            <span className="shrink-0 text-sm font-semibold text-gray-900">
              {item.percent.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
