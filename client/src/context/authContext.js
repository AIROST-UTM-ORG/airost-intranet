import React, { createContext, useState, useEffect, useCallback, useMemo } from "react";
import apiClient, { resetAuthUnauthorizedLock } from "../shared/api/client";

export const AuthContext = createContext({
  user: null,
  loading: true,
  setUser: () => {},
  refreshUser: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const response = await apiClient.get("/auth/login/success", {
        skipAuthRedirect: true,
        headers: {
          Accept: "application/json",
        },
      });

      const authenticatedUser = response.data?.user || null;
      if (authenticatedUser) {
        resetAuthUnauthorizedLock();
      }
      setUser(authenticatedUser);
    } catch (err) {
      if (err?.status !== 401 && err?.response?.status !== 401) {
        console.error("Auth initialization failed:", err);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser((prevUser) => (prevUser ? null : prevUser));
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout", null, {
        skipAuthRedirect: true,
        headers: {
          Accept: "application/json",
        },
      });
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setUser(null);
      sessionStorage.clear();
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      setUser,
      refreshUser: fetchUser,
      logout,
    }),
    [user, loading, fetchUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
