import React from "react";
import { FiSearch } from "react-icons/fi";

/**
 * Screen 3: No Search Results (< 150 lines)
 */
const SpaceNoSearchResultsCard = ({ searchQuery, onClearSearch }) => (
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
      onClick={onClearSearch}
      className="doc-btn-primary h-[42px] px-[20px] gap-[6px]"
      data-testid="clear-search-cta"
    >
      <span className="font-varela text-[14px]">✕ Clear search</span>
    </button>
  </div>
);

export default SpaceNoSearchResultsCard;
