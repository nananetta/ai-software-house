import { RetirementDto, RetirementSettingsDto } from '../types';

// =============================================================================
// Retirement Projection Formula (BR-041)
//
//   FV = PV × (1 + r)^n + C × [((1 + r)^n − 1) / r]
//   When r = 0: FV = PV + (C × n)
//
// @param pv  Current portfolio value (present value)
// @param r   Annual return rate as a decimal (e.g. 0.07 for 7%)
// @param n   Years remaining until retirement
// @param c   Annual contribution amount
// =============================================================================

export function calculateRetirementFV(
  pv: number,
  r: number,
  n: number,
  c: number
): number {
  if (n <= 0) {
    // Return present value when no years remaining
    return pv;
  }

  if (r === 0) {
    return pv + c * n;
  }

  const growthFactor = Math.pow(1 + r, n);
  const portfolioFV = pv * growthFactor;
  const contributionFV = c * ((growthFactor - 1) / r);
  return portfolioFV + contributionFV;
}

// =============================================================================
// Build full retirement projection response
// =============================================================================

export function buildRetirementProjection(
  currentPortfolioTotal: number,
  rawSettings: {
    currentAge: number | null;
    retirementAge: number | null;
    retirementTargetAmount: number | null;
    expectedAnnualReturn: number | null;
    expectedAnnualContribution: number | null;
  } | null
): RetirementDto {
  // If settings are not configured or incomplete, return a stub response
  if (
    !rawSettings ||
    rawSettings.currentAge === null ||
    rawSettings.retirementAge === null ||
    rawSettings.retirementTargetAmount === null ||
    rawSettings.expectedAnnualReturn === null
  ) {
    return {
      currentPortfolioTotal,
      settings: null,
      yearsRemaining: null,
      projectedFV: null,
      gap: null,
      progressPercent: null,
      isTargetReached: false,
    };
  }

  const currentAge = rawSettings.currentAge;
  const retirementAge = rawSettings.retirementAge;
  const target = rawSettings.retirementTargetAmount;
  const annualReturnPct = rawSettings.expectedAnnualReturn;
  const annualContribution = rawSettings.expectedAnnualContribution ?? 0;

  const n = retirementAge - currentAge;
  const r = annualReturnPct / 100;
  const c = annualContribution;

  const settings: RetirementSettingsDto = {
    currentAge,
    retirementAge,
    retirementTargetAmount: target,
    expectedAnnualReturn: annualReturnPct,
    expectedAnnualContribution: annualContribution,
  };

  // progressPercent based on current portfolio vs target (BR-043)
  const progressPercent =
    target > 0
      ? Math.round((currentPortfolioTotal / target) * 1000) / 10
      : null;

  const gap = target - currentPortfolioTotal;
  const isTargetReached = gap <= 0;

  // If retirement age already reached, suppress projection formula (BR-044)
  if (n <= 0) {
    return {
      currentPortfolioTotal,
      settings,
      yearsRemaining: n,
      projectedFV: null,
      gap,
      progressPercent,
      isTargetReached,
      ...(isTargetReached ? { surplusAmount: Math.abs(gap) } : {}),
    };
  }

  const rawFV = calculateRetirementFV(currentPortfolioTotal, r, n, c);
  const projectedFV = Math.round(rawFV * 100) / 100;

  return {
    currentPortfolioTotal,
    settings,
    yearsRemaining: n,
    projectedFV,
    gap,
    progressPercent,
    isTargetReached,
    ...(isTargetReached ? { surplusAmount: Math.abs(gap) } : {}),
  };
}
