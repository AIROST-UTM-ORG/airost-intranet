import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SpaceListScreen from "./components/SpaceListScreen";
import SpaceFormScreen from "./components/SpaceFormScreen";
import SpaceDetailScreen from "./components/SpaceDetailScreen";
import DocumentFormScreen from "./components/DocumentFormScreen";
import ArchivedDocumentsScreen from "./components/ArchivedDocumentsScreen";
import {
  listSpaces,
  getSpace,
  createSpace,
  updateSpace,
  listDocuments,
  createDocument,
  updateDocument,
  archiveDocument,
  restoreDocument,
  listProjects,
  listMembers,
} from "./documentationApi";
import "./Documentation.css";

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

const Documentation = ({ initialView = ViewModes.SPACES_LIST, initialSpaceId = null }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const lastPathRef = useRef(null);

  const [viewMode, setViewMode] = useState(() => {
    if (initialView && initialView !== ViewModes.SPACES_LIST) {
      return initialView;
    }
    const parsed = parseDocPath(location?.pathname);
    return parsed ? parsed.mode : ViewModes.SPACES_LIST;
  });
  const [editReturnMode, setEditReturnMode] = useState(ViewModes.SPACES_LIST);
  const [spaces, setSpaces] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [archivedDocuments, setArchivedDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [activeArea, setActiveArea] = useState("development");

  // Auxiliary data
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);

  // Async status
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [restoringId, setRestoringId] = useState(null);

  const navigateSafe = useCallback(
    (to) => {
      if (navigate && location?.pathname !== to) {
        lastPathRef.current = to;
        navigate(to);
      }
    },
    [navigate, location?.pathname]
  );

  // Handlers
  const handleAuthError = (err) => {
    if (err.response?.status === 401 || err.response?.data?.error?.code === "UNAUTHENTICATED") {
      window.location.href = "/login";
      return true;
    }
    return false;
  };

  const extractError = (err, defaultMsg = "Operation failed") => {
    const errData = err.response?.data?.error;
    return {
      message: errData?.message || err.message || defaultMsg,
      code: errData?.code,
      details: errData?.details || [],
    };
  };

  // Load auxiliary data (projects & members)
  const loadAuxData = useCallback(async () => {
    try {
      const [projData, memberData] = await Promise.all([listProjects(), listMembers()]);
      setProjects(projData);
      setMembers(memberData);
    } catch {
      // Ignore aux loading errors
    }
  }, []);

  // Load spaces & aux data
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [spaceData, projData, memberData] = await Promise.all([
        listSpaces(),
        listProjects(),
        listMembers(),
      ]);
      setSpaces(spaceData);
      setProjects(projData);
      setMembers(memberData);
      return true;
    } catch (err) {
      if (handleAuthError(err)) return false;
      const msg = err.response?.data?.error?.message || err.message || "Failed to load spaces";
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load space details & documents
  const loadSpaceDetail = useCallback(async (spaceId) => {
    setLoading(true);
    setError(null);
    try {
      const [spData, docData] = await Promise.all([
        getSpace(spaceId),
        listDocuments(spaceId, { includeArchived: false }),
      ]);
      setSelectedSpace(spData);
      setDocuments(docData);
      return true;
    } catch (err) {
      if (handleAuthError(err)) return false;
      const msg = err.response?.data?.error?.message || err.message || "Failed to load space";
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadArchivedDocuments = useCallback(async (spaceId) => {
    setLoading(true);
    setError(null);
    try {
      const docs = await listDocuments(spaceId, { includeArchived: true });
      setArchivedDocuments(docs);
      return true;
    } catch (err) {
      if (handleAuthError(err)) return false;
      const msg =
        err.response?.data?.error?.message || err.message || "Failed to load archived documents";
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync on prop change if initialSpaceId provided
  useEffect(() => {
    if (initialSpaceId) {
      loadSpaceDetail(initialSpaceId);
    }
  }, [initialSpaceId, loadSpaceDetail]);

  // Synchronize on mount & pathname changes (handles deep-links, direct URLs, and back/forward navigation)
  useEffect(() => {
    if (lastPathRef.current === location?.pathname) {
      return;
    }
    lastPathRef.current = location?.pathname;

    const parsed = parseDocPath(location?.pathname);
    if (!parsed) {
      loadInitialData();
      return;
    }

    if (parsed.mode === ViewModes.SPACES_LIST) {
      setViewMode(ViewModes.SPACES_LIST);
      loadInitialData();
    } else if (parsed.mode === ViewModes.CREATE_SPACE) {
      setViewMode(ViewModes.CREATE_SPACE);
      loadAuxData();
    } else if (parsed.spaceId) {
      setViewMode(parsed.mode);
      loadSpaceDetail(parsed.spaceId);
      loadAuxData();
      if (parsed.mode === ViewModes.ARCHIVED_DOCUMENTS) {
        loadArchivedDocuments(parsed.spaceId);
      }
    }
  }, [location?.pathname, loadInitialData, loadSpaceDetail, loadArchivedDocuments, loadAuxData]);

  // Handlers
  const handleOpenSpace = async (space) => {
    const ok = await loadSpaceDetail(space._id);
    if (ok) {
      setActiveArea("development");
      setViewMode(ViewModes.SPACE_DETAIL);
      navigateSafe(`/doc/spaces/${space._id}`);
    }
  };

  const handleStartCreateSpace = () => {
    setServerError(null);
    setSelectedSpace(null);
    setViewMode(ViewModes.CREATE_SPACE);
    navigateSafe("/doc/spaces/new");
  };

  const handleStartEditSpace = async (space, returnMode = ViewModes.SPACES_LIST) => {
    setServerError(null);
    setEditReturnMode(returnMode);
    try {
      const fullSpace = await getSpace(space._id);
      setSelectedSpace(fullSpace);
    } catch {
      setSelectedSpace(space);
    }
    setViewMode(ViewModes.EDIT_SPACE);
    navigateSafe(`/doc/spaces/${space._id}/edit`);
  };

  const handleCreateSpaceSubmit = async (payload) => {
    setSubmitting(true);
    setServerError(null);
    try {
      const created = await createSpace(payload);
      await loadInitialData();
      await loadSpaceDetail(created._id);
      setViewMode(ViewModes.SPACE_DETAIL);
      navigateSafe(`/doc/spaces/${created._id}`);
    } catch (err) {
      if (handleAuthError(err)) return;
      setServerError(extractError(err, "Failed to create space"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSpaceSubmit = async (payload) => {
    if (!selectedSpace) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const updated = await updateSpace(selectedSpace._id, payload);
      await loadInitialData();
      await loadSpaceDetail(updated._id);
      setViewMode(ViewModes.SPACE_DETAIL);
      navigateSafe(`/doc/spaces/${updated._id}`);
    } catch (err) {
      if (handleAuthError(err)) return;
      setServerError(extractError(err, "Failed to update space"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartAddDocument = (area) => {
    setServerError(null);
    setSelectedDocument(null);
    setActiveArea(area || "general");
    setViewMode(ViewModes.ADD_DOCUMENT);
    if (selectedSpace) {
      navigateSafe(`/doc/spaces/${selectedSpace._id}/documents/new`);
    }
  };

  const handleStartEditDocument = (doc) => {
    setServerError(null);
    setSelectedDocument(doc);
    setViewMode(ViewModes.EDIT_DOCUMENT);
  };

  const handleAddDocumentSubmit = async (payload) => {
    if (!selectedSpace) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await createDocument(selectedSpace._id, payload);
      await loadSpaceDetail(selectedSpace._id);
      setActiveArea(payload.area || "general");
      setViewMode(ViewModes.SPACE_DETAIL);
      navigateSafe(`/doc/spaces/${selectedSpace._id}`);
    } catch (err) {
      if (handleAuthError(err)) return;
      setServerError(extractError(err, "Failed to add document"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditDocumentSubmit = async (payload) => {
    if (!selectedDocument || !selectedSpace) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await updateDocument(selectedDocument._id, payload);
      await loadSpaceDetail(selectedSpace._id);
      setActiveArea(payload.area || selectedDocument.area || "general");
      setViewMode(ViewModes.SPACE_DETAIL);
      navigateSafe(`/doc/spaces/${selectedSpace._id}`);
    } catch (err) {
      if (handleAuthError(err)) return;
      setServerError(extractError(err, "Failed to update document"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveDocument = async (doc) => {
    if (!selectedSpace) return;
    try {
      await archiveDocument(doc._id);
      await loadSpaceDetail(selectedSpace._id);
    } catch (err) {
      if (handleAuthError(err)) return;
      const msg =
        err.response?.data?.error?.message || err.message || "Failed to archive document";
      setError(msg);
    }
  };

  const handleViewArchived = async () => {
    if (!selectedSpace) return;
    await loadArchivedDocuments(selectedSpace._id);
    setViewMode(ViewModes.ARCHIVED_DOCUMENTS);
    navigateSafe(`/doc/spaces/${selectedSpace._id}/archived`);
  };

  const handleRestoreDocument = async (doc) => {
    if (!selectedSpace) return;
    setRestoringId(doc._id);
    try {
      await restoreDocument(doc._id);
      await Promise.all([
        loadArchivedDocuments(selectedSpace._id),
        getSpace(selectedSpace._id).then((sp) => setSelectedSpace(sp)),
      ]);
    } catch (err) {
      if (handleAuthError(err)) return;
      const msg =
        err.response?.data?.error?.message || err.message || "Failed to restore document";
      setError(msg);
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="doc-feature-root px-[22px] md:px-[40px] pt-[24px]">
      {viewMode === ViewModes.SPACES_LIST && (
        <SpaceListScreen
          spaces={spaces}
          loading={loading}
          error={error}
          onOpenSpace={handleOpenSpace}
          onCreateSpace={handleStartCreateSpace}
          onEditSpace={(space) => handleStartEditSpace(space, ViewModes.SPACES_LIST)}
          onManagePermissions={(space) => handleStartEditSpace(space, ViewModes.SPACES_LIST)}
          onRetry={loadInitialData}
        />
      )}

      {viewMode === ViewModes.CREATE_SPACE && (
        <SpaceFormScreen
          initialSpace={null}
          projects={projects}
          members={members}
          onSubmit={handleCreateSpaceSubmit}
          onCancel={() => {
            setViewMode(ViewModes.SPACES_LIST);
            navigateSafe("/doc");
          }}
          submitting={submitting}
          serverError={serverError}
        />
      )}

      {viewMode === ViewModes.EDIT_SPACE && (
        <SpaceFormScreen
          initialSpace={selectedSpace}
          projects={projects}
          members={members}
          onSubmit={handleEditSpaceSubmit}
          onCancel={() => {
            setViewMode(editReturnMode);
            if (editReturnMode === ViewModes.SPACE_DETAIL && selectedSpace) {
              navigateSafe(`/doc/spaces/${selectedSpace._id}`);
            } else {
              navigateSafe("/doc");
            }
          }}
          submitting={submitting}
          serverError={serverError}
        />
      )}

      {viewMode === ViewModes.SPACE_DETAIL && selectedSpace && (
        <SpaceDetailScreen
          space={selectedSpace}
          documents={documents}
          loading={loading}
          error={error}
          activeArea={activeArea}
          onSelectArea={(area) => setActiveArea(area)}
          onBack={() => {
            loadInitialData();
            setViewMode(ViewModes.SPACES_LIST);
            navigateSafe("/doc");
          }}
          onAddDocument={(area) => handleStartAddDocument(area)}
          onEditSpace={() => handleStartEditSpace(selectedSpace, ViewModes.SPACE_DETAIL)}
          onEditDocument={(doc) => handleStartEditDocument(doc)}
          onArchiveDocument={handleArchiveDocument}
          onViewArchived={handleViewArchived}
        />
      )}

      {viewMode === ViewModes.ADD_DOCUMENT && selectedSpace && (
        <DocumentFormScreen
          space={selectedSpace}
          initialDocument={null}
          initialArea={activeArea}
          onSubmit={handleAddDocumentSubmit}
          onCancel={() => {
            setViewMode(ViewModes.SPACE_DETAIL);
            if (selectedSpace) {
              navigateSafe(`/doc/spaces/${selectedSpace._id}`);
            }
          }}
          submitting={submitting}
          serverError={serverError}
        />
      )}

      {viewMode === ViewModes.EDIT_DOCUMENT && selectedSpace && selectedDocument && (
        <DocumentFormScreen
          space={selectedSpace}
          initialDocument={selectedDocument}
          initialArea={selectedDocument.area}
          onSubmit={handleEditDocumentSubmit}
          onCancel={() => {
            setViewMode(ViewModes.SPACE_DETAIL);
            if (selectedSpace) {
              navigateSafe(`/doc/spaces/${selectedSpace._id}`);
            }
          }}
          submitting={submitting}
          serverError={serverError}
        />
      )}

      {viewMode === ViewModes.ARCHIVED_DOCUMENTS && selectedSpace && (
        <ArchivedDocumentsScreen
          space={selectedSpace}
          archivedDocuments={archivedDocuments}
          loading={loading}
          error={error}
          onBack={async () => {
            await loadSpaceDetail(selectedSpace._id);
            setViewMode(ViewModes.SPACE_DETAIL);
            if (selectedSpace) {
              navigateSafe(`/doc/spaces/${selectedSpace._id}`);
            }
          }}
          onRestore={handleRestoreDocument}
          restoringId={restoringId}
        />
      )}
    </div>
  );
};

export default Documentation;
