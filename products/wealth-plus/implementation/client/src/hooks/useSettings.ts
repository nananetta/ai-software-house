import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as meApi from '../api/me';
import type { UpdateFinancialSettingsRequest, UpdateProfileRequest } from '../types/index';

export const FINANCIAL_SETTINGS_KEY = ['financial-settings'] as const;
export const PROFILE_KEY = ['profile'] as const;

export function useFinancialSettings() {
  return useQuery({
    queryKey: FINANCIAL_SETTINGS_KEY,
    queryFn: meApi.getFinancialSettings,
  });
}

export function useUpdateFinancialSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateFinancialSettingsRequest) =>
      meApi.updateFinancialSettings(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FINANCIAL_SETTINGS_KEY });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'retirement'] });
    },
  });
}

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: meApi.getProfile,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfileRequest) => meApi.updateProfile(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
    },
  });
}
