import { prisma } from '../prisma/client';
import { AppError } from '../middleware/errorHandler';
import { buildComparisonData } from './comparisonService';
import {
  SnapshotSummaryDto,
  SnapshotHeaderDto,
  SnapshotDetailDto,
} from '../types';

interface CsvImportRow {
  investmentType: string;
  institution: string;
  investmentName: string;
  currentBalance: number;
  currency: string;
  note: string | null;
  displayOrder: number;
}

// =============================================================================
// Helpers
// =============================================================================

function toDateMidnightUTC(dateStr: string): Date {
  // Parse YYYY-MM-DD and store as midnight UTC to avoid timezone drift
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
}

function snapshotToHeaderDto(s: {
  id: string;
  userId: string;
  snapshotName: string;
  snapshotDate: Date;
  notes: string | null;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}): SnapshotHeaderDto {
  return {
    id: s.id,
    userId: s.userId,
    snapshotName: s.snapshotName,
    snapshotDate: s.snapshotDate.toISOString(),
    notes: s.notes,
    isLocked: s.isLocked,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function csvEscape(value: string | number | null): string {
  const stringValue = value === null ? '' : String(value);

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function parseCsv(csvContent: string): string[][] {
  const rows: string[][] = [];
  let currentValue = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < csvContent.length; i += 1) {
    const char = csvContent[i];
    const nextChar = csvContent[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i += 1;
      }
      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = '';
      continue;
    }

    currentValue += char;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((cell) => cell.trim().length > 0));
}

function normalizeImportedType(rawValue: string): string {
  return rawValue.trim().toUpperCase();
}

function parseSnapshotImportRows(csvContent: string): CsvImportRow[] {
  const rows = parseCsv(csvContent.replace(/^\uFEFF/, ''));

  if (rows.length < 2) {
    throw new AppError(400, 'CSV must include a header row and at least one data row.');
  }

  const [headerRow, ...dataRows] = rows;

  if (!headerRow) {
    throw new AppError(400, 'CSV header row is required.');
  }

  const headers = headerRow.map((header) => header.trim());
  const indexMap = new Map(headers.map((header, index) => [header, index]));
  const requiredHeaders = [
    'investmentType',
    'institution',
    'investmentName',
    'currentBalance',
    'currency',
    'note',
    'displayOrder',
  ];

  for (const requiredHeader of requiredHeaders) {
    if (!indexMap.has(requiredHeader)) {
      throw new AppError(400, `CSV is missing required column: ${requiredHeader}`);
    }
  }

  return dataRows.map((row, rowIndex) => {
    const getValue = (header: string): string => row[indexMap.get(header) ?? -1]?.trim() ?? '';
    const investmentType = normalizeImportedType(getValue('investmentType'));
    const institution = getValue('institution');
    const investmentName = getValue('investmentName');
    const currentBalanceRaw = getValue('currentBalance');
    const currency = getValue('currency') || 'THB';
    const note = getValue('note');
    const displayOrderRaw = getValue('displayOrder');
    const currentBalance = Number(currentBalanceRaw);
    const displayOrder = Number(displayOrderRaw);
    const lineNumber = rowIndex + 2;

    if (!investmentType) {
      throw new AppError(400, `CSV row ${lineNumber}: investmentType is required.`);
    }
    if (!institution) {
      throw new AppError(400, `CSV row ${lineNumber}: institution is required.`);
    }
    if (!investmentName) {
      throw new AppError(400, `CSV row ${lineNumber}: investmentName is required.`);
    }
    if (!Number.isFinite(currentBalance) || currentBalance < 0) {
      throw new AppError(400, `CSV row ${lineNumber}: currentBalance must be a non-negative number.`);
    }
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      throw new AppError(400, `CSV row ${lineNumber}: displayOrder must be a non-negative integer.`);
    }

    return {
      investmentType,
      institution,
      investmentName,
      currentBalance,
      currency,
      note: note || null,
      displayOrder,
    };
  });
}

function buildSnapshotCsv(snapshot: {
  items: Array<{
    investmentType: string;
    institution: string;
    investmentName: string;
    currentBalance: number;
    currency: string;
    note: string | null;
    displayOrder: number;
  }>;
}): string {
  const header = [
    'investmentType',
    'institution',
    'investmentName',
    'currentBalance',
    'currency',
    'note',
    'displayOrder',
  ];

  const lines = [
    header.join(','),
    ...snapshot.items.map((item) =>
      [
        item.investmentType,
        item.institution,
        item.investmentName,
        item.currentBalance,
        item.currency,
        item.note,
        item.displayOrder,
      ]
        .map(csvEscape)
        .join(',')
    ),
  ];

  return lines.join('\n');
}

function toFileSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// =============================================================================
// List snapshots — with computed totals and change vs prior
// =============================================================================

export async function listSnapshots(userId: string): Promise<SnapshotSummaryDto[]> {
  // Fetch all snapshots for the user ordered by date desc, createdAt desc
  const snapshots = await prisma.snapshot.findMany({
    where: { userId },
    orderBy: [{ snapshotDate: 'desc' }, { createdAt: 'desc' }],
    include: {
      items: { select: { currentBalance: true } },
    },
  });

  if (snapshots.length === 0) {
    return [];
  }

  // Compute totals for each snapshot
  const snapshotsWithTotals = snapshots.map((s) => ({
    ...s,
    total: s.items.reduce((sum, item) => sum + item.currentBalance, 0),
  }));

  // Build a map from snapshot id to total for prior snapshot lookups
  const result: SnapshotSummaryDto[] = [];

  for (let i = 0; i < snapshotsWithTotals.length; i++) {
    const current = snapshotsWithTotals[i];
    if (!current) continue;

    // Find the immediately prior snapshot (first one with an earlier date)
    let previousTotal: number | null = null;
    let changeAmount: number | null = null;
    let changePercent: number | null = null;

    for (let j = i + 1; j < snapshotsWithTotals.length; j++) {
      const candidate = snapshotsWithTotals[j];
      if (!candidate) continue;
      if (candidate.snapshotDate < current.snapshotDate) {
        previousTotal = candidate.total;
        changeAmount = current.total - previousTotal;
        if (previousTotal > 0) {
          changePercent = Math.round((changeAmount / previousTotal) * 10000) / 100;
        } else {
          changePercent = null;
        }
        break;
      }
    }

    result.push({
      id: current.id,
      snapshotName: current.snapshotName,
      snapshotDate: current.snapshotDate.toISOString(),
      notes: current.notes,
      isLocked: current.isLocked,
      total: current.total,
      previousTotal,
      changeAmount,
      changePercent,
      createdAt: current.createdAt.toISOString(),
      updatedAt: current.updatedAt.toISOString(),
    });
  }

  return result;
}

// =============================================================================
// Create snapshot
// =============================================================================

export async function createSnapshot(
  userId: string,
  snapshotName: string,
  snapshotDate: string,
  notes?: string
): Promise<SnapshotHeaderDto> {
  const snapshot = await prisma.snapshot.create({
    data: {
      userId,
      snapshotName,
      snapshotDate: toDateMidnightUTC(snapshotDate),
      notes: notes ?? null,
      isLocked: false,
    },
  });

  return snapshotToHeaderDto(snapshot);
}

// =============================================================================
// Get snapshot with comparison data
// =============================================================================

