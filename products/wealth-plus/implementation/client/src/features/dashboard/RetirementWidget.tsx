import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { formatTHB } from '../../utils/formatCurrency';
import { cn } from '../../utils/cn';
import type { RetirementProjection } from '../../types/index';
import { Target } from 'lucide-react';

interface RetirementWidgetProps {
  data: RetirementProjection | null;
  onConfigureClick: () => void;
}

export function RetirementWidget({ data, onConfigureClick }: RetirementWidgetProps) {
  const navigate = useNavigate();

  // Not configured or no settings
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

  const progress = Math.min(data!.progressPercent!, 100);
  const gap = data!.gap ?? 0;
  const isGoalMet = data!.isTargetReached;
  const yearsRemaining = data!.yearsRemaining;
  const projectedFV = data!.projectedFV;
  const settings = data!.settings!;

  return (
    <div className="space-y-4">
      {/* Progress text */}
      <div>
        <p className="text-sm text-gray-600">
          You are at{' '}
          <span className={cn('font-bold', isGoalMet ? 'text-green-600' : 'text-blue-600')}>
            {progress.toFixed(1)}%
          </span>{' '}
          of your retirement target
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isGoalMet ? 'bg-green-500' : 'bg-blue-500'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {projectedFV !== null && (
          <div className="rounded-md bg-gray-50 p-3">
            <p className="text-xs text-gray-500 mb-0.5">
              Projected at age {settings.retirementAge}
            </p>
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
          <p className="text-xs text-gray-500 mb-0.5">Remaining gap</p>
          <p
            className={cn(
              'font-semibold',
              isGoalMet ? 'text-green-600' : gap > 0 ? 'text-red-600' : 'text-green-600'
            )}
          >
            {isGoalMet
              ? `Surplus: ${formatTHB(data!.surplusAmount ?? 0)}`
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

      <button
        onClick={onConfigureClick}
        className="text-xs text-blue-600 hover:underline"
      >
        Edit settings
      </button>
    </div>
  );
}
