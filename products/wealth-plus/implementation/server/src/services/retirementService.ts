import {
  RetirementDto,
  RetirementSettingsDto,
  RetirementTrajectoryPointDto,
} from '../types';

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

function addYears(baseDate: Date, years: number): Date {
  const next = new Date(baseDate);
  next.setUTCFullYear(next.getUTCFullYear() + years);
  return next;
}

function addFractionalYears(baseDate: Date, years: number): Date {
  const wholeYears = Math.floor(years);
  const remainder = years - wholeYears;
  const next = addYears(baseDate, wholeYears);
  if (remainder <= 0) {
    return next;
  }

  const daysInYear = 365.25;
  next.setUTCDate(next.getUTCDate() + Math.round(remainder * daysInYear));
  return next;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundAge(value: number): number {
  return Math.round(value * 10) / 10;
}

function buildTrajectory(
  currentPortfolioTotal: number,
  currentAge: number,
  yearsRemaining: number,
  annualReturn: number,
  annualContribution: number,
  today: Date
): RetirementTrajectoryPointDto[] {
  const trajectory: RetirementTrajectoryPointDto[] = [];

  for (let yearOffset = 0; yearOffset <= yearsRemaining; yearOffset += 1) {
    trajectory.push({
      yearOffset,
      age: currentAge + yearOffset,
      date: addYears(today, yearOffset).toISOString(),
      value: roundCurrency(
        calculateRetirementFV(
          currentPortfolioTotal,
          annualReturn,
          yearOffset,
          annualContribution
        )
      ),
    });
  }

  return trajectory;
}

function buildTargetReach(
  trajectory: RetirementTrajectoryPointDto[],
  target: number,
  currentAge: number,
  today: Date
) {
  const currentPoint = trajectory[0];
  if (!currentPoint) {
    return {
      targetReachAge: null,
      targetReachDate: null,
      targetReachYearOffset: null,
      targetReachValue: null,
      isTargetReachableByRetirement: false,
    };
  }

  if (currentPoint.value >= target) {
    return {
      targetReachAge: roundAge(currentAge),
      targetReachDate: today.toISOString(),
      targetReachYearOffset: 0,
      targetReachValue: currentPoint.value,
      isTargetReachableByRetirement: true,
    };
  }

  for (let index = 1; index < trajectory.length; index += 1) {
    const previousPoint = trajectory[index - 1];
    const currentPoint = trajectory[index];

    if (!previousPoint || !currentPoint) continue;
    if (currentPoint.value < target) continue;

    const delta = currentPoint.value - previousPoint.value;
    const fraction =
      delta <= 0 ? 0 : Math.min(Math.max((target - previousPoint.value) / delta, 0), 1);
    const yearOffset = previousPoint.yearOffset + fraction;

    return {
      targetReachAge: roundAge(currentAge + yearOffset),
      targetReachDate: addFractionalYears(today, yearOffset).toISOString(),
      targetReachYearOffset: roundAge(yearOffset),
      targetReachValue: roundCurrency(target),
      isTargetReachableByRetirement: true,
    };
  }

  return {
    targetReachAge: null,
    targetReachDate: null,
    targetReachYearOffset: null,
    targetReachValue: null,
    isTargetReachableByRetirement: false,
  };
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
  const today = new Date();

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
      trajectory: [],
      targetReachAge: null,
      targetReachDate: null,
      targetReachYearOffset: null,
      targetReachValue: null,
      isTargetReachableByRetirement: false,
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
      trajectory: [
        {
          yearOffset: 0,
          age: currentAge,
          date: today.toISOString(),
          value: roundCurrency(currentPortfolioTotal),
        },
      ],
      targetReachAge: isTargetReached ? roundAge(currentAge) : null,
      targetReachDate: isTargetReached ? today.toISOString() : null,
      targetReachYearOffset: isTargetReached ? 0 : null,
      targetReachValue: isTargetReached ? roundCurrency(target) : null,
      isTargetReachableByRetirement: isTargetReached,
      ...(isTargetReached ? { surplusAmount: Math.abs(gap) } : {}),
    };
  }

  const rawFV = calculateRetirementFV(currentPortfolioTotal, r, n, c);
  const projectedFV = roundCurrency(rawFV);
  const trajectory = buildTrajectory(currentPortfolioTotal, currentAge, n, r, c, today);
  const targetReach = buildTargetReach(trajectory, target, currentAge, today);

  return {
    currentPortfolioTotal,
    settings,
    yearsRemaining: n,
    projectedFV,
    gap,
    progressPercent,
    isTargetReached,
    trajectory,
    ...targetReach,
    ...(isTargetReached ? { surplusAmount: Math.abs(gap) } : {}),
  };
}
