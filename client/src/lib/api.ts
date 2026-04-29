import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/stores/auth';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as any;
    const status = error.response?.status;

    if (status === 401 && !original._retry && original.url !== '/auth/refresh') {
      original._retry = true;
      const store = useAuthStore.getState();
      const refreshToken = store.refreshToken;
      if (!refreshToken) {
        store.clear();
        return Promise.reject(error);
      }

      refreshing = refreshing ?? refreshAccessToken(refreshToken);
      const newToken = await refreshing;
      refreshing = null;

      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      store.clear();
    }
    return Promise.reject(error);
  },
);

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await axios.post(
      `${import.meta.env.VITE_API_URL ?? '/api'}/auth/refresh`,
      { refreshToken },
    );
    const { tokens, user } = res.data.data;
    useAuthStore.getState().setAuth(user, tokens);
    return tokens.accessToken;
  } catch {
    return null;
  }
}
