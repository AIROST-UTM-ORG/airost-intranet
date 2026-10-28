import React, { useState, useEffect } from "react";
import InfoBanner from "./InfoBanner";
import DocumentLinkPreview from "./DocumentLinkPreview";
import AreaSelectDropdown from "./AreaSelectDropdown";
import { AREA_LABELS } from "../../../services/documentation";

/**
 * DocumentFormScreen - Covers Screen 12 (Add Document) and Screen 13 (Edit Document)
 */
const DocumentFormScreen = ({
  space,
  initialDocument = null, // null for create, object for edit
  initialArea = "development",
  onSubmit,
  onCancel,
  submitting = false,
  serverError = null,
}) => {
  const isEditing = Boolean(initialDocument && initialDocument._id);

  const [title, setTitle] = useState(initialDocument?.title || "");
  const [url, setUrl] = useState(isEditing ? "" : initialDocument?.url || "");
  const [area, setArea] = useState(initialDocument?.area || initialArea || "general");
  const [errors, setErrors] = useState({});

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

    if (!isEditing) {
      if (!url.trim()) {
        errs.url = "Link URL is required";
      } else {
        try {
          const parsed = new URL(url.trim());
          if (parsed.protocol !== "https:") {
            errs.url = "Only HTTPS URLs are allowed";
          }
        } catch {
          errs.url = "Please enter a valid URL format (e.g. https://docs.google.com/...)";
        }
      }
    } else {
      // In edit mode, replace link is optional. If provided, must be https
      if (url.trim()) {
        try {
          const parsed = new URL(url.trim());
          if (parsed.protocol !== "https:") {
            errs.url = "Only HTTPS URLs are allowed";
          }
        } catch {
          errs.url = "Please enter a valid URL format (e.g. https://docs.google.com/...)";
        }
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      title: title.trim(),
      area,
    };

    if (!isEditing || url.trim()) {
      payload.url = url.trim();
    }

    onSubmit(payload);
  };

  // Subtitle per Screen 12 & Screen 13
  const isProjectLinked = Boolean(space?.projectId && space.projectId.title);
  const subtitle = isEditing
    ? `${space?.title || "Space"} · ${AREA_LABELS[area] || "General"}`
    : `${space?.title || "Space"} · ${
        isProjectLinked ? space.projectId.title : "Standalone space"
      }`;

  return (
    <div className="w-full max-w-[959px] mx-auto pb-12 font-varela" data-testid="document-form-screen">
      {/* Top Back Navigation Link */}
      <button
        type="button"
        onClick={onCancel}
        className="flex items-center gap-[8px] text-[#686868] hover:text-[#171717] font-varela text-[14px] mb-[12px] focus:outline-none transition-colors"
        data-testid="back-to-space-btn"
      >
        <span className="text-[14px]">←</span>
        <span>Back to {space?.title || "Space"}</span>
      </button>

      {/* Page Header */}
      <div className="mb-[24px]">
        <h1 className="doc-page-title" data-testid="doc-form-title">
          {isEditing ? "Edit Document" : "Add Document"}
        </h1>
        <p className="font-varela text-[14px] text-[#686868] mt-[10px]" data-testid="doc-form-subtitle">
          {subtitle}
        </p>
      </div>

      {/* Form Container Card */}
      <form
        onSubmit={handleSubmit}
        className="doc-form-card w-full p-[28px] md:p-[32px]"
        data-testid="document-form"
      >
        {serverError && (
          <div
            className="mb-6 p-4 rounded bg-red-50 border border-red-200 text-red-700 text-[14px]"
            data-testid="doc-form-server-error"
          >
            {typeof serverError === "string" ? serverError : serverError?.message}
          </div>
        )}

        {/* Field 1 — Title */}
        <div className="flex flex-col mb-[20px]">
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
            placeholder="Enter a document title"
            maxLength={120}
            className={`doc-input h-[46px] px-[16px] ${
              errors.title ? "border-red-400" : ""
            }`}
            data-testid="doc-title-input"
          />
          {errors.title && (
            <span className="text-red-500 text-[12px] mt-1">{errors.title}</span>
          )}
        </div>

        {/* Screen 12: Link Input vs Screen 13: Saved Link Summary + Replace Link */}
        {!isEditing ? (
          /* Screen 12: Field 2 — Link */
          <div className="flex flex-col mb-[20px]">
            <label className="font-varela text-[14px] text-[#171717] mb-[8px]">
              Link <span className="text-[#171717]">*</span>
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (errors.url) setErrors({ ...errors, url: null });
              }}
              placeholder="Paste the Document Link"
              maxLength={2048}
              className={`doc-input h-[46px] px-[16px] ${
                errors.url ? "border-red-400" : ""
              }`}
              data-testid="doc-link-input"
            />
            {errors.url ? (
              <span className="text-red-500 text-[12px] mt-1">{errors.url}</span>
            ) : (
              <span className="font-varela text-[13px] text-[#686868] mt-[8px]">
                Only the external link is stored. Document content is never imported.
              </span>
            )}
          </div>
        ) : (
          /* Screen 13: Field 2 — Saved Link Summary & Field 3 — Replace Link */
          <div className="mb-[20px]">
            <label className="font-varela text-[14px] text-[#171717] mb-[8px] block">
              Link <span className="text-[#171717]">*</span>
            </label>
            {/* Saved Link Read-only Box */}
            <DocumentLinkPreview provider={initialDocument?.provider} />

            {/* Replace Link Optional Input */}
            <div className="flex flex-col">
              <label className="font-varela text-[14px] text-[#171717] mb-[8px]">
                Replace link
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (errors.url) setErrors({ ...errors, url: null });
                }}
                placeholder="Paste the Document Link"
                maxLength={2048}
                className={`doc-input h-[46px] px-[16px] ${
                  errors.url ? "border-red-400" : ""
                }`}
                data-testid="doc-replace-link-input"
              />
              {errors.url ? (
                <span className="text-red-500 text-[12px] mt-1">{errors.url}</span>
              ) : (
                <span className="font-varela text-[13px] text-[#686868] mt-[8px]">
                  Leave empty to keep the current link. Only the link record is updated.
                </span>
              )}
            </div>
          </div>
        )}

        {/* Field — Area Custom Dropdown */}
        <AreaSelectDropdown area={area} onSelectArea={setArea} />

        {/* Info Banner */}
        <InfoBanner className="mb-[24px]" />

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-[12px]">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="doc-btn-secondary w-[84px] h-[42px] text-[14px]"
            data-testid="cancel-doc-btn"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="doc-btn-primary h-[42px] px-[24px] min-w-[132px] text-[14px]"
            data-testid="submit-doc-btn"
          >
            <span className="font-varela text-[14px] capitalize">
              {submitting ? "Saving..." : isEditing ? "Save Changes" : "Add Document"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default DocumentFormScreen;
