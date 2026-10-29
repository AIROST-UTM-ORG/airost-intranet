import React, { useState, useEffect } from "react";
import { FiChevronDown } from "react-icons/fi";
import InfoBanner from "./InfoBanner";
import SpaceFormHeader from "./SpaceFormHeader";
import SpaceAccessSection from "./SpaceAccessSection";

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

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const nextProjectId =
      initialSpace?.projectId?._id || (initialSpace?.projectId ? initialSpace.projectId : "");
    if (nextProjectId && !projectId) {
      setProjectId(nextProjectId);
    }
  }, [initialSpace?.projectId, projectId]);

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

  return (
    <div className="w-full max-w-[959px] mx-auto pb-12 font-varela" data-testid="space-form-screen">
      {/* Page Header */}
      <SpaceFormHeader
        isEditing={isEditing}
        hasProject={hasProject}
        initialTitle={initialSpace?.title}
      />

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
                <FiChevronDown className="w-[14px] h-[14px]" strokeWidth={2} />
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
        <SpaceAccessSection
          hasProject={hasProject}
          accessType={accessType}
          setAccessType={setAccessType}
          updateType={updateType}
          setUpdateType={setUpdateType}
          accessMembers={accessMembers}
          setAccessMembers={setAccessMembers}
          updateMembers={updateMembers}
          setUpdateMembers={setUpdateMembers}
          members={members}
          errors={errors}
          setErrors={setErrors}
        />

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
