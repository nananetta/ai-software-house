import { Request, Response, NextFunction } from 'express';

import { AppError } from '../middleware/errorHandler';
import * as authService from '../services/authService';

// =============================================================================
// Cookie configuration
// =============================================================================

const REFRESH_TOKEN_COOKIE = 'refreshToken';
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env['NODE_ENV'] === 'production',
    maxAge: REFRESH_TOKEN_MAX_AGE,
    path: '/',
  });
}

function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env['NODE_ENV'] === 'production',
    path: '/',
  });
}

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
// POST /api/auth/login
// =============================================================================

export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string };

  const { accessToken, rawRefreshToken, user } = await authService.login(email, password);

  setRefreshTokenCookie(res, rawRefreshToken);

  res.status(200).json({ accessToken, user });
});

// =============================================================================
// POST /api/auth/refresh
// =============================================================================

export const refresh = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const rawRefreshToken: string | undefined = req.cookies?.[REFRESH_TOKEN_COOKIE];

  if (!rawRefreshToken) {
    throw new AppError(401, 'Refresh token is missing.');
  }

  const { accessToken } = await authService.refresh(rawRefreshToken);

  res.status(200).json({ accessToken });
});

// =============================================================================
// POST /api/auth/logout
// =============================================================================

export const logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const rawRefreshToken: string | undefined = req.cookies?.[REFRESH_TOKEN_COOKIE];

  await authService.logout(rawRefreshToken);

  clearRefreshTokenCookie(res);

  res.status(200).json({ message: 'Logged out successfully.' });
});
