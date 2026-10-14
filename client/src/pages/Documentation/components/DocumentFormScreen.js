import React, { useState, useRef, useEffect } from "react";
import InfoBanner from "./InfoBanner";
import {
  VALID_AREAS,
  AREA_LABELS,
  getProviderDisplayName,
} from "../documentationApi";

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
  const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [errors, setErrors] = useState({});

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsAreaDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
            <div
              className="w-full h-[60px] bg-[#F5F5F5] rounded-[6px] px-[16px] flex items-center gap-[12px] mb-[16px]"
              data-testid="saved-link-box"
            >
              <svg
                className="w-[18px] h-[18px] text-[#686868] flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <div className="flex flex-col">
                <span className="font-varela text-[14px] text-[#171717] leading-none">
                  {getProviderDisplayName(initialDocument?.provider)}
                </span>
                <span className="font-varela text-[12px] text-[#686868] mt-[4px]">
                  An external document link is saved.
                </span>
              </div>
            </div>

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
        <div className="flex flex-col mb-[20px] relative" ref={dropdownRef}>
          <label className="font-varela text-[14px] text-[#171717] mb-[8px]">
            Area <span className="text-[#171717]">*</span>
          </label>
          <div
            onClick={() => setIsAreaDropdownOpen(!isAreaDropdownOpen)}
            className="doc-input h-[46px] px-[16px] flex items-center justify-between cursor-pointer bg-white"
            data-testid="area-select-trigger"
          >
            <span className="font-varela text-[15px] text-[#171717]">
              {AREA_LABELS[area] || "Select Area"}
            </span>
            <svg
              className={`w-[14px] h-[14px] text-[#686868] transition-transform ${
                isAreaDropdownOpen ? "rotate-180" : ""
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

          {/* Open Dropdown Menu */}
          {isAreaDropdownOpen && (
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
                      setArea(areaKey);
                      setIsAreaDropdownOpen(false);
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
                      <span className="text-[#158019] font-bold text-[14px]">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

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
