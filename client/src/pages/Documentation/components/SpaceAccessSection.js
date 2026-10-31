import React from "react";
import MemberPicker from "./MemberPicker";

/**
 * SpaceAccessSection component for SpaceFormScreen.
 * Handles 2-column permission settings: Access (view) & Update permissions,
 * including radio choices and MemberPicker multi-select chip UI.
 */
const SpaceAccessSection = ({
  hasProject,
  accessType,
  setAccessType,
  updateType,
  setUpdateType,
  accessMembers,
  setAccessMembers,
  updateMembers,
  setUpdateMembers,
  members,
  errors,
  setErrors,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-[48px] mb-[24px]">
      {/* Left Column: Access */}
      <div className="flex flex-col">
        <h3 className="font-varela text-[18px] text-[#171717] font-normal mb-[6px]">Access</h3>
        <p className="font-varela text-[13px] text-[#686868] mb-[16px]">
          Who can view and open document links?
        </p>

        <div className="flex flex-col gap-[14px]">
          {/* Option: All */}
          <label className="flex items-center gap-[10px] cursor-pointer select-none">
            <input
              type="radio"
              name="accessType"
              value="all"
              checked={accessType === "all"}
              onChange={() => setAccessType("all")}
              className="doc-radio"
              data-testid="access-radio-all"
            />
            <span className="font-varela text-[14px] text-[#171717]">All</span>
          </label>

          {/* Option: Project members (ONLY shown if project linked) */}
          {hasProject && (
            <label className="flex items-center gap-[10px] cursor-pointer select-none">
              <input
                type="radio"
                name="accessType"
                value="project_members"
                checked={accessType === "project_members"}
                onChange={() => setAccessType("project_members")}
                className="doc-radio"
                data-testid="access-radio-project-members"
              />
              <span className="font-varela text-[14px] text-[#171717]">Project members</span>
            </label>
          )}

          {/* Option: Selected members */}
          <label className="flex items-center gap-[10px] cursor-pointer select-none">
            <input
              type="radio"
              name="accessType"
              value="selected"
              checked={accessType === "selected"}
              onChange={() => setAccessType("selected")}
              className="doc-radio"
              data-testid="access-radio-selected"
            />
            <span className="font-varela text-[14px] text-[#171717]">Selected members</span>
          </label>

          {/* Member Picker when accessType === "selected" */}
          {accessType === "selected" && (
            <div className="mt-[4px] pl-[26px]">
              <MemberPicker
                members={members}
                selectedIds={accessMembers}
                onChange={(ids) => {
                  setAccessMembers(ids);
                  if (errors.accessMembers) setErrors({ ...errors, accessMembers: null });
                }}
                error={errors.accessMembers}
              />
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Update permissions */}
      <div className="flex flex-col">
        <h3 className="font-varela text-[18px] text-[#171717] font-normal mb-[6px]">
          Update permissions
        </h3>
        <p className="font-varela text-[13px] text-[#686868] mb-[16px]">
          Who can add, edit and archive document links?
        </p>

        <div className="flex flex-col gap-[14px]">
          {/* Option: All */}
          <label className="flex items-center gap-[10px] cursor-pointer select-none">
            <input
              type="radio"
              name="updateType"
              value="all"
              checked={updateType === "all"}
              onChange={() => setUpdateType("all")}
              className="doc-radio"
              data-testid="update-radio-all"
            />
            <span className="font-varela text-[14px] text-[#171717]">All</span>
          </label>

          {/* Option: Project members (ONLY shown if project linked) */}
          {hasProject && (
            <label className="flex items-center gap-[10px] cursor-pointer select-none">
              <input
                type="radio"
                name="updateType"
                value="project_members"
                checked={updateType === "project_members"}
                onChange={() => setUpdateType("project_members")}
                className="doc-radio"
                data-testid="update-radio-project-members"
              />
              <span className="font-varela text-[14px] text-[#171717]">Project members</span>
            </label>
          )}

          {/* Option: Selected members */}
          <label className="flex items-center gap-[10px] cursor-pointer select-none">
            <input
              type="radio"
              name="updateType"
              value="selected"
              checked={updateType === "selected"}
              onChange={() => setUpdateType("selected")}
              className="doc-radio"
              data-testid="update-radio-selected"
            />
            <span className="font-varela text-[14px] text-[#171717]">Selected members</span>
          </label>

          {/* Member Picker when updateType === "selected" */}
          {updateType === "selected" && (
            <div className="mt-[4px] pl-[26px]">
              <MemberPicker
                members={members}
                selectedIds={updateMembers}
                onChange={(ids) => {
                  setUpdateMembers(ids);
                  if (errors.updateMembers) setErrors({ ...errors, updateMembers: null });
                }}
                error={errors.updateMembers}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpaceAccessSection;
