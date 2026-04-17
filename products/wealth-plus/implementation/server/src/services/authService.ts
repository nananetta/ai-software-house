import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { prisma } from '../prisma/client';
import { AppError } from '../middleware/errorHandler';
import { JwtPayload } from '../types';

const BCRYPT_COST_FACTOR = 12;

// =============================================================================
// Helpers
// =============================================================================

function signAccessToken(payload: { sub: string; email: string; name: string }): string {
  const secret = process.env['JWT_SECRET'];
  const expiresIn = process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m';

  if (!secret) {
    throw new AppError(500, 'JWT_SECRET is not configured.');
  }

  return jwt.sign(
    { sub: payload.sub, email: payload.email, name: payload.name },
    secret,
    { expiresIn } as jwt.SignOptions
  );
}

function generateRawRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function refreshTokenExpiryDate(): Date {
  // Default 7 days if env not set
  const days = 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

// =============================================================================
// Login
// =============================================================================

export async function login(
  email: string,
  password: string
): Promise<{ accessToken: string; rawRefreshToken: string; user: { id: string; email: string; name: string } }> {
  // Find user — use generic error to avoid leaking whether email exists
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(401, 'Invalid email or password.');
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    throw new AppError(401, 'Invalid email or password.');
  }

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    name: user.name,
  });

  const rawRefreshToken = generateRawRefreshToken();
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = refreshTokenExpiryDate();

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  return {
    accessToken,
    rawRefreshToken,
    user: { id: user.id, email: user.email, name: user.name },
  };
}

// =============================================================================
// Refresh
// =============================================================================

export async function refresh(
  rawRefreshToken: string
): Promise<{ accessToken: string }> {
  const tokenHash = hashToken(rawRefreshToken);

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored) {
    throw new AppError(401, 'Refresh token not found or already invalidated.');
  }

  if (stored.expiresAt < new Date()) {
    // Clean up expired token
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    throw new AppError(401, 'Refresh token has expired. Please log in again.');
  }

  const accessToken = signAccessToken({
    sub: stored.user.id,
    email: stored.user.email,
    name: stored.user.name,
  });

  return { accessToken };
}

// =============================================================================
// Logout
// =============================================================================

export async function logout(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) {
    // No cookie present — still a "successful" logout from client perspective
    return;
  }

  const tokenHash = hashToken(rawRefreshToken);

  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}

// =============================================================================
// Invalidate all refresh tokens for a user (called on password change)
// =============================================================================

export async function invalidateAllRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

// =============================================================================
// Password utilities (used by meService)
// =============================================================================

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_COST_FACTOR);
}

export async function verifyPassword(
  plaintext: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

// =============================================================================
// Verify JWT (used by auth middleware — also exported for testing)
// =============================================================================

export function verifyAccessToken(token: string): JwtPayload {
  const secret = process.env['JWT_SECRET'];
  if (!secret) {
    throw new AppError(500, 'JWT_SECRET is not configured.');
  }
  return jwt.verify(token, secret) as JwtPayload;
}
