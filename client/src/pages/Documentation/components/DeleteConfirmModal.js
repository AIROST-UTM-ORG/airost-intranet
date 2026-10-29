import React, { useState, useEffect, useRef } from "react";
import { FiX, FiRefreshCw } from "react-icons/fi";

/**
 * Accessible Confirmation Modal for Destructive Actions
 * Complies with WAI-ARIA Dialog (Modal) Pattern:
 * - role="dialog", aria-modal="true", aria-labelledby
 * - Focus placed into modal on open
 * - Focus restored to trigger on close
 * - Escape key closes without action
 * - Focus trapped inside modal while open
 */
const DeleteConfirmModal = ({
  isOpen = false,
  title,
  description,
  requireMatchText = "",
  inputLabel = "Type to confirm:",
  inputPlaceholder = "",
  confirmButtonText = "Delete",
  cancelButtonText = "Cancel",
  onConfirm,
  onCancel,
  isSubmitting = false,
  error = null,
  onRetry = null,
  onItemAlreadyDeleted = null,
  triggerRef = null,
  dataTestId = "delete-confirm-modal",
}) => {
  const [typedText, setTypedText] = useState("");
  const modalRef = useRef(null);
  const inputRef = useRef(null);
  const cancelBtnRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  // Cache trigger element and manage focus on open/close
  useEffect(() => {
    if (isOpen) {
      const activeEl = triggerRef?.current || document.activeElement;
      previousActiveElementRef.current = activeEl;
      setTypedText("");

      // Move focus inside after DOM paint
      const timer = setTimeout(() => {
        if (requireMatchText && inputRef.current) {
          inputRef.current.focus();
        } else if (cancelBtnRef.current) {
          cancelBtnRef.current.focus();
        }
      }, 30);

      const triggerEl = triggerRef?.current;
      return () => {
        clearTimeout(timer);
        const target = previousActiveElementRef.current || triggerEl;
        if (target && typeof target.focus === "function") {
          target.focus();
          setTimeout(() => {
            target.focus();
          }, 0);
        }
      };
    }
  }, [isOpen, requireMatchText, triggerRef]);

  // Escape key and focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape" || e.code === "Escape") {
        e.preventDefault();
        if (!isSubmitting) {
          onCancel();
        }
        return;
      }

      if (e.key === "Tab") {
        if (!modalRef.current) return;
        const focusableElements = modalRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const focusable = Array.from(focusableElements);
        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onCancel]);

  if (!isOpen) return null;

  const isMatchValid = !requireMatchText || typedText === requireMatchText;
  const isConfirmDisabled = isSubmitting || !isMatchValid;

  // Categorize error if present
  const status = error?.response?.status || error?.status;
  const errorCode = error?.response?.data?.error?.code || error?.code;
  const errorMessage =
    error?.response?.data?.error?.message || error?.message || "";

  const is403 = status === 403 || errorCode === "FORBIDDEN";
  const is404 = status === 404 || errorCode === "NOT_FOUND";
  const is500OrNetwork =
    status >= 500 ||
    errorCode === "INTERNAL_ERROR" ||
    errorCode === "NETWORK_ERROR" ||
    errorCode === "TIMEOUT";

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onCancel();
    }
  };

  return (
    <div
      className="doc-modal-backdrop"
      onClick={handleBackdropClick}
      data-testid={dataTestId}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        className="doc-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between mb-4">
          <h2
            id="delete-modal-title"
            className="font-varela text-[20px] font-bold text-[#171717] leading-tight m-0"
            data-testid="delete-modal-title"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-[#686868] hover:text-[#171717] p-1 rounded transition-colors focus:outline-none"
            aria-label="Close dialog"
            data-testid="delete-modal-close-x"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Description */}
        <div className="font-varela text-[14px] text-[#686868] leading-[150%] mb-4 space-y-2">
          {typeof description === "string" ? (
            <p className="m-0" data-testid="delete-modal-desc">
              {description}
            </p>
          ) : (
            description
          )}
        </div>

        {/* Exact Match Input (if required) */}
        {Boolean(requireMatchText) && (
          <div className="mb-4">
            <label
              htmlFor="confirm-title-input"
              className="block font-varela text-[13px] text-[#171717] mb-2 font-medium"
            >
              {inputLabel}
            </label>
            <input
              ref={inputRef}
              id="confirm-title-input"
              type="text"
              value={typedText}
              disabled={isSubmitting}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder={inputPlaceholder || requireMatchText}
              className="doc-input w-full h-[40px] px-3 text-[14px]"
              autoComplete="off"
              data-testid="delete-confirm-input"
            />
            {typedText && !isMatchValid && (
              <p className="font-varela text-[12px] text-red-600 mt-1 mb-0">
                Title does not match
              </p>
            )}
          </div>
        )}

        {/* Inline Error Banner */}
        {error && (
          <div
            className="p-3 mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 font-varela text-[13px]"
            role="alert"
            data-testid="delete-modal-error"
          >
            {is403 && (
              <p className="m-0">
                <strong>Permission denied:</strong> Only platform administrators have permission to perform this action.
              </p>
            )}
            {is404 && (
              <div className="flex items-center justify-between gap-2">
                <p className="m-0">
                  <strong>Not found:</strong> This item has already been deleted or removed.
                </p>
                {onItemAlreadyDeleted && (
                  <button
                    type="button"
                    onClick={onItemAlreadyDeleted}
                    className="doc-btn-secondary px-2 py-1 text-[12px]"
                    data-testid="delete-modal-refresh-close"
                  >
                    Refresh & Close
                  </button>
                )}
              </div>
            )}
            {is500OrNetwork && (
              <div className="flex items-center justify-between gap-2">
                <p className="m-0">
                  <strong>Server error:</strong> {errorMessage || "An unexpected error occurred. Please try again."}
                </p>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="doc-btn-secondary px-2 py-1 text-[12px]"
                    data-testid="delete-modal-retry-btn"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
            {!is403 && !is404 && !is500OrNetwork && (
              <p className="m-0">{errorMessage || "An unexpected error occurred."}</p>
            )}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            ref={cancelBtnRef}
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="doc-btn-secondary h-[38px] px-4 text-[14px]"
            data-testid="delete-modal-cancel-btn"
          >
            {cancelButtonText}
          </button>
          <button
            type="button"
            disabled={isConfirmDisabled}
            onClick={onConfirm}
            className="doc-btn-danger h-[38px] px-4 text-[14px] gap-2"
            data-testid="delete-modal-confirm-btn"
          >
            {isSubmitting && (
              <FiRefreshCw className="animate-spin w-4 h-4 text-white" />
            )}
            <span>{isSubmitting ? "Deleting..." : confirmButtonText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
