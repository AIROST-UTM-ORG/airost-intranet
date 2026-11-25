import React from "react";
import { FiPlus, FiEdit2, FiLock } from "react-icons/fi";

/**
 * SpaceHeader component for SpaceDetailScreen.
 * Displays breadcrumb back button, space title, project association,
 * document count, description, and action buttons (+ Add Document, access status badge).
 */
const SpaceHeader = ({
  space,
  activeArea,
  onBack,
  onAddDocument,
  onEditSpace,
  canUpdate,
  canManage,
  isProjectLinked,
}) => {
  return (
    <>
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
              <FiPlus className="w-[16px] h-[16px]" strokeWidth={2.5} />
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
              <FiEdit2 className="w-[12px] h-[12px]" strokeWidth={2} />
              <span>Update access</span>
            </button>
          ) : (
            /* Screen 11: Read-only badge */
            <div
              className="h-[30px] px-[12px] bg-[#F5F5F5] rounded-[6px] flex items-center gap-[6px] text-[#686868] font-varela text-[13px]"
              data-testid="read-only-badge"
            >
              <FiLock className="w-[12px] h-[12px]" strokeWidth={2} />
              <span>Read-only</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SpaceHeader;
