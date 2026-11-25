import React from "react";
import SpaceListHeader from "./SpaceListHeader";
import SpaceCard from "./SpaceCard";
import SpaceListSkeleton from "./SpaceListSkeleton";
import SpaceFirstUseCard from "./SpaceFirstUseCard";
import SpaceNoSearchResultsCard from "./SpaceNoSearchResultsCard";
import { useSpaceListFilter } from "../hooks/useSpaceListFilter";

/**
 * SpaceListScreen - Covers Screens 1, 2, 3, and 4 (< 150 lines)
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
  const {
    searchQuery,
    setSearchQuery,
    activeMenuSpaceId,
    setActiveMenuSpaceId,
    menuRef,
    filteredSpaces,
  } = useSpaceListFilter(spaces);

  const totalDocuments = spaces.reduce(
    (acc, s) => acc + (s.activeDocumentCount ?? s.documentCount ?? 0),
    0
  );

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
      {loading && !error && <SpaceListSkeleton />}

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
          {isFirstUse && <SpaceFirstUseCard onCreateSpace={onCreateSpace} />}

          {/* Screen 3: No Search Results */}
          {isNoSearchResults && (
            <SpaceNoSearchResultsCard
              searchQuery={searchQuery}
              onClearSearch={() => setSearchQuery("")}
            />
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
