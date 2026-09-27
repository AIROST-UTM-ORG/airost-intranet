import React, { createContext, useState, useEffect, useCallback, useMemo } from "react";
import { API_URL } from "../config/api";

export const AuthContext = createContext({
  user: null,
  loading: true,
  setUser: () => {},
  refreshUser: async () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/auth/login/success`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user || null);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Auth initialization failed:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const logout = useCallback(() => {
    window.open(`${API_URL}/auth/logout`, "_self");
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
