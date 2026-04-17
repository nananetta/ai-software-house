import { Request, Response, NextFunction } from 'express';

import * as dashboardService from '../services/dashboardService';

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
// GET /api/dashboard
// =============================================================================

export const getSummary = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user.id;
  const snapshotId = req.query['snapshotId'] as string | undefined;

  const summary = await dashboardService.getDashboardSummary(userId, snapshotId);
  res.status(200).json(summary);
});

// =============================================================================
// GET /api/dashboard/allocation
// =============================================================================

export const getAllocation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user.id;
  const snapshotId = req.query['snapshotId'] as string | undefined;

  const allocation = await dashboardService.getDashboardAllocation(userId, snapshotId);
  res.status(200).json(allocation);
});

// =============================================================================
// GET /api/dashboard/retirement
// =============================================================================

export const getRetirement = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user.id;
  const retirement = await dashboardService.getDashboardRetirement(userId);
  res.status(200).json(retirement);
});
