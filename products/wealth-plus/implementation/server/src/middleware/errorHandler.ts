import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

// =============================================================================
// AppError — typed application error with an HTTP status code
// =============================================================================

export class AppError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    // Restore prototype chain (needed for instanceof checks in transpiled TS)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// =============================================================================
// Global Express error handler
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function globalErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Known application error — return its status and message
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Zod validation errors — should have been handled by validate middleware,
  // but catch here as a safety net
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const path = issue.path.join('.');
      fields[path] = issue.message;
    }
    res.status(400).json({ error: 'Validation failed', fields });
    return;
  }

  // Unknown error — log it and return a generic 500
  console.error('[GlobalErrorHandler] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
}
