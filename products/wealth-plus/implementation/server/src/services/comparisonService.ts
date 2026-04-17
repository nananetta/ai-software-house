import { prisma } from '../prisma/client';
import { SnapshotDetailDto, SnapshotItemDto, ClosedItemDto } from '../types';

// =============================================================================
// Comparison Key
// =============================================================================

/**
 * Builds a case-insensitive match key from an item.
 * Format: investmentType|institution|investmentName (all lowercased)
 */
function makeMatchKey(item: {
  investmentType: string;
  institution: string;
  investmentName: string;
}): string {
  return (
    item.investmentType.toLowerCase() +
    '|' +
    item.institution.toLowerCase() +
    '|' +
    item.investmentName.toLowerCase()
  );
}

// =============================================================================
// Main comparison engine
// =============================================================================

/**
 * Given a snapshot (with items already loaded), finds the prior snapshot
 * for the same user and computes comparison fields for each item.
 *
 * Returns a fully-formed SnapshotDetailDto.
 */
export async function buildComparisonData(
  currentSnapshot: {
    id: string;
    userId: string;
    snapshotName: string;
    snapshotDate: Date;
    notes: string | null;
    isLocked: boolean;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
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
    }>;
  },
  userId: string
): Promise<SnapshotDetailDto> {
  // Step 1: Find prior snapshot (strictly earlier date, then latest createdAt as tiebreak)
  const priorSnapshot = await prisma.snapshot.findFirst({
    where: {
      userId,
      snapshotDate: { lt: currentSnapshot.snapshotDate },
    },
    orderBy: [{ snapshotDate: 'desc' }, { createdAt: 'desc' }],
  });

  const snapshotHeader = {
    id: currentSnapshot.id,
    userId: currentSnapshot.userId,
    snapshotName: currentSnapshot.snapshotName,
    snapshotDate: currentSnapshot.snapshotDate.toISOString(),
    notes: currentSnapshot.notes,
    isLocked: currentSnapshot.isLocked,
    createdAt: currentSnapshot.createdAt.toISOString(),
    updatedAt: currentSnapshot.updatedAt.toISOString(),
  };

  // Step 2: No prior snapshot — all items are "New"
  if (!priorSnapshot) {
    const items: SnapshotItemDto[] = currentSnapshot.items.map((item) => ({
      id: item.id,
      snapshotId: item.snapshotId,
      investmentType: item.investmentType,
      institution: item.institution,
      investmentName: item.investmentName,
      currentBalance: item.currentBalance,
      currency: item.currency,
      note: item.note,
      displayOrder: item.displayOrder,
      previousBalance: null,
      amountChange: null,
      percentChange: null,
      isNew: true,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));

    return {
      snapshot: snapshotHeader,
      items,
      closedItems: [],
      priorSnapshotId: null,
      priorSnapshotDate: null,
    };
  }

  // Step 3: Load prior items
  const priorItems = await prisma.snapshotItem.findMany({
    where: { snapshotId: priorSnapshot.id },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
  });

  // Step 4: Build prior index (first match wins for duplicate keys — BR-015)
  const priorIndex = new Map<string, (typeof priorItems)[number]>();
  for (const priorItem of priorItems) {
    const key = makeMatchKey(priorItem);
    if (!priorIndex.has(key)) {
      priorIndex.set(key, priorItem);
    }
  }

  // Step 5: Process current items
  const matchedPriorKeys = new Set<string>();
  const items: SnapshotItemDto[] = currentSnapshot.items.map((item) => {
    const key = makeMatchKey(item);
    const priorItem = priorIndex.get(key);

    if (priorItem) {
      matchedPriorKeys.add(key);
      const previousBalance = priorItem.currentBalance;
      const amountChange = item.currentBalance - previousBalance;

      let percentChange: number | null;
      if (previousBalance > 0) {
        percentChange = Math.round((amountChange / previousBalance) * 10000) / 100;
      } else if (item.currentBalance > 0) {
        // previousBalance = 0 and currentBalance > 0 → display as "New" in UI
        percentChange = null;
      } else {
        // Both zero
        percentChange = 0;
      }

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
        previousBalance,
        amountChange,
        percentChange,
        isNew: false,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      };
    } else {
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
        previousBalance: null,
        amountChange: null,
        percentChange: null,
        isNew: true,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      };
    }
  });

  // Step 6: Build closed items list (prior items not matched in current snapshot)
  const closedItems: ClosedItemDto[] = [];
  for (const priorItem of priorItems) {
    const key = makeMatchKey(priorItem);
    if (!matchedPriorKeys.has(key)) {
      closedItems.push({
        investmentType: priorItem.investmentType,
        institution: priorItem.institution,
        investmentName: priorItem.investmentName,
        previousBalance: priorItem.currentBalance,
        currency: priorItem.currency,
      });
    }
  }

  return {
    snapshot: snapshotHeader,
    items,
    closedItems,
    priorSnapshotId: priorSnapshot.id,
    priorSnapshotDate: priorSnapshot.snapshotDate.toISOString(),
  };
}
