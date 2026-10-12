import axios from 'axios';

export const API_URL = (process.env.REACT_APP_API_URL || "http://localhost:4000").replace(/\/$/, "");

// Ensure axios sends cookies/credentials for cross-origin requests
axios.defaults.withCredentials = true;

// Attach current user email if available as a fallback header
axios.interceptors.request.use((config) => {
  const userEmail = localStorage.getItem('currentUserEmail');
  if (userEmail && !config.headers['x-user-email']) {
    config.headers['x-user-email'] = userEmail;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});
