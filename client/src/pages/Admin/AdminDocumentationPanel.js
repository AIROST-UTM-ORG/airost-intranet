import React from "react";
import { FiSearch, FiX, FiCheck } from "react-icons/fi";
import useAdminSpaces, { isUserAdmin } from "./useAdminSpaces";
import AdminDocumentationStats from "./AdminDocumentationStats";
import AdminDocumentationTable from "./AdminDocumentationTable";
import AdminTransferModal from "./AdminTransferModal";
import DeleteConfirmModal from "../Documentation/components/DeleteConfirmModal";

export { isUserAdmin };

const AdminDocumentationPanel = () => {
  const {
    isAdmin,
    spaces,
    loading,
    error,
    page,
    setPage,
    total,
    totalPages,
    startRow,
    endRow,
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    setDebouncedQuery,
    activeMenuSpaceId,
    setActiveMenuSpaceId,
    menuRef,
    spaceToReassign,
    setSpaceToReassign,
    spaceToDelete,
    setSpaceToDelete,
    membersLoading,
    membersError,
    memberFilter,
    setMemberFilter,
    selectedUserId,
    setSelectedUserId,
    isReassigning,
    reassignError,
    isDeleting,
    deleteError,
    setDeleteError,
    toastMessage,
    setToastMessage,
    loadSpaces,
    handleConfirmReassign,
    handleConfirmDelete,
    filteredMembers,
  } = useAdminSpaces();

  // Non-admin guard
  if (!isAdmin) {
    return (
      <div
        className="p-8 my-6 text-center text-red-600 bg-red-50 border border-red-200 rounded-lg font-medium"
        data-testid="admin-doc-unauthorized"
      >
        Access Denied. Only platform administrators can access documentation oversight.
      </div>
    );
  }

  return (
    <div className="w-full font-varela p-5" data-testid="admin-documentation-panel">
      {/* Top Header & Search Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800" data-testid="admin-doc-heading">
            Documentation Spaces Oversight
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Inspect, edit, reassign, or delete documentation spaces across the intranet.
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            className="input input-bordered w-full pr-10 text-sm"
            placeholder="Search title, project, or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="admin-spaces-search-input"
          />
          {searchQuery ? (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              onClick={() => {
                setSearchQuery("");
                setDebouncedQuery("");
              }}
              data-testid="admin-spaces-search-clear"
              aria-label="Clear search"
            >
              <FiX className="w-4 h-4" />
            </button>
          ) : (
            <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none w-4 h-4" />
          )}
        </div>
      </div>

      {/* Metric Cards Stats */}
      <AdminDocumentationStats spaces={spaces} total={total} />

      {/* Error State with Retry */}
      {error && !loading && (
        <div
          className="alert alert-error mb-6 flex justify-between items-center"
          data-testid="spaces-fetch-error"
        >
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline text-white"
            onClick={loadSpaces}
            data-testid="retry-fetch-btn"
          >
            Retry
          </button>
        </div>
      )}

      {/* Spaces Table */}
      <AdminDocumentationTable
        spaces={spaces}
        loading={loading}
        error={error}
        debouncedQuery={debouncedQuery}
        activeMenuSpaceId={activeMenuSpaceId}
        setActiveMenuSpaceId={setActiveMenuSpaceId}
        menuRef={menuRef}
        setSpaceToReassign={setSpaceToReassign}
        setSpaceToDelete={setSpaceToDelete}
        onClearSearch={() => {
          setSearchQuery("");
          setDebouncedQuery("");
        }}
      />

      {/* Pagination Controls */}
      {!loading && !error && total > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 px-2 text-xs text-gray-600">
          <div data-testid="pagination-info">
            Showing <span className="font-semibold">{startRow}</span> to{" "}
            <span className="font-semibold">{endRow}</span> of{" "}
            <span className="font-semibold">{total}</span> spaces
          </div>
          <div className="join">
            <button
              type="button"
              className="join-item btn btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              data-testid="pagination-prev"
            >
              « Previous
            </button>
            <span className="join-item btn btn-sm btn-disabled bg-white text-gray-800">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="join-item btn btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              data-testid="pagination-next"
            >
              Next »
            </button>
          </div>
        </div>
      )}

      {/* Reassign Owner Modal */}
      <AdminTransferModal
        spaceToReassign={spaceToReassign}
        onClose={() => setSpaceToReassign(null)}
        reassignError={reassignError}
        memberFilter={memberFilter}
        setMemberFilter={setMemberFilter}
        isReassigning={isReassigning}
        membersLoading={membersLoading}
        membersError={membersError}
        filteredMembers={filteredMembers}
        selectedUserId={selectedUserId}
        setSelectedUserId={setSelectedUserId}
        onConfirmReassign={handleConfirmReassign}
      />

      {/* Delete Space Modal */}
      {spaceToDelete && (
        <DeleteConfirmModal
          isOpen={Boolean(spaceToDelete)}
          title={`Delete ${spaceToDelete.title}?`}
          description={
            <>
              <p className="m-0 mb-2">
                This space and all of its associated documents (
                {spaceToDelete.documentCount ?? 0} active, including{" "}
                {spaceToDelete.archivedCount ?? 0} archived) will be permanently deleted.
              </p>
              <p className="m-0 mb-2">
                External Google Docs or Drive items will <strong>not</strong> be modified.
              </p>
              <p className="m-0 text-red-600 font-medium">This action cannot be undone.</p>
            </>
          }
          requireMatchText={spaceToDelete.title}
          inputLabel={`Type "${spaceToDelete.title}" to confirm deletion:`}
          inputPlaceholder={spaceToDelete.title}
          confirmButtonText="Delete space"
          cancelButtonText="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setSpaceToDelete(null);
            setDeleteError(null);
          }}
          isSubmitting={isDeleting}
          error={deleteError}
          onRetry={handleConfirmDelete}
          onItemAlreadyDeleted={() => {
            setSpaceToDelete(null);
            setDeleteError(null);
            loadSpaces();
          }}
          dataTestId="admin-delete-space-modal"
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 text-sm animate-fade-in"
          data-testid="admin-doc-toast"
        >
          <FiCheck className="text-green-400 w-4 h-4" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage("")}
            className="text-gray-400 hover:text-white ml-2 text-xs"
            aria-label="Dismiss toast"
          >
            <FiX className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminDocumentationPanel;
