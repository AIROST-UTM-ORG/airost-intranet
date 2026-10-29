import { useState, useEffect, useRef, useCallback } from "react";
import useAuth from "../../hooks/useAuth";
import {
  getAdminSpaces,
  reassignSpaceOwner,
  deleteSpace,
  listMembers,
  extractError,
} from "../Documentation/documentationApi";

export const isUserAdmin = (user) => {
  if (!user || !user.position) return false;
  if (Array.isArray(user.position)) {
    return user.position.some(
      (p) => typeof p === "string" && p.toLowerCase().includes("admin")
    );
  }
  return typeof user.position === "string" && user.position.toLowerCase().includes("admin");
};

export const useAdminSpaces = () => {
  const { user } = useAuth();
  const isAdmin = isUserAdmin(user);

  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [total, setTotal] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Action Menu dropdown state
  const [activeMenuSpaceId, setActiveMenuSpaceId] = useState(null);
  const menuRef = useRef(null);

  // Modals state
  const [spaceToReassign, setSpaceToReassign] = useState(null);
  const [spaceToDelete, setSpaceToDelete] = useState(null);

  // Reassign Modal state
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState(null);
  const [memberFilter, setMemberFilter] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);
  const [reassignError, setReassignError] = useState(null);

  // Delete Space state
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
      setPage(1); // reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close overflow menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuSpaceId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch spaces list
  const loadSpaces = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminSpaces({
        page,
        limit,
        q: debouncedQuery,
      });
      setSpaces(data.spaces || []);
      setTotal(data.total || 0);
    } catch (err) {
      const parsed = extractError(err, "Failed to load documentation spaces");
      setError(parsed.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, page, limit, debouncedQuery]);

  useEffect(() => {
    loadSpaces();
  }, [loadSpaces]);

  // Load members when Reassign modal opens
  useEffect(() => {
    if (!spaceToReassign) {
      setMembers([]);
      setMemberFilter("");
      setSelectedUserId("");
      setReassignError(null);
      return;
    }

    let isMounted = true;
    const fetchUsers = async () => {
      setMembersLoading(true);
      setMembersError(null);
      try {
        const userList = await listMembers();
        if (isMounted) {
          setMembers(userList || []);
        }
      } catch (err) {
        if (isMounted) {
          const parsed = extractError(err, "Failed to load active members");
          setMembersError(parsed.message);
        }
      } finally {
        if (isMounted) {
          setMembersLoading(false);
        }
      }
    };

    fetchUsers();

    return () => {
      isMounted = false;
    };
  }, [spaceToReassign]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Handle reassign confirmation
  const handleConfirmReassign = async (e) => {
    if (e) e.preventDefault();
    if (!spaceToReassign || !selectedUserId || isReassigning) return;

    setIsReassigning(true);
    setReassignError(null);
    try {
      await reassignSpaceOwner(spaceToReassign._id, selectedUserId);
      const newOwner = members.find((m) => m._id === selectedUserId);
      setToastMessage(
        `Space owner reassigned successfully to ${newOwner?.name || "new owner"}.`
      );
      setSpaceToReassign(null);
      await loadSpaces();
    } catch (err) {
      const parsed = extractError(err, "Failed to reassign space owner");
      setReassignError(parsed.message);
    } finally {
      setIsReassigning(false);
    }
  };

  // Handle delete space confirmation
  const handleConfirmDelete = async () => {
    if (!spaceToDelete || isDeleting) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteSpace(spaceToDelete._id);
      setToastMessage(`"${spaceToDelete.title}" and its documents were permanently deleted.`);
      setSpaceToDelete(null);
      await loadSpaces();
    } catch (err) {
      const parsed = extractError(err, "Failed to delete documentation space");
      setDeleteError(parsed.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    if (!memberFilter.trim()) return true;
    const q = memberFilter.toLowerCase();
    const nameMatch = (m.name || "").toLowerCase().includes(q);
    const emailMatch = (m.email || "").toLowerCase().includes(q);
    return nameMatch || emailMatch;
  });

  const totalPages = Math.ceil(total / limit) || 1;
  const startRow = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRow = Math.min(page * limit, total);

  return {
    user,
    isAdmin,
    spaces,
    loading,
    error,
    page,
    setPage,
    limit,
    total,
    totalPages,
    startRow,
    endRow,
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    setDebouncedQuery,
    activeMenuSpaceId,
    setActiveMenuSpaceId,
    menuRef,
    spaceToReassign,
    setSpaceToReassign,
    spaceToDelete,
    setSpaceToDelete,
    members,
    membersLoading,
    membersError,
    memberFilter,
    setMemberFilter,
    selectedUserId,
    setSelectedUserId,
    isReassigning,
    reassignError,
    setReassignError,
    isDeleting,
    deleteError,
    setDeleteError,
    toastMessage,
    setToastMessage,
    loadSpaces,
    handleConfirmReassign,
    handleConfirmDelete,
    filteredMembers,
  };
};

export default useAdminSpaces;
