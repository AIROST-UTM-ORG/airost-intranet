import React, { useState, useEffect } from "react";
import { FiRefreshCw } from "react-icons/fi";
import Modal from "../../../shared/components/Dialog/Modal";

/**
 * Accessible Confirmation Modal for Destructive Actions
 * Wraps shared Phase 3 Dialog Modal primitive.
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
  dataTestId = "delete-confirm-modal",
}) => {
  const [typedText, setTypedText] = useState("");

  useEffect(() => {
    if (isOpen) setTypedText("");
  }, [isOpen]);

  if (!isOpen) return null;

  const isMatchValid = !requireMatchText || typedText === requireMatchText;
  const isConfirmDisabled = isSubmitting || !isMatchValid;
  const status = error?.response?.status || error?.status;
  const errorCode = error?.response?.data?.error?.code || error?.code;
  const errorMessage = error?.response?.data?.error?.message || error?.message || "";
  const is403 = status === 403 || errorCode === "FORBIDDEN";
  const is404 = status === 404 || errorCode === "NOT_FOUND";
  const is500OrNetwork = status >= 500 || ["INTERNAL_ERROR", "NETWORK_ERROR", "TIMEOUT"].includes(errorCode);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      titleTestId="delete-modal-title"
      dataTestId={dataTestId}
      showCloseButton={!isSubmitting}
      closeOnEsc={!isSubmitting}
      closeOnBackdrop={!isSubmitting}
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
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
            {isSubmitting && <FiRefreshCw className="animate-spin w-4 h-4 text-white" />}
            <span>{isSubmitting ? "Deleting..." : confirmButtonText}</span>
          </button>
        </div>
      }
    >
      <div className="font-varela text-[14px] text-[#686868] leading-[150%] mb-4 space-y-2">
        {typeof description === "string" ? (
          <p className="m-0" data-testid="delete-modal-desc">{description}</p>
        ) : (
          description
        )}
      </div>

      {Boolean(requireMatchText) && (
        <div className="mb-4">
          <label htmlFor="confirm-title-input" className="block font-varela text-[13px] text-[#171717] mb-2 font-medium">
            {inputLabel}
          </label>
          <input
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
            <p className="font-varela text-[12px] text-red-600 mt-1 mb-0">Title does not match</p>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 font-varela text-[13px]" role="alert" data-testid="delete-modal-error">
          {is403 && (
            <p className="m-0">
              <strong>Permission denied:</strong> Only platform administrators have permission to perform this action.
            </p>
          )}
          {is404 && (
            <div className="flex items-center justify-between gap-2">
              <p className="m-0"><strong>Not found:</strong> This item has already been deleted or removed.</p>
              {onItemAlreadyDeleted && (
                <button type="button" onClick={onItemAlreadyDeleted} className="doc-btn-secondary px-2 py-1 text-[12px]" data-testid="delete-modal-refresh-close">
                  Refresh & Close
                </button>
              )}
            </div>
          )}
          {is500OrNetwork && (
            <div className="flex items-center justify-between gap-2">
              <p className="m-0"><strong>Server error:</strong> {errorMessage || "An unexpected error occurred. Please try again."}</p>
              {onRetry && (
                <button type="button" onClick={onRetry} className="doc-btn-secondary px-2 py-1 text-[12px]" data-testid="delete-modal-retry-btn">
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
    </Modal>
  );
};

export default DeleteConfirmModal;
