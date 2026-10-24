import React, { useState, useEffect } from "react";
import SpaceListScreen from "./components/SpaceListScreen";
import SpaceFormScreen from "./components/SpaceFormScreen";
import SpaceDetailScreen from "./components/SpaceDetailScreen";
import DocumentFormScreen from "./components/DocumentFormScreen";
import ArchivedDocumentsScreen from "./components/ArchivedDocumentsScreen";
import {
  ViewModes,
  parseDocPath,
  useDocumentationRouter,
} from "./hooks/useDocumentationRouter";
import { useSpaceList } from "./hooks/useSpaceList";
import { useSpaceDetail } from "./hooks/useSpaceDetail";
import {
  getSpace,
  createSpace,
  updateSpace,
  createDocument,
  updateDocument,
} from "./api";
import "./Documentation.css";

export { ViewModes, parseDocPath };

const Documentation = ({ initialView = ViewModes.SPACES_LIST, initialSpaceId = null }) => {
  const { pathname, search, navigateSafe, lastPathRef } = useDocumentationRouter();

  const {
    spaces,
    projects,
    members,
    loading,
    setLoading,
    error,
    setError,
    loadInitialData,
    loadAuxData,
    handleAuthError,
    extractError,
  } = useSpaceList();

  const requestedProjectId = React.useMemo(() => {
    return new URLSearchParams(search || "").get("projectId");
  }, [search]);

  const preselectedProjectId = React.useMemo(() => {
    if (!requestedProjectId || !projects || projects.length === 0) return "";
    const match = projects.find((p, idx) => {
      const pId = String(p._id || p.id || "");
      if (pId === String(requestedProjectId)) return true;
      if (p.id !== undefined && String(p.id) === String(requestedProjectId)) return true;
      if (p.projectId && String(p.projectId) === String(requestedProjectId)) return true;
      if (String(idx + 1) === String(requestedProjectId)) return true;
      return false;
    });
    return match ? (match._id || match.id) : "";
  }, [requestedProjectId, projects]);

  const {
    selectedSpace,
    setSelectedSpace,
    documents,
    archivedDocuments,
    selectedDocument,
    setSelectedDocument,
    activeArea,
    setActiveArea,
    restoringId,
    loadSpaceDetail,
    loadArchivedDocuments,
    handleArchiveDocument,
    handleRestoreDocument,
  } = useSpaceDetail({ setLoading, setError, handleAuthError });

  const [viewMode, setViewMode] = useState(() => {
    if (initialView && initialView !== ViewModes.SPACES_LIST) {
      return initialView;
    }
    const parsed = parseDocPath(pathname);
    return parsed ? parsed.mode : ViewModes.SPACES_LIST;
  });

  const [editReturnMode, setEditReturnMode] = useState(ViewModes.SPACES_LIST);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  // Sync on prop change if initialSpaceId provided
  useEffect(() => {
    if (initialSpaceId) {
      loadSpaceDetail(initialSpaceId);
    }
  }, [initialSpaceId, loadSpaceDetail]);

  // Synchronize on mount & pathname changes
  useEffect(() => {
    if (lastPathRef.current === pathname) {
      return;
    }
    lastPathRef.current = pathname;

    const parsed = parseDocPath(pathname);
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
  }, [pathname, lastPathRef, loadInitialData, loadSpaceDetail, loadArchivedDocuments, loadAuxData]);

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

  const handleViewArchived = async () => {
    if (!selectedSpace) return;
    await loadArchivedDocuments(selectedSpace._id);
    setViewMode(ViewModes.ARCHIVED_DOCUMENTS);
    navigateSafe(`/doc/spaces/${selectedSpace._id}/archived`);
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
          initialSpace={preselectedProjectId ? { projectId: preselectedProjectId } : null}
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
