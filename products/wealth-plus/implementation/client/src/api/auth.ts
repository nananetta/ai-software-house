import { apiClient } from './client';
import type { LoginRequest, LoginResponse, User } from '../types/index';

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', credentials);
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function refreshToken(): Promise<{ accessToken: string }> {
  const { data } = await apiClient.post<{ accessToken: string }>('/auth/refresh');
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>('/me');
  return data;
}
