import React, { useState, useEffect, useCallback } from "react";
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

const Documentation = ({ initialView = ViewModes.SPACES_LIST, initialSpaceId = null }) => {
  const [viewMode, setViewMode] = useState(initialView);
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
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || "Failed to load spaces";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

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
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || "Failed to load space";
      setError(msg);
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
    } catch (err) {
      const msg =
        err.response?.data?.error?.message || err.message || "Failed to load archived documents";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handlers
  const handleOpenSpace = async (space) => {
    await loadSpaceDetail(space._id);
    setActiveArea("development");
    setViewMode(ViewModes.SPACE_DETAIL);
  };

  const handleStartCreateSpace = () => {
    setServerError(null);
    setSelectedSpace(null);
    setViewMode(ViewModes.CREATE_SPACE);
  };

  const handleStartEditSpace = (space) => {
    setServerError(null);
    setSelectedSpace(space);
    setViewMode(ViewModes.EDIT_SPACE);
  };

  const handleCreateSpaceSubmit = async (payload) => {
    setSubmitting(true);
    setServerError(null);
    try {
      const created = await createSpace(payload);
      await loadInitialData();
      await loadSpaceDetail(created._id);
      setViewMode(ViewModes.SPACE_DETAIL);
    } catch (err) {
      const msg =
        err.response?.data?.error?.message || err.message || "Failed to create space";
      setServerError(msg);
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
    } catch (err) {
      const msg =
        err.response?.data?.error?.message || err.message || "Failed to update space";
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartAddDocument = (area) => {
    setServerError(null);
    setSelectedDocument(null);
    setActiveArea(area || "general");
    setViewMode(ViewModes.ADD_DOCUMENT);
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
    } catch (err) {
      const msg =
        err.response?.data?.error?.message || err.message || "Failed to add document";
      setServerError(msg);
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
    } catch (err) {
      const msg =
        err.response?.data?.error?.message || err.message || "Failed to update document";
      setServerError(msg);
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
      const msg =
        err.response?.data?.error?.message || err.message || "Failed to archive document";
      setError(msg);
    }
  };

  const handleViewArchived = async () => {
    if (!selectedSpace) return;
    await loadArchivedDocuments(selectedSpace._id);
    setViewMode(ViewModes.ARCHIVED_DOCUMENTS);
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
          onEditSpace={handleStartEditSpace}
          onManagePermissions={handleStartEditSpace}
          onRetry={loadInitialData}
        />
      )}

      {viewMode === ViewModes.CREATE_SPACE && (
        <SpaceFormScreen
          initialSpace={null}
          projects={projects}
          members={members}
          onSubmit={handleCreateSpaceSubmit}
          onCancel={() => setViewMode(ViewModes.SPACES_LIST)}
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
            if (selectedSpace) {
              setViewMode(ViewModes.SPACE_DETAIL);
            } else {
              setViewMode(ViewModes.SPACES_LIST);
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
          }}
          onAddDocument={(area) => handleStartAddDocument(area)}
          onEditSpace={() => handleStartEditSpace(selectedSpace)}
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
          onCancel={() => setViewMode(ViewModes.SPACE_DETAIL)}
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
          onCancel={() => setViewMode(ViewModes.SPACE_DETAIL)}
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
          }}
          onRestore={handleRestoreDocument}
          restoringId={restoringId}
        />
      )}
    </div>
  );
};

export default Documentation;
