import { apiClient } from './client';
import type { DashboardSummary, DashboardAllocation, RetirementProjection } from '../types/index';

export async function getDashboard(snapshotId?: string): Promise<DashboardSummary> {
  const params = snapshotId ? { snapshotId } : {};
  const { data } = await apiClient.get<DashboardSummary>('/dashboard', { params });
  return data;
}

export async function getAllocation(snapshotId?: string): Promise<DashboardAllocation> {
  const params = snapshotId ? { snapshotId } : {};
  const { data } = await apiClient.get<DashboardAllocation>('/dashboard/allocation', { params });
  return data;
}

export async function getRetirement(): Promise<RetirementProjection> {
  const { data } = await apiClient.get<RetirementProjection>('/dashboard/retirement');
  return data;
}
