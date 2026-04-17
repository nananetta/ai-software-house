import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { AppError } from './errorHandler';
import { AuthenticatedUser, JwtPayload } from '../types';

// Extend Express Request to include our authenticated user
declare global {
  namespace Express {
    interface Request {
      user: AuthenticatedUser;
    }
  }
}

/**
 * authMiddleware — validates the JWT access token from the Authorization header.
 * On success, attaches req.user = { id, email, name }.
 * On failure, throws AppError(401).
 */
export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Authorization token is required.'));
  }

  const token = authHeader.slice(7);
  const secret = process.env['JWT_SECRET'];

  if (!secret) {
    return next(new AppError(500, 'JWT_SECRET is not configured.'));
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;

    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
    };

    next();
  } catch {
    next(new AppError(401, 'Token is invalid or expired.'));
  }
}
