import axios, { AxiosHeaders } from 'axios';
import { useAuthStore } from '../stores/authStore';

/**
 * Base URL for the Aponta API. The NestJS backend sets a global `api`
 * prefix (see apps/api/src/main.ts `app.setGlobalPrefix('api')`); the web
 * app is served/proxied from the same origin, so a root-relative path is
 * sufficient and avoids depending on build-time env wiring not yet defined
 * for this project.
 */
export const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState();
  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);
