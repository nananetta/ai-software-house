import { Router } from 'express';

import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateProfileSchema, updateFinancialSettingsSchema } from '../schemas/settingsSchema';
import * as meController from '../controllers/meController';

export const meRouter = Router();

// All /api/me routes require authentication
meRouter.use(authMiddleware);

// GET /api/me
meRouter.get('/', meController.getProfile);

// PUT /api/me
meRouter.put('/', validate(updateProfileSchema), meController.updateProfile);

// GET /api/me/financial-settings
meRouter.get('/financial-settings', meController.getFinancialSettings);

// PUT /api/me/financial-settings
meRouter.put(
  '/financial-settings',
  validate(updateFinancialSettingsSchema),
  meController.updateFinancialSettings
);
