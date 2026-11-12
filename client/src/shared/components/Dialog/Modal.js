import React, { useEffect, useId, useRef } from "react";

const SIZE = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  ariaLabel,
  size = "md",
  closeOnBackdrop = true,
  closeOnEsc = true,
  showCloseButton = true,
  footer,
  className = "",
  children,
}) {
  const dialogRef = useRef(null);
  const boxRef = useRef(null);
  const prevFocusRef = useRef(null);
  const uid = useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      prevFocusRef.current = document.activeElement; // Save focus BEFORE showModal() moves focus
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      (boxRef.current?.querySelector(FOCUSABLE) || boxRef.current)?.focus();
    } else if (!isOpen && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
      prevFocusRef.current?.focus?.();
    }

    return () => {
      if (dialog.open) prevFocusRef.current?.focus?.();
    };
  }, [isOpen]);

  const handleCancel = (e) => {
    e.preventDefault();
    if (closeOnEsc) onClose();
  };

  // Fallback sync: Chrome's close watcher may close <dialog> natively on double-Esc without firing cancel
  const handleNativeClose = () => {
    if (isOpen) {
      prevFocusRef.current?.focus?.();
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key !== "Tab" || !boxRef.current) return;
    const items = boxRef.current.querySelectorAll(FOCUSABLE);
    if (!items.length) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
      aria-label={!title ? ariaLabel : undefined}
      onCancel={handleCancel}
      onClose={handleNativeClose}
    >
      <div
        ref={boxRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`modal-box ${SIZE[size] || SIZE.md} ${className}`}
      >
        {showCloseButton && (
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          >
            ✕
          </button>
        )}
        {title && <h3 id={titleId} className="font-bold text-lg">{title}</h3>}
        {description && <p id={descId} className="py-2">{description}</p>}
        {isOpen && children}
        {footer && <div className="modal-action">{footer}</div>}
      </div>
      <div
        className="modal-backdrop"
        aria-hidden="true"
        onClick={() => closeOnBackdrop && onClose()}
      />
    </dialog>
  );
}

export default Modal;

