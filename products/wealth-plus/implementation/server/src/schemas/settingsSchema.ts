import { z } from 'zod';

export const updateProfileSchema = z
  .object({
    name: z.string().min(1, 'name must not be empty.').optional(),
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(8, 'newPassword must be at least 8 characters.')
      .optional(),
  })
  .refine(
    (data) => {
      // If newPassword is provided, currentPassword must also be provided
      if (data.newPassword && !data.currentPassword) {
        return false;
      }
      return true;
    },
    {
      message: 'currentPassword is required when changing password.',
      path: ['currentPassword'],
    }
  )
  .refine(
    (data) => data.name !== undefined || data.newPassword !== undefined,
    { message: 'At least one of name or newPassword must be provided.' }
  );

export const updateFinancialSettingsSchema = z
  .object({
    baseCurrency: z.string().min(1, 'baseCurrency must not be empty.').optional(),
    currentAge: z
      .number({ invalid_type_error: 'currentAge must be an integer.' })
      .int('currentAge must be an integer.')
      .min(1, 'currentAge must be at least 1.')
      .max(120, 'currentAge must be at most 120.')
      .optional(),
    retirementAge: z
      .number({ invalid_type_error: 'retirementAge must be an integer.' })
      .int('retirementAge must be an integer.')
      .min(1, 'retirementAge must be at least 1.')
      .max(120, 'retirementAge must be at most 120.')
      .optional(),
    retirementTargetAmount: z
      .number({ invalid_type_error: 'retirementTargetAmount must be a number.' })
      .positive('retirementTargetAmount must be greater than 0.')
      .optional(),
    expectedAnnualReturn: z
      .number({ invalid_type_error: 'expectedAnnualReturn must be a number.' })
      .positive('expectedAnnualReturn must be greater than 0.')
      .max(100, 'expectedAnnualReturn must be at most 100.')
      .optional(),
    expectedAnnualContribution: z
      .number({ invalid_type_error: 'expectedAnnualContribution must be a number.' })
      .min(0, 'expectedAnnualContribution must be at least 0.')
      .optional(),
  })
  .refine(
    (data) => {
      // If both are provided, retirementAge must be > currentAge
      if (
        data.retirementAge !== undefined &&
        data.currentAge !== undefined &&
        data.retirementAge <= data.currentAge
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'retirementAge must be greater than currentAge.',
      path: ['retirementAge'],
    }
  );

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateFinancialSettingsInput = z.infer<typeof updateFinancialSettingsSchema>;
