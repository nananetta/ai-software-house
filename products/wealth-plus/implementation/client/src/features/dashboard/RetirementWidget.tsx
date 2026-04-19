import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Beaker, Target } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '../../components/ui/Button';
import { formatTHB } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { cn } from '../../utils/cn';
import type {
  RetirementProjection,
  RetirementSimulationRequest,
} from '../../types/index';
import { RetirementSimulationModal } from './RetirementSimulationModal';

interface RetirementWidgetProps {
  data: RetirementProjection | null;
  onConfigureClick: () => void;
}

function formatCompactCurrency(amount: number): string {
  const absolute = Math.abs(amount);

  if (absolute >= 1_000_000_000) {
    return `฿${(amount / 1_000_000_000).toFixed(1)}B`;
  }

  if (absolute >= 1_000_000) {
    return `฿${(amount / 1_000_000).toFixed(1)}M`;
  }

  if (absolute >= 1_000) {
    return `฿${(amount / 1_000).toFixed(0)}K`;
  }

  return `฿${amount.toFixed(0)}`;
}

export function RetirementWidget({ data, onConfigureClick }: RetirementWidgetProps) {
  const navigate = useNavigate();
  const [isSimulationOpen, setIsSimulationOpen] = React.useState(false);

  const isConfigured =
    data !== null && data.settings !== null && data.progressPercent !== null;

  if (!isConfigured) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center gap-3">
        <Target className="h-10 w-10 text-gray-300" />
        <div>
          <p className="text-sm font-medium text-gray-700">Set up your retirement goal</p>
          <p className="text-xs text-gray-400 mt-1">
            Configure your target to track retirement progress.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('/settings')}
        >
          Configure
        </Button>
      </div>
    );
  }

  const activeProjection = data!;
  const settings = activeProjection.settings!;
  const progress = Math.min(activeProjection.progressPercent ?? 0, 100);
  const gap = activeProjection.gap ?? 0;
  const isGoalMet = activeProjection.isTargetReached;
  const yearsRemaining = activeProjection.yearsRemaining;
  const projectedFV = activeProjection.projectedFV;
  const trajectory = activeProjection.trajectory ?? [];
  const hasTrajectory = trajectory.length > 1 && yearsRemaining !== null && yearsRemaining > 0;
  const chartData = trajectory.map((point) => ({
    ...point,
    target: settings.retirementTargetAmount,
  }));
  const targetReachLabel = activeProjection.targetReachDate
    ? `Around ${formatDate(activeProjection.targetReachDate)}`
    : `Not reached by age ${settings.retirementAge}`;
  const targetReachContext = activeProjection.targetReachAge !== null
    ? `Age ${activeProjection.targetReachAge.toFixed(1)}`
    : `${yearsRemaining ?? 0} years remaining`;
  const retirementProjectionContext =
    projectedFV !== null
      ? `${formatTHB(projectedFV)} by age ${settings.retirementAge}`
      : 'Projection unavailable';
  const simulationDefaults: RetirementSimulationRequest = {
    currentAge: settings.currentAge,
    retirementAge: settings.retirementAge,
    retirementTargetAmount: settings.retirementTargetAmount,
    expectedAnnualReturn: settings.expectedAnnualReturn,
    expectedAnnualContribution: settings.expectedAnnualContribution,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsSimulationOpen(true)}
            className="gap-1.5"
          >
            <Beaker className="h-3.5 w-3.5" />
            Simulation
          </Button>
        </div>
      </div>

      <div>
        <p className="text-sm text-gray-600">
          You are at{' '}
          <span className={cn('font-bold', isGoalMet ? 'text-green-600' : 'text-blue-600')}>
            {progress.toFixed(1)}%
          </span>{' '}
          of your retirement target
        </p>
      </div>

      <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isGoalMet ? 'bg-green-500' : 'bg-blue-500'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {hasTrajectory ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                Trajectory
              </p>
              <p className="text-sm text-slate-600">
                From today to age {settings.retirementAge}, based on your current portfolio,
                expected annual return, and annual contribution.
              </p>
            </div>
            <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
              {trajectory[0] ? formatDate(trajectory[0].date) : 'Today'} to age{' '}
              {settings.retirementAge}
            </div>
          </div>

          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  type="number"
                  dataKey="age"
                  domain={[settings.currentAge, settings.retirementAge]}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `Age ${value}`}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                  tickFormatter={formatCompactCurrency}
                />
                <ReferenceLine
                  y={settings.retirementTargetAmount}
                  stroke="#f59e0b"
                  strokeDasharray="5 5"
                  ifOverflow="extendDomain"
                  label={{
                    value: 'Target',
                    position: 'insideTopRight',
                    fill: '#b45309',
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={isGoalMet ? '#16a34a' : '#2563eb'}
                  strokeWidth={3}
                  strokeDasharray="7 5"
                  dot={false}
                  isAnimationActive={false}
                />
                {trajectory[0] && (
                  <ReferenceDot
                    x={trajectory[0].age}
                    y={trajectory[0].value}
                    r={5}
                    fill="#0f172a"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                )}
                {trajectory[trajectory.length - 1] && (
                  <ReferenceDot
                    x={trajectory[trajectory.length - 1]!.age}
                    y={trajectory[trajectory.length - 1]!.value}
                    r={5}
                    fill="#2563eb"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                )}
                {activeProjection.targetReachAge !== null &&
                  activeProjection.targetReachValue !== null && (
                    <ReferenceDot
                      x={activeProjection.targetReachAge}
                      y={activeProjection.targetReachValue}
                      r={5}
                      fill="#f59e0b"
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
              <p className="text-xs text-slate-500">Current portfolio</p>
              <p className="text-sm font-semibold text-slate-900">
                {formatTHB(activeProjection.currentPortfolioTotal)}
              </p>
            </div>
            <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
              <p className="text-xs text-slate-500">At retirement age</p>
              <p className="text-sm font-semibold text-slate-900">
                {retirementProjectionContext}
              </p>
            </div>
            <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
              <p className="text-xs text-slate-500">Target reached</p>
              <p className="text-sm font-semibold text-slate-900">{targetReachLabel}</p>
              <p className="text-xs text-slate-500">{targetReachContext}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-600">
          Retirement age has already been reached, so no forward trajectory is shown.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        {projectedFV !== null && (
          <div className="rounded-md bg-gray-50 p-3">
            <p className="text-xs text-gray-500 mb-0.5">Projected at age {settings.retirementAge}</p>
            <p className="font-semibold text-gray-900">{formatTHB(projectedFV)}</p>
          </div>
        )}

        <div className="rounded-md bg-gray-50 p-3">
          <p className="text-xs text-gray-500 mb-0.5">Target</p>
          <p className="font-semibold text-gray-900">
            {formatTHB(settings.retirementTargetAmount)}
          </p>
        </div>

        <div className="rounded-md bg-gray-50 p-3">
          <p className="text-xs text-gray-500 mb-0.5">Target reached at</p>
          <p className="font-semibold text-gray-900">
            {activeProjection.targetReachDate
              ? formatDate(activeProjection.targetReachDate)
              : `Not by age ${settings.retirementAge}`}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {activeProjection.targetReachAge !== null
              ? `Around age ${activeProjection.targetReachAge.toFixed(1)}`
              : 'Projection stays below target in the current timeframe'}
          </p>
        </div>

        <div className="rounded-md bg-gray-50 p-3">
          <p className="text-xs text-gray-500 mb-0.5">Remaining gap</p>
          <p
            className={cn(
              'font-semibold',
              isGoalMet ? 'text-green-600' : gap > 0 ? 'text-red-600' : 'text-green-600'
            )}
          >
            {isGoalMet
              ? `Surplus: ${formatTHB(activeProjection.surplusAmount ?? 0)}`
              : formatTHB(gap)}
          </p>
        </div>

        {yearsRemaining !== null && (
          <div className="rounded-md bg-gray-50 p-3">
            <p className="text-xs text-gray-500 mb-0.5">Years remaining</p>
            <p className="font-semibold text-gray-900">{yearsRemaining}</p>
          </div>
        )}
      </div>

      <button onClick={onConfigureClick} className="text-xs text-blue-600 hover:underline">
        Edit settings
      </button>

      <RetirementSimulationModal
        isOpen={isSimulationOpen}
        onClose={() => setIsSimulationOpen(false)}
        defaults={simulationDefaults}
      />
    </div>
  );
}
