// =============================================================================
// Investment Type Constants
// =============================================================================

export const INVESTMENT_TYPE_CODES = [
  'CASH_DEPOSIT',
  'THAI_EQUITY',
  'FOREIGN_EQUITY',
  'THAI_FIXED_INCOME',
  'FOREIGN_FIXED_INCOME',
  'MUTUAL_FUND',
  'GOLD',
  'REAL_ESTATE',
  'CASH_ON_HAND',
  'OTHER',
] as const;

export type InvestmentTypeCode = (typeof INVESTMENT_TYPE_CODES)[number];

export const INVESTMENT_TYPE_LABELS: Record<InvestmentTypeCode, string> = {
  CASH_DEPOSIT: 'เงินฝาก',
  THAI_EQUITY: 'หุ้นไทย',
  FOREIGN_EQUITY: 'หุ้นต่างประเทศ',
  THAI_FIXED_INCOME: 'ตราสารหนี้ไทย',
  FOREIGN_FIXED_INCOME: 'ตราสารหนี้ต่างประเทศ',
  MUTUAL_FUND: 'กองทุนรวม',
  GOLD: 'ทองคำ',
  REAL_ESTATE: 'อสังหาริมทรัพย์',
  CASH_ON_HAND: 'เงินสด',
  OTHER: 'อื่นๆ',
};

export const PRESET_INSTITUTIONS = [
  'KBank',
  'SCB',
  'BBL',
  'Krungsri',
  'Krungthai',
  'TMBThanachart (ttb)',
  'UOB',
  'Kasikorn Asset',
  'Bualuang',
  'One Asset',
  'SCBAM',
  'Fidelity',
  'Interactive Brokers',
  'Other',
] as const;

export type PresetInstitution = (typeof PRESET_INSTITUTIONS)[number];

// =============================================================================
// Domain Entities (mirror Prisma models — without Prisma-specific types)
// =============================================================================

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface UserFinancialSettings {
  id: string;
  userId: string;
  baseCurrency: string;
  currentAge: number | null;
  retirementAge: number | null;
  retirementTargetAmount: number | null;
  expectedAnnualReturn: number | null;
  expectedAnnualContribution: number | null;
  updatedAt: Date;
}

export interface Snapshot {
  id: string;
  userId: string;
  snapshotName: string;
  snapshotDate: Date;
  notes: string | null;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SnapshotItem {
  id: string;
  snapshotId: string;
  investmentType: string;
  institution: string;
  investmentName: string;
  currentBalance: number;
  currency: string;
  note: string | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Auth context attached to Express Request
// =============================================================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

// =============================================================================
// Response DTOs
// =============================================================================

export interface UserDto {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface UserFinancialSettingsDto {
  id: string | null;
  userId: string;
  baseCurrency: string;
  currentAge: number | null;
  retirementAge: number | null;
  retirementTargetAmount: number | null;
  expectedAnnualReturn: number | null;
  expectedAnnualContribution: number | null;
  updatedAt: string | null;
}

export interface SnapshotSummaryDto {
  id: string;
  snapshotName: string;
  snapshotDate: string;
  notes: string | null;
  isLocked: boolean;
  total: number;
  previousTotal: number | null;
  changeAmount: number | null;
  changePercent: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SnapshotHeaderDto {
  id: string;
  userId: string;
  snapshotName: string;
  snapshotDate: string;
  notes: string | null;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SnapshotItemDto {
  id: string;
  snapshotId: string;
  investmentType: string;
  institution: string;
  investmentName: string;
  currentBalance: number;
  currency: string;
  note: string | null;
  displayOrder: number;
  previousBalance: number | null;
  amountChange: number | null;
  percentChange: number | null;
  isNew: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClosedItemDto {
  investmentType: string;
  institution: string;
  investmentName: string;
  previousBalance: number;
  currency: string;
}

export interface SnapshotDetailDto {
  snapshot: SnapshotHeaderDto;
  items: SnapshotItemDto[];
  closedItems: ClosedItemDto[];
  priorSnapshotId: string | null;
  priorSnapshotDate: string | null;
}

export interface DashboardSummaryDto {
  snapshotId: string | null;
  snapshotName: string | null;
  snapshotDate: string | null;
  isLocked: boolean;
  totalCurrent: number;
  totalPrevious: number | null;
  changeAmount: number | null;
  changePercent: number | null;
  recentSnapshots: Array<{
    id: string;
    snapshotName: string;
    snapshotDate: string;
    total: number;
    isLocked: boolean;
  }>;
}

export interface AllocationItemDto {
  investmentType: string;
  label: string;
  total: number;
  percent: number;
}

export interface DashboardAllocationDto {
  snapshotId: string | null;
  snapshotName: string | null;
  total: number;
  allocation: AllocationItemDto[];
}

export interface RetirementSettingsDto {
  currentAge: number;
  retirementAge: number;
  retirementTargetAmount: number;
  expectedAnnualReturn: number;
  expectedAnnualContribution: number;
}

export interface RetirementDto {
  currentPortfolioTotal: number;
  settings: RetirementSettingsDto | null;
  yearsRemaining: number | null;
  projectedFV: number | null;
  gap: number | null;
  progressPercent: number | null;
  isTargetReached: boolean;
  surplusAmount?: number;
}

// =============================================================================
// Request Body DTOs
// =============================================================================

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface CreateSnapshotRequestDto {
  snapshotName: string;
  snapshotDate: string;
  notes?: string;
}

export interface UpdateSnapshotRequestDto {
  snapshotName?: string;
  snapshotDate?: string;
  notes?: string | null;
}

export interface CreateItemRequestDto {
  investmentType: string;
  institution: string;
  investmentName: string;
  currentBalance: number;
  currency?: string;
  note?: string;
  displayOrder?: number;
}

export interface UpdateItemRequestDto {
  investmentType?: string;
  institution?: string;
  investmentName?: string;
  currentBalance?: number;
  currency?: string;
  note?: string | null;
  displayOrder?: number;
}

export interface UpdateProfileRequestDto {
  name?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface UpdateFinancialSettingsRequestDto {
  baseCurrency?: string;
  currentAge?: number;
  retirementAge?: number;
  retirementTargetAmount?: number;
  expectedAnnualReturn?: number;
  expectedAnnualContribution?: number;
}

// =============================================================================
// JWT Payload
// =============================================================================

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}
