import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useImportSnapshot } from '../../hooks/useSnapshots';
import { useToast } from '../../components/ui/Toast';

const importSchema = z.object({
  snapshotName: z.string().min(1, 'Snapshot name is required'),
  snapshotDate: z.string().min(1, 'Snapshot date is required'),
  notes: z.string(),
});

type ImportFormValues = z.infer<typeof importSchema>;

interface ImportSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportSnapshotModal({ isOpen, onClose }: ImportSnapshotModalProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const importMutation = useImportSnapshot();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ImportFormValues>({
    resolver: zodResolver(importSchema),
    defaultValues: {
      snapshotName: '',
      snapshotDate: new Date().toISOString().slice(0, 10),
      notes: '',
    },
  });

  React.useEffect(() => {
    if (!isOpen) {
      reset({
        snapshotName: '',
        snapshotDate: new Date().toISOString().slice(0, 10),
        notes: '',
      });
      setFile(null);
    }
  }, [isOpen, reset]);

  const onSubmit = async (values: ImportFormValues) => {
    if (!file) {
      toast.error('Please select a CSV file to import.');
      return;
    }

    const csvContent = await file.text();

    importMutation.mutate(
      {
        snapshotName: values.snapshotName,
        snapshotDate: values.snapshotDate,
        notes: values.notes || undefined,
        csvContent,
      },
      {
        onSuccess: () => {
          toast.success('Snapshot imported from CSV.');
          onClose();
        },
        onError: (error) => {
          const message = axios.isAxiosError(error)
            ? (error.response?.data as { error?: string })?.error ?? 'Failed to import CSV.'
            : 'Failed to import CSV.';
          toast.error(message);
        },
      }
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Snapshot From CSV" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="snapshotName" className="mb-1 block text-sm font-medium text-gray-700">
            Snapshot Name
          </label>
          <Input id="snapshotName" {...register('snapshotName')} />
          {errors.snapshotName && (
            <p className="mt-1 text-xs text-red-600">{errors.snapshotName.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="snapshotDate" className="mb-1 block text-sm font-medium text-gray-700">
            Snapshot Date
          </label>
          <Input id="snapshotDate" type="date" {...register('snapshotDate')} />
          {errors.snapshotDate && (
            <p className="mt-1 text-xs text-red-600">{errors.snapshotDate.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            {...register('notes')}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>

        <div>
          <label htmlFor="csvFile" className="mb-1 block text-sm font-medium text-gray-700">
            CSV File
          </label>
          <Input
            id="csvFile"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-xs text-gray-500">
            Use a CSV previously exported from a snapshot.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={importMutation.isPending}>
            {importMutation.isPending ? 'Importing…' : 'Import Snapshot'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
