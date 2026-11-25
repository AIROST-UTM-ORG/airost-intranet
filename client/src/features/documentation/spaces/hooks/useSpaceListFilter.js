import { useState, useRef, useEffect } from "react";

/**
 * Custom hook to filter documentation spaces and manage card overflow menus.
 */
export const useSpaceListFilter = (spaces = []) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenuSpaceId, setActiveMenuSpaceId] = useState(null);
  const menuRef = useRef(null);

  // Close overflow menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuSpaceId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSpaces = spaces.filter((space) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = (space.title || "").toLowerCase().includes(q);
    const descMatch = (space.description || "").toLowerCase().includes(q);
    const projectMatch = space.projectId?.title
      ? space.projectId.title.toLowerCase().includes(q)
      : false;
    return titleMatch || descMatch || projectMatch;
  });

  return {
    searchQuery,
    setSearchQuery,
    activeMenuSpaceId,
    setActiveMenuSpaceId,
    menuRef,
    filteredSpaces,
  };
};

export default useSpaceListFilter;
