import { useNavigate, Link } from 'react-router-dom';
import { useSnapshots } from '../hooks/useSnapshots';
import { formatTHB } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Badge } from '../components/ui/Badge';
import { cn } from '../utils/cn';
import { PlusCircle, Camera, Upload } from 'lucide-react';
import * as React from 'react';
import { ImportSnapshotModal } from '../features/snapshots/ImportSnapshotModal';

export default function SnapshotListPage() {
  const navigate = useNavigate();
  const { data: snapshots, isLoading, isError, refetch } = useSnapshots();
  const [showImportModal, setShowImportModal] = React.useState(false);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Snapshots</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowImportModal(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={() => navigate('/snapshots/new')} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            New Snapshot
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {isError && (
        <ErrorMessage
          message="Failed to load snapshots."
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && !isError && snapshots && snapshots.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Camera className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No snapshots yet.</p>
          <p className="text-sm text-gray-400 mt-1">Create your first snapshot to get started.</p>
          <Button onClick={() => navigate('/snapshots/new')} className="mt-4 gap-2">
            <PlusCircle className="h-4 w-4" />
            Create Snapshot
          </Button>
        </div>
      )}

      {!isLoading && !isError && snapshots && snapshots.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Total (฿)</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Change vs Prior</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {snapshots.map((snap) => {
                const hasChange = snap.changeAmount !== null && snap.changePercent !== null;
                const isPositive = (snap.changeAmount ?? 0) >= 0;

                return (
                  <tr
                    key={snap.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/snapshots/${snap.id}`)}
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/snapshots/${snap.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {snap.snapshotName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(snap.snapshotDate)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatTHB(snap.total)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {hasChange ? (
                        <div className={cn('flex flex-col items-end', isPositive ? 'text-green-600' : 'text-red-600')}>
                          <span>
                            {isPositive ? '+' : ''}
                            {formatTHB(snap.changeAmount!)}
                          </span>
                          <span className="text-xs">
                            ({isPositive ? '+' : ''}
                            {snap.changePercent!.toFixed(2)}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {snap.isLocked ? (
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                          Locked
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          Active
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ImportSnapshotModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} />
    </div>
  );
}
