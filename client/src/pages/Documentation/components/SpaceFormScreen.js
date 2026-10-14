import React, { useState, useEffect } from "react";
import InfoBanner from "./InfoBanner";
import MemberPicker from "./MemberPicker";

/**
 * SpaceFormScreen - Covers Screens 5, 6, and 7
 * Handles both Create (Project-linked or Standalone) and Edit Space (Manager)
 */
const SpaceFormScreen = ({
  initialSpace = null, // null for create, object for edit
  projects = [],
  members = [],
  onSubmit,
  onCancel,
  submitting = false,
  serverError = null,
}) => {
  const isEditing = Boolean(initialSpace && initialSpace._id);

  // Form State
  const [title, setTitle] = useState(initialSpace?.title || "");
  const [projectId, setProjectId] = useState(
    initialSpace?.projectId?._id || (initialSpace?.projectId ? initialSpace.projectId : "")
  );
  const [description, setDescription] = useState(initialSpace?.description || "");
  const [accessType, setAccessType] = useState(initialSpace?.accessType || "project_members");
  const [updateType, setUpdateType] = useState(initialSpace?.updateType || "selected");
  const [accessMembers, setAccessMembers] = useState(
    (initialSpace?.accessMembers || []).map((m) => (typeof m === "object" ? m._id : m))
  );
  const [updateMembers, setUpdateMembers] = useState(
    (initialSpace?.updateMembers || []).map((m) => (typeof m === "object" ? m._id : m))
  );

  // Validation state
  const [errors, setErrors] = useState({});

  const hasProject = Boolean(projectId && projectId !== "");

  // If project is set to "No project" (Standalone), automatically remove "project_members"
  useEffect(() => {
    if (!hasProject) {
      if (accessType === "project_members") {
        setAccessType("all");
      }
      if (updateType === "project_members") {
        setUpdateType("selected");
      }
    }
  }, [hasProject, accessType, updateType]);

  // Map backend field-level validation errors (400 VALIDATION_ERROR details)
  useEffect(() => {
    if (serverError && typeof serverError === "object" && Array.isArray(serverError.details)) {
      const fieldErrs = {};
      serverError.details.forEach((d) => {
        if (d.field) fieldErrs[d.field] = d.message;
      });
      if (Object.keys(fieldErrs).length > 0) {
        setErrors((prev) => ({ ...prev, ...fieldErrs }));
      }
    }
  }, [serverError]);

  const validate = () => {
    const errs = {};
    if (!title.trim()) {
      errs.title = "Title is required";
    } else if (title.trim().length > 120) {
      errs.title = "Title must be 120 characters or fewer";
    }

    if (!description.trim()) {
      errs.description = "Description is required";
    } else if (description.trim().length > 1000) {
      errs.description = "Description must be 1000 characters or fewer";
    }

    if (accessType === "selected" && accessMembers.length === 0) {
      errs.accessMembers = "Please select at least one member for access";
    }

    if (updateType === "selected" && updateMembers.length === 0) {
      errs.updateMembers = "Please select at least one member for update permissions";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      title: title.trim(),
      description: description.trim(),
      projectId: hasProject ? projectId : null,
      accessType,
      updateType,
      accessMembers: accessType === "selected" ? accessMembers : [],
      updateMembers: updateType === "selected" ? updateMembers : [],
    };

    onSubmit(payload);
  };

  // Determine Subtitle according to Screen 5, 6, 7
  let subtitleText = "";
  if (isEditing) {
    subtitleText = `${initialSpace.title || "Space"} · Manager access`;
  } else if (hasProject) {
    subtitleText = "Organize external document links and choose who can access and update them.";
  } else {
    subtitleText =
      "A standalone space brings shared knowledge together without linking to a project.";
  }

  return (
    <div className="w-full max-w-[959px] mx-auto pb-12 font-varela" data-testid="space-form-screen">
      {/* Page Header */}
      <div className="mb-[24px]">
        <h1 className="doc-page-title" data-testid="space-form-title">
          {isEditing ? "Edit Documentation Space" : "Create Documentation Space"}
        </h1>
        <p className="font-varela text-[14px] text-[#686868] mt-[12px]" data-testid="space-form-subtitle">
          {subtitleText}
        </p>
      </div>

      {/* Main Form Card */}
      <form
        onSubmit={handleSubmit}
        className="doc-form-card w-full p-[28px] md:p-[32px]"
        data-testid="space-form"
      >
        {serverError && (
          <div
            className="mb-6 p-4 rounded bg-red-50 border border-red-200 text-red-700 text-[14px]"
            data-testid="space-form-server-error"
          >
            {typeof serverError === "string" ? serverError : serverError?.message}
          </div>
        )}

        {/* Row 1: Title (65%) & Project (35%) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-[24px] mb-[20px]">
          {/* Title */}
          <div className="md:col-span-8 flex flex-col">
            <label className="font-varela text-[14px] text-[#171717] mb-[8px]">
              Title <span className="text-[#171717]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors({ ...errors, title: null });
              }}
              placeholder="e.g. Engineering Handbook"
              maxLength={120}
              className={`doc-input h-[46px] px-[16px] ${
                errors.title ? "border-red-400" : ""
              }`}
              data-testid="space-title-input"
            />
            {errors.title && (
              <span className="text-red-500 text-[12px] mt-1">{errors.title}</span>
            )}
          </div>

          {/* Project Dropdown */}
          <div className="md:col-span-4 flex flex-col">
            <label className="font-varela text-[14px] text-[#171717] mb-[8px]">Project</label>
            <div className="relative">
              <select
                value={projectId || ""}
                onChange={(e) => setProjectId(e.target.value)}
                className="doc-input h-[46px] px-[16px] pr-[36px] w-full appearance-none cursor-pointer bg-white"
                data-testid="space-project-select"
              >
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.title}
                  </option>
                ))}
              </select>
              <div className="absolute right-[14px] top-[16px] pointer-events-none text-[#686868]">
                <svg
                  className="w-[14px] h-[14px]"
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
            </div>
          </div>
        </div>

        {/* Row 2: Description */}
        <div className="flex flex-col mb-[24px]">
          <label className="font-varela text-[14px] text-[#171717] mb-[8px]">
            Description <span className="text-[#171717]">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) setErrors({ ...errors, description: null });
            }}
            placeholder="Technical references and delivery guides for the team."
            maxLength={1000}
            rows={3}
            className={`doc-input py-[12px] px-[16px] min-h-[68px] resize-y ${
              errors.description ? "border-red-400" : ""
            }`}
            data-testid="space-description-input"
          />
          {errors.description && (
            <span className="text-red-500 text-[12px] mt-1">{errors.description}</span>
          )}
        </div>

        {/* Row 3: 2-Column Permissions Grid */}
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

              {/* Option: Project members (ONLY shown if project linked per Screen 5 vs Screen 6) */}
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

              {/* Option: Project members (ONLY shown if project linked per Screen 5 vs Screen 6) */}
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

        {/* Row 4: Shared Info Banner */}
        <InfoBanner className="mb-[24px]" />

        {/* Row 5: Footer Actions */}
        <div className="flex items-center justify-end gap-[12px]">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="doc-btn-secondary w-[84px] h-[42px] text-[14px]"
            data-testid="cancel-space-btn"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`doc-btn-primary h-[42px] px-[24px] text-[14px] ${
              isEditing ? "min-w-[132px]" : "min-w-[126px]"
            }`}
            data-testid="submit-space-btn"
          >
            <span className="font-varela text-[14px] capitalize">
              {submitting ? "Saving..." : isEditing ? "Save Changes" : "Create Space"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default SpaceFormScreen;
