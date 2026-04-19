import { z } from 'zod';

export const simulateRetirementSchema = z
  .object({
    currentAge: z
      .number({ invalid_type_error: 'currentAge must be an integer.' })
      .int('currentAge must be an integer.')
      .min(1, 'currentAge must be at least 1.')
      .max(120, 'currentAge must be at most 120.'),
    retirementAge: z
      .number({ invalid_type_error: 'retirementAge must be an integer.' })
      .int('retirementAge must be an integer.')
      .min(1, 'retirementAge must be at least 1.')
      .max(120, 'retirementAge must be at most 120.'),
    retirementTargetAmount: z
      .number({ invalid_type_error: 'retirementTargetAmount must be a number.' })
      .positive('retirementTargetAmount must be greater than 0.'),
    expectedAnnualReturn: z
      .number({ invalid_type_error: 'expectedAnnualReturn must be a number.' })
      .min(0, 'expectedAnnualReturn must be at least 0.')
      .max(100, 'expectedAnnualReturn must be at most 100.'),
    expectedAnnualContribution: z
      .number({ invalid_type_error: 'expectedAnnualContribution must be a number.' })
      .min(0, 'expectedAnnualContribution must be at least 0.'),
  })
  .refine((data) => data.retirementAge > data.currentAge, {
    message: 'retirementAge must be greater than currentAge.',
    path: ['retirementAge'],
  });

export type SimulateRetirementInput = z.infer<typeof simulateRetirementSchema>;
