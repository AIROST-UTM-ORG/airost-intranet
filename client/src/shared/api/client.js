import axios from 'axios';

// Production must always use relative '/api' routing so requests stay same-origin
// behind reverse proxies (e.g., Cloudflare) and retain session cookies (connect.sid).
const baseURL =
  process.env.NODE_ENV === 'development' && process.env.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL
    : '/api';

const AUTH_EXEMPT_ENDPOINTS = new Set([
  '/login/success',
  '/auth/login/success',
  '/api/auth/login/success',
  '/logout',
  '/auth/logout',
  '/api/auth/logout',
]);

const isAuthLifecycleEndpoint = (url) => {
  if (typeof url !== 'string' || !url) return false;
  const pathOnly = url.split(/[?#]/)[0].replace(/\/+$/, '');
  const pathname = pathOnly.replace(/^https?:\/\/[^/]+/i, '');
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return AUTH_EXEMPT_ENDPOINTS.has(normalizedPath);
};

let isUnauthorizedDispatched = false;

/**
 * Resets the single-cycle 401 unauthorized event lock.
 * Should be called exclusively by AuthProvider upon confirmed login or authenticated session restoration.
 */
export const resetAuthUnauthorizedLock = () => {
  isUnauthorizedDispatched = false;
};

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
      return Promise.reject(error);
    }

    const data = error.response?.data;
    const nestedErrorMessage =
      typeof data?.error === 'string' ? data.error : data?.error?.message;

    error.status = error.response?.status;
    error.normalizedMessage =
      data?.message ||
      nestedErrorMessage ||
      error.message ||
      'An unexpected error occurred';

    if (!error.response) {
      return Promise.reject(error);
    }

    if (
      error.response.status === 401 &&
      error.config?.skipAuthRedirect !== true &&
      typeof window !== 'undefined' &&
      window.location.pathname !== '/login' &&
      !isAuthLifecycleEndpoint(error.config?.url)
    ) {
      if (!isUnauthorizedDispatched) {
        isUnauthorizedDispatched = true;
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
