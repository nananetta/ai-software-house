import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

// Module-level token store (in-memory, never persisted)
let accessToken: string | null = null;
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];
let onAuthFailure: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAuthFailureCallback(callback: () => void): void {
  onAuthFailure = callback;
}

const BASE_URL =
  (import.meta.env['VITE_API_BASE_URL'] as string | undefined) ??
  '/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: inject access token
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers['Authorization'] = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor: silent refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Queue concurrent 401s until refresh completes
        return new Promise<unknown>((resolve) => {
          refreshQueue.push((token: string) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const { data } = await axios.post<{ accessToken: string }>(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newToken = data.accessToken;
        setAccessToken(newToken);

        // Drain the queue
        refreshQueue.forEach((cb) => cb(newToken));
        refreshQueue = [];

        // Retry original request
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch {
        // Refresh failed — clear auth and redirect
        setAccessToken(null);
        refreshQueue = [];
        if (onAuthFailure) {
          onAuthFailure();
        } else {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
