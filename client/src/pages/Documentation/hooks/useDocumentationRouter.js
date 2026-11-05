import { useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export const ViewModes = {
  SPACES_LIST: "SPACES_LIST",
  CREATE_SPACE: "CREATE_SPACE",
  EDIT_SPACE: "EDIT_SPACE",
  SPACE_DETAIL: "SPACE_DETAIL",
  ADD_DOCUMENT: "ADD_DOCUMENT",
  EDIT_DOCUMENT: "EDIT_DOCUMENT",
  ARCHIVED_DOCUMENTS: "ARCHIVED_DOCUMENTS",
};

/**
 * Parses client pathnames according to docs/api/documentation.md Section 8.1
 */
export const parseDocPath = (pathname) => {
  if (!pathname) return null;
  if (pathname === "/doc/spaces/new" || pathname === "/doc/spaces/new/") {
    return { mode: ViewModes.CREATE_SPACE, spaceId: null };
  }
  const editMatch = pathname.match(/^\/doc\/spaces\/([^/]+)\/edit\/?$/);
  if (editMatch) {
    return { mode: ViewModes.EDIT_SPACE, spaceId: editMatch[1] };
  }
  const addDocMatch = pathname.match(/^\/doc\/spaces\/([^/]+)\/documents\/new\/?$/);
  if (addDocMatch) {
    return { mode: ViewModes.ADD_DOCUMENT, spaceId: addDocMatch[1] };
  }
  const archivedMatch = pathname.match(/^\/doc\/spaces\/([^/]+)\/archived\/?$/);
  if (archivedMatch) {
    return { mode: ViewModes.ARCHIVED_DOCUMENTS, spaceId: archivedMatch[1] };
  }
  const detailMatch = pathname.match(/^\/doc\/spaces\/([^/]+)\/?$/);
  if (detailMatch && detailMatch[1] !== "new") {
    return { mode: ViewModes.SPACE_DETAIL, spaceId: detailMatch[1] };
  }
  if (pathname === "/doc" || pathname === "/doc/") {
    return { mode: ViewModes.SPACES_LIST, spaceId: null };
  }
  return null;
};

/**
 * Custom hook managing URL synchronization and history navigation for Documentation.
 */
export const useDocumentationRouter = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const lastPathRef = useRef(null);

  const navigateSafe = useCallback(
    (to) => {
      if (navigate && location?.pathname !== to) {
        lastPathRef.current = to;
        navigate(to);
      }
    },
    [navigate, location?.pathname]
  );

  return {
    pathname: location?.pathname,
    search: location?.search,
    navigateSafe,
    lastPathRef,
    parseCurrentPath: () => parseDocPath(location?.pathname),
  };
};
