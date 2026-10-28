import React from "react";
import { FiArchive } from "react-icons/fi";
import { VALID_AREAS, AREA_LABELS } from "../../../services/documentation";

/**
 * AreaTabs component for SpaceDetailScreen.
 * Displays horizontal area filter tabs with counts, divider line,
 * and area subheader with count and archived documents link.
 */
const AreaTabs = ({
  activeArea,
  space,
  onSelectArea,
  areaCount,
  canUpdate,
  onViewArchived,
  archivedCount,
}) => {
  return (
    <>
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
            <FiArchive className="w-[16px] h-[16px]" strokeWidth={2} />
            <span>Archived Documents ({archivedCount})</span>
          </button>
        )}
      </div>
    </>
  );
};

export default AreaTabs;
