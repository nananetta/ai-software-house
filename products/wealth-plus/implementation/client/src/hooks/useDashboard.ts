import { useQuery } from '@tanstack/react-query';
import * as dashboardApi from '../api/dashboard';

export const DASHBOARD_KEY = ['dashboard'] as const;
export const ALLOCATION_KEY = ['dashboard', 'allocation'] as const;
export const RETIREMENT_KEY = ['dashboard', 'retirement'] as const;

export function useDashboard(snapshotId?: string) {
  return useQuery({
    queryKey: snapshotId ? [...DASHBOARD_KEY, snapshotId] : DASHBOARD_KEY,
    queryFn: () => dashboardApi.getDashboard(snapshotId),
  });
}

export function useAllocation(snapshotId?: string) {
  return useQuery({
    queryKey: snapshotId ? [...ALLOCATION_KEY, snapshotId] : ALLOCATION_KEY,
    queryFn: () => dashboardApi.getAllocation(snapshotId),
  });
}

export function useRetirement() {
  return useQuery({
    queryKey: RETIREMENT_KEY,
    queryFn: dashboardApi.getRetirement,
  });
}
