import React from "react";
import { FiPlus, FiSearch, FiX } from "react-icons/fi";

/**
 * Header section for SpaceListScreen including title, Add button, and live search bar.
 */
const SpaceListHeader = ({
  searchQuery,
  onSearchChange,
  onCreateSpace,
}) => {
  return (
    <>
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
          <FiPlus className="w-[17px] h-[17px]" strokeWidth={2.5} />
          <span className="doc-font-outfit text-[15px] tracking-[0.6px]">ADD</span>
        </button>
      </div>

      {/* Search Field */}
      <div className="relative mb-[28px]">
        <div className="absolute left-[16px] top-[15px] pointer-events-none text-[#686868]">
          <FiSearch className="w-[20px] h-[20px]" strokeWidth={2} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search documentation spaces"
          className="doc-search-input pl-[48px] pr-[44px]"
          data-testid="spaces-search-input"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-[16px] top-[16px] text-[#686868] hover:text-[#171717] focus:outline-none"
            aria-label="Clear search"
            data-testid="clear-search-btn"
          >
            <FiX className="w-[18px] h-[18px]" strokeWidth={2} />
          </button>
        )}
      </div>
    </>
  );
};

export default SpaceListHeader;
