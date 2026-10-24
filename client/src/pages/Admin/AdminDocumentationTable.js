import React from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  FiExternalLink,
  FiEdit2,
  FiUserCheck,
  FiTrash2,
  FiMoreHorizontal,
} from "react-icons/fi";

const formatAccessType = (type) => {
  switch (type) {
    case "project_members":
      return "Project Members";
    case "selected":
      return "Selected";
    case "all":
    default:
      return "All Members";
  }
};

const formatUpdateType = (type) => {
  switch (type) {
    case "project_members":
      return "Project Members";
    case "selected":
      return "Selected";
    case "all":
    default:
      return "All Members";
  }
};

const AdminDocumentationTable = ({
  spaces,
  loading,
  error,
  debouncedQuery,
  activeMenuSpaceId,
  setActiveMenuSpaceId,
  menuRef,
  setSpaceToReassign,
  setSpaceToDelete,
  onClearSearch,
}) => {
  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
      <table className="table table-zebra w-full text-sm" data-testid="admin-spaces-table">
        <thead className="bg-gray-100 text-gray-700 uppercase text-xs font-semibold">
          <tr>
            <th className="py-3 px-4 text-left">Space Title</th>
            <th className="py-3 px-4 text-left">Project</th>
            <th className="py-3 px-4 text-left">Owner</th>
            <th className="py-3 px-4 text-center">Access</th>
            <th className="py-3 px-4 text-center">Update</th>
            <th className="py-3 px-4 text-center">Docs</th>
            <th className="py-3 px-4 text-center">Archived</th>
            <th className="py-3 px-4 text-left">Updated</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {/* Loading Skeleton */}
          {loading && (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} data-testid="admin-spaces-loading" className="animate-pulse">
                  <td className="py-4 px-4">
                    <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
                    <div className="h-3 bg-gray-100 rounded w-64"></div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-gray-200 rounded w-28"></div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                    <div className="h-3 bg-gray-100 rounded w-32"></div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="h-5 bg-gray-200 rounded-full w-20 mx-auto"></div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="h-5 bg-gray-200 rounded-full w-20 mx-auto"></div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="h-5 bg-gray-200 rounded w-8 mx-auto"></div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="h-5 bg-gray-200 rounded w-8 mx-auto"></div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="h-8 bg-gray-200 rounded w-16 ml-auto"></div>
                  </td>
                </tr>
              ))}
            </>
          )}

          {/* Empty State */}
          {!loading && !error && spaces.length === 0 && (
            <tr>
              <td colSpan="9" className="py-12 text-center text-gray-500">
                {debouncedQuery ? (
                  <div className="flex flex-col items-center gap-3" data-testid="no-search-results">
                    <p className="text-base text-gray-700">No spaces match your search</p>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={onClearSearch}
                      data-testid="admin-clear-search-btn"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  <div data-testid="empty-spaces-state">
                    <p className="text-base text-gray-700">No documentation spaces yet</p>
                  </div>
                )}
              </td>
            </tr>
          )}

          {/* Populated Rows */}
          {!loading &&
            !error &&
            spaces.map((space) => {
              const isMenuOpen = activeMenuSpaceId === space._id;
              let formattedDate = "";
              try {
                formattedDate = space.updatedAt
                  ? format(new Date(space.updatedAt), "yyyy-MM-dd")
                  : "—";
              } catch {
                formattedDate = "—";
              }

              return (
                <tr
                  key={space._id}
                  className="hover transition-colors"
                  data-testid={`admin-space-row-${space._id}`}
                >
                  {/* Space title & description */}
                  <td className="py-3 px-4 max-w-xs">
                    <Link
                      to={`/doc/spaces/${space._id}`}
                      className="font-bold text-primary hover:underline block truncate text-base"
                      title={space.title}
                      data-testid={`space-title-link-${space._id}`}
                    >
                      {space.title}
                    </Link>
                    {space.description && (
                      <p
                        className="text-xs text-gray-500 truncate mt-0.5"
                        title={space.description}
                      >
                        {space.description}
                      </p>
                    )}
                  </td>

                  {/* Project */}
                  <td className="py-3 px-4 text-gray-800">
                    {space.project ? (
                      <span className="font-medium" title={space.project.title}>
                        {space.project.title}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">Standalone</span>
                    )}
                  </td>

                  {/* Owner */}
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900 truncate" title={space.owner?.name}>
                      {space.owner?.name || "Unknown"}
                    </div>
                    {space.owner?.email && (
                      <div
                        className="text-xs text-gray-500 truncate"
                        title={space.owner?.email}
                      >
                        {space.owner.email}
                      </div>
                    )}
                  </td>

                  {/* Access Type */}
                  <td className="py-3 px-4 text-center">
                    <span className="badge badge-ghost badge-sm text-xs whitespace-nowrap">
                      {formatAccessType(space.accessType)}
                    </span>
                  </td>

                  {/* Update Type */}
                  <td className="py-3 px-4 text-center">
                    <span className="badge badge-ghost badge-sm text-xs whitespace-nowrap">
                      {formatUpdateType(space.updateType)}
                    </span>
                  </td>

                  {/* Active Docs */}
                  <td className="py-3 px-4 text-center font-medium">
                    <span className="badge badge-outline badge-sm" data-testid={`active-docs-count-${space._id}`}>
                      {space.documentCount ?? 0}
                    </span>
                  </td>

                  {/* Archived Docs */}
                  <td className="py-3 px-4 text-center text-gray-500">
                    <span className="badge badge-outline badge-sm text-gray-400" data-testid={`archived-docs-count-${space._id}`}>
                      {space.archivedCount ?? 0}
                    </span>
                  </td>

                  {/* Updated At */}
                  <td className="py-3 px-4 text-gray-600 text-xs whitespace-nowrap">
                    {formattedDate}
                  </td>

                  {/* Actions Menu */}
                  <td className="py-3 px-4 text-right relative">
                    <div className="relative inline-block text-left">
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs text-gray-700 hover:bg-gray-200"
                        onClick={() =>
                          setActiveMenuSpaceId(isMenuOpen ? null : space._id)
                        }
                        aria-label={`Actions for ${space.title}`}
                        data-testid={`space-actions-trigger-${space._id}`}
                      >
                        <FiMoreHorizontal className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <div
                          ref={menuRef}
                          className="absolute right-0 top-8 z-30 w-44 bg-white rounded-md shadow-lg border border-gray-200 py-1 text-xs text-left"
                          data-testid={`space-actions-menu-${space._id}`}
                        >
                          <Link
                            to={`/doc/spaces/${space._id}`}
                            className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2 no-underline"
                            onClick={() => setActiveMenuSpaceId(null)}
                            data-testid={`action-open-space-${space._id}`}
                          >
                            <FiExternalLink className="w-3.5 h-3.5 text-gray-500" />
                            <span>Open space</span>
                          </Link>
                          <Link
                            to={`/doc/spaces/${space._id}/edit`}
                            className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2 no-underline"
                            onClick={() => setActiveMenuSpaceId(null)}
                            data-testid={`action-edit-space-${space._id}`}
                          >
                            <FiEdit2 className="w-3.5 h-3.5 text-gray-500" />
                            <span>Edit space</span>
                          </Link>
                          <button
                            type="button"
                            className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            onClick={() => {
                              setActiveMenuSpaceId(null);
                              setSpaceToReassign(space);
                            }}
                            data-testid={`reassign-owner-btn-${space._id}`}
                          >
                            <FiUserCheck className="w-3.5 h-3.5 text-gray-500" />
                            <span>Reassign owner</span>
                          </button>
                          <div className="border-t border-gray-100 my-1"></div>
                          <button
                            type="button"
                            className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2"
                            onClick={() => {
                              setActiveMenuSpaceId(null);
                              setSpaceToDelete(space);
                            }}
                            data-testid={`delete-space-btn-${space._id}`}
                          >
                            <FiTrash2 className="w-3.5 h-3.5 text-red-500" />
                            <span>Delete space</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
};

export default AdminDocumentationTable;
