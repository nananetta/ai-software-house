import { Router } from 'express';

import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createSnapshotSchema,
  updateSnapshotSchema,
  duplicateSnapshotSchema,
  importSnapshotSchema,
} from '../schemas/snapshotSchema';
import { createItemSchema, updateItemSchema } from '../schemas/itemSchema';
import * as snapshotController from '../controllers/snapshotController';
import * as itemController from '../controllers/itemController';

export const snapshotsRouter = Router();

// All snapshot routes require authentication
snapshotsRouter.use(authMiddleware);

// GET /api/snapshots
snapshotsRouter.get('/', snapshotController.list);

// POST /api/snapshots
snapshotsRouter.post('/', validate(createSnapshotSchema), snapshotController.create);

// POST /api/snapshots/import
snapshotsRouter.post('/import', validate(importSnapshotSchema), snapshotController.importCsv);

// GET /api/snapshots/:id
snapshotsRouter.get('/:id', snapshotController.getById);

// GET /api/snapshots/:id/export
snapshotsRouter.get('/:id/export', snapshotController.exportCsv);

// PUT /api/snapshots/:id
snapshotsRouter.put('/:id', validate(updateSnapshotSchema), snapshotController.update);

// DELETE /api/snapshots/:id
snapshotsRouter.delete('/:id', snapshotController.remove);

// POST /api/snapshots/:id/duplicate
snapshotsRouter.post(
  '/:id/duplicate',
  validate(duplicateSnapshotSchema),
  snapshotController.duplicate
);

// POST /api/snapshots/:id/lock
snapshotsRouter.post('/:id/lock', snapshotController.lock);

// POST /api/snapshots/:id/unlock
snapshotsRouter.post('/:id/unlock', snapshotController.unlock);

// POST /api/snapshots/:id/items
snapshotsRouter.post('/:id/items', validate(createItemSchema), itemController.create);

// PUT /api/snapshots/:id/items/:itemId
snapshotsRouter.put(
  '/:id/items/:itemId',
  validate(updateItemSchema),
  itemController.update
);

// DELETE /api/snapshots/:id/items/:itemId
snapshotsRouter.delete('/:id/items/:itemId', itemController.remove);
