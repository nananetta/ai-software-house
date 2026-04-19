import { prisma } from '../prisma/client';
import { AppError } from '../middleware/errorHandler';
import {
  DashboardSummaryDto,
  DashboardAllocationDto,
  AllocationItemDto,
  INVESTMENT_TYPE_LABELS,
  InvestmentTypeCode,
  INVESTMENT_TYPE_CODES,
} from '../types';
import { buildRetirementProjection } from './retirementService';
import { SimulateRetirementInput } from '../schemas/dashboardSchema';

// =============================================================================
// Helper — resolve the target snapshot (latest or specified)
// =============================================================================

async function resolveSnapshot(userId: string, snapshotId?: string) {
  if (snapshotId) {
    const snapshot = await prisma.snapshot.findUnique({
      where: { id: snapshotId },
      include: { items: true },
    });

    if (!snapshot) {
      throw new AppError(404, 'Snapshot not found.');
    }

    if (snapshot.userId !== userId) {
      throw new AppError(403, 'Access denied.');
    }

    return snapshot;
  }

  // Default: latest by snapshotDate
  return prisma.snapshot.findFirst({
    where: { userId },
    orderBy: [{ snapshotDate: 'desc' }, { createdAt: 'desc' }],
    include: { items: true },
  });
}

async function getLatestPortfolioTotal(userId: string): Promise<number> {
  const latestSnapshot = await prisma.snapshot.findFirst({
    where: { userId },
    orderBy: [{ snapshotDate: 'desc' }, { createdAt: 'desc' }],
    include: { items: { select: { currentBalance: true } } },
  });

  return latestSnapshot
    ? latestSnapshot.items.reduce((sum, item) => sum + item.currentBalance, 0)
    : 0;
}

// =============================================================================
// Dashboard Summary
// =============================================================================

export async function getDashboardSummary(
  userId: string,
  snapshotId?: string
): Promise<DashboardSummaryDto> {
  const current = await resolveSnapshot(userId, snapshotId);

  // No snapshots at all
  if (!current) {
    return {
      snapshotId: null,
      snapshotName: null,
      snapshotDate: null,
      isLocked: false,
      totalCurrent: 0,
      totalPrevious: null,
      changeAmount: null,
      changePercent: null,
      recentSnapshots: [],
    };
  }

  const totalCurrent = current.items.reduce(
    (sum, item) => sum + item.currentBalance,
    0
  );

  // Find prior snapshot
  const prior = await prisma.snapshot.findFirst({
    where: {
      userId,
      snapshotDate: { lt: current.snapshotDate },
    },
    orderBy: [{ snapshotDate: 'desc' }, { createdAt: 'desc' }],
    include: { items: { select: { currentBalance: true } } },
  });

  let totalPrevious: number | null = null;
  let changeAmount: number | null = null;
  let changePercent: number | null = null;

  if (prior) {
    totalPrevious = prior.items.reduce((sum, item) => sum + item.currentBalance, 0);
    changeAmount = totalCurrent - totalPrevious;
    if (totalPrevious > 0) {
      changePercent = Math.round((changeAmount / totalPrevious) * 10000) / 100;
    }
  }

  // Recent snapshots (up to 5) — BR-039
  const recentRaw = await prisma.snapshot.findMany({
    where: { userId },
    orderBy: [{ snapshotDate: 'desc' }, { createdAt: 'desc' }],
    take: 5,
    include: { items: { select: { currentBalance: true } } },
  });

  const recentSnapshots = recentRaw.map((s) => ({
    id: s.id,
    snapshotName: s.snapshotName,
    snapshotDate: s.snapshotDate.toISOString(),
    total: s.items.reduce((sum, item) => sum + item.currentBalance, 0),
    isLocked: s.isLocked,
  }));

  return {
    snapshotId: current.id,
    snapshotName: current.snapshotName,
    snapshotDate: current.snapshotDate.toISOString(),
    isLocked: current.isLocked,
    totalCurrent,
    totalPrevious,
    changeAmount,
    changePercent,
    recentSnapshots,
  };
}

// =============================================================================
// Allocation Breakdown
// =============================================================================

export async function getDashboardAllocation(
  userId: string,
  snapshotId?: string
): Promise<DashboardAllocationDto> {
  const snapshot = await resolveSnapshot(userId, snapshotId);

  if (!snapshot) {
    return {
      snapshotId: null,
      snapshotName: null,
      total: 0,
      allocation: [],
    };
  }

  const total = snapshot.items.reduce((sum, item) => sum + item.currentBalance, 0);

  // Group by investmentType
  const typeMap = new Map<string, number>();
  for (const item of snapshot.items) {
    const existing = typeMap.get(item.investmentType) ?? 0;
    typeMap.set(item.investmentType, existing + item.currentBalance);
  }

  // Build allocation array (exclude zero totals — BR-036)
  const allocation: AllocationItemDto[] = [];
  for (const [investmentType, typeTotal] of typeMap.entries()) {
    if (typeTotal <= 0) continue;

    // Look up Thai label — fall back to the code itself for custom types
    const label =
      INVESTMENT_TYPE_CODES.includes(investmentType as InvestmentTypeCode)
        ? INVESTMENT_TYPE_LABELS[investmentType as InvestmentTypeCode]
        : investmentType;

    const percent = total > 0 ? Math.round((typeTotal / total) * 10000) / 100 : 0;

    allocation.push({ investmentType, label, total: typeTotal, percent });
  }

  // Sort by total descending
  allocation.sort((a, b) => b.total - a.total);

  return {
    snapshotId: snapshot.id,
    snapshotName: snapshot.snapshotName,
    total,
    allocation,
  };
}

// =============================================================================
// Retirement Projection
// =============================================================================

export async function getDashboardRetirement(userId: string) {
  const currentPortfolioTotal = await getLatestPortfolioTotal(userId);

  const settings = await prisma.userFinancialSettings.findUnique({
    where: { userId },
  });

  return buildRetirementProjection(currentPortfolioTotal, settings ?? null);
}

export async function simulateDashboardRetirement(
  userId: string,
  overrides: SimulateRetirementInput
) {
  const currentPortfolioTotal = await getLatestPortfolioTotal(userId);

  return buildRetirementProjection(currentPortfolioTotal, {
    currentAge: overrides.currentAge,
    retirementAge: overrides.retirementAge,
    retirementTargetAmount: overrides.retirementTargetAmount,
    expectedAnnualReturn: overrides.expectedAnnualReturn,
    expectedAnnualContribution: overrides.expectedAnnualContribution,
  });
}
