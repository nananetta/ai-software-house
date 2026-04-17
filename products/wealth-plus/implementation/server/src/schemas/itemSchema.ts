import { z } from 'zod';

export const createItemSchema = z.object({
  investmentType: z
    .string({ required_error: 'investmentType is required.' })
    .min(1, 'investmentType must not be empty.'),
  institution: z
    .string({ required_error: 'institution is required.' })
    .min(1, 'institution must not be empty.'),
  investmentName: z
    .string({ required_error: 'investmentName is required.' })
    .min(1, 'investmentName must not be empty.'),
  currentBalance: z
    .number({ required_error: 'currentBalance is required.', invalid_type_error: 'currentBalance must be a number.' })
    .min(0, 'currentBalance must be a non-negative number.'),
  currency: z.string().min(1, 'currency must not be empty.').optional(),
  note: z.string().optional(),
  displayOrder: z.number().int().optional(),
});

export const updateItemSchema = z
  .object({
    investmentType: z.string().min(1, 'investmentType must not be empty.').optional(),
    institution: z.string().min(1, 'institution must not be empty.').optional(),
    investmentName: z.string().min(1, 'investmentName must not be empty.').optional(),
    currentBalance: z
      .number({ invalid_type_error: 'currentBalance must be a number.' })
      .min(0, 'currentBalance must be a non-negative number.')
      .optional(),
    currency: z.string().min(1, 'currency must not be empty.').optional(),
    note: z.string().nullable().optional(),
    displayOrder: z.number().int().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided.' }
  );

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
