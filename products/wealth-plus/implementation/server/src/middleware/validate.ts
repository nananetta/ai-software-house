import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * validate — middleware factory that validates req.body against a Zod schema.
 * On validation failure returns HTTP 400 with { error, fields }.
 * On success, replaces req.body with the parsed (coerced) value and calls next().
 *
 * @param schema - Zod schema to validate against
 */
export function validate<T>(schema: ZodSchema<T>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const fields: Record<string, string> = {};
      for (const issue of (result.error as ZodError).issues) {
        const path = issue.path.join('.');
        // Only set the first error per field path
        if (!fields[path]) {
          fields[path] = issue.message;
        }
      }
      res.status(400).json({ error: 'Validation failed', fields });
      return;
    }

    // Replace body with the safely-parsed / coerced value
    req.body = result.data as Record<string, unknown>;
    next();
  };
}
