import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useSnapshots, useCreateSnapshot, useDuplicateSnapshot } from '../hooks/useSnapshots';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { toInputDate } from '../utils/formatDate';
import type { CreateSnapshotFormValues } from '../types/index';

const today = new Date().toISOString().split('T')[0]!;

const schema = z.object({
  snapshotName: z.string().min(1, 'Name is required'),
  snapshotDate: z.string().min(1, 'Date is required'),
  notes: z.string(),
  mode: z.enum(['blank', 'duplicate']),
});

export default function CreateSnapshotPage() {
  const navigate = useNavigate();
  const { data: snapshots } = useSnapshots();
  const createMutation = useCreateSnapshot();
  const duplicateMutation = useDuplicateSnapshot();

  const hasPrior = snapshots && snapshots.length > 0;
  const latestSnapshot = hasPrior ? snapshots[0] : null;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateSnapshotFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      snapshotName: '',
      snapshotDate: today,
      notes: '',
      mode: hasPrior ? 'duplicate' : 'blank',
    },
  });

  const mode = watch('mode');

  const onSubmit = (values: CreateSnapshotFormValues) => {
    const payload = {
      snapshotName: values.snapshotName,
      snapshotDate: values.snapshotDate,
      notes: values.notes || undefined,
    };

    if (values.mode === 'duplicate' && latestSnapshot) {
      duplicateMutation.mutate({ id: latestSnapshot.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || duplicateMutation.isPending;

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Snapshot</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Snapshot Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Name */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Snapshot Name <span className="text-red-500">*</span>
              </label>
              <Input
                {...register('snapshotName')}
                placeholder="e.g. April 2026"
                className={errors.snapshotName ? 'border-red-400' : ''}
              />
              {errors.snapshotName && (
                <p className="mt-1 text-xs text-red-600">{errors.snapshotName.message}</p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Snapshot Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                {...register('snapshotDate')}
                className={errors.snapshotDate ? 'border-red-400' : ''}
              />
              {errors.snapshotDate && (
                <p className="mt-1 text-xs text-red-600">{errors.snapshotDate.message}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                placeholder="Any notes about this snapshot…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>

            {/* Mode */}
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">Starting point</p>
              <div className="space-y-2">
                {hasPrior && (
                  <label className="flex items-start gap-3 rounded-md border border-gray-200 p-3 cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      value="duplicate"
                      {...register('mode')}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">Duplicate from latest snapshot</p>
                      {latestSnapshot && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Copy all items from "{latestSnapshot.snapshotName}" ({toInputDate(latestSnapshot.snapshotDate)})
                        </p>
                      )}
                    </div>
                  </label>
                )}
                <label className="flex items-start gap-3 rounded-md border border-gray-200 p-3 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    value="blank"
                    {...register('mode')}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Blank snapshot</p>
                    <p className="text-xs text-gray-400 mt-0.5">Start with an empty ledger</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? mode === 'duplicate'
                    ? 'Duplicating…'
                    : 'Creating…'
                  : 'Create Snapshot'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/snapshots')}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
