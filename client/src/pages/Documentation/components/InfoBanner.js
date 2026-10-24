import React from "react";
import { FiInfo } from "react-icons/fi";

/**
 * Shared Info Banner
 * Observed in DESIGN.md & SCREEN_SPEC.md:
 * Container: Full width, height 44px, background #F5F5F5, border-radius 6px, horizontal padding 16px.
 * Left: Info circle icon (FiInfo, 16px, #686868) + 10px gap
 * Text: "Document access and editing permissions are managed by the linked service." (Varela Round, 14px, #686868)
 */
const InfoBanner = ({ className = "" }) => {
  return (
    <div
      className={`w-full h-[44px] min-h-[44px] bg-[#F5F5F5] rounded-[6px] px-[16px] flex items-center gap-[10px] ${className}`}
      data-testid="info-banner"
    >
      <FiInfo
        className="w-[16px] h-[16px] text-[#686868] flex-shrink-0"
        strokeWidth={2}
        aria-hidden="true"
      />
      <span className="font-varela text-[14px] text-[#686868] truncate">
        Document access and editing permissions are managed by the linked service.
      </span>
    </div>
  );
};

export default InfoBanner;
