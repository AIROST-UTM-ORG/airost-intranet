import React, { useState, useRef, useEffect } from "react";

/**
 * Member Multi-Select Component
 * Used in Screen 5, 6, 7 under "Selected members"
 */
const MemberPicker = ({ members = [], selectedIds = [], onChange, error = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleMember = (memberId) => {
    if (selectedIds.includes(memberId)) {
      onChange(selectedIds.filter((id) => id !== memberId));
    } else {
      onChange([...selectedIds, memberId]);
    }
  };

  const handleRemovePill = (e, memberId) => {
    e.stopPropagation();
    onChange(selectedIds.filter((id) => id !== memberId));
  };

  const filteredMembers = members.filter((m) =>
    (m.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedMembers = selectedIds.map((id) => {
    const found = members.find((m) => m._id === id);
    return found || { _id: id, name: "Member" };
  });

  return (
    <div className="relative w-full" ref={containerRef} data-testid="member-picker">
      {/* Top Input Box with Selected Pills */}
      <div
        className={`w-full min-h-[44px] border ${
          error ? "border-red-400" : isOpen ? "border-[#0DC414]" : "border-[#DEDEDE]"
        } rounded-[6px] px-[12px] py-[6px] bg-white flex items-center justify-between cursor-pointer flex-wrap gap-[6px] transition-colors`}
        onClick={() => setIsOpen(!isOpen)}
        data-testid="member-picker-trigger"
      >
        <div className="flex flex-wrap items-center gap-[6px] flex-1">
          {selectedMembers.length === 0 ? (
            <span className="font-varela text-[13px] text-[#686868]">Select members...</span>
          ) : (
            selectedMembers.map((member) => (
              <span
                key={member._id}
                className="inline-flex items-center gap-[6px] bg-[#F5F5F5] rounded-[12px] px-[10px] py-[4px] font-varela text-[13px] text-[#171717]"
              >
                {member.name}
                <button
                  type="button"
                  onClick={(e) => handleRemovePill(e, member._id)}
                  className="text-[#686868] hover:text-[#171717] focus:outline-none"
                  aria-label={`Remove ${member.name}`}
                  data-testid={`remove-member-${member.name}`}
                >
                  ✕
                </button>
              </span>
            ))
          )}
        </div>
        <svg
          className={`w-[14px] h-[14px] text-[#686868] ml-2 flex-shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {error && <p className="text-red-500 font-varela text-[12px] mt-1">{error}</p>}

      {/* Expandable Dropdown Box */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+8px)] bg-white border border-[#DEDEDE] rounded-[6px] p-[12px] shadow-[0px_4px_16px_rgba(0,0,0,0.15)] z-50 doc-popover-menu"
          data-testid="member-picker-dropdown"
        >
          {/* Search Row */}
          <div className="flex items-center gap-[8px] border-b border-[#F0F0F0] pb-[8px] mb-[10px]">
            <svg
              className="w-[14px] h-[14px] text-[#686868] flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="w-full font-varela text-[13px] text-[#171717] placeholder-[#686868] outline-none bg-transparent"
              placeholder="Search members"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              data-testid="member-picker-search"
            />
          </div>

          {/* Members Checkbox List */}
          <div className="max-h-[170px] overflow-y-auto doc-scrollbar flex flex-col gap-[10px]">
            {filteredMembers.length === 0 ? (
              <span className="font-varela text-[13px] text-[#686868] py-2 text-center">
                No members found
              </span>
            ) : (
              filteredMembers.map((member) => {
                const isChecked = selectedIds.includes(member._id);
                return (
                  <label
                    key={member._id}
                    className="flex items-center gap-[10px] cursor-pointer select-none group"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      className="doc-checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleMember(member._id)}
                      data-testid={`member-checkbox-${member.name}`}
                    />
                    <span className="font-varela text-[14px] text-[#171717] group-hover:text-black">
                      {member.name}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberPicker;
