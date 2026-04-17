import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth';
import { useAuthStore } from '../store/authStore';
import type { LoginRequest } from '../types/index';
import { setAuthFailureCallback } from '../api/client';

export function useLoginMutation() {
  const loginStore = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (credentials: LoginRequest) => authApi.login(credentials),
    onSuccess: (data) => {
      loginStore(
        {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          createdAt: '',
        },
        data.accessToken
      );
      navigate('/dashboard');
    },
  });
}

export function useLogoutMutation() {
  const logoutStore = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      logoutStore();
      navigate('/login');
    },
  });
}

export function useAuthBootstrap() {
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const logout = useAuthStore((s) => s.logout);
  const markAuthResolved = useAuthStore((s) => s.markAuthResolved);

  useEffect(() => {
    let isMounted = true;

    setAuthFailureCallback(() => {
      if (!isMounted) {
        return;
      }

      logout();
    });

    void (async () => {
      try {
        const { accessToken } = await authApi.refreshToken();
        const user = await authApi.getMe();

        if (!isMounted) {
          return;
        }

        restoreSession(user, accessToken);
      } catch {
        if (!isMounted) {
          return;
        }

        markAuthResolved();
      }
    })();

    return () => {
      isMounted = false;
      setAuthFailureCallback(() => undefined);
    };
  }, [logout, markAuthResolved, restoreSession]);
}
