import React, { useState, useRef, useEffect } from "react";
import { FiExternalLink } from "react-icons/fi";
import InfoBanner from "../../shared/components/InfoBanner";
import SpaceHeader from "./SpaceHeader";
import AreaTabs from "../../shared/components/AreaTabs";
import DocumentCard from "../../documents/components/DocumentCard";
import EmptyAreaCard from "./EmptyAreaCard";

/**
 * SpaceDetailScreen - Covers Screens 8, 9, 10, and 11 (< 150 lines)
 */
const SpaceDetailScreen = ({
  space,
  documents = [],
  loading = false,
  error = null,
  activeArea = "development",
  onSelectArea,
  onBack,
  onAddDocument,
  onEditSpace,
  onEditDocument,
  onArchiveDocument,
  onViewArchived,
}) => {
  const [activeMenuDocId, setActiveMenuDocId] = useState(null);
  const menuRef = useRef(null);

  // Close doc overflow menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuDocId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!space) return null;

  const canUpdate = Boolean(space.canUpdate);
  const canManage = Boolean(space.canManage ?? space.isManager);
  const isProjectLinked = Boolean(space.projectId && space.projectId.title);

  // Filter non-archived documents for the selected area
  const areaDocs = documents.filter((d) => !d.archived && d.area === activeArea);
  const areaCount = areaDocs.length;
  const archivedCount = space.archivedCount ?? space.archivedDocumentCount ?? 0;

  return (
    <div className="w-full max-w-[959px] mx-auto pb-12 font-varela" data-testid="space-detail-screen">
      {/* Space Header */}
      <SpaceHeader
        space={space}
        activeArea={activeArea}
        onBack={onBack}
        onAddDocument={onAddDocument}
        onEditSpace={onEditSpace}
        canUpdate={canUpdate}
        canManage={canManage}
        isProjectLinked={isProjectLinked}
      />

      {/* Area Tabs & Subheader */}
      <AreaTabs
        activeArea={activeArea}
        space={space}
        onSelectArea={onSelectArea}
        areaCount={areaCount}
        canUpdate={canUpdate}
        onViewArchived={onViewArchived}
        archivedCount={archivedCount}
      />

      {/* Loading state */}
      {loading && (
        <div className="space-y-4 mb-6">
          <div className="doc-card h-[104px] p-[24px] animate-pulse bg-gray-50"></div>
          <div className="doc-card h-[104px] p-[24px] animate-pulse bg-gray-50"></div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="doc-card p-6 mb-6 border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {/* Loaded Content */}
      {!loading && !error && (
        <>
          {areaCount === 0 ? (
            /* Screen 10 / Screen 11: Empty Area Card */
            <EmptyAreaCard
              activeArea={activeArea}
              canUpdate={canUpdate}
              onAddDocument={onAddDocument}
            />
          ) : (
            /* Screen 8: Document Cards Stack */
            <div className="flex flex-col gap-[20px] mb-[20px]" data-testid="documents-list">
              {areaDocs.map((doc) => {
                const isMenuOpen = activeMenuDocId === doc._id;

                return (
                  <DocumentCard
                    key={doc._id}
                    doc={doc}
                    canUpdate={canUpdate}
                    isMenuOpen={isMenuOpen}
                    onToggleMenu={() =>
                      setActiveMenuDocId(isMenuOpen ? null : doc._id)
                    }
                    menuRef={menuRef}
                    onEditDocument={(d) => {
                      setActiveMenuDocId(null);
                      onEditDocument(d);
                    }}
                    onArchiveDocument={(d) => {
                      setActiveMenuDocId(null);
                      onArchiveDocument(d);
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* Footer Helper Note (Screen 8: shown when documents exist) */}
          {areaCount > 0 && (
            <div className="flex items-center gap-[8px] mb-[16px]">
              <FiExternalLink className="w-[14px] h-[14px] text-[#686868]" strokeWidth={2} />
              <span className="font-varela text-[13px] text-[#686868]">
                Open launches the linked document in a new tab.
              </span>
            </div>
          )}

          {/* Shared Info Banner */}
          <InfoBanner />
        </>
      )}
    </div>
  );
};

export default SpaceDetailScreen;
