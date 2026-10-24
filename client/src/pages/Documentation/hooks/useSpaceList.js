import { useState, useCallback } from "react";
import { listSpaces, listProjects, listMembers } from "../documentationApi";

/**
 * Custom hook to manage spaces overview, projects, members, and initial data loading.
 */
export const useSpaceList = () => {
  const [spaces, setSpaces] = useState([]);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAuthError = (err) => {
    if (err.response?.status === 401 || err.response?.data?.error?.code === "UNAUTHENTICATED") {
      window.location.href = "/login";
      return true;
    }
    return false;
  };

  const extractError = (err, defaultMsg = "Operation failed") => {
    const errData = err.response?.data?.error;
    return {
      message: errData?.message || err.message || defaultMsg,
      code: errData?.code,
      details: errData?.details || [],
    };
  };

  const loadAuxData = useCallback(async () => {
    try {
      const [projData, memberData] = await Promise.all([listProjects(), listMembers()]);
      setProjects(projData);
      setMembers(memberData);
    } catch {
      // Ignore aux loading errors
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [spaceData, projData, memberData] = await Promise.all([
        listSpaces(),
        listProjects(),
        listMembers(),
      ]);
      setSpaces(spaceData);
      setProjects(projData);
      setMembers(memberData);
      return true;
    } catch (err) {
      if (handleAuthError(err)) return false;
      const msg = err.response?.data?.error?.message || err.message || "Failed to load spaces";
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    spaces,
    setSpaces,
    projects,
    setProjects,
    members,
    setMembers,
    loading,
    setLoading,
    error,
    setError,
    loadInitialData,
    loadAuxData,
    handleAuthError,
    extractError,
  };
};
