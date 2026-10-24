import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { FiPlus, FiFileText, FiChevronDown } from "react-icons/fi";
import useAuth from "../../../hooks/useAuth";
import { listSpaces, extractError, SEED_PROJECTS } from "../documentationApi";

/**
 * Resolves a raw projectId or project object to an effective project ID.
 * Supports MongoDB ObjectIds, mock numeric IDs, and SEED_PROJECTS matching.
 */
export const resolveProjectId = (rawId, projectObj) => {
  if (!rawId && !projectObj) return "";
  const candidate = rawId || projectObj?._id || projectObj?.id;
  if (!candidate) return "";
  const strId = String(candidate);

  // Valid 24-character hex MongoDB ObjectId
  if (/^[0-9a-fA-F]{24}$/.test(strId)) {
    return strId;
  }

  // Try matching against SEED_PROJECTS by title if projectObj has title
  if (projectObj?.title) {
    const match = SEED_PROJECTS.find(
      (sp) => sp.title.toLowerCase() === projectObj.title.toLowerCase()
    );
    if (match) return match._id;
  }

  // Numeric index lookup in SEED_PROJECTS (e.g. 1 -> index 0, 2 -> index 1)
  const num = parseInt(strId, 10);
  if (!isNaN(num) && num >= 1 && num <= SEED_PROJECTS.length) {
    return SEED_PROJECTS[num - 1]._id;
  }

  return strId;
};

/**
 * ProjectDocumentationLink
 * Self-contained component that fetches and renders dynamic documentation space link(s)
 * for a specific project.
 */
const ProjectDocumentationLink = ({
  projectId,
  project = null,
  projectLead = null,
  canCreate = undefined,
  className = "",
}) => {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const { user } = useAuth();
  const effectiveProjectId = resolveProjectId(projectId, project);

  const fetchSpaces = useCallback(async () => {
    if (!effectiveProjectId) {
      setSpaces([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listSpaces({ projectId: effectiveProjectId });
      setSpaces(Array.isArray(data) ? data : []);
    } catch (err) {
      const errMsg =
        typeof extractError === "function"
          ? extractError(err, "Failed to load documentation").message
          : err?.message || "Failed to load documentation";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }, [effectiveProjectId]);

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Determine if current user can create a space for this project
  let userCanCreate = canCreate;
  if (userCanCreate === undefined) {
    const isAdmin = Boolean(
      user?.position &&
        (Array.isArray(user.position)
          ? user.position.some((p) => typeof p === "string" && p.toLowerCase().includes("admin"))
          : typeof user.position === "string" && user.position.toLowerCase().includes("admin"))
    );

    const effectiveLead = projectLead || project?.lead;
    const isLead = Boolean(
      user &&
        effectiveLead &&
        ((typeof effectiveLead === "string" &&
          user.name &&
          user.name.toLowerCase() === effectiveLead.toLowerCase()) ||
          (typeof effectiveLead === "object" &&
            (user._id === effectiveLead._id || user.email === effectiveLead.email)) ||
          user._id === effectiveLead)
    );

    userCanCreate = Boolean(isAdmin || isLead);
  }

  // 1. Loading state
  if (loading) {
    return (
      <span
        data-testid="project-doc-loading"
        className={`inline-flex items-center gap-1.5 h-6 px-2.5 bg-gray-200 animate-pulse rounded text-xs text-transparent select-none font-varela ${className}`}
        aria-busy="true"
        aria-label="Loading documentation spaces"
      >
        Loading...
      </span>
    );
  }

  // 2. Error state
  if (error) {
    return (
      <span
        data-testid="project-doc-error"
        className={`inline-flex items-center gap-2 text-xs font-varela text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded ${className}`}
      >
        <span>Failed to load documentation</span>
        <button
          type="button"
          onClick={fetchSpaces}
          data-testid="project-doc-retry-btn"
          className="underline font-semibold hover:text-red-800 focus:outline-none"
        >
          Retry
        </button>
      </span>
    );
  }

  // 3. Zero spaces
  if (spaces.length === 0) {
    if (userCanCreate) {
      return (
        <Link
          to={`/doc/spaces/new?projectId=${encodeURIComponent(effectiveProjectId || "")}`}
          data-testid="create-project-doc-link"
          className={`inline-flex items-center gap-1 text-xs font-varela text-[#2B3467] hover:underline font-medium ${className}`}
        >
          <FiPlus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Create documentation space</span>
        </Link>
      );
    }
    // Quieter option: Muted "No documentation yet" line
    return (
      <span
        data-testid="project-doc-none"
        className={`text-gray-400 text-xs font-varela italic ${className}`}
      >
        No documentation yet
      </span>
    );
  }

  // 4. One space
  if (spaces.length === 1) {
    const space = spaces[0];
    const docCount = space.documentCount ?? space.activeDocumentCount ?? 0;
    return (
      <Link
        to={`/doc/spaces/${space._id}`}
        data-testid="project-doc-link-single"
        className={`doc-btn-secondary inline-flex items-center gap-1.5 text-xs font-varela py-1 px-2.5 rounded border border-gray-300 hover:border-[#2B3467] text-[#2B3467] font-medium transition-colors ${className}`}
        title={`${space.title} (${docCount} documents)`}
      >
        <FiFileText className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Documentation</span>
        <span
          data-testid="doc-count-badge"
          className="ml-0.5 inline-flex items-center justify-center bg-gray-100 text-gray-700 text-[11px] px-1.5 rounded-full font-semibold"
        >
          {docCount}
        </span>
      </Link>
    );
  }

  // 5. Several spaces
  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        data-testid="project-doc-menu-btn"
        aria-haspopup="true"
        aria-expanded={open}
        className="doc-btn-secondary inline-flex items-center gap-1.5 text-xs font-varela py-1 px-2.5 rounded border border-gray-300 hover:border-[#2B3467] text-[#2B3467] font-medium transition-colors"
      >
        <FiFileText className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Documentation</span>
        <span
          data-testid="spaces-count-badge"
          className="ml-0.5 inline-flex items-center justify-center bg-gray-100 text-gray-700 text-[11px] px-1.5 rounded-full font-semibold"
        >
          {spaces.length}
        </span>
        <FiChevronDown className="w-3 h-3 text-gray-500 ml-0.5" aria-hidden="true" />
      </button>
      {open && (
        <div
          data-testid="project-doc-menu"
          className="absolute left-0 mt-1 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-50 py-1 font-varela"
        >
          {spaces.map((space) => {
            const docCount = space.documentCount ?? space.activeDocumentCount ?? 0;
            return (
              <Link
                key={space._id}
                to={`/doc/spaces/${space._id}`}
                onClick={() => setOpen(false)}
                data-testid={`project-doc-item-${space._id}`}
                className="flex items-center justify-between px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-[#2B3467] transition-colors"
              >
                <span className="font-medium truncate mr-2" title={space.title}>
                  {space.title}
                </span>
                <span className="text-[11px] text-gray-500 whitespace-nowrap bg-gray-100 px-1.5 py-0.5 rounded">
                  {docCount} {docCount === 1 ? "doc" : "docs"}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProjectDocumentationLink;
