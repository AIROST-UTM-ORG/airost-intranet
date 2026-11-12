import apiClient from "../../shared/api/client";

const DOC_TIMEOUT_MS = 10000;

const normalizeDocumentationError = (error) => {
  // Standardize error envelope
  if (error?.response?.data?.error) {
    return error;
  }

  const status = error?.status || error?.response?.status || 500;
  const message =
    error?.normalizedMessage ||
    error?.response?.data?.message ||
    error?.message ||
    "An unexpected server error occurred.";
  const code =
    status === 400
      ? "VALIDATION_ERROR"
      : status === 401
      ? "UNAUTHENTICATED"
      : status === 403
      ? "FORBIDDEN"
      : status === 404
      ? "NOT_FOUND"
      : "INTERNAL_ERROR";

  const customErr = new Error(message);
  customErr.status = status;
  customErr.normalizedMessage = message;
  customErr.response = {
    status,
    data: {
      error: {
        code,
        message,
        details: error?.response?.data?.details || [],
      },
    },
  };
  return customErr;
};

const withDocConfig = (config = {}) => ({
  timeout: DOC_TIMEOUT_MS,
  ...config,
  headers: {
    Accept: "application/json",
    ...(config.headers || {}),
  },
});

const delegate = async (requestFn) => {
  try {
    return await requestFn();
  } catch (error) {
    return Promise.reject(normalizeDocumentationError(error));
  }
};

/**
 * Shared real API client for documentation services, backed by the centralized apiClient.
 */
export const realApiClient = {
  get: (url, config) => delegate(() => apiClient.get(url, withDocConfig(config))),
  delete: (url, config) => delegate(() => apiClient.delete(url, withDocConfig(config))),
  post: (url, data, config) => delegate(() => apiClient.post(url, data, withDocConfig(config))),
  put: (url, data, config) => delegate(() => apiClient.put(url, data, withDocConfig(config))),
  patch: (url, data, config) => delegate(() => apiClient.patch(url, data, withDocConfig(config))),
  request: (config) => delegate(() => apiClient.request(withDocConfig(config))),
};

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const createError = (status, code, message, details = []) => {
  const err = new Error(message);
  err.status = status;
  err.response = {
    status,
    data: {
      error: {
        code,
        message,
        details,
      },
    },
  };
  return err;
};

export const extractError = (err, defaultMsg = "Operation failed") => {
  const errData = err?.response?.data?.error;
  return {
    message: errData?.message || err?.message || defaultMsg,
    code: errData?.code,
    details: errData?.details || [],
  };
};
