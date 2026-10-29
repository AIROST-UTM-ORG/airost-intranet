import React from "react";
import { FiFileText, FiRotateCcw } from "react-icons/fi";
import InfoBanner from "./InfoBanner";
import { getProviderDisplayName, AREA_LABELS } from "../api";

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
  restoringId = null,
}) => {
  if (!space) return null;

  const isProjectLinked = Boolean(space.projectId && space.projectId.title);
  const metadataText = isProjectLinked
    ? `${space.title} · Project: ${space.projectId.title}`
    : `${space.title} · Standalone space`;

  return (
    <div
      className="w-full max-w-[959px] mx-auto pb-12 font-varela"
      data-testid="archived-documents-screen"
    >
      {/* Top Back Navigation Link */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-[8px] text-[#686868] hover:text-[#171717] font-varela text-[14px] mb-[12px] focus:outline-none transition-colors"
        data-testid="back-to-space-btn"
      >
        <span className="text-[14px]">←</span>
        <span>Back to {space.title}</span>
      </button>

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
                        <FiFileText className="w-[20px] h-[20px] text-[#686868]" strokeWidth={2} />
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

                    {/* Right Control: Restore Button */}
                    <button
                      type="button"
                      disabled={isRestoring}
                      onClick={() => onRestore(doc)}
                      className="doc-btn-secondary w-[100px] h-[38px] text-[14px] gap-[8px]"
                      data-testid={`restore-doc-btn-${doc._id}`}
                    >
                      <FiRotateCcw className="w-[15px] h-[15px] text-[#171717]" strokeWidth={2} />
                      <span>{isRestoring ? "Restoring..." : "Restore"}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Shared Info Banner */}
          <InfoBanner />
        </>
      )}
    </div>
  );
};

export default ArchivedDocumentsScreen;
