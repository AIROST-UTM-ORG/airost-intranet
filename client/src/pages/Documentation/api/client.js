import axios from "axios";
import { API_URL } from "../../../config/api";

/**
 * Shared real API axios client with unified error normalization.
 */
export const realApiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

realApiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    // Standardize error envelope
    if (error.response && error.response.data && error.response.data.error) {
      return Promise.reject(error);
    }
    const status = error.response?.status || 500;
    const message =
      error.response?.data?.message ||
      error.message ||
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
    customErr.response = {
      status,
      data: {
        error: {
          code,
          message,
          details: error.response?.data?.details || [],
        },
      },
    };
    return Promise.reject(customErr);
  }
);

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
