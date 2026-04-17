import * as React from 'react';
import { useParams } from 'react-router-dom';
import { useSnapshot } from '../hooks/useSnapshots';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Button } from '../components/ui/Button';
import { formatTHB } from '../utils/formatCurrency';
import { cn } from '../utils/cn';
import { SnapshotHeader } from '../features/snapshots/SnapshotHeader';
import { ItemRow } from '../features/snapshots/ItemRow';
import { AddItemModal } from '../features/snapshots/AddItemModal';
import { ChevronDown, ChevronRight, PlusCircle } from 'lucide-react';
import type { ComparisonItem } from '../types/index';
import { INVESTMENT_TYPE_LABELS } from '../types/index';

function ChangeCell({ amount, percent, isNew }: { amount: number | null; percent: number | null; isNew: boolean }) {
  if (isNew) {
    return (
      <td className="px-3 py-2 text-center">
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
          New
        </span>
      </td>
    );
  }
  if (amount === null || percent === null) {
    return <td className="px-3 py-2 text-center text-gray-400">—</td>;
  }
  const isPos = amount >= 0;
  const colorClass = isPos ? 'text-green-600' : 'text-red-600';
  return (
    <td className={cn('px-3 py-2 text-right tabular-nums', colorClass)}>
      {isPos ? '+' : ''}{formatTHB(amount)}
    </td>
  );
}

function PercentCell({ percent, isNew }: { percent: number | null; isNew: boolean }) {
  if (isNew) return <td className="px-3 py-2 text-gray-400 text-center">—</td>;
  if (percent === null) return <td className="px-3 py-2 text-gray-400 text-center">—</td>;
  const isPos = percent >= 0;
  const colorClass = isPos ? 'text-green-600' : 'text-red-600';
  return (
    <td className={cn('px-3 py-2 text-right tabular-nums', colorClass)}>
      {isPos ? '+' : ''}{percent.toFixed(2)}%
    </td>
  );
}

export default function SnapshotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useSnapshot(id ?? '');
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [closedExpanded, setClosedExpanded] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const handleItemDeleted = React.useCallback(() => {
    setRefreshKey((k) => k + 1);
    void refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <ErrorMessage
          message="Failed to load snapshot."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const { snapshot, items, closedItems } = data;
  const isLocked = snapshot.isLocked;

  const totalCurrent = items.reduce((sum, item) => sum + item.currentBalance, 0);
  const totalChange = items.reduce((sum, item) => sum + (item.amountChange ?? 0), 0);

  return (
    <div className="p-6 max-w-full mx-auto">
      {/* Snapshot Header */}
      <SnapshotHeader snapshot={snapshot} isLocked={isLocked} />

      {/* Ledger */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Investments</h2>
          {!isLocked && (
            <Button size="sm" onClick={() => setShowAddModal(true)} className="gap-1.5">
              <PlusCircle className="h-4 w-4" />
              Add Investment
            </Button>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                <th className="px-3 py-2 w-8">#</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Institution</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2 text-right">Prev. Balance</th>
                <th className="px-3 py-2 text-right">Current Balance</th>
                <th className="px-3 py-2 text-right">Change (฿)</th>
                <th className="px-3 py-2 text-right">Change (%)</th>
                <th className="px-3 py-2">Note</th>
                {!isLocked && <th className="px-3 py-2 w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={isLocked ? 9 : 10}
                    className="px-4 py-10 text-center text-sm text-gray-400"
                  >
                    No investments yet.{' '}
                    {!isLocked && (
                      <button
                        className="text-blue-600 hover:underline"
                        onClick={() => setShowAddModal(true)}
                      >
                        Add one now.
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                items.map((item: ComparisonItem, idx: number) => (
                  <ItemRow
                    key={`${item.id}-${refreshKey}`}
                    item={item}
                    index={idx + 1}
                    snapshotId={snapshot.id}
                    isLocked={isLocked}
                    onDeleted={handleItemDeleted}
                  />
                ))
              )}
            </tbody>
            {/* Sticky total row */}
            {items.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3" colSpan={3}>
                    Total
                  </td>
                  <td className="px-3 py-3 text-right" />
                  <td className="px-3 py-3 text-right tabular-nums text-gray-900">
                    {formatTHB(totalCurrent)}
                  </td>
                  <td
                    className={cn(
                      'px-3 py-3 text-right tabular-nums',
                      totalChange >= 0 ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {totalChange >= 0 ? '+' : ''}{formatTHB(totalChange)}
                  </td>
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3" />
                  {!isLocked && <td className="px-3 py-3" />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Closed / Missing Items */}
      {closedItems.length > 0 && (
        <div className="mt-6">
          <button
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            onClick={() => setClosedExpanded((v) => !v)}
          >
            {closedExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            Closed / Missing Items ({closedItems.length})
          </button>

          {closedExpanded && (
            <div className="mt-3 overflow-x-auto rounded-lg border border-yellow-200 bg-yellow-50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-yellow-200 text-xs font-medium text-yellow-700 uppercase tracking-wide">
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Institution</th>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-right">Previous Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-yellow-100">
                  {closedItems.map((ci, i) => (
                    <tr key={i} className="text-yellow-800">
                      <td className="px-4 py-2">
                        {INVESTMENT_TYPE_LABELS[ci.investmentType as keyof typeof INVESTMENT_TYPE_LABELS] ?? ci.investmentType}
                      </td>
                      <td className="px-4 py-2">{ci.institution}</td>
                      <td className="px-4 py-2">{ci.investmentName}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatTHB(ci.previousBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Item Modal */}
      {!isLocked && (
        <AddItemModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          snapshotId={snapshot.id}
        />
      )}
    </div>
  );
}
