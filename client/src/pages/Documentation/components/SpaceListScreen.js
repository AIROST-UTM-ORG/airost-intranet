import React, { useState, useRef, useEffect } from "react";

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
  onRetry,
}) => {
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

  const isFirstUse = !loading && spaces.length === 0;
  const isNoSearchResults = !loading && spaces.length > 0 && filteredSpaces.length === 0;

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
        <button
          type="button"
          onClick={onCreateSpace}
          className="doc-btn-primary w-[106px] h-[46px] gap-[8px]"
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
        </button>
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
            onClick={() => setSearchQuery("")}
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
            {isNoSearchResults ? (
              <>
                <h2 className="font-varela text-[20px] text-[#171717] font-normal">
                  Search results
                </h2>
                <span className="font-varela text-[14px] text-[#686868]" data-testid="search-results-summary">
                  0 spaces found
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
              <button
                type="button"
                onClick={onCreateSpace}
                className="doc-btn-primary h-[42px] px-[24px] gap-[8px]"
                data-testid="create-first-space-btn"
              >
                <span className="font-varela text-[14px] capitalize">+ Create Documentation Space</span>
              </button>
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
              <h3 className="font-varela text-[22px] text-[#171717] mb-[12px] font-normal">
                No spaces found for “{searchQuery}”
              </h3>
              <p className="font-varela text-[14px] text-[#686868] max-w-[520px] leading-[150%] mb-[24px]">
                Try another space title or project name, or clear your search to see all Documentation
                Spaces.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="doc-btn-primary h-[42px] px-[20px] gap-[6px]"
                data-testid="clear-search-cta"
              >
                <span className="font-varela text-[14px]">✕ Clear search</span>
              </button>
            </div>
          )}

          {/* Screen 1 & Screen 4: Populated Space Cards */}
          {!isFirstUse && !isNoSearchResults && (
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
                      {/* Overflow Button (Shown if user has manager rights) */}
                      {Boolean(space.isManager || space.canManage) ? (
                        <div className="relative">
                          <button
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
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuSpaceId(null);
                                  onEditSpace(space);
                                }}
                                className="doc-menu-item"
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
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuSpaceId(null);
                                  onManagePermissions(space);
                                }}
                                className="doc-menu-item"
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
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-[26px] h-[26px]"></div>
                      )}

                      {/* Open Button */}
                      <button
                        type="button"
                        onClick={() => onOpenSpace(space)}
                        className="doc-btn-secondary w-[76px] h-[40px] text-[15px]"
                        data-testid={`open-space-btn-${space._id}`}
                      >
                        Open
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SpaceListScreen;
