import React, { useState, useRef, useEffect } from "react";
import { FiFolder, FiExternalLink } from "react-icons/fi";
import InfoBanner from "./InfoBanner";
import SpaceHeader from "./SpaceHeader";
import AreaTabs from "./AreaTabs";
import DocumentCard from "./DocumentCard";
import { AREA_LABELS } from "../../../services/documentation";

/**
 * SpaceDetailScreen - Covers Screens 8, 9, 10, and 11
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

  // Empty area descriptions per Screen 10 / SCREEN_SPEC.md
  const getEmptyAreaDescription = (area) => {
    if (area === "deployment") {
      return "Add a link to a release checklist, hosting guide or deployment runbook in Google Docs or Drive.";
    }
    return "Add a link to a document or folder in Google Docs or Drive for this area.";
  };

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
            <div
              className="doc-card w-full min-h-[300px] p-[32px] flex flex-col items-center justify-center text-center mb-[20px]"
              data-testid="empty-area-card"
            >
              <div className="w-[56px] h-[56px] rounded-full bg-[#F5F5F5] flex items-center justify-center mb-[18px]">
                <FiFolder className="w-[24px] h-[24px] text-[#686868]" strokeWidth={2} />
              </div>
              <h3 className="font-varela text-[22px] text-[#171717] mb-[12px] font-normal" data-testid="empty-area-heading">
                No documents in {AREA_LABELS[activeArea]} yet
              </h3>
              <p className="font-varela text-[14px] text-[#686868] max-w-[520px] leading-[150%] mb-[24px]" data-testid="empty-area-desc">
                {getEmptyAreaDescription(activeArea)}
              </p>
              {canUpdate && (
                <button
                  type="button"
                  onClick={() => onAddDocument(activeArea)}
                  className="doc-btn-primary h-[42px] px-[24px] gap-[8px]"
                  data-testid="empty-area-add-doc-btn"
                >
                  <span className="font-varela text-[14px] capitalize">+ Add Document</span>
                </button>
              )}
            </div>
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
