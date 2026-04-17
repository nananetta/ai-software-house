import { Request, Response, NextFunction } from 'express';

import * as meService from '../services/meService';
import { UpdateProfileInput, UpdateFinancialSettingsInput } from '../schemas/settingsSchema';

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
// GET /api/me
// =============================================================================

export const getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user.id;
  const profile = await meService.getProfile(userId);
  res.status(200).json(profile);
});

// =============================================================================
// PUT /api/me
// =============================================================================

export const updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user.id;
  const body = req.body as UpdateProfileInput;
  const updated = await meService.updateProfile(userId, body);
  res.status(200).json(updated);
});

// =============================================================================
// GET /api/me/financial-settings
// =============================================================================

export const getFinancialSettings = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user.id;
    const settings = await meService.getFinancialSettings(userId);
    res.status(200).json(settings);
  }
);

// =============================================================================
// PUT /api/me/financial-settings
// =============================================================================

export const updateFinancialSettings = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user.id;
    const body = req.body as UpdateFinancialSettingsInput;
    const updated = await meService.updateFinancialSettings(userId, body);
    res.status(200).json(updated);
  }
);
