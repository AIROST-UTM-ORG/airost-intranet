import React, { useState, useRef, useEffect } from "react";
import InfoBanner from "./InfoBanner";
import { getProviderDisplayName, VALID_AREAS, AREA_LABELS } from "../documentationApi";

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
      {/* Top Back Navigation Link */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-[8px] text-[#686868] hover:text-[#171717] font-varela text-[14px] mb-[12px] focus:outline-none transition-colors"
        data-testid="back-to-documentation-btn"
      >
        <span className="text-[14px]">←</span>
        <span>Back to Documentation</span>
      </button>

      {/* Space Header */}
      <div className="flex items-start justify-between mb-[24px]">
        {/* Left Stack */}
        <div className="flex-1 pr-[24px]">
          <h1 className="doc-page-title truncate" data-testid="space-detail-title">
            {space.title}
          </h1>
          <div className="font-varela text-[14px] flex items-center gap-[6px] mt-[10px] mb-[12px]">
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
          <p className="font-varela text-[14px] text-[#686868] leading-[150%] max-w-[700px] m-0">
            {space.description}
          </p>
        </div>

        {/* Right Action Stack */}
        <div className="flex flex-col items-end flex-shrink-0">
          {/* Top: + Add Document button (Screen 8; HIDDEN in Read-only Screen 11) */}
          {canUpdate && (
            <button
              type="button"
              onClick={() => onAddDocument(activeArea)}
              className="doc-btn-primary h-[44px] px-[20px] gap-[8px] mb-[12px]"
              data-testid="add-document-btn"
            >
              <svg
                className="w-[16px] h-[16px]"
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
              <span className="font-varela text-[14px] capitalize">+ Add Document</span>
            </button>
          )}

          {/* Bottom: Access Badge Chip */}
          {canUpdate ? (
            <button
              type="button"
              onClick={canManage ? onEditSpace : undefined}
              className={`h-[30px] px-[12px] bg-[#F5F5F5] rounded-[6px] flex items-center gap-[6px] text-[#686868] font-varela text-[13px] border-none ${
                canManage ? "cursor-pointer hover:bg-[#EBEBEB]" : "cursor-default"
              }`}
              data-testid="update-access-badge"
            >
              <svg
                className="w-[12px] h-[12px]"
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
              <span>Update access</span>
            </button>
          ) : (
            /* Screen 11: Read-only badge */
            <div
              className="h-[30px] px-[12px] bg-[#F5F5F5] rounded-[6px] flex items-center gap-[6px] text-[#686868] font-varela text-[13px]"
              data-testid="read-only-badge"
            >
              <svg
                className="w-[12px] h-[12px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Read-only</span>
            </div>
          )}
        </div>
      </div>

      {/* Area Filter Tabs Bar */}
      <div className="mb-[20px]">
        <div className="flex items-center gap-[8px] overflow-x-auto pb-[2px] doc-scrollbar">
          {VALID_AREAS.map((areaKey) => {
            const isActive = activeArea === areaKey;
            const count = space.areaCounts ? space.areaCounts[areaKey] || 0 : 0;
            return (
              <button
                key={areaKey}
                type="button"
                onClick={() => onSelectArea(areaKey)}
                className={`h-[38px] px-[16px] rounded-[6px] font-varela text-[14px] flex items-center gap-[8px] transition-colors flex-shrink-0 border-none ${
                  isActive
                    ? "bg-[#EBF9EC] text-[#158019] font-medium"
                    : "bg-[#F5F5F5] text-[#686868] hover:bg-[#EBEBEB]"
                }`}
                data-testid={`area-tab-${areaKey}`}
              >
                <span>{AREA_LABELS[areaKey]}</span>
                <span className={isActive ? "text-[#158019]" : "text-[#686868]"}>{count}</span>
              </button>
            );
          })}
        </div>
        {/* Horizontal Divider Line */}
        <div className="w-full h-[1px] bg-[#EDEDED] mt-[16px]"></div>
      </div>

      {/* Area Section Sub-Header */}
      <div className="flex items-center justify-between mb-[20px]">
        <div className="flex items-center gap-[12px]">
          <h2 className="font-varela text-[22px] text-[#171717] font-normal" data-testid="current-area-title">
            {AREA_LABELS[activeArea]}
          </h2>
          <span className="font-varela text-[14px] text-[#686868]" data-testid="current-area-count">
            {areaCount} {areaCount === 1 ? "document" : "documents"}
          </span>
        </div>

        {/* Right: Archived Documents button (Screen 8; HIDDEN in Read-only Screen 11) */}
        {canUpdate && (
          <button
            type="button"
            onClick={onViewArchived}
            className="flex items-center gap-[6px] text-[#686868] hover:text-[#171717] font-varela text-[14px] focus:outline-none transition-colors"
            data-testid="archived-documents-link"
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
              <polyline points="21 8 21 21 3 21 3 8" />
              <rect x="1" y="3" width="22" height="5" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
            <span>Archived Documents ({archivedCount})</span>
          </button>
        )}
      </div>

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
                  <div
                    key={doc._id}
                    className="doc-card w-full h-[104px] p-[24px] flex items-center justify-between relative transition-shadow hover:shadow-[0_6px_12px_rgba(0,0,0,0.1)]"
                    data-testid={`document-card-${doc._id}`}
                  >
                    {/* Left Content */}
                    <div className="flex items-center gap-[16px] flex-1 pr-[16px]">
                      {/* Leading 44x44 icon badge */}
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
                      <div className="flex flex-col justify-center">
                        <h3 className="font-varela text-[22px] text-[#171717] font-normal leading-tight truncate">
                          {doc.title}
                        </h3>
                        <span className="font-varela text-[14px] text-[#686868] mt-[6px]">
                          {getProviderDisplayName(doc.provider)}
                        </span>
                      </div>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-[12px] flex-shrink-0 relative">
                      {/* Open Button (opens in new tab) */}
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="doc-btn-secondary w-[86px] h-[38px] text-[14px] gap-[6px] no-underline"
                        data-testid={`open-document-btn-${doc._id}`}
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

                      {/* Document Menu Button (Screen 8 & 9; HIDDEN in Read-only Screen 11) */}
                      {canUpdate && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMenuDocId(isMenuOpen ? null : doc._id)
                            }
                            className="w-[26px] h-[26px] flex items-center justify-center text-[#171717] hover:bg-[#F5F5F5] rounded transition-colors focus:outline-none"
                            aria-label={`Options for ${doc.title}`}
                            data-testid={`doc-menu-trigger-${doc._id}`}
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

                          {/* Screen 9: Floating Document Menu */}
                          {isMenuOpen && (
                            <div
                              ref={menuRef}
                              className="doc-popover-menu absolute right-0 top-[34px] w-[156px] py-[8px]"
                              data-testid={`doc-menu-${doc._id}`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuDocId(null);
                                  onEditDocument(doc);
                                }}
                                className="doc-menu-item"
                                data-testid="edit-doc-menu-item"
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
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuDocId(null);
                                  onArchiveDocument(doc);
                                }}
                                className="doc-menu-item"
                                data-testid="archive-doc-menu-item"
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
                                  <polyline points="21 8 21 21 3 21 3 8" />
                                  <rect x="1" y="3" width="22" height="5" />
                                  <line x1="10" y1="12" x2="14" y2="12" />
                                </svg>
                                <span>Archive</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Helper Note (Screen 8: shown when documents exist) */}
          {areaCount > 0 && (
            <div className="flex items-center gap-[8px] mb-[16px]">
              <svg
                className="w-[14px] h-[14px] text-[#686868]"
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
