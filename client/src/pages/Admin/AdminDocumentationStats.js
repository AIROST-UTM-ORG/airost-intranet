import React from "react";
import { FiDatabase, FiFileText, FiArchive, FiFolder } from "react-icons/fi";

const AdminDocumentationStats = ({ spaces = [], total = 0 }) => {
  const activeDocs = spaces.reduce(
    (sum, space) => sum + (space.documentCount ?? 0),
    0
  );
  const archivedDocs = spaces.reduce(
    (sum, space) => sum + (space.archivedCount ?? 0),
    0
  );
  const projectLinkedCount = spaces.filter((s) => Boolean(s.project)).length;

  const statItems = [
    {
      id: "total-spaces",
      label: "Total Spaces",
      value: total,
      subtext: `${projectLinkedCount} project-linked`,
      icon: <FiDatabase className="w-5 h-5 text-indigo-600" />,
      bg: "bg-indigo-50",
    },
    {
      id: "active-docs",
      label: "Active Documents",
      value: activeDocs,
      subtext: "Visible across spaces",
      icon: <FiFileText className="w-5 h-5 text-emerald-600" />,
      bg: "bg-emerald-50",
    },
    {
      id: "archived-docs",
      label: "Archived Documents",
      value: archivedDocs,
      subtext: "Soft-deleted links",
      icon: <FiArchive className="w-5 h-5 text-amber-600" />,
      bg: "bg-amber-50",
    },
    {
      id: "storage-breakdown",
      label: "Metadata Footprint",
      value: `${spaces.length} cached`,
      subtext: "Link-only storage",
      icon: <FiFolder className="w-5 h-5 text-blue-600" />,
      bg: "bg-blue-50",
    },
  ];

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      data-testid="admin-doc-stats"
    >
      {statItems.map((item) => (
        <div
          key={item.id}
          className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between shadow-sm"
          data-testid={`stat-card-${item.id}`}
        >
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {item.label}
            </div>
            <div className="text-2xl font-bold text-gray-800 mt-1">
              {item.value}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{item.subtext}</div>
          </div>
          <div className={`p-3 rounded-lg ${item.bg}`}>{item.icon}</div>
        </div>
      ))}
    </div>
  );
};

export default AdminDocumentationStats;
