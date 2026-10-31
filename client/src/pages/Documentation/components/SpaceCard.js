import React from "react";
import { FiMoreHorizontal, FiEdit2, FiUsers } from "react-icons/fi";

/**
 * Individual SpaceCard for Screen 1 and Screen 4.
 */
const SpaceCard = ({
  space,
  isMenuOpen,
  menuRef,
  onToggleMenu,
  onOpenSpace,
  onEditSpace,
  onManagePermissions,
}) => {
  const isProjectLinked = Boolean(space.projectId && space.projectId.title);

  return (
    <div
      className="doc-card w-full h-[149px] p-[24px] flex justify-between relative transition-shadow hover:shadow-[0_6px_12px_rgba(0,0,0,0.1)]"
      data-testid={`space-card-${space._id}`}
    >
      {/* Left Detail Stack */}
      <div className="flex flex-col justify-between flex-1 pr-[24px]">
        <div>
          <h3 className="font-varela text-[28px] text-[#171717] leading-none mb-[8px] font-normal truncate">
            {space.title}
          </h3>
          <div className="font-varela text-[14px] flex items-center gap-[6px] mb-[8px]">
            {isProjectLinked ? (
              <>
                <span className="text-[#171717]">Project: {space.projectId.title}</span>
                <span className="text-[#686868]">·</span>
                <span className="text-[#686868]">
                  {space.activeDocumentCount ?? space.documentCount ?? 0} documents
                </span>
              </>
            ) : (
              <>
                <span className="text-[#171717]">No project · Standalone space</span>
                <span className="text-[#686868]">·</span>
                <span className="text-[#686868]">
                  {space.activeDocumentCount ?? space.documentCount ?? 0} documents
                </span>
              </>
            )}
          </div>
        </div>
        <p className="font-varela text-[14px] text-[#686868] line-clamp-1 leading-[150%] m-0">
          {space.description}
        </p>
      </div>

      {/* Right Action Stack */}
      <div className="flex flex-col items-end justify-between flex-shrink-0 relative">
        {/* Overflow Button (Shown if user has manager rights) */}
        {Boolean(space.isManager || space.canManage) ? (
          <div className="relative">
            <button
              type="button"
              onClick={onToggleMenu}
              className="w-[26px] h-[26px] flex items-center justify-center text-[#171717] hover:bg-[#F5F5F5] rounded transition-colors focus:outline-none"
              aria-label={`Options for ${space.title}`}
              data-testid={`space-menu-trigger-${space._id}`}
            >
              <FiMoreHorizontal className="w-[20px] h-[20px]" strokeWidth={2} />
            </button>

            {/* Screen 4: Floating Manager Menu */}
            {isMenuOpen && (
              <div
                ref={menuRef}
                className="doc-popover-menu absolute right-0 top-[30px] w-[190px] py-[8px]"
                data-testid={`space-menu-${space._id}`}
              >
                <button
                  type="button"
                  onClick={() => onEditSpace(space)}
                  className="doc-menu-item"
                  data-testid="edit-space-menu-item"
                >
                  <FiEdit2 className="w-[16px] h-[16px] text-[#171717]" strokeWidth={2} />
                  <span>Edit space</span>
                </button>
                <button
                  type="button"
                  onClick={() => onManagePermissions(space)}
                  className="doc-menu-item"
                  data-testid="manage-permissions-menu-item"
                >
                  <FiUsers className="w-[16px] h-[16px] text-[#171717]" strokeWidth={2} />
                  <span>Manage permissions</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="w-[26px] h-[26px]"></div>
        )}

        {/* Open Button */}
        <button
          type="button"
          onClick={() => onOpenSpace(space)}
          className="doc-btn-secondary w-[76px] h-[40px] text-[15px]"
          data-testid={`open-space-btn-${space._id}`}
        >
          Open
        </button>
      </div>
    </div>
  );
};

export default SpaceCard;
