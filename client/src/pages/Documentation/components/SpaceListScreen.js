import React, { useState, useRef, useEffect } from "react";
import { FiFolder, FiSearch } from "react-icons/fi";
import SpaceListHeader from "./SpaceListHeader";
import SpaceCard from "./SpaceCard";

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
      <SpaceListHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCreateSpace={onCreateSpace}
      />

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
                <FiFolder className="w-[24px] h-[24px] text-[#686868]" strokeWidth={2} />
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
                <FiSearch className="w-[24px] h-[24px] text-[#686868]" strokeWidth={2} />
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
              {filteredSpaces.map((space) => (
                <SpaceCard
                  key={space._id}
                  space={space}
                  isMenuOpen={activeMenuSpaceId === space._id}
                  menuRef={menuRef}
                  onToggleMenu={() =>
                    setActiveMenuSpaceId(activeMenuSpaceId === space._id ? null : space._id)
                  }
                  onOpenSpace={onOpenSpace}
                  onEditSpace={onEditSpace}
                  onManagePermissions={onManagePermissions}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SpaceListScreen;
