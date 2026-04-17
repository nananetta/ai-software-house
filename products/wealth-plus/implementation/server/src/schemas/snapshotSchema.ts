import { z } from 'zod';

// Validates a YYYY-MM-DD date string
const isoDateString = z
  .string({ required_error: 'snapshotDate is required.' })
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'snapshotDate must be a valid ISO 8601 date (YYYY-MM-DD).'
  )
  .refine(
    (val) => {
      const d = new Date(val);
      return !isNaN(d.getTime());
    },
    { message: 'snapshotDate must be a valid calendar date.' }
  );

export const createSnapshotSchema = z.object({
  snapshotName: z
    .string({ required_error: 'snapshotName is required.' })
    .min(1, 'snapshotName must not be empty.'),
  snapshotDate: isoDateString,
  notes: z.string().optional(),
});

export const updateSnapshotSchema = z
  .object({
    snapshotName: z.string().min(1, 'snapshotName must not be empty.').optional(),
    snapshotDate: isoDateString.optional(),
    notes: z.string().nullable().optional(),
  })
  .refine(
    (data) =>
      data.snapshotName !== undefined ||
      data.snapshotDate !== undefined ||
      data.notes !== undefined,
    { message: 'At least one field must be provided.' }
  );

export const duplicateSnapshotSchema = z.object({
  snapshotName: z
    .string({ required_error: 'snapshotName is required.' })
    .min(1, 'snapshotName must not be empty.'),
  snapshotDate: isoDateString,
  notes: z.string().optional(),
});

export const importSnapshotSchema = z.object({
  snapshotName: z
    .string({ required_error: 'snapshotName is required.' })
    .min(1, 'snapshotName must not be empty.'),
  snapshotDate: isoDateString,
  notes: z.string().optional(),
  csvContent: z
    .string({ required_error: 'csvContent is required.' })
    .min(1, 'csvContent must not be empty.'),
});

export type CreateSnapshotInput = z.infer<typeof createSnapshotSchema>;
export type UpdateSnapshotInput = z.infer<typeof updateSnapshotSchema>;
export type DuplicateSnapshotInput = z.infer<typeof duplicateSnapshotSchema>;
export type ImportSnapshotInput = z.infer<typeof importSnapshotSchema>;
