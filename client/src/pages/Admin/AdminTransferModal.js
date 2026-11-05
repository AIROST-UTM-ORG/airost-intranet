import React from "react";
import { FiX, FiSearch, FiUserCheck } from "react-icons/fi";

const AdminTransferModal = ({
  spaceToReassign,
  onClose,
  reassignError,
  memberFilter,
  setMemberFilter,
  isReassigning,
  membersLoading,
  membersError,
  filteredMembers,
  selectedUserId,
  setSelectedUserId,
  onConfirmReassign,
}) => {
  if (!spaceToReassign) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reassign-modal-title"
      data-testid="reassign-owner-modal"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 font-varela flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FiUserCheck className="w-5 h-5 text-primary" />
            <h3
              id="reassign-modal-title"
              className="text-lg font-bold text-gray-900"
              data-testid="reassign-modal-title"
            >
              Reassign Space Owner
            </h3>
          </div>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 p-1"
            onClick={onClose}
            disabled={isReassigning}
            aria-label="Close dialog"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Select a new active user to become the owner of{" "}
          <strong>"{spaceToReassign.title}"</strong>. Space management rights will transfer to
          them.
        </p>

        <div className="text-xs text-gray-500 mb-3 bg-gray-50 p-2.5 rounded border border-gray-100">
          Current owner:{" "}
          <strong className="text-gray-800">
            {spaceToReassign.owner?.name || "Unknown"}
          </strong>{" "}
          ({spaceToReassign.owner?.email || "no email"})
        </div>

        {/* Inline Error */}
        {reassignError && (
          <div
            className="p-3 mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded"
            data-testid="reassign-error-message"
          >
            {reassignError}
          </div>
        )}

        {/* Member Search */}
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Filter members by name or email..."
            className="input input-bordered input-sm w-full pl-8"
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            disabled={isReassigning}
            data-testid="reassign-member-filter"
          />
          <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
        </div>

        {/* Members List */}
        <div className="border border-gray-200 rounded-lg overflow-y-auto max-h-56 p-1 mb-4 divide-y divide-gray-100">
          {membersLoading && (
            <div className="p-4 text-center text-xs text-gray-400">Loading active users...</div>
          )}
          {membersError && (
            <div className="p-4 text-center text-xs text-red-500">{membersError}</div>
          )}
          {!membersLoading && !membersError && filteredMembers.length === 0 && (
            <div className="p-4 text-center text-xs text-gray-400">No active members found</div>
          )}
          {!membersLoading &&
            !membersError &&
            filteredMembers.map((member) => {
              const isCurrent = member._id === spaceToReassign.owner?._id;
              const isSelected = selectedUserId === member._id;

              return (
                <label
                  key={member._id}
                  className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                    isSelected ? "bg-primary/10" : "hover:bg-gray-50"
                  } ${isCurrent ? "opacity-60" : ""}`}
                  data-testid={`member-option-${member._id}`}
                >
                  <input
                    type="radio"
                    name="reassign-target-user"
                    className="radio radio-sm radio-primary"
                    checked={isSelected}
                    onChange={() => setSelectedUserId(member._id)}
                    disabled={isReassigning}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {member.name}
                      {isCurrent && (
                        <span className="ml-2 text-xs font-normal text-gray-400">
                          (Current Owner)
                        </span>
                      )}
                    </div>
                    {member.email && (
                      <div className="text-xs text-gray-400 truncate">{member.email}</div>
                    )}
                  </div>
                </label>
              );
            })}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={onClose}
            disabled={isReassigning}
            data-testid="reassign-cancel-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={onConfirmReassign}
            disabled={
              !selectedUserId ||
              selectedUserId === spaceToReassign.owner?._id ||
              isReassigning
            }
            data-testid="reassign-confirm-btn"
          >
            {isReassigning ? (
              <span className="flex items-center gap-1">
                <span className="loading loading-spinner loading-xs"></span>
                Reassigning...
              </span>
            ) : (
              "Reassign Owner"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminTransferModal;
