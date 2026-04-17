import { Request, Response, NextFunction } from 'express';

import { AppError } from '../middleware/errorHandler';
import * as snapshotService from '../services/snapshotService';
import {
  CreateSnapshotInput,
  UpdateSnapshotInput,
  DuplicateSnapshotInput,
  ImportSnapshotInput,
} from '../schemas/snapshotSchema';

// =============================================================================
// asyncHandler helper
// =============================================================================

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

// =============================================================================
// GET /api/snapshots
// =============================================================================

export const list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user.id;
  const snapshots = await snapshotService.listSnapshots(userId);
  res.status(200).json({ snapshots });
});

// =============================================================================
// POST /api/snapshots
// =============================================================================

export const create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { snapshotName, snapshotDate, notes } = req.body as CreateSnapshotInput;
  const snapshot = await snapshotService.createSnapshot(userId, snapshotName, snapshotDate, notes);
  res.status(201).json({ snapshot });
});

// =============================================================================
// POST /api/snapshots/import
// =============================================================================

export const importCsv = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { snapshotName, snapshotDate, notes, csvContent } = req.body as ImportSnapshotInput;

  const detail = await snapshotService.importSnapshotFromCsv(
    userId,
    snapshotName,
    snapshotDate,
    csvContent,
    notes
  );

  res.status(201).json(detail);
});

// =============================================================================
// GET /api/snapshots/:id
// =============================================================================

export const getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { id } = req.params as { id: string };

  if (!id) {
    throw new AppError(400, 'Snapshot ID is required.');
  }

  const detail = await snapshotService.getSnapshot(id, userId);
  res.status(200).json(detail);
});

// =============================================================================
// GET /api/snapshots/:id/export
// =============================================================================

export const exportCsv = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { id } = req.params as { id: string };

  if (!id) {
    throw new AppError(400, 'Snapshot ID is required.');
  }

  const { fileName, csvContent } = await snapshotService.exportSnapshotToCsv(id, userId);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.status(200).send(`\uFEFF${csvContent}`);
});

// =============================================================================
// PUT /api/snapshots/:id
// =============================================================================

export const update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { id } = req.params as { id: string };

  if (!id) {
    throw new AppError(400, 'Snapshot ID is required.');
  }

  const body = req.body as UpdateSnapshotInput;
  const snapshot = await snapshotService.updateSnapshot(id, userId, body);
  res.status(200).json({ snapshot });
});

// =============================================================================
// DELETE /api/snapshots/:id
// =============================================================================

export const remove = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { id } = req.params as { id: string };

  if (!id) {
    throw new AppError(400, 'Snapshot ID is required.');
  }

  await snapshotService.deleteSnapshot(id, userId);
  res.status(204).send();
});

// =============================================================================
// POST /api/snapshots/:id/duplicate
// =============================================================================

export const duplicate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { snapshotName, snapshotDate, notes } = req.body as DuplicateSnapshotInput;

  const { snapshotId, sourceSnapshotId } = await snapshotService.duplicateSnapshot(
    userId,
    snapshotName,
    snapshotDate,
    notes
  );

  // Fetch the full new snapshot to return with items
  const detail = await snapshotService.getSnapshot(snapshotId, userId);

  res.status(201).json({
    snapshot: detail.snapshot,
    items: detail.items,
    sourceSnapshotId,
  });
});

// =============================================================================
// POST /api/snapshots/:id/lock
// =============================================================================

export const lock = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { id } = req.params as { id: string };

  if (!id) {
    throw new AppError(400, 'Snapshot ID is required.');
  }

  const snapshot = await snapshotService.lockSnapshot(id, userId);
  res.status(200).json({ snapshot });
});

// =============================================================================
// POST /api/snapshots/:id/unlock
// =============================================================================

export const unlock = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { id } = req.params as { id: string };

  if (!id) {
    throw new AppError(400, 'Snapshot ID is required.');
  }

  const snapshot = await snapshotService.unlockSnapshot(id, userId);
  res.status(200).json({ snapshot });
});
