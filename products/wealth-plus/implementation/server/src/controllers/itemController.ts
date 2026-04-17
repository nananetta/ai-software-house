import { Request, Response, NextFunction } from 'express';

import { AppError } from '../middleware/errorHandler';
import * as itemService from '../services/itemService';
import { CreateItemInput, UpdateItemInput } from '../schemas/itemSchema';

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
// POST /api/snapshots/:id/items
// =============================================================================

export const create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { id: snapshotId } = req.params as { id: string };

  if (!snapshotId) {
    throw new AppError(400, 'Snapshot ID is required.');
  }

  const body = req.body as CreateItemInput;
  const { item, hasDuplicateWarning } = await itemService.addItem(snapshotId, userId, body);

  res.status(201).json({ item, hasDuplicateWarning });
});

// =============================================================================
// PUT /api/snapshots/:id/items/:itemId
// =============================================================================

export const update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { id: snapshotId, itemId } = req.params as { id: string; itemId: string };

  if (!snapshotId) {
    throw new AppError(400, 'Snapshot ID is required.');
  }

  if (!itemId) {
    throw new AppError(400, 'Item ID is required.');
  }

  const body = req.body as UpdateItemInput;
  const { item, hasDuplicateWarning } = await itemService.updateItem(
    snapshotId,
    itemId,
    userId,
    body
  );

  res.status(200).json({ item, hasDuplicateWarning });
});

// =============================================================================
// DELETE /api/snapshots/:id/items/:itemId
// =============================================================================

export const remove = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { id: snapshotId, itemId } = req.params as { id: string; itemId: string };

  if (!snapshotId) {
    throw new AppError(400, 'Snapshot ID is required.');
  }

  if (!itemId) {
    throw new AppError(400, 'Item ID is required.');
  }

  await itemService.deleteItem(snapshotId, itemId, userId);
  res.status(204).send();
});