export async function getSnapshot(
  snapshotId: string,
  userId: string
): Promise<SnapshotDetailDto> {
  const snapshot = await prisma.snapshot.findUnique({
    where: { id: snapshotId },
    include: {
      items: {
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });

  if (!snapshot) {
    throw new AppError(404, 'Snapshot not found.');
  }

  if (snapshot.userId !== userId) {
    throw new AppError(403, 'Access denied.');
  }

  return buildComparisonData(snapshot, userId);
}

export async function exportSnapshotToCsv(
  snapshotId: string,
  userId: string
): Promise<{ fileName: string; csvContent: string }> {
  const snapshot = await prisma.snapshot.findUnique({
    where: { id: snapshotId },
    include: {
      items: {
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });

  if (!snapshot) {
    throw new AppError(404, 'Snapshot not found.');
  }

  if (snapshot.userId !== userId) {
    throw new AppError(403, 'Access denied.');
  }

  const fileName = `${toFileSlug(snapshot.snapshotName) || 'snapshot'}-${snapshot.snapshotDate
    .toISOString()
    .slice(0, 10)}.csv`;

  return {
    fileName,
    csvContent: buildSnapshotCsv(snapshot),
  };
}

// =============================================================================
// Update snapshot header
// =============================================================================

export async function updateSnapshot(
  snapshotId: string,
  userId: string,
  data: {
    snapshotName?: string;
    snapshotDate?: string;
    notes?: string | null;
  }
): Promise<SnapshotHeaderDto> {
  const existing = await prisma.snapshot.findUnique({
    where: { id: snapshotId },
  });

  if (!existing) {
    throw new AppError(404, 'Snapshot not found.');
  }

  if (existing.userId !== userId) {
    throw new AppError(403, 'Access denied.');
  }

  if (existing.isLocked) {
    throw new AppError(403, 'Snapshot is locked and cannot be modified.');
  }

  const updated = await prisma.snapshot.update({
    where: { id: snapshotId },
    data: {
      ...(data.snapshotName !== undefined && { snapshotName: data.snapshotName }),
      ...(data.snapshotDate !== undefined && {
        snapshotDate: toDateMidnightUTC(data.snapshotDate),
      }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });

  return snapshotToHeaderDto(updated);
}

// =============================================================================
// Delete snapshot (cascade handled by DB)
// =============================================================================

export async function deleteSnapshot(
  snapshotId: string,
  userId: string
): Promise<void> {
  const existing = await prisma.snapshot.findUnique({
    where: { id: snapshotId },
  });

  if (!existing) {
    throw new AppError(404, 'Snapshot not found.');
  }

  if (existing.userId !== userId) {
    throw new AppError(403, 'Access denied.');
  }

  await prisma.snapshot.delete({ where: { id: snapshotId } });
}

// =============================================================================
// Duplicate snapshot — copies items from the most recent snapshot by date
// =============================================================================

export async function duplicateSnapshot(
  userId: string,
  snapshotName: string,
  snapshotDate: string,
  notes?: string
): Promise<{ snapshotId: string; sourceSnapshotId: string }> {
  // Find the source: most recent snapshot by date (tiebreak: createdAt desc)
  const source = await prisma.snapshot.findFirst({
    where: { userId },
    orderBy: [{ snapshotDate: 'desc' }, { createdAt: 'desc' }],
    include: {
      items: { orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }] },
    },
  });

  if (!source) {
    throw new AppError(404, 'No snapshots found to duplicate from.');
  }

  // Create new snapshot + copy all items in a transaction
  const newDate = toDateMidnightUTC(snapshotDate);

  const newSnapshot = await prisma.$transaction(async (tx) => {
    const created = await tx.snapshot.create({
      data: {
        userId,
        snapshotName,
        snapshotDate: newDate,
        notes: notes ?? null,
        isLocked: false,
      },
    });

    if (source.items.length > 0) {
      await tx.snapshotItem.createMany({
        data: source.items.map((item) => ({
          snapshotId: created.id,
          investmentType: item.investmentType,
          institution: item.institution,
          investmentName: item.investmentName,
          currentBalance: item.currentBalance,
          currency: item.currency,
          note: item.note,
          displayOrder: item.displayOrder,
        })),
      });
    }

    return created;
  });

  return { snapshotId: newSnapshot.id, sourceSnapshotId: source.id };
}

export async function importSnapshotFromCsv(
  userId: string,
  snapshotName: string,
  snapshotDate: string,
  csvContent: string,
  notes?: string
): Promise<SnapshotDetailDto> {
  const rows = parseSnapshotImportRows(csvContent);

  const snapshot = await prisma.$transaction(async (tx) => {
    const created = await tx.snapshot.create({
      data: {
        userId,
        snapshotName,
        snapshotDate: toDateMidnightUTC(snapshotDate),
        notes: notes ?? null,
        isLocked: false,
      },
    });

    if (rows.length > 0) {
      await tx.snapshotItem.createMany({
        data: rows.map((row) => ({
          snapshotId: created.id,
          investmentType: row.investmentType,
          institution: row.institution,
          investmentName: row.investmentName,
          currentBalance: row.currentBalance,
          currency: row.currency,
          note: row.note,
          displayOrder: row.displayOrder,
        })),
      });
    }

    return created;
  });

  return getSnapshot(snapshot.id, userId);
}

// =============================================================================
// Lock snapshot
// =============================================================================

export async function lockSnapshot(
  snapshotId: string,
  userId: string
): Promise<SnapshotHeaderDto> {
  const existing = await prisma.snapshot.findUnique({
    where: { id: snapshotId },
  });

  if (!existing) {
    throw new AppError(404, 'Snapshot not found.');
  }

  if (existing.userId !== userId) {
    throw new AppError(403, 'Access denied.');
  }

  const updated = await prisma.snapshot.update({
    where: { id: snapshotId },
    data: { isLocked: true },
  });

  return snapshotToHeaderDto(updated);
}

// =============================================================================
// Unlock snapshot
// =============================================================================

export async function unlockSnapshot(
  snapshotId: string,
  userId: string
): Promise<SnapshotHeaderDto> {
  const existing = await prisma.snapshot.findUnique({
    where: { id: snapshotId },
  });

  if (!existing) {
    throw new AppError(404, 'Snapshot not found.');
  }

  if (existing.userId !== userId) {
    throw new AppError(403, 'Access denied.');
  }

  const updated = await prisma.snapshot.update({
    where: { id: snapshotId },
    data: { isLocked: false },
  });

  return snapshotToHeaderDto(updated);
}
