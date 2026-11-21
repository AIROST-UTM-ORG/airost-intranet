import React from "react";
import { FiChevronDown } from "react-icons/fi";
import InfoBanner from "./InfoBanner";
import SpaceFormHeader from "./SpaceFormHeader";
import SpaceAccessSection from "./SpaceAccessSection";
import { useSpaceForm } from "../hooks/useSpaceForm";

/**
 * SpaceFormScreen - Covers Screens 5, 6, and 7 (< 150 lines)
 */
const SpaceFormScreen = ({
  initialSpace = null,
  projects = [],
  members = [],
  projectsError = null,
  membersError = null,
  onRetryAux = null,
  onSubmit,
  onCancel,
  submitting = false,
  serverError = null,
}) => {
  const form = useSpaceForm({ initialSpace, projectsError, membersError, serverError, onSubmit });
  const { isEditing, hasProject, title, setTitle, projectId, setProjectId, description, setDescription, errors, setErrors, handleSubmit } = form;

  const renderAuxError = (error, testId, retryTestId) =>
    error ? (
      <div className="alert alert-error text-[13px] py-2 mb-4 flex items-center justify-between" data-testid={testId}>
        <span>{error}</span>
        {onRetryAux && (
          <button type="button" onClick={onRetryAux} className="btn btn-xs btn-outline" data-testid={retryTestId}>
            Retry
          </button>
        )}
      </div>
    ) : null;

  return (
    <div className="w-full max-w-[959px] mx-auto pb-12 font-varela" data-testid="space-form-screen">
      <SpaceFormHeader isEditing={isEditing} hasProject={hasProject} initialTitle={initialSpace?.title} />

      <form onSubmit={handleSubmit} className="doc-form-card w-full p-[28px] md:p-[32px]" data-testid="space-form">
        {serverError && (
          <div className="mb-6 p-4 rounded bg-red-50 border border-red-200 text-red-700 text-[14px]" data-testid="space-form-server-error">
            {typeof serverError === "string" ? serverError : serverError?.message}
          </div>
        )}
        {renderAuxError(projectsError, "projects-error-banner", "retry-projects-btn")}
        {renderAuxError(membersError, "members-error-banner", "retry-members-btn")}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-[24px] mb-[20px]">
          <div className="md:col-span-8 flex flex-col">
            <label className="font-varela text-[14px] text-[#171717] mb-[8px]">Title <span className="text-[#171717]">*</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); if (errors.title) setErrors({ ...errors, title: null }); }}
              placeholder="e.g. Engineering Handbook"
              maxLength={120}
              className={`doc-input h-[46px] px-[16px] ${errors.title ? "border-red-400" : ""}`}
              data-testid="space-title-input"
            />
            {errors.title && <span className="text-red-500 text-[12px] mt-1">{errors.title}</span>}
          </div>

          <div className="md:col-span-4 flex flex-col">
            <label className="font-varela text-[14px] text-[#171717] mb-[8px]">Project</label>
            <div className="relative">
              <select
                value={projectId || ""}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={Boolean(projectsError)}
                className={`doc-input h-[46px] px-[16px] pr-[36px] w-full appearance-none cursor-pointer bg-white ${projectsError ? "border-red-400" : ""}`}
                data-testid="space-project-select"
              >
                <option value="">No project</option>
                {projects.map((p) => (<option key={p._id} value={p._id}>{p.title}</option>))}
              </select>
              <div className="absolute right-[14px] top-[16px] pointer-events-none text-[#686868]">
                <FiChevronDown className="w-[14px] h-[14px]" strokeWidth={2} />
              </div>
            </div>
            {projectsError && <span className="text-red-500 text-[12px] mt-1" data-testid="projects-error-text">{projectsError}</span>}
          </div>
        </div>

        <div className="flex flex-col mb-[24px]">
          <label className="font-varela text-[14px] text-[#171717] mb-[8px]">Description <span className="text-[#171717]">*</span></label>
          <textarea
            value={description}
            onChange={(e) => { setDescription(e.target.value); if (errors.description) setErrors({ ...errors, description: null }); }}
            placeholder="Technical references and delivery guides for the team."
            maxLength={1000}
            rows={3}
            className={`doc-input py-[12px] px-[16px] min-h-[68px] resize-y ${errors.description ? "border-red-400" : ""}`}
            data-testid="space-description-input"
          />
          {errors.description && <span className="text-red-500 text-[12px] mt-1">{errors.description}</span>}
        </div>

        <SpaceAccessSection {...form} members={members} />

        <InfoBanner className="mb-[24px]" />

        <div className="flex items-center justify-end gap-[12px]">
          <button type="button" onClick={onCancel} disabled={submitting} className="doc-btn-secondary w-[84px] h-[42px] text-[14px]" data-testid="cancel-space-btn">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || Boolean(projectsError) || Boolean(membersError)}
            className={`doc-btn-primary h-[42px] px-[24px] text-[14px] ${isEditing ? "min-w-[132px]" : "min-w-[126px]"}`}
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
