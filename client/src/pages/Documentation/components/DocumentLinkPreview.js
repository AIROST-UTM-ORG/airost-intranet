import React from "react";
import { FiFileText } from "react-icons/fi";
import { getProviderDisplayName } from "../../../services/documentation";

/**
 * DocumentLinkPreview component for DocumentFormScreen (Screen 13 - Edit Document).
 * Displays a summary of the currently saved external document link and provider.
 */
const DocumentLinkPreview = ({ provider }) => {
  return (
    <div
      className="w-full h-[60px] bg-[#F5F5F5] rounded-[6px] px-[16px] flex items-center gap-[12px] mb-[16px]"
      data-testid="saved-link-box"
    >
      <FiFileText className="w-[18px] h-[18px] text-[#686868] flex-shrink-0" strokeWidth={2} />
      <div className="flex flex-col">
        <span className="font-varela text-[14px] text-[#171717] leading-none">
          {getProviderDisplayName(provider)}
        </span>
        <span className="font-varela text-[12px] text-[#686868] mt-[4px]">
          An external document link is saved.
        </span>
      </div>
    </div>
  );
};

export default DocumentLinkPreview;
