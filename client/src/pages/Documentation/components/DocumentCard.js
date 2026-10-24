import React from "react";
import {
  FiFileText,
  FiExternalLink,
  FiMoreHorizontal,
  FiEdit2,
  FiArchive,
} from "react-icons/fi";
import { getProviderDisplayName } from "../api";

/**
 * DocumentCard component for SpaceDetailScreen.
 * Displays an individual document card with icon, title, provider,
 * external Open button, and options popup menu (Edit, Archive).
 */
const DocumentCard = ({
  doc,
  canUpdate,
  isMenuOpen,
  onToggleMenu,
  menuRef,
  onEditDocument,
  onArchiveDocument,
}) => {
  return (
    <div
      className="doc-card w-full h-[104px] p-[24px] flex items-center justify-between relative transition-shadow hover:shadow-[0_6px_12px_rgba(0,0,0,0.1)]"
      data-testid={`document-card-${doc._id}`}
    >
      {/* Left Content */}
      <div className="flex items-center gap-[16px] flex-1 pr-[16px]">
        {/* Leading 44x44 icon badge */}
        <div className="w-[44px] h-[44px] bg-[#F5F5F5] rounded-[8px] flex items-center justify-center flex-shrink-0">
          <FiFileText className="w-[20px] h-[20px] text-[#686868]" strokeWidth={2} />
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
          <FiExternalLink className="w-[14px] h-[14px] text-[#171717]" strokeWidth={2} />
          <span>Open</span>
        </a>

        {/* Document Menu Button (Screen 8 & 9; HIDDEN in Read-only Screen 11) */}
        {canUpdate && (
          <div className="relative">
            <button
              type="button"
              onClick={onToggleMenu}
              className="w-[26px] h-[26px] flex items-center justify-center text-[#171717] hover:bg-[#F5F5F5] rounded transition-colors focus:outline-none"
              aria-label={`Options for ${doc.title}`}
              data-testid={`doc-menu-trigger-${doc._id}`}
            >
              <FiMoreHorizontal className="w-[20px] h-[20px]" />
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
                    onEditDocument(doc);
                  }}
                  className="doc-menu-item"
                  data-testid="edit-doc-menu-item"
                >
                  <FiEdit2 className="w-[16px] h-[16px] text-[#171717]" strokeWidth={2} />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onArchiveDocument(doc);
                  }}
                  className="doc-menu-item"
                  data-testid="archive-doc-menu-item"
                >
                  <FiArchive className="w-[16px] h-[16px] text-[#171717]" strokeWidth={2} />
                  <span>Archive</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentCard;
