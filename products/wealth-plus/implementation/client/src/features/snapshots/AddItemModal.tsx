import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAddItem } from '../../hooks/useItems';
import { useToast } from '../../components/ui/Toast';
import { INVESTMENT_TYPE_CODES, INVESTMENT_TYPE_LABELS, PRESET_INSTITUTIONS } from '../../types/index';
import type { AddItemFormValues } from '../../types/index';

const schema = z.object({
  investmentType: z.string().min(1, 'Investment type is required'),
  institution: z.string().min(1, 'Institution is required'),
  investmentName: z.string().min(1, 'Investment name is required'),
  currentBalance: z
    .number({ invalid_type_error: 'Balance is required' })
    .min(0, 'Balance must be 0 or more'),
  currency: z.string().default('THB'),
  note: z.string(),
});

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshotId: string;
}

export function AddItemModal({ isOpen, onClose, snapshotId }: AddItemModalProps) {
  const addItemMutation = useAddItem(snapshotId);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddItemFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      investmentType: '',
      institution: '',
      investmentName: '',
      currentBalance: 0,
      currency: 'THB',
      note: '',
    },
  });

  const onSubmit = (values: AddItemFormValues) => {
    addItemMutation.mutate(
      {
        investmentType: values.investmentType,
        institution: values.institution,
        investmentName: values.investmentName,
        currentBalance: values.currentBalance,
        currency: values.currency,
        note: values.note || undefined,
      },
      {
        onSuccess: (data) => {
          if (data.hasDuplicateWarning) {
            toast.success('Investment added — a similar item already exists in this snapshot.');
          } else {
            toast.success('Investment added.');
          }
          reset();
          onClose();
        },
        onError: () => toast.error('Failed to add investment. Please try again.'),
      }
    );
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Investment" size="md">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Investment Type */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Investment Type <span className="text-red-500">*</span>
          </label>
          <select
            {...register('investmentType')}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select type…</option>
            {INVESTMENT_TYPE_CODES.map((code) => (
              <option key={code} value={code}>
                {INVESTMENT_TYPE_LABELS[code]}
              </option>
            ))}
          </select>
          {errors.investmentType && (
            <p className="mt-1 text-xs text-red-600">{errors.investmentType.message}</p>
          )}
        </div>

        {/* Institution */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Institution <span className="text-red-500">*</span>
          </label>
          <input
            list="add-item-institution-list"
            {...register('institution')}
            placeholder="Select or type institution…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <datalist id="add-item-institution-list">
            {PRESET_INSTITUTIONS.map((inst) => (
              <option key={inst} value={inst} />
            ))}
          </datalist>
          {errors.institution && (
            <p className="mt-1 text-xs text-red-600">{errors.institution.message}</p>
          )}
        </div>

        {/* Investment Name */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Investment Name <span className="text-red-500">*</span>
          </label>
          <Input
            {...register('investmentName')}
            placeholder="e.g. KBank Savings, KFSDIV, Gold Bar"
            className={errors.investmentName ? 'border-red-400' : ''}
          />
          {errors.investmentName && (
            <p className="mt-1 text-xs text-red-600">{errors.investmentName.message}</p>
          )}
        </div>

        {/* Current Balance */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Current Balance (฿) <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            {...register('currentBalance', { valueAsNumber: true })}
            className={errors.currentBalance ? 'border-red-400' : ''}
          />
          {errors.currentBalance && (
            <p className="mt-1 text-xs text-red-600">{errors.currentBalance.message}</p>
          )}
        </div>

        {/* Currency hidden */}
        <input type="hidden" {...register('currency')} value="THB" />

        {/* Note */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Note <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            {...register('note')}
            rows={2}
            placeholder="Any notes about this investment…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={addItemMutation.isPending}>
            {addItemMutation.isPending ? 'Adding…' : 'Add Investment'}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose} disabled={addItemMutation.isPending}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
