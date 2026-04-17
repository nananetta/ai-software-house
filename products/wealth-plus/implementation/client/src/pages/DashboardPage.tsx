import * as React from 'react';
import { Link } from 'react-router-dom';
import { useDashboard, useAllocation, useRetirement } from '../hooks/useDashboard';
import { useSnapshots } from '../hooks/useSnapshots';
import { formatTHB } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { AllocationChart } from '../features/dashboard/AllocationChart';
import { InstitutionChart } from '../features/dashboard/InstitutionChart';
import { RetirementWidget } from '../features/dashboard/RetirementWidget';
import { cn } from '../utils/cn';
import { useNavigate } from 'react-router-dom';

function ChangeDisplay({
  amount,
  percent,
}: {
  amount: number | null;
  percent: number | null;
}) {
  if (amount === null || percent === null) return <span className="text-gray-400 text-sm">—</span>;
  const isPositive = amount >= 0;
  const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
  return (
    <span className={cn('text-sm font-medium', colorClass)}>
      {isPositive ? '+' : ''}
      {formatTHB(amount)} ({isPositive ? '+' : ''}
      {percent.toFixed(2)}%)
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border bg-white p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="h-8 bg-gray-200 rounded w-2/3 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
    </div>
  );
}

export default function DashboardPage() {
  const [selectedSnapshotId, setSelectedSnapshotId] = React.useState<string | undefined>(undefined);
  const navigate = useNavigate();

  const snapshotsQuery = useSnapshots();
  const dashboardQuery = useDashboard(selectedSnapshotId);
  const allocationQuery = useAllocation(selectedSnapshotId);
  const retirementQuery = useRetirement();

  const summary = dashboardQuery.data;
  const allocation = allocationQuery.data;
  const retirement = retirementQuery.data;
  const snapshots = snapshotsQuery.data ?? [];

  const isLoading = dashboardQuery.isLoading;
  const isError = dashboardQuery.isError;

  // InstitutionData: derive from allocation items by grouping on institution
  // The API only gives us allocation by type; institution chart uses snapshot items
  // We'll derive institution totals from the allocation data as a proxy
  const institutionData = React.useMemo(() => {
    // Dashboard doesn't expose per-institution data directly; return empty unless allocation has it
    return [] as Array<{ institution: string; total: number }>;
  }, []);

  const recentSnapshots = summary?.recentSnapshots ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

        {/* Snapshot selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="snapshot-select" className="text-sm text-gray-600 shrink-0">
            Viewing snapshot:
          </label>
          <select
            id="snapshot-select"
            value={selectedSnapshotId ?? ''}
            onChange={(e) => setSelectedSnapshotId(e.target.value || undefined)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Latest</option>
            {snapshots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.snapshotName} ({formatDate(s.snapshotDate)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {isError && (
        <ErrorMessage
          message="Failed to load dashboard data."
          onRetry={() => void dashboardQuery.refetch()}
        />
      )}

      {isLoading && (
        <div className="grid gap-4 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {!isLoading && !isError && summary && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* 1. Total Net Worth Card */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-gray-500 font-medium">Total Net Worth</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-gray-900">{formatTHB(summary.totalCurrent)}</p>
              <div className="mt-1 flex items-center gap-2">
                <ChangeDisplay amount={summary.changeAmount} percent={summary.changePercent} />
                {summary.snapshotName && (
                  <span className="text-xs text-gray-400">
                    vs. previous snapshot
                  </span>
                )}
              </div>
              {summary.snapshotName && (
                <p className="mt-1 text-xs text-gray-400">
                  {summary.snapshotName} — {summary.snapshotDate ? formatDate(summary.snapshotDate) : ''}
                </p>
              )}
            </CardContent>
          </Card>

          {/* 2. Allocation Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Asset Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              {allocationQuery.isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : allocation && allocation.allocation.length > 0 ? (
                <AllocationChart data={allocation.allocation} />
              ) : (
                <p className="py-8 text-center text-sm text-gray-400">No allocation data</p>
              )}
            </CardContent>
          </Card>

          {/* 3. Institution Chart placeholder (no direct API) */}
          {institutionData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By Institution</CardTitle>
              </CardHeader>
              <CardContent>
                <InstitutionChart data={institutionData} />
              </CardContent>
            </Card>
          )}

          {/* 4. Retirement Widget */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Retirement Progress</CardTitle>
            </CardHeader>
            <CardContent>
              {retirementQuery.isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : (
                <RetirementWidget
                  data={retirement ?? null}
                  onConfigureClick={() => navigate('/settings')}
                />
              )}
            </CardContent>
          </Card>

          {/* 5. Recent Snapshots */}
          <Card className={institutionData.length > 0 ? '' : 'lg:col-span-1'}>
            <CardHeader>
              <CardTitle className="text-base">Recent Snapshots</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {recentSnapshots.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No snapshots yet.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {recentSnapshots.slice(0, 5).map((snap) => {
                    const full = snapshots.find((s) => s.id === snap.id);
                    const changeAmt = full?.changeAmount ?? null;
                    const changePct = full?.changePercent ?? null;
                    return (
                      <li key={snap.id}>
                        <Link
                          to={`/snapshots/${snap.id}`}
                          className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">{snap.snapshotName}</p>
                            <p className="text-xs text-gray-400">{formatDate(snap.snapshotDate)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">{formatTHB(snap.total)}</p>
                            {changePct !== null && (
                              <p
                                className={cn(
                                  'text-xs',
                                  changePct >= 0 ? 'text-green-600' : 'text-red-600'
                                )}
                              >
                                {changePct >= 0 ? '+' : ''}
                                {changePct.toFixed(2)}%
                              </p>
                            )}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
