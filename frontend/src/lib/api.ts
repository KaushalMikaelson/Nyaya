import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  withCredentials: true,
});

let accessToken = '';

export const setAccessToken = (token: string) => {
  accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('nyaya_access_token', token);
    } else {
      localStorage.removeItem('nyaya_access_token');
    }
  }
};

export const getAccessToken = () => {
  if (accessToken) return accessToken;
  // Fallback: read from localStorage if in-memory token not yet set (race condition)
  if (typeof window !== 'undefined') {
    return localStorage.getItem('nyaya_access_token') || '';
  }
  return '';
};

/**
 * Returns a guaranteed-valid access token.
 * If the stored token is missing, expired, or within 60s of expiry,
 * it silently calls /auth/refresh (via the httpOnly cookie) to get a fresh one.
 */
export const getValidAccessToken = async (): Promise<string> => {
  const token = getAccessToken();

  // Check expiry by decoding the JWT payload (no signature verification needed client-side)
  if (token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      const expiresAt = payload.exp * 1000; // convert to ms
      const now = Date.now();
      const bufferMs = 60 * 1000; // refresh if within 60s of expiry

      if (expiresAt - now > bufferMs) {
        // Token is still valid and not close to expiry
        return token;
      }
    } catch {
      // Malformed token — fall through to refresh
    }
  }

  // Token is missing, expired, or expiring soon — refresh silently
  try {
    const { data } = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/refresh`,
      {},
      { withCredentials: true }
    );
    if (data.accessToken) {
      setAccessToken(data.accessToken);
      return data.accessToken;
    }
  } catch {
    // Refresh failed — return whatever we have (will result in a 401 that the interceptor handles)
  }

  return token;
};

// Request interceptor to add the access token
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh handling
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/auth/refresh'
    ) {
      if (isRefreshing) {
        try {
          const token = await new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          });
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        } catch (err) {
          return Promise.reject(err);
        }
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        setAccessToken(data.accessToken);
        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
