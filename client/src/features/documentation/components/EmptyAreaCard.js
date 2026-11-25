import React from "react";
import { FiFolder } from "react-icons/fi";
import { AREA_LABELS } from "../shared/constants";

/**
 * Screen 10 / Screen 11: Empty Area Card (< 150 lines)
 */
const EmptyAreaCard = ({ activeArea, canUpdate, onAddDocument }) => {
  const getEmptyAreaDescription = (area) => {
    if (area === "deployment") {
      return "Add a link to a release checklist, hosting guide or deployment runbook in Google Docs or Drive.";
    }
    return "Add a link to a document or folder in Google Docs or Drive for this area.";
  };

  return (
    <div
      className="doc-card w-full min-h-[300px] p-[32px] flex flex-col items-center justify-center text-center mb-[20px]"
      data-testid="empty-area-card"
    >
      <div className="w-[56px] h-[56px] rounded-full bg-[#F5F5F5] flex items-center justify-center mb-[18px]">
        <FiFolder className="w-[24px] h-[24px] text-[#686868]" strokeWidth={2} />
      </div>
      <h3
        className="font-varela text-[22px] text-[#171717] mb-[12px] font-normal"
        data-testid="empty-area-heading"
      >
        No documents in {AREA_LABELS[activeArea]} yet
      </h3>
      <p
        className="font-varela text-[14px] text-[#686868] max-w-[520px] leading-[150%] mb-[24px]"
        data-testid="empty-area-desc"
      >
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
  );
};

export default EmptyAreaCard;
