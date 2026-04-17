import { prisma } from '../prisma/client';
import { AppError } from '../middleware/errorHandler';
import { CreateItemInput, UpdateItemInput } from '../schemas/itemSchema';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Verifies the parent snapshot exists, belongs to the user, and is not locked.
 * Returns the snapshot record.
 */
async function requireUnlockedSnapshot(snapshotId: string, userId: string) {
  const snapshot = await prisma.snapshot.findUnique({
    where: { id: snapshotId },
  });

  if (!snapshot) {
    throw new AppError(404, 'Snapshot not found.');
  }

  if (snapshot.userId !== userId) {
    throw new AppError(403, 'Access denied.');
  }

  if (snapshot.isLocked) {
    throw new AppError(403, 'Snapshot is locked. Unlock it before editing items.');
  }

  return snapshot;
}

/**
 * Checks whether a duplicate (same investmentType + institution + investmentName,
 * case-insensitive) already exists in the snapshot.
 */
async function hasDuplicate(
  snapshotId: string,
  investmentType: string,
  institution: string,
  investmentName: string,
  excludeItemId?: string
): Promise<boolean> {
  const items = await prisma.snapshotItem.findMany({
    where: { snapshotId },
    select: {
      id: true,
      investmentType: true,
      institution: true,
      investmentName: true,
    },
  });

  const targetKey =
    investmentType.toLowerCase() +
    '|' +
    institution.toLowerCase() +
    '|' +
    investmentName.toLowerCase();

  return items.some((item) => {
    if (excludeItemId && item.id === excludeItemId) return false;
    const key =
      item.investmentType.toLowerCase() +
      '|' +
      item.institution.toLowerCase() +
      '|' +
      item.investmentName.toLowerCase();
    return key === targetKey;
  });
}

// =============================================================================
// Add item
// =============================================================================

export async function addItem(
  snapshotId: string,
  userId: string,
  data: CreateItemInput
): Promise<{ item: ReturnType<typeof serializeItem>; hasDuplicateWarning: boolean }> {
  await requireUnlockedSnapshot(snapshotId, userId);

  const duplicate = await hasDuplicate(
    snapshotId,
    data.investmentType,
    data.institution,
    data.investmentName
  );

  const item = await prisma.snapshotItem.create({
    data: {
      snapshotId,
      investmentType: data.investmentType,
      institution: data.institution,
      investmentName: data.investmentName,
      currentBalance: data.currentBalance,
      currency: data.currency ?? 'THB',
      note: data.note ?? null,
      displayOrder: data.displayOrder ?? 0,
    },
  });

  return { item: serializeItem(item), hasDuplicateWarning: duplicate };
}

// =============================================================================
// Update item
// =============================================================================

export async function updateItem(
  snapshotId: string,
  itemId: string,
  userId: string,
  data: UpdateItemInput
): Promise<{ item: ReturnType<typeof serializeItem>; hasDuplicateWarning: boolean }> {
  await requireUnlockedSnapshot(snapshotId, userId);

  const existing = await prisma.snapshotItem.findFirst({
    where: { id: itemId, snapshotId },
  });

  if (!existing) {
    throw new AppError(404, 'Item not found or does not belong to this snapshot.');
  }

  // Merge new values with existing for duplicate check
  const mergedType = data.investmentType ?? existing.investmentType;
  const mergedInstitution = data.institution ?? existing.institution;
  const mergedName = data.investmentName ?? existing.investmentName;

  const duplicate = await hasDuplicate(
    snapshotId,
    mergedType,
    mergedInstitution,
    mergedName,
    itemId
  );

  const updated = await prisma.snapshotItem.update({
    where: { id: itemId },
    data: {
      ...(data.investmentType !== undefined && { investmentType: data.investmentType }),
      ...(data.institution !== undefined && { institution: data.institution }),
      ...(data.investmentName !== undefined && { investmentName: data.investmentName }),
      ...(data.currentBalance !== undefined && { currentBalance: data.currentBalance }),
      ...(data.currency !== undefined && { currency: data.currency }),
      ...(data.note !== undefined && { note: data.note }),
      ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
    },
  });

  return { item: serializeItem(updated), hasDuplicateWarning: duplicate };
}

// =============================================================================
// Delete item
// =============================================================================

export async function deleteItem(
  snapshotId: string,
  itemId: string,
  userId: string
): Promise<void> {
  await requireUnlockedSnapshot(snapshotId, userId);

  const existing = await prisma.snapshotItem.findFirst({
    where: { id: itemId, snapshotId },
  });

  if (!existing) {
    throw new AppError(404, 'Item not found or does not belong to this snapshot.');
  }

  await prisma.snapshotItem.delete({ where: { id: itemId } });
}

// =============================================================================
// Serializer
// =============================================================================

function serializeItem(item: {
  id: string;
  snapshotId: string;
  investmentType: string;
  institution: string;
  investmentName: string;
  currentBalance: number;
  currency: string;
  note: string | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: item.id,
    snapshotId: item.snapshotId,
    investmentType: item.investmentType,
    institution: item.institution,
    investmentName: item.investmentName,
    currentBalance: item.currentBalance,
    currency: item.currency,
    note: item.note,
    displayOrder: item.displayOrder,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}
