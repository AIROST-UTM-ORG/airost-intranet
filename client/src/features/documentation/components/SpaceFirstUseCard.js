import React from "react";
import { FiFolder } from "react-icons/fi";

/**
 * Screen 2: First Use Empty State (< 150 lines)
 */
const SpaceFirstUseCard = ({ onCreateSpace }) => (
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
);

export default SpaceFirstUseCard;
