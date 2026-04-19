import { Router } from 'express';

import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as dashboardController from '../controllers/dashboardController';
import { simulateRetirementSchema } from '../schemas/dashboardSchema';

export const dashboardRouter = Router();

// All dashboard routes require authentication
dashboardRouter.use(authMiddleware);

// GET /api/dashboard
dashboardRouter.get('/', dashboardController.getSummary);

// GET /api/dashboard/allocation
dashboardRouter.get('/allocation', dashboardController.getAllocation);

// GET /api/dashboard/retirement
dashboardRouter.get('/retirement', dashboardController.getRetirement);

// POST /api/dashboard/retirement/simulate
dashboardRouter.post(
  '/retirement/simulate',
  validate(simulateRetirementSchema),
  dashboardController.simulateRetirement
);
