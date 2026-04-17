import * as React from 'react';
import { Trash2 } from 'lucide-react';
import { useUpdateItem, useDeleteItem } from '../../hooks/useItems';
import { formatTHB } from '../../utils/formatCurrency';
import { cn } from '../../utils/cn';
import { useToast } from '../../components/ui/Toast';
import type { ComparisonItem } from '../../types/index';
import { INVESTMENT_TYPE_LABELS, INVESTMENT_TYPE_CODES, PRESET_INSTITUTIONS } from '../../types/index';

interface ItemRowProps {
  item: ComparisonItem;
  index: number;
  snapshotId: string;
  isLocked: boolean;
  onDeleted: () => void;
}

type EditField =
  | 'investmentType'
  | 'institution'
  | 'investmentName'
  | 'currentBalance'
  | 'note'
  | null;

export function ItemRow({ item, index, snapshotId, isLocked, onDeleted }: ItemRowProps) {
  const [editingField, setEditingField] = React.useState<EditField>(null);
  const [localValues, setLocalValues] = React.useState({
    investmentType: item.investmentType,
    institution: item.institution,
    investmentName: item.investmentName,
    currentBalance: item.currentBalance,
    note: item.note ?? '',
  });
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const updateMutation = useUpdateItem(snapshotId);
  const deleteMutation = useDeleteItem(snapshotId);
  const { toast } = useToast();

  const commitField = (field: keyof typeof localValues) => {
    const payload: Record<string, unknown> = {};
    const val = localValues[field];

    if (field === 'currentBalance') {
      const num = Number(val);
      if (isNaN(num)) {
        setLocalValues((v) => ({ ...v, currentBalance: item.currentBalance }));
        setEditingField(null);
        return;
      }
      payload.currentBalance = num;
    } else if (field === 'note') {
      payload.note = val === '' ? null : val;
    } else {
      payload[field] = val;
    }

    updateMutation.mutate(
      { itemId: item.id, payload },
      {
        onSuccess: () => toast.success('Updated.'),
        onError: () => {
          toast.error('Failed to update item.');
          setLocalValues((v) => ({ ...v, [field]: item[field] ?? '' }));
        },
      }
    );
    setEditingField(null);
  };

  const handleCellClick = (field: EditField) => {
    if (isLocked || !field) return;
    setEditingField(field);
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        toast.success('Investment deleted.');
        onDeleted();
      },
      onError: () => toast.error('Failed to delete item.'),
    });
  };

  const isNew = item.isNew;
  const amountChange = item.amountChange;
  const percentChange = item.percentChange;

  return (
    <tr
      className={cn(
        'transition-colors',
        deleteMutation.isPending ? 'opacity-50' : 'hover:bg-gray-50',
        isNew ? 'bg-blue-50/30' : ''
      )}
    >
      {/* # */}
      <td className="px-3 py-2 text-gray-400 text-xs">{index}</td>

      {/* Investment Type */}
      <td
        className={cn('px-3 py-2', !isLocked && 'cursor-pointer hover:bg-blue-50/50')}
        onClick={() => handleCellClick('investmentType')}
      >
        {editingField === 'investmentType' ? (
          <select
            autoFocus
            value={localValues.investmentType}
            onChange={(e) => setLocalValues((v) => ({ ...v, investmentType: e.target.value }))}
            onBlur={() => commitField('investmentType')}
            className="w-full rounded border border-blue-400 px-1 py-0.5 text-sm focus:outline-none"
          >
            {INVESTMENT_TYPE_CODES.map((code) => (
              <option key={code} value={code}>
                {INVESTMENT_TYPE_LABELS[code]}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-sm">
            {INVESTMENT_TYPE_LABELS[localValues.investmentType as keyof typeof INVESTMENT_TYPE_LABELS] ??
              localValues.investmentType}
          </span>
        )}
      </td>

      {/* Institution */}
      <td
        className={cn('px-3 py-2', !isLocked && 'cursor-pointer hover:bg-blue-50/50')}
        onClick={() => handleCellClick('institution')}
      >
        {editingField === 'institution' ? (
          <InstitutionInput
            value={localValues.institution}
            onChange={(v) => setLocalValues((prev) => ({ ...prev, institution: v }))}
            onCommit={() => commitField('institution')}
          />
        ) : (
          <span className="text-sm">{localValues.institution}</span>
        )}
      </td>

      {/* Investment Name */}
      <td
        className={cn('px-3 py-2', !isLocked && 'cursor-pointer hover:bg-blue-50/50')}
        onClick={() => handleCellClick('investmentName')}
      >
        {editingField === 'investmentName' ? (
          <input
            autoFocus
            value={localValues.investmentName}
            onChange={(e) => setLocalValues((v) => ({ ...v, investmentName: e.target.value }))}
            onBlur={() => commitField('investmentName')}
            onKeyDown={(e) => e.key === 'Enter' && commitField('investmentName')}
            className="w-full rounded border border-blue-400 px-1 py-0.5 text-sm focus:outline-none"
          />
        ) : (
          <span className="text-sm font-medium">{localValues.investmentName}</span>
        )}
      </td>

      {/* Previous Balance — always read-only */}
      <td className="px-3 py-2 text-right text-sm text-gray-500 tabular-nums">
        {isNew ? (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            New
          </span>
        ) : item.previousBalance !== null ? (
          formatTHB(item.previousBalance)
        ) : (
          '—'
        )}
      </td>

      {/* Current Balance */}
      <td
        className={cn('px-3 py-2 text-right', !isLocked && 'cursor-pointer hover:bg-blue-50/50')}
        onClick={() => handleCellClick('currentBalance')}
      >
        {editingField === 'currentBalance' ? (
          <input
            autoFocus
            type="number"
            step="0.01"
            value={localValues.currentBalance}
            onChange={(e) =>
              setLocalValues((v) => ({ ...v, currentBalance: parseFloat(e.target.value) || 0 }))
            }
            onBlur={() => commitField('currentBalance')}
            onKeyDown={(e) => e.key === 'Enter' && commitField('currentBalance')}
            className="w-full rounded border border-blue-400 px-1 py-0.5 text-sm text-right focus:outline-none"
          />
        ) : (
          <span className="text-sm font-medium tabular-nums">
            {formatTHB(localValues.currentBalance)}
          </span>
        )}
      </td>

      {/* Amount Change */}
      <td
        className={cn(
          'px-3 py-2 text-right text-sm tabular-nums',
          isNew
            ? 'text-gray-400'
            : amountChange === null
            ? 'text-gray-400'
            : amountChange >= 0
            ? 'text-green-600'
            : 'text-red-600'
        )}
      >
        {isNew
          ? '—'
          : amountChange !== null
          ? `${amountChange >= 0 ? '+' : ''}${formatTHB(amountChange)}`
          : '—'}
      </td>

      {/* % Change */}
      <td
        className={cn(
          'px-3 py-2 text-right text-sm tabular-nums',
          isNew
            ? 'text-gray-400'
            : percentChange === null
            ? 'text-gray-400'
            : percentChange >= 0
            ? 'text-green-600'
            : 'text-red-600'
        )}
      >
        {isNew
          ? '—'
          : percentChange !== null
          ? `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%`
          : '—'}
      </td>

      {/* Note */}
      <td
        className={cn('px-3 py-2', !isLocked && 'cursor-pointer hover:bg-blue-50/50')}
        onClick={() => handleCellClick('note')}
      >
        {editingField === 'note' ? (
          <input
            autoFocus
            value={localValues.note}
            onChange={(e) => setLocalValues((v) => ({ ...v, note: e.target.value }))}
            onBlur={() => commitField('note')}
            onKeyDown={(e) => e.key === 'Enter' && commitField('note')}
            placeholder="Add note…"
            className="w-full rounded border border-blue-400 px-1 py-0.5 text-sm focus:outline-none"
          />
        ) : (
          <span className="text-sm text-gray-500">
            {localValues.note || <span className="text-gray-300">—</span>}
          </span>
        )}
      </td>

      {/* Actions */}
      {!isLocked && (
        <td className="px-3 py-2">
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="rounded px-1.5 py-0.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? '…' : 'Yes'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded px-1.5 py-0.5 text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-100"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={handleDelete}
              className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              aria-label="Delete investment"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </td>
      )}
    </tr>
  );
}

// ─── Institution inline input with datalist ───────────────────────────────────

function InstitutionInput({
  value,
  onChange,
  onCommit,
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
}) {
  const listId = 'institution-options';
  return (
    <>
      <input
        autoFocus
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => e.key === 'Enter' && onCommit()}
        className="w-full rounded border border-blue-400 px-1 py-0.5 text-sm focus:outline-none"
      />
      <datalist id={listId}>
        {PRESET_INSTITUTIONS.map((inst) => (
          <option key={inst} value={inst} />
        ))}
      </datalist>
    </>
  );
}
