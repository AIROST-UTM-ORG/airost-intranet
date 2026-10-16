import React, { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DocLink } from "../DocLink";
import useAuth from "../../../hooks/useAuth";
import DeleteConfirmModal from "./DeleteConfirmModal";
import { deleteSpace, searchDocuments } from "../documentationApi";

const getProviderDisplayName = (provider) => {
  switch (provider) {
    case "google_doc":
      return "Google Docs";
    case "google_drive":
      return "Google Drive";
    default:
      return "External Link";
  }
};

export const isUserAdmin = (user) => {
  if (!user || !user.position) return false;
  if (Array.isArray(user.position)) {
    return user.position.some((p) => typeof p === "string" && p.toLowerCase().includes("admin"));
  }
  return typeof user.position === "string" && user.position.toLowerCase().includes("admin");
};

/**
 * SpaceListScreen - Covers Screens 1, 2, 3, and 4
 */
const SpaceListScreen = ({
  spaces = [],
  loading = false,
  error = null,
  onOpenSpace,
  onCreateSpace,
  onEditSpace,
  onManagePermissions,
  onDeleteSpace,
  onRetry,
  isAdmin: propIsAdmin,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const qFromUrl = searchParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(qFromUrl);
  const [activeMenuSpaceId, setActiveMenuSpaceId] = useState(null);
  const menuRef = useRef(null);
  const triggerRefs = useRef({});

  // Role resolution
  const auth = useAuth ? useAuth() : null;
  const user = auth?.user;
  const userIsAdmin = isUserAdmin(user);
  const isAdmin = propIsAdmin !== undefined ? propIsAdmin : userIsAdmin;

  // Delete Space Modal State
  const [spaceToDelete, setSpaceToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleOpenDeleteModal = (space) => {
    setSpaceToDelete(space);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!spaceToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      if (onDeleteSpace) {
        await onDeleteSpace(spaceToDelete);
      } else {
        await deleteSpace(spaceToDelete._id);
      }
      const deletedTitle = spaceToDelete.title;
      setSpaceToDelete(null);
      setToastMessage(`"${deletedTitle}" and its document links were deleted.`);
      if (onRetry) {
        await onRetry();
      }
    } catch (err) {
      setDeleteError(err);
      const status = err?.response?.status || err?.status;
      const code = err?.response?.data?.error?.code || err?.code;
      if (status === 404 || code === "NOT_FOUND") {
        if (onRetry) onRetry();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Sync searchQuery to URL query ?q= with 250ms debounce and replace: true
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentQ = searchParams.get("q") || "";
      if (searchQuery !== currentQ) {
        const nextParams = new URLSearchParams(searchParams);
        if (searchQuery.trim()) {
          nextParams.set("q", searchQuery);
        } else {
          nextParams.delete("q");
        }
        setSearchParams(nextParams, { replace: true });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, searchParams, setSearchParams]);

  // Sync from URL changes (Back/Forward) to state
  useEffect(() => {
    const qFromUrl = searchParams.get("q") || "";
    if (qFromUrl !== searchQuery) {
      setSearchQuery(qFromUrl);
    }
  }, [searchParams]);

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

  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery.trim());

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isSearchActive = searchQuery.trim().length > 0;
  const isDocSearchEnabled = debouncedQuery.length >= 2;

  const {
    data: searchData,
    isLoading: isSearchLoading,
    isError: isSearchError,
    error: searchErrorObj,
    refetch: refetchSearch,
  } = useQuery({
    queryKey: ["docSearch", debouncedQuery],
    queryFn: async ({ signal }) => {
      return await searchDocuments({ q: debouncedQuery, signal });
    },
    enabled: isDocSearchEnabled,
    staleTime: 60 * 1000,
  });

  const matchingDocuments =
    isDocSearchEnabled && searchData?.documents ? searchData.documents : [];

  const totalDocuments = spaces.reduce(
    (acc, s) => acc + (s.activeDocumentCount ?? s.documentCount ?? 0),
    0
  );

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

  const spaceCount = filteredSpaces.length;
  const docCount = isDocSearchEnabled ? matchingDocuments.length : 0;
  const spaceCountStr = `${spaceCount} ${spaceCount === 1 ? "space" : "spaces"}`;
  const docCountStr = `${docCount} ${docCount === 1 ? "document" : "documents"}`;
  const searchResultsCountText = isDocSearchEnabled
    ? `${spaceCountStr} · ${docCountStr} found`
    : `${spaceCountStr} found`;

  const isFirstUse = !loading && spaces.length === 0;

  // Screen 3 condition: appears only when BOTH spaces and documents have no matches
  const isNoSearchResults =
    !loading &&
    spaces.length > 0 &&
    isSearchActive &&
    (isDocSearchEnabled
      ? !isSearchLoading &&
        !isSearchError &&
        filteredSpaces.length === 0 &&
        matchingDocuments.length === 0
      : filteredSpaces.length === 0);

  const displayQuery =
    searchQuery.length > 40 ? searchQuery.slice(0, 40) + "…" : searchQuery;

  return (
    <div className="w-full max-w-[959px] mx-auto pb-12 font-varela" data-testid="spaces-list-screen">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-[28px]">
        <div>
          <h1 className="doc-page-title" data-testid="documentation-title">
            Documentation
          </h1>
          <p className="font-varela text-[14px] text-[#686868] mt-[12px]">
            Keep project knowledge together. Store and open links to Google Docs and Drive.
          </p>
        </div>
        <DocLink
          to="/doc/spaces/new"
          onClick={(e) => {
            if (onCreateSpace) onCreateSpace(e);
          }}
          className="doc-btn-primary w-[106px] h-[46px] gap-[8px] no-underline inline-flex items-center justify-center"
          data-testid="add-space-btn"
        >
          <svg
            className="w-[17px] h-[17px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span className="doc-font-outfit text-[15px] tracking-[0.6px]">ADD</span>
        </DocLink>
      </div>

      {/* Search Field */}
      <div className="relative mb-[28px]">
        <div className="absolute left-[16px] top-[15px] pointer-events-none text-[#686868]">
          <svg
            className="w-[20px] h-[20px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search documentation spaces"
          className="doc-search-input pl-[48px] pr-[44px]"
          data-testid="spaces-search-input"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setDebouncedQuery("");
              const nextParams = new URLSearchParams(searchParams);
              nextParams.delete("q");
              setSearchParams(nextParams, { replace: true });
            }}
            className="absolute right-[16px] top-[16px] text-[#686868] hover:text-[#171717] focus:outline-none"
            aria-label="Clear search"
            data-testid="clear-search-btn"
          >
            <svg
              className="w-[18px] h-[18px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div
          className="doc-card p-6 mb-6 border border-red-200 bg-red-50 text-center"
          data-testid="spaces-error"
        >
          <p className="text-red-700 font-varela text-[16px] mb-3">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="doc-btn-secondary px-4 py-2 text-[14px]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !error && (
        <div className="flex flex-col gap-[24px]" data-testid="spaces-loading">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="doc-card h-[149px] p-[24px] flex justify-between animate-pulse bg-gray-50"
            >
              <div className="w-2/3 space-y-3">
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
              <div className="w-24 flex flex-col items-end justify-between">
                <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
                <div className="h-10 w-20 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loaded Content */}
      {!loading && !error && (
        <>
          {/* List Heading Row */}
          <div className="flex items-center justify-between mb-[24px]">
            {isSearchActive ? (
              <>
                <h2 className="font-varela text-[20px] text-[#171717] font-normal">
                  Search results
                </h2>
                <span
                  className="font-varela text-[14px] text-[#686868]"
                  data-testid="search-results-summary"
                >
                  <span data-testid="spaces-summary">{searchResultsCountText}</span>
                </span>
              </>
            ) : isFirstUse ? (
              <>
                <h2 className="font-varela text-[20px] text-[#171717] font-normal">
                  Documentation Spaces
                </h2>
                <span className="font-varela text-[14px] text-[#686868]" data-testid="spaces-summary">
                  0 spaces
                </span>
              </>
            ) : (
              <>
                <h2 className="font-varela text-[20px] text-[#171717] font-normal">
                  Documentation Spaces
                </h2>
                <span className="font-varela text-[14px] text-[#686868]" data-testid="spaces-summary">
                  {filteredSpaces.length} {filteredSpaces.length === 1 ? "space" : "spaces"} ·{" "}
                  {searchQuery.trim()
                    ? filteredSpaces.reduce((a, s) => a + (s.activeDocumentCount || 0), 0)
                    : totalDocuments}{" "}
                  documents
                </span>
              </>
            )}
          </div>

          {/* Screen 2: First Use Empty State */}
          {isFirstUse && (
            <div
              className="doc-card w-full min-h-[330px] p-[32px] flex flex-col items-center justify-center text-center"
              data-testid="first-use-card"
            >
              <div className="w-[56px] h-[56px] rounded-full bg-[#F5F5F5] flex items-center justify-center mb-[18px]">
                <svg
                  className="w-[24px] h-[24px] text-[#686868]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3 className="font-varela text-[22px] text-[#171717] mb-[12px] font-normal">
                A home for your documentation
              </h3>
              <p className="font-varela text-[14px] text-[#686868] max-w-[520px] leading-[150%] mb-[24px]">
                Create your first Documentation Space, then add links to Google Docs or Drive.
                Connect it to a project or keep it open to the team.
              </p>
              <DocLink
                to="/doc/spaces/new"
                onClick={(e) => {
                  if (onCreateSpace) onCreateSpace(e);
                }}
                className="doc-btn-primary h-[42px] px-[24px] gap-[8px] no-underline inline-flex items-center justify-center"
                data-testid="create-first-space-btn"
              >
                <span className="font-varela text-[14px] capitalize">+ Create Documentation Space</span>
              </DocLink>
            </div>
          )}

          {/* Screen 3: No Search Results */}
          {isNoSearchResults && (
            <div
              className="doc-card w-full min-h-[315px] p-[32px] flex flex-col items-center justify-center text-center"
              data-testid="no-search-results-card"
            >
              <div className="w-[56px] h-[56px] rounded-full bg-[#F5F5F5] flex items-center justify-center mb-[18px]">
                <svg
                  className="w-[24px] h-[24px] text-[#686868]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <h3 className="font-varela text-[22px] text-[#171717] mb-[12px] font-normal break-words" data-testid="no-search-results-heading">
                No spaces found for “{displayQuery}”
              </h3>
              <p className="font-varela text-[14px] text-[#686868] max-w-[520px] leading-[150%] mb-[24px]">
                Try another space title or project name, or clear your search to see all Documentation
                Spaces.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setDebouncedQuery("");
                  const nextParams = new URLSearchParams(searchParams);
                  nextParams.delete("q");
                  setSearchParams(nextParams, { replace: true });
                }}
                className="doc-btn-primary h-[42px] px-[20px] gap-[6px]"
                data-testid="clear-search-cta"
              >
                <span className="font-varela text-[14px]">✕ Clear search</span>
              </button>
            </div>
          )}

          {/* Screen 1 & Screen 4: Populated Space Cards */}
          {!isFirstUse && !isNoSearchResults && filteredSpaces.length > 0 && (
            <div className="flex flex-col gap-[24px]" data-testid="spaces-grid">
              {filteredSpaces.map((space) => {
                const isProjectLinked = Boolean(space.projectId && space.projectId.title);
                const isMenuOpen = activeMenuSpaceId === space._id;

                return (
                  <div
                    key={space._id}
                    className="doc-card w-full h-[149px] p-[24px] flex justify-between relative transition-shadow hover:shadow-[0_6px_12px_rgba(0,0,0,0.1)]"
                    data-testid={`space-card-${space._id}`}
                  >
                    {/* Left Detail Stack */}
                    <div className="flex flex-col justify-between flex-1 pr-[24px]">
                      <div>
                        <h3 className="font-varela text-[28px] text-[#171717] leading-none mb-[8px] font-normal truncate">
                          {space.title}
                        </h3>
                        <div className="font-varela text-[14px] flex items-center gap-[6px] mb-[8px]">
                          {isProjectLinked ? (
                            <>
                              <span className="text-[#171717]">Project: {space.projectId.title}</span>
                              <span className="text-[#686868]">·</span>
                              <span className="text-[#686868]">
                                {space.activeDocumentCount ?? space.documentCount ?? 0} documents
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-[#171717]">No project · Standalone space</span>
                              <span className="text-[#686868]">·</span>
                              <span className="text-[#686868]">
                                {space.activeDocumentCount ?? space.documentCount ?? 0} documents
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <p className="font-varela text-[14px] text-[#686868] line-clamp-1 leading-[150%] m-0">
                        {space.description}
                      </p>
                    </div>

                    {/* Right Action Stack */}
                    <div className="flex flex-col items-end justify-between flex-shrink-0 relative">
                      {/* Overflow Button (Shown if user has manager rights or is admin) */}
                      {Boolean(isAdmin || space.isManager || space.canManage) ? (
                        <div className="relative">
                          <button
                            ref={(el) => {
                              triggerRefs.current[space._id] = el;
                            }}
                            type="button"
                            onClick={() =>
                              setActiveMenuSpaceId(isMenuOpen ? null : space._id)
                            }
                            className="w-[26px] h-[26px] flex items-center justify-center text-[#171717] hover:bg-[#F5F5F5] rounded transition-colors focus:outline-none"
                            aria-label={`Options for ${space.title}`}
                            data-testid={`space-menu-trigger-${space._id}`}
                          >
                            <svg
                              className="w-[20px] h-[20px]"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="1.5" />
                              <circle cx="19" cy="12" r="1.5" />
                              <circle cx="5" cy="12" r="1.5" />
                            </svg>
                          </button>

                          {/* Screen 4: Floating Manager Menu */}
                          {isMenuOpen && (
                            <div
                              ref={menuRef}
                              className="doc-popover-menu absolute right-0 top-[30px] w-[190px] py-[8px]"
                              data-testid={`space-menu-${space._id}`}
                            >
                              <DocLink
                                to={`/doc/spaces/${space._id}/edit`}
                                onClick={(e) => {
                                  setActiveMenuSpaceId(null);
                                  if (onEditSpace) onEditSpace(space);
                                }}
                                className="doc-menu-item no-underline flex items-center"
                                data-testid="edit-space-menu-item"
                              >
                                <svg
                                  className="w-[16px] h-[16px] text-[#171717]"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                </svg>
                                <span>Edit space</span>
                              </DocLink>
                              <DocLink
                                to={`/doc/spaces/${space._id}/edit`}
                                onClick={(e) => {
                                  setActiveMenuSpaceId(null);
                                  if (onManagePermissions) onManagePermissions(space);
                                }}
                                className="doc-menu-item no-underline flex items-center"
                                data-testid="manage-permissions-menu-item"
                              >
                                <svg
                                  className="w-[16px] h-[16px] text-[#171717]"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                  <circle cx="9" cy="7" r="4" />
                                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                                <span>Manage permissions</span>
                              </DocLink>

                              {/* Admin Only: Delete Space Option */}
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuSpaceId(null);
                                    handleOpenDeleteModal(space);
                                  }}
                                  className="doc-menu-item doc-menu-item-danger no-underline flex items-center"
                                  data-testid="delete-space-menu-item"
                                >
                                  <svg
                                    className="w-[16px] h-[16px]"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    <line x1="10" y1="11" x2="10" y2="17" />
                                    <line x1="14" y1="11" x2="14" y2="17" />
                                  </svg>
                                  <span>Delete space</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-[26px] h-[26px]"></div>
                      )}

                      {/* Open Button */}
                      <DocLink
                        to={`/doc/spaces/${space._id}`}
                        onClick={(e) => {
                          if (onOpenSpace) onOpenSpace(space);
                        }}
                        className="doc-btn-secondary w-[76px] h-[40px] text-[15px] no-underline inline-flex items-center justify-center"
                        data-testid={`open-space-btn-${space._id}`}
                      >
                        Open
                      </DocLink>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Documents Section when search query is at least 2 characters */}
          {!isFirstUse && !isNoSearchResults && isDocSearchEnabled && (
            <div className="mt-[32px]" data-testid="search-documents-section">
              <div className="flex items-center justify-between mb-[16px]">
                <h3 className="font-varela text-[20px] text-[#171717] font-normal">
                  Documents
                </h3>
                {!isSearchLoading && !isSearchError && (
                  <span
                    className="font-varela text-[14px] text-[#686868]"
                    data-testid="search-documents-count"
                  >
                    {docCountStr}
                  </span>
                )}
              </div>

              {/* Documents Section Loading Skeleton */}
              {isSearchLoading && (
                <div
                  className="flex flex-col gap-[16px]"
                  data-testid="search-documents-loading"
                >
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="doc-card h-[104px] p-[24px] flex items-center justify-between animate-pulse bg-gray-50 rounded-[8px]"
                    >
                      <div className="flex items-center gap-[16px] flex-1">
                        <div className="w-[44px] h-[44px] bg-gray-200 rounded-[8px]"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        </div>
                      </div>
                      <div className="w-[86px] h-[38px] bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              )}

              {/* Documents Section Error State with Retry */}
              {isSearchError && !isSearchLoading && (
                <div
                  className="doc-card p-4 border border-red-200 bg-red-50 text-red-700 flex items-center justify-between font-varela text-[14px]"
                  data-testid="search-documents-error"
                >
                  <span>
                    {searchErrorObj?.response?.data?.error?.message ||
                      searchErrorObj?.message ||
                      "Failed to load matching documents"}
                  </span>
                  <button
                    type="button"
                    onClick={() => refetchSearch()}
                    className="doc-btn-secondary px-3 py-1 text-[13px] text-red-800 border-red-300 hover:bg-red-100"
                    data-testid="search-documents-retry-btn"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Matching Documents List */}
              {!isSearchLoading &&
                !isSearchError &&
                matchingDocuments.length > 0 && (
                  <div
                    className="flex flex-col gap-[16px]"
                    data-testid="search-documents-list"
                  >
                    {matchingDocuments.map((doc) => {
                      const spaceId = doc.spaceId || doc.space?._id;
                      const spaceTitle =
                        doc.space?.title || "Documentation Space";
                      const providerLabel = getProviderDisplayName(doc.provider);
                      const areaParam = doc.area || "general";

                      return (
                        <div
                          key={doc._id}
                          className="doc-card w-full h-[104px] p-[24px] flex items-center justify-between relative transition-shadow hover:shadow-[0_6px_12px_rgba(0,0,0,0.1)]"
                          data-testid={`search-document-card-${doc._id}`}
                        >
                          {/* Left Content */}
                          <div className="flex items-center gap-[16px] flex-1 pr-[16px] min-w-0">
                            {/* 44x44 leading icon box */}
                            <div className="w-[44px] h-[44px] bg-[#F5F5F5] rounded-[8px] flex items-center justify-center flex-shrink-0">
                              <svg
                                className="w-[20px] h-[20px] text-[#686868]"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                              </svg>
                            </div>

                            {/* Text Stack */}
                            <div className="flex flex-col justify-center min-w-0">
                              <h4
                                className="font-varela text-[20px] text-[#171717] font-normal leading-tight truncate"
                                title={doc.title}
                              >
                                {doc.title}
                              </h4>
                              <div className="font-varela text-[13px] text-[#686868] mt-[4px] flex items-center gap-1.5 truncate">
                                <span>{providerLabel}</span>
                                <span>·</span>
                                <DocLink
                                  to={`/doc/spaces/${spaceId}?area=${areaParam}`}
                                  className="text-[#2B3467] hover:underline font-medium truncate"
                                  data-testid={`search-document-space-link-${doc._id}`}
                                  title={spaceTitle}
                                >
                                  {spaceTitle}
                                </DocLink>
                                <span>·</span>
                                <span className="capitalize text-gray-500">
                                  {doc.area}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right Controls */}
                          <div className="flex items-center gap-[12px] flex-shrink-0">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="doc-btn-secondary w-[86px] h-[38px] text-[14px] gap-[6px] no-underline"
                              data-testid={`open-search-document-btn-${doc._id}`}
                            >
                              <svg
                                className="w-[14px] h-[14px] text-[#171717]"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                              <span>Open</span>
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          )}
        </>
      )}

      {/* Delete Space Confirmation Modal */}
      {spaceToDelete && (
        <DeleteConfirmModal
          isOpen={Boolean(spaceToDelete)}
          title={`Delete ${spaceToDelete.title}?`}
          description={
            <>
              <p className="m-0 mb-2">
                This space and all of its document links (
                {spaceToDelete.activeDocumentCount ?? spaceToDelete.documentCount ?? 0} active, including{" "}
                {spaceToDelete.archivedDocumentCount ?? spaceToDelete.archivedCount ?? 0} archived) will be
                permanently deleted.
              </p>
              <p className="m-0 mb-2">
                The external documents themselves are <strong>not affected</strong>.
              </p>
              <p className="m-0 text-red-600 font-medium">
                This action cannot be undone.
              </p>
            </>
          }
          requireMatchText={spaceToDelete.title}
          inputLabel={`Type "${spaceToDelete.title}" to confirm:`}
          inputPlaceholder={spaceToDelete.title}
          confirmButtonText="Delete space"
          cancelButtonText="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setSpaceToDelete(null);
            setDeleteError(null);
          }}
          isSubmitting={isDeleting}
          error={deleteError}
          onRetry={handleConfirmDelete}
          onItemAlreadyDeleted={() => {
            setSpaceToDelete(null);
            setDeleteError(null);
            if (onRetry) onRetry();
          }}
          triggerRef={{ current: triggerRefs.current[spaceToDelete._id] }}
          dataTestId="delete-space-modal"
        />
      )}

      {/* Accessible Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="doc-toast"
          data-testid="documentation-toast"
        >
          <svg
            className="w-5 h-5 text-green-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage("")}
            className="text-gray-400 hover:text-white ml-2 text-sm focus:outline-none"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default SpaceListScreen;
