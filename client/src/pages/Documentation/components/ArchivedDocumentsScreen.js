import React, { useState, useEffect, useRef } from "react";
import { DocLink, useDocNavigate } from "../DocLink";
import InfoBanner from "./InfoBanner";
import DeleteConfirmModal from "./DeleteConfirmModal";
import { getProviderDisplayName, AREA_LABELS, permanentlyDeleteDocument } from "../documentationApi";
import useAuth from "../../../hooks/useAuth";
import { isUserAdmin } from "./SpaceListScreen";

/**
 * ArchivedDocumentsScreen - Covers Screen 14
 */
const ArchivedDocumentsScreen = ({
  space,
  archivedDocuments = [],
  loading = false,
  error = null,
  onBack,
  onRestore,
  onDeletePermanently,
  onRefresh,
  restoringId = null,
  isAdmin: propIsAdmin,
}) => {
  const navigate = useDocNavigate();
  const auth = useAuth();
  const user = auth?.user;
  const userIsAdmin = isUserAdmin(user);
  const isAdmin = propIsAdmin !== undefined ? propIsAdmin : userIsAdmin;

  const [docToDelete, setDocToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const triggerRefs = useRef({});

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  if (!space) return null;

  const isProjectLinked = Boolean(space.projectId && space.projectId.title);
  const metadataText = isProjectLinked
    ? `${space.title} · Project: ${space.projectId.title}`
    : `${space.title} · Standalone space`;

  const handleBack = (e) => {
    if (onBack) {
      onBack(e);
      return;
    }
    if (window.history.state && window.history.state.idx > 0) {
      e.preventDefault();
      navigate(-1);
    }
  };

  const handleConfirmDeletePermanent = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      if (onDeletePermanently) {
        await onDeletePermanently(docToDelete);
      } else {
        await permanentlyDeleteDocument(docToDelete._id);
      }
      const title = docToDelete.title;
      setDocToDelete(null);
      setToastMessage(`"${title}" was permanently deleted.`);
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      setDeleteError(err);
      const status = err?.response?.status || err?.status;
      const code = err?.response?.data?.error?.code || err?.code;
      if (status === 404 || code === "NOT_FOUND") {
        if (onRefresh) onRefresh();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="w-full max-w-[959px] mx-auto pb-12 font-varela"
      data-testid="archived-documents-screen"
    >
      {/* Top Back Navigation Link */}
      <DocLink
        to={`/doc/spaces/${space._id}`}
        onClick={handleBack}
        className="flex items-center gap-[8px] text-[#686868] hover:text-[#171717] font-varela text-[14px] mb-[12px] no-underline focus:outline-none transition-colors"
        data-testid="back-to-space-btn"
      >
        <span className="text-[14px]">←</span>
        <span>Back to {space.title}</span>
      </DocLink>

      {/* Page Header */}
      <div className="mb-[24px]">
        <h1 className="doc-page-title" data-testid="archived-page-title">
          Archived Documents
        </h1>
        <p className="font-varela text-[14px] text-[#686868] mt-[10px]" data-testid="archived-metadata">
          {metadataText}
        </p>
        <p className="font-varela text-[14px] text-[#686868] mt-[16px] leading-[150%] max-w-[760px]">
          Archived links are hidden from their Areas. Restore a link to return it to its original Area;
          the external document is not changed.
        </p>
      </div>

      {/* List Heading Row */}
      <div className="flex items-center justify-between mb-[16px]">
        <h2 className="font-varela text-[18px] text-[#171717] font-normal" data-testid="archived-count-heading">
          {archivedDocuments.length}{" "}
          {archivedDocuments.length === 1 ? "archived document" : "archived documents"}
        </h2>
        <span className="font-varela text-[13px] text-[#686868]">Update access</span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4 mb-[24px]">
          <div className="doc-card h-[104px] animate-pulse bg-gray-50"></div>
          <div className="doc-card h-[104px] animate-pulse bg-gray-50"></div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="doc-card p-6 mb-[24px] border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {/* Loaded Content */}
      {!loading && !error && (
        <>
          {archivedDocuments.length === 0 ? (
            <div className="doc-card w-full h-[180px] p-[24px] flex flex-col items-center justify-center text-center mb-[24px]">
              <p className="font-varela text-[16px] text-[#686868]">
                There are no archived documents in this space.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-[20px] mb-[24px]" data-testid="archived-list">
              {archivedDocuments.map((doc) => {
                const isRestoring = restoringId === doc._id;
                const isThisDocDeleting = isDeleting && docToDelete?._id === doc._id;

                return (
                  <div
                    key={doc._id}
                    className="doc-card w-full h-[104px] p-[24px] flex items-center justify-between relative transition-shadow hover:shadow-[0_6px_12px_rgba(0,0,0,0.1)]"
                    data-testid={`archived-doc-card-${doc._id}`}
                  >
                    {/* Left Content */}
                    <div className="flex items-center gap-[16px] flex-1 pr-[16px]">
                      {/* Leading 44x44 Icon Box */}
                      <div className="w-[44px] h-[44px] bg-[#F5F5F5] rounded-[8px] flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-[20px] h-[20px] text-[#686868]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10 9 9 9 8 9" />
                        </svg>
                      </div>

                      {/* Text Stack */}
                      <div className="flex flex-col justify-center">
                        <h3 className="font-varela text-[22px] text-[#171717] font-normal leading-tight truncate">
                          {doc.title}
                        </h3>
                        <span className="font-varela text-[14px] text-[#686868] mt-[6px]">
                          {getProviderDisplayName(doc.provider)} · {AREA_LABELS[doc.area] || "General"}
                        </span>
                      </div>
                    </div>

                    {/* Right Controls: Restore Button + Admin-only Permanent Delete */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        type="button"
                        disabled={isRestoring || isDeleting}
                        onClick={() => onRestore(doc)}
                        className="doc-btn-secondary w-[100px] h-[38px] text-[14px] gap-[8px]"
                        data-testid={`restore-doc-btn-${doc._id}`}
                      >
                        <svg
                          className="w-[15px] h-[15px] text-[#171717]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="21 8 21 21 3 21 3 8" />
                          <rect x="1" y="3" width="22" height="5" />
                          <line x1="12" y1="17" x2="12" y2="11" />
                          <polyline points="9 14 12 11 15 14" />
                        </svg>
                        <span>{isRestoring ? "Restoring..." : "Restore"}</span>
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          ref={(el) => {
                            triggerRefs.current[doc._id] = el;
                          }}
                          disabled={isRestoring || isDeleting}
                          onClick={() => {
                            setDocToDelete(doc);
                            setDeleteError(null);
                          }}
                          className="doc-btn-danger h-[38px] px-3 text-[14px] gap-[6px]"
                          data-testid={`delete-permanent-doc-btn-${doc._id}`}
                        >
                          <svg
                            className="w-[14px] h-[14px]"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                          <span>{isThisDocDeleting ? "Deleting..." : "Delete permanently"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Shared Info Banner */}
          <InfoBanner />
        </>
      )}

      {/* Confirmation Modal for Permanent Delete */}
      {docToDelete && (
        <DeleteConfirmModal
          isOpen={Boolean(docToDelete)}
          title={`Delete "${docToDelete.title}" permanently?`}
          description="This removes the link record only; the external document is not changed. This cannot be undone."
          confirmButtonText="Delete permanently"
          cancelButtonText="Cancel"
          onConfirm={handleConfirmDeletePermanent}
          onCancel={() => {
            setDocToDelete(null);
            setDeleteError(null);
          }}
          isSubmitting={isDeleting}
          error={deleteError}
          onRetry={handleConfirmDeletePermanent}
          onItemAlreadyDeleted={() => {
            setDocToDelete(null);
            setDeleteError(null);
            if (onRefresh) onRefresh();
          }}
          triggerRef={{ current: triggerRefs.current[docToDelete._id] }}
          dataTestId="delete-permanent-modal"
        />
      )}

      {/* Accessible Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="doc-toast"
          data-testid="documentation-toast"
        >
          <svg
            className="w-5 h-5 text-green-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage("")}
            className="text-gray-400 hover:text-white ml-2 text-sm focus:outline-none"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default ArchivedDocumentsScreen;

