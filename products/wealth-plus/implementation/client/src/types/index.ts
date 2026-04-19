// ─── Investment Type Constants ───────────────────────────────────────────────

export const INVESTMENT_TYPE_CODES = [
  'CASH_DEPOSIT',
  'THAI_EQUITY',
  'FOREIGN_EQUITY',
  'THAI_FIXED_INCOME',
  'FOREIGN_FIXED_INCOME',
  'MUTUAL_FUND',
  'GOLD',
  'REAL_ESTATE',
  'ALTERNATIVE',
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
  ALTERNATIVE: 'สินทรัพย์ทางเลือก',
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

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

// ─── Financial Settings ───────────────────────────────────────────────────────

export interface UserFinancialSettings {
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

// ─── Snapshot ─────────────────────────────────────────────────────────────────

export interface Snapshot {
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

// ─── Snapshot Item ────────────────────────────────────────────────────────────

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
  createdAt: string;
  updatedAt: string;
}

// ─── Comparison Item (item + comparison fields) ───────────────────────────────

export interface ComparisonItem extends SnapshotItem {
  previousBalance: number | null;
  amountChange: number | null;
  percentChange: number | null;
  isNew: boolean;
}

// ─── Closed Item ──────────────────────────────────────────────────────────────

export interface ClosedItem {
  investmentType: string;
  institution: string;
  investmentName: string;
  previousBalance: number;
  currency: string;
}

// ─── Snapshot Detail (full response) ─────────────────────────────────────────

export interface SnapshotWithItems {
  id: string;
  userId: string;
  snapshotName: string;
  snapshotDate: string;
  notes: string | null;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SnapshotWithComparison {
  snapshot: SnapshotWithItems;
  items: ComparisonItem[];
  closedItems: ClosedItem[];
  priorSnapshotId: string | null;
  priorSnapshotDate: string | null;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardSummary {
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

// ─── Allocation ───────────────────────────────────────────────────────────────

export interface AllocationData {
  investmentType: string;
  label: string;
  total: number;
  percent: number;
}

export interface DashboardAllocation {
  snapshotId: string;
  snapshotName: string;
  total: number;
  allocation: AllocationData[];
}

// ─── Retirement ───────────────────────────────────────────────────────────────

export interface RetirementProjection {
  currentPortfolioTotal: number;
  settings: {
    currentAge: number;
    retirementAge: number;
    retirementTargetAmount: number;
    expectedAnnualReturn: number;
    expectedAnnualContribution: number;
  } | null;
  yearsRemaining: number | null;
  projectedFV: number | null;
  gap: number | null;
  progressPercent: number | null;
  isTargetReached: boolean;
  trajectory: Array<{
    yearOffset: number;
    age: number;
    date: string;
    value: number;
  }>;
  targetReachAge: number | null;
  targetReachDate: string | null;
  targetReachYearOffset: number | null;
  targetReachValue: number | null;
  isTargetReachableByRetirement: boolean;
  surplusAmount?: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

// ─── Form Types ───────────────────────────────────────────────────────────────

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface CreateSnapshotFormValues {
  snapshotName: string;
  snapshotDate: string;
  notes: string;
  mode: 'blank' | 'duplicate';
}

export interface UpdateSnapshotFormValues {
  snapshotName: string;
  snapshotDate: string;
  notes: string;
}

export interface AddItemFormValues {
  investmentType: string;
  institution: string;
  investmentName: string;
  currentBalance: number;
  currency: string;
  note: string;
}

export interface UpdateItemFormValues {
  investmentType?: string;
  institution?: string;
  investmentName?: string;
  currentBalance?: number;
  currency?: string;
  note?: string | null;
  displayOrder?: number;
}

export interface FinancialSettingsFormValues {
  currentAge: number;
  retirementAge: number;
  retirementTargetAmount: number;
  expectedAnnualReturn: number;
  expectedAnnualContribution: number;
}

export interface RetirementSimulationRequest {
  currentAge: number;
  retirementAge: number;
  retirementTargetAmount: number;
  expectedAnnualReturn: number;
  expectedAnnualContribution: number;
}

export interface ChangePasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateProfileFormValues {
  name: string;
}

// ─── API Request types ────────────────────────────────────────────────────────

export interface CreateSnapshotRequest {
  snapshotName: string;
  snapshotDate: string;
  notes?: string;
}

export interface ImportSnapshotRequest extends CreateSnapshotRequest {
  csvContent: string;
}

export interface UpdateSnapshotRequest {
  snapshotName?: string;
  snapshotDate?: string;
  notes?: string | null;
}

export interface CreateItemRequest {
  investmentType: string;
  institution: string;
  investmentName: string;
  currentBalance: number;
  currency?: string;
  note?: string;
  displayOrder?: number;
}

export interface UpdateItemRequest {
  investmentType?: string;
  institution?: string;
  investmentName?: string;
  currentBalance?: number;
  currency?: string;
  note?: string | null;
  displayOrder?: number;
}

export interface UpdateProfileRequest {
  name?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface UpdateFinancialSettingsRequest {
  baseCurrency?: string;
  currentAge?: number;
  retirementAge?: number;
  retirementTargetAmount?: number;
  expectedAnnualReturn?: number;
  expectedAnnualContribution?: number;
}

// ─── API Error ────────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  fields?: Record<string, string>;
}
