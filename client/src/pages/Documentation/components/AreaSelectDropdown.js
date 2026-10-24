import React, { useRef, useState, useEffect } from "react";
import { FiChevronDown, FiCheck } from "react-icons/fi";
import { VALID_AREAS, AREA_LABELS } from "../api";

/**
 * AreaSelectDropdown component for DocumentFormScreen.
 * Provides custom dropdown with area selection and checkmark indicator.
 */
const AreaSelectDropdown = ({ area, onSelectArea }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col mb-[20px] relative" ref={dropdownRef}>
      <label className="font-varela text-[14px] text-[#171717] mb-[8px]">
        Area <span className="text-[#171717]">*</span>
      </label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="doc-input h-[46px] px-[16px] flex items-center justify-between cursor-pointer bg-white"
        data-testid="area-select-trigger"
      >
        <span className="font-varela text-[15px] text-[#171717]">
          {AREA_LABELS[area] || "Select Area"}
        </span>
        <FiChevronDown
          className={`w-[14px] h-[14px] text-[#686868] transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          strokeWidth={2}
        />
      </div>

      {/* Open Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] bg-white border border-[#DEDEDE] rounded-[6px] p-[6px] shadow-[0px_4px_16px_rgba(0,0,0,0.15)] z-50 doc-popover-menu"
          data-testid="area-select-menu"
        >
          {VALID_AREAS.map((areaKey) => {
            const isSelected = area === areaKey;
            return (
              <button
                key={areaKey}
                type="button"
                onClick={() => {
                  onSelectArea(areaKey);
                  setIsOpen(false);
                }}
                className={`w-full h-[36px] px-[12px] rounded-[4px] flex items-center justify-between font-varela text-[14px] text-left transition-colors border-none ${
                  isSelected
                    ? "bg-[#EBF9EC] text-[#158019] font-medium"
                    : "bg-transparent text-[#171717] hover:bg-[#F5F5F5]"
                }`}
                data-testid={`area-option-${areaKey}`}
              >
                <span>{AREA_LABELS[areaKey]}</span>
                {isSelected && (
                  <FiCheck className="text-[#158019] w-[14px] h-[14px]" strokeWidth={2.5} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AreaSelectDropdown;
