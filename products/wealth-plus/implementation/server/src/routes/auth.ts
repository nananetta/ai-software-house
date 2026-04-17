import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { loginSchema } from '../schemas/authSchema';
import * as authController from '../controllers/authController';

export const authRouter = Router();

// Rate limiter: 10 requests per 15-minute window per IP (BR-005)
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

// POST /api/auth/login
authRouter.post('/login', loginRateLimiter, validate(loginSchema), authController.login);

// POST /api/auth/refresh
authRouter.post('/refresh', authController.refresh);

// POST /api/auth/logout
authRouter.post('/logout', authMiddleware, authController.logout);
