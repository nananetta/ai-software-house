import * as React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useSimulateRetirement } from '../../hooks/useDashboard';
import { useToast } from '../../components/ui/Toast';
import { formatTHB } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { cn } from '../../utils/cn';
import type {
  RetirementProjection,
  RetirementSimulationRequest,
} from '../../types/index';

const simulationSchema = z
  .object({
    currentAge: z
      .number({ invalid_type_error: 'Required' })
      .int()
      .min(18, 'Must be at least 18')
      .max(100, 'Must be at most 100'),
    retirementAge: z
      .number({ invalid_type_error: 'Required' })
      .int()
      .min(18, 'Must be at least 18')
      .max(100, 'Must be at most 100'),
    retirementTargetAmount: z
      .number({ invalid_type_error: 'Required' })
      .positive('Must be greater than 0'),
    expectedAnnualReturn: z
      .number({ invalid_type_error: 'Required' })
      .min(0, 'Must be 0 or more')
      .max(50, 'Must be 50 or less'),
    expectedAnnualContribution: z
      .number({ invalid_type_error: 'Required' })
      .min(0, 'Must be 0 or more'),
  })
  .refine((data) => data.retirementAge > data.currentAge, {
    message: 'Retirement age must be greater than current age',
    path: ['retirementAge'],
  });

type SimulationFormValues = z.infer<typeof simulationSchema>;

interface RetirementSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaults: RetirementSimulationRequest;
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

function SimulationPreview({ projection }: { projection: RetirementProjection }) {
  const settings = projection.settings;

  if (!settings) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Simulation preview is unavailable until all retirement fields are valid.
      </div>
    );
  }

  const progress = Math.min(projection.progressPercent ?? 0, 100);
  const gap = projection.gap ?? 0;
  const isGoalMet = projection.isTargetReached;
  const yearsRemaining = projection.yearsRemaining;
  const trajectory = projection.trajectory ?? [];
  const hasTrajectory = trajectory.length > 1 && yearsRemaining !== null && yearsRemaining > 0;
  const chartData = trajectory.map((point) => ({
    ...point,
    target: settings.retirementTargetAmount,
  }));

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Live Simulation
          </p>
          <p className="text-sm text-slate-600">
            This preview updates in real time and stays temporary until you apply it.
          </p>
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
          {trajectory[0] ? formatDate(trajectory[0].date) : 'Today'} to age {settings.retirementAge}
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
        <div className="h-[260px]">
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
              {projection.targetReachAge !== null && projection.targetReachValue !== null && (
                <ReferenceDot
                  x={projection.targetReachAge}
                  y={projection.targetReachValue}
                  r={5}
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">
          Retirement age has already been reached, so no forward trajectory is shown.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
          <p className="text-xs text-slate-500">Current portfolio</p>
          <p className="text-sm font-semibold text-slate-900">
            {formatTHB(projection.currentPortfolioTotal)}
          </p>
        </div>
        <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
          <p className="text-xs text-slate-500">At retirement age</p>
          <p className="text-sm font-semibold text-slate-900">
            {projection.projectedFV !== null
              ? formatTHB(projection.projectedFV)
              : 'Projection unavailable'}
          </p>
        </div>
        <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
          <p className="text-xs text-slate-500">Target reached</p>
          <p className="text-sm font-semibold text-slate-900">
            {projection.targetReachDate
              ? formatDate(projection.targetReachDate)
              : `Not by age ${settings.retirementAge}`}
          </p>
          <p className="text-xs text-slate-500">
            {projection.targetReachAge !== null
              ? `Around age ${projection.targetReachAge.toFixed(1)}`
              : 'Projection stays below target'}
          </p>
        </div>
        <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
          <p className="text-xs text-slate-500">Remaining gap</p>
          <p
            className={cn(
              'text-sm font-semibold',
              isGoalMet ? 'text-green-600' : gap > 0 ? 'text-red-600' : 'text-green-600'
            )}
          >
            {isGoalMet
              ? `Surplus: ${formatTHB(projection.surplusAmount ?? 0)}`
              : formatTHB(gap)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function RetirementSimulationModal({
  isOpen,
  onClose,
  defaults,
}: RetirementSimulationModalProps) {
  const simulateMutation = useSimulateRetirement();
  const { toast } = useToast();
  const [previewProjection, setPreviewProjection] = React.useState<RetirementProjection | null>(null);
  const lastRequestId = React.useRef(0);

  const {
    register,
    control,
    trigger,
    getValues,
    reset,
    formState: { errors },
  } = useForm<SimulationFormValues>({
    resolver: zodResolver(simulationSchema),
    defaultValues: defaults,
    mode: 'onChange',
  });

  const watchedValues = useWatch({ control });

  React.useEffect(() => {
    if (isOpen) {
      reset(defaults);
      setPreviewProjection(null);
    }
  }, [defaults, isOpen, reset]);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      const isValid = await trigger();
      if (!isValid) {
        return;
      }

      const requestId = lastRequestId.current + 1;
      lastRequestId.current = requestId;
      const values = getValues();

      simulateMutation.mutate(values, {
        onSuccess: (projection) => {
          if (lastRequestId.current === requestId) {
            setPreviewProjection(projection);
          }
        },
        onError: () => {
          if (lastRequestId.current === requestId) {
            toast.error('Failed to update simulation preview.');
          }
        },
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [getValues, isOpen, simulateMutation, toast, trigger, watchedValues]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Retirement Simulation" size="lg">
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This is a temporary what-if scenario. The graph and summary below update in real time,
          and nothing is saved.
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Current Age</label>
            <Input
              type="number"
              {...register('currentAge', { valueAsNumber: true })}
              className={errors.currentAge ? 'border-red-400' : ''}
            />
            {errors.currentAge && (
              <p className="mt-1 text-xs text-red-600">{errors.currentAge.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Retirement Age</label>
            <Input
              type="number"
              {...register('retirementAge', { valueAsNumber: true })}
              className={errors.retirementAge ? 'border-red-400' : ''}
            />
            {errors.retirementAge && (
              <p className="mt-1 text-xs text-red-600">{errors.retirementAge.message}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Retirement Target Amount (฿)
            </label>
            <Input
              type="number"
              {...register('retirementTargetAmount', { valueAsNumber: true })}
              className={errors.retirementTargetAmount ? 'border-red-400' : ''}
            />
            {errors.retirementTargetAmount && (
              <p className="mt-1 text-xs text-red-600">
                {errors.retirementTargetAmount.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Expected Annual Return (%)
            </label>
            <Input
              type="number"
              step="0.1"
              {...register('expectedAnnualReturn', { valueAsNumber: true })}
              className={errors.expectedAnnualReturn ? 'border-red-400' : ''}
            />
            {errors.expectedAnnualReturn && (
              <p className="mt-1 text-xs text-red-600">{errors.expectedAnnualReturn.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Expected Annual Contribution (฿)
            </label>
            <Input
              type="number"
              {...register('expectedAnnualContribution', { valueAsNumber: true })}
              className={errors.expectedAnnualContribution ? 'border-red-400' : ''}
            />
            {errors.expectedAnnualContribution && (
              <p className="mt-1 text-xs text-red-600">
                {errors.expectedAnnualContribution.message}
              </p>
            )}
          </div>
        </div>

        {simulateMutation.isPending && !previewProjection ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Updating simulation preview…
          </div>
        ) : previewProjection ? (
          <SimulationPreview projection={previewProjection} />
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Enter valid values to preview the retirement trajectory.
          </div>
        )}

      </div>
    </Modal>
  );
}
