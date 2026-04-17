import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Lock, Unlock, X, Check, Download } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useLockSnapshot, useUnlockSnapshot, useUpdateSnapshot } from '../../hooks/useSnapshots';
import { useToast } from '../../components/ui/Toast';
import { formatDate, toInputDate } from '../../utils/formatDate';
import type { SnapshotWithItems } from '../../types/index';
import * as snapshotsApi from '../../api/snapshots';

interface SnapshotHeaderProps {
  snapshot: SnapshotWithItems;
  isLocked: boolean;
}

const editSchema = z.object({
  snapshotName: z.string().min(1, 'Name is required'),
  snapshotDate: z.string().min(1, 'Date is required'),
  notes: z.string(),
});

type EditFormValues = z.infer<typeof editSchema>;

export function SnapshotHeader({ snapshot, isLocked }: SnapshotHeaderProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = React.useState(false);
  const { toast } = useToast();

  const lockMutation = useLockSnapshot(snapshot.id);
  const unlockMutation = useUnlockSnapshot(snapshot.id);
  const updateMutation = useUpdateSnapshot(snapshot.id);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      snapshotName: snapshot.snapshotName,
      snapshotDate: toInputDate(snapshot.snapshotDate),
      notes: snapshot.notes ?? '',
    },
  });

  const handleEdit = () => {
    reset({
      snapshotName: snapshot.snapshotName,
      snapshotDate: toInputDate(snapshot.snapshotDate),
      notes: snapshot.notes ?? '',
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => setIsEditing(false);

  const onSubmit = (values: EditFormValues) => {
    updateMutation.mutate(
      {
        snapshotName: values.snapshotName,
        snapshotDate: values.snapshotDate,
        notes: values.notes || null,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
          toast.success('Snapshot updated.');
        },
        onError: () => toast.error('Failed to update snapshot.'),
      }
    );
  };

  const handleLock = () => {
    lockMutation.mutate(undefined, {
      onSuccess: () => toast.success('Snapshot locked.'),
      onError: () => toast.error('Failed to lock snapshot.'),
    });
  };

  const handleUnlock = () => {
    unlockMutation.mutate(undefined, {
      onSuccess: () => {
        setShowUnlockConfirm(false);
        toast.success('Snapshot unlocked.');
      },
      onError: () => toast.error('Failed to unlock snapshot.'),
    });
  };

  const handleExport = async () => {
    try {
      const { blob, fileName } = await snapshotsApi.exportSnapshot(snapshot.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Snapshot exported to CSV.');
    } catch {
      toast.error('Failed to export snapshot.');
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-3">
              <div>
                <Input
                  {...register('snapshotName')}
                  className={`text-xl font-bold ${errors.snapshotName ? 'border-red-400' : ''}`}
                />
                {errors.snapshotName && (
                  <p className="mt-1 text-xs text-red-600">{errors.snapshotName.message}</p>
                )}
              </div>
              <div>
                <Input type="date" {...register('snapshotDate')} />
                {errors.snapshotDate && (
                  <p className="mt-1 text-xs text-red-600">{errors.snapshotDate.message}</p>
                )}
              </div>
              <textarea
                {...register('notes')}
                rows={2}
                placeholder="Notes (optional)…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                <Check className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{snapshot.snapshotName}</h1>
              {isLocked && (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  <Lock className="h-3 w-3 mr-1 inline" />
                  Locked
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">{formatDate(snapshot.snapshotDate)}</p>
            {snapshot.notes && (
              <p className="mt-2 text-sm text-gray-600">{snapshot.notes}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => void handleExport()} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>

            {!isLocked && (
              <Button variant="outline" size="sm" onClick={handleEdit} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}

            {isLocked ? (
              showUnlockConfirm ? (
                <div className="flex items-center gap-2 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2">
                  <span className="text-xs text-yellow-800">Unlock this historical record?</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleUnlock}
                    disabled={unlockMutation.isPending}
                  >
                    {unlockMutation.isPending ? 'Unlocking…' : 'Confirm'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUnlockConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUnlockConfirm(true)}
                  className="gap-1.5"
                >
                  <Unlock className="h-3.5 w-3.5" />
                  Unlock
                </Button>
              )
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLock}
                disabled={lockMutation.isPending}
                className="gap-1.5"
              >
                <Lock className="h-3.5 w-3.5" />
                {lockMutation.isPending ? 'Locking…' : 'Lock'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
