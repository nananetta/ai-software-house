import { prisma } from '../prisma/client';
import { AppError } from '../middleware/errorHandler';
import { hashPassword, verifyPassword, invalidateAllRefreshTokens } from './authService';
import { UserDto, UserFinancialSettingsDto } from '../types';
import { UpdateProfileInput, UpdateFinancialSettingsInput } from '../schemas/settingsSchema';

// =============================================================================
// Get profile
// =============================================================================

export async function getProfile(userId: string): Promise<UserDto> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError(404, 'User not found.');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
  };
}

// =============================================================================
// Update profile (name + optional password change)
// =============================================================================

export async function updateProfile(
  userId: string,
  data: UpdateProfileInput
): Promise<UserDto> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError(404, 'User not found.');
  }

  const updateData: { name?: string; password?: string } = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
  }

  if (data.newPassword !== undefined) {
    // currentPassword is required — enforced by Zod schema, but double-check here
    if (!data.currentPassword) {
      throw new AppError(400, 'currentPassword is required to change password.');
    }

    const isMatch = await verifyPassword(data.currentPassword, user.password);
    if (!isMatch) {
      throw new AppError(403, 'Current password is incorrect.');
    }

    updateData.password = await hashPassword(data.newPassword);

    // Invalidate all refresh tokens on password change (forces re-login everywhere)
    await invalidateAllRefreshTokens(userId);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  return {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    createdAt: updated.createdAt.toISOString(),
  };
}

// =============================================================================
// Get financial settings
// =============================================================================

export async function getFinancialSettings(
  userId: string
): Promise<UserFinancialSettingsDto> {
  const settings = await prisma.userFinancialSettings.findUnique({
    where: { userId },
  });

  if (!settings) {
    // Return null-field record as per API contract
    return {
      id: null,
      userId,
      baseCurrency: 'THB',
      currentAge: null,
      retirementAge: null,
      retirementTargetAmount: null,
      expectedAnnualReturn: null,
      expectedAnnualContribution: null,
      updatedAt: null,
    };
  }

  return {
    id: settings.id,
    userId: settings.userId,
    baseCurrency: settings.baseCurrency,
    currentAge: settings.currentAge,
    retirementAge: settings.retirementAge,
    retirementTargetAmount: settings.retirementTargetAmount,
    expectedAnnualReturn: settings.expectedAnnualReturn,
    expectedAnnualContribution: settings.expectedAnnualContribution,
    updatedAt: settings.updatedAt.toISOString(),
  };
}

// =============================================================================
// Update (upsert) financial settings
// =============================================================================

export async function updateFinancialSettings(
  userId: string,
  data: UpdateFinancialSettingsInput
): Promise<UserFinancialSettingsDto> {
  // If both retirementAge and currentAge are being updated together,
  // validate that retirementAge > currentAge.
  // The Zod schema handles this when both are in the same request.
  // Also validate against the existing stored value when only one is provided.
  if (
    data.retirementAge !== undefined &&
    data.currentAge === undefined
  ) {
    const existing = await prisma.userFinancialSettings.findUnique({
      where: { userId },
    });
    if (existing?.currentAge !== null && existing?.currentAge !== undefined) {
      if (data.retirementAge <= existing.currentAge) {
        throw new AppError(
          400,
          'retirementAge must be greater than currentAge.'
        );
      }
    }
  }

  if (
    data.currentAge !== undefined &&
    data.retirementAge === undefined
  ) {
    const existing = await prisma.userFinancialSettings.findUnique({
      where: { userId },
    });
    if (
      existing?.retirementAge !== null &&
      existing?.retirementAge !== undefined
    ) {
      if (data.currentAge >= existing.retirementAge) {
        throw new AppError(
          400,
          'currentAge must be less than retirementAge.'
        );
      }
    }
  }

  const settings = await prisma.userFinancialSettings.upsert({
    where: { userId },
    update: {
      ...(data.baseCurrency !== undefined && { baseCurrency: data.baseCurrency }),
      ...(data.currentAge !== undefined && { currentAge: data.currentAge }),
      ...(data.retirementAge !== undefined && { retirementAge: data.retirementAge }),
      ...(data.retirementTargetAmount !== undefined && {
        retirementTargetAmount: data.retirementTargetAmount,
      }),
      ...(data.expectedAnnualReturn !== undefined && {
        expectedAnnualReturn: data.expectedAnnualReturn,
      }),
      ...(data.expectedAnnualContribution !== undefined && {
        expectedAnnualContribution: data.expectedAnnualContribution,
      }),
    },
    create: {
      userId,
      baseCurrency: data.baseCurrency ?? 'THB',
      currentAge: data.currentAge ?? null,
      retirementAge: data.retirementAge ?? null,
      retirementTargetAmount: data.retirementTargetAmount ?? null,
      expectedAnnualReturn: data.expectedAnnualReturn ?? null,
      expectedAnnualContribution: data.expectedAnnualContribution ?? null,
    },
  });

  return {
    id: settings.id,
    userId: settings.userId,
    baseCurrency: settings.baseCurrency,
    currentAge: settings.currentAge,
    retirementAge: settings.retirementAge,
    retirementTargetAmount: settings.retirementTargetAmount,
    expectedAnnualReturn: settings.expectedAnnualReturn,
    expectedAnnualContribution: settings.expectedAnnualContribution,
    updatedAt: settings.updatedAt.toISOString(),
  };
}
