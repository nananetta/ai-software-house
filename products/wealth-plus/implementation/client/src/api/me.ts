import { apiClient } from './client';
import type {
  User,
  UserFinancialSettings,
  UpdateProfileRequest,
  UpdateFinancialSettingsRequest,
} from '../types/index';

export async function getProfile(): Promise<User> {
  const { data } = await apiClient.get<User>('/me');
  return data;
}

export async function updateProfile(payload: UpdateProfileRequest): Promise<User> {
  const { data } = await apiClient.put<User>('/me', payload);
  return data;
}

export async function getFinancialSettings(): Promise<UserFinancialSettings> {
  const { data } = await apiClient.get<UserFinancialSettings>('/me/financial-settings');
  return data;
}

export async function updateFinancialSettings(
  payload: UpdateFinancialSettingsRequest
): Promise<UserFinancialSettings> {
  const { data } = await apiClient.put<UserFinancialSettings>('/me/financial-settings', payload);
  return data;
}
