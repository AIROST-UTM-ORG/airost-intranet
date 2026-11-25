import React, { useState, useEffect, useMemo } from "react";
import SpaceListScreen from "../spaces/components/SpaceListScreen";
import SpaceFormScreen from "../spaces/components/SpaceFormScreen";
import SpaceDetailScreen from "../spaces/components/SpaceDetailScreen";
import DocumentFormScreen from "../documents/components/DocumentFormScreen";
import ArchivedDocumentsScreen from "../documents/components/ArchivedDocumentsScreen";
import { useDocumentationRouter, ViewModes, parseDocPath } from "../shared/hooks/useDocumentationRouter";
import { useSpaceList } from "../spaces/hooks/useSpaceList";
import { useSpaceDetail } from "../spaces/hooks/useSpaceDetail";
import { useSpaceActions } from "../spaces/hooks/useSpaceActions";
import "../shared/styles/Documentation.css";

export { ViewModes, parseDocPath };

const DocumentationPage = ({ initialView = null, initialSpaceId = null }) => {
  const { pathname, search, lastPathRef, navigateSafe } = useDocumentationRouter();
  const { spaces, projects, members, loading, setLoading, error, setError, projectsError, membersError, loadInitialData, loadAuxData, handleAuthError, extractError } = useSpaceList();

  const requestedProjectId = useMemo(() => new URLSearchParams(search || "").get("projectId"), [search]);
  const preselectedProjectId = useMemo(() => {
    if (!requestedProjectId || !projects || projects.length === 0) return "";
    const match = projects.find((p, idx) => {
      const pId = String(p._id || p.id || "");
      return pId === String(requestedProjectId) || (p.id !== undefined && String(p.id) === String(requestedProjectId)) ||
        (p.projectId && String(p.projectId) === String(requestedProjectId)) || String(idx + 1) === String(requestedProjectId);
    });
    return match ? (match._id || match.id) : "";
  }, [requestedProjectId, projects]);

  const { selectedSpace, setSelectedSpace, documents, archivedDocuments, selectedDocument, setSelectedDocument, activeArea, setActiveArea, restoringId, loadSpaceDetail, loadArchivedDocuments, handleArchiveDocument, handleRestoreDocument } = useSpaceDetail({ setLoading, setError, handleAuthError });

  const [viewMode, setViewMode] = useState(() => {
    if (initialView && initialView !== ViewModes.SPACES_LIST) return initialView;
    const parsed = parseDocPath(pathname);
    return parsed ? parsed.mode : ViewModes.SPACES_LIST;
  });

  const { editReturnMode, submitting, serverError, editSpaceError, failedEditTarget, handleOpenSpace, handleStartCreateSpace, handleStartEditSpace, handleCreateSpaceSubmit, handleEditSpaceSubmit, handleStartAddDocument, handleStartEditDocument, handleAddDocumentSubmit, handleEditDocumentSubmit, handleViewArchived } = useSpaceActions({
    navigateSafe, loadInitialData, loadSpaceDetail, loadArchivedDocuments, selectedSpace, setSelectedSpace, selectedDocument, setSelectedDocument, setActiveArea, setViewMode, handleAuthError, extractError,
  });

  useEffect(() => {
    if (initialSpaceId) loadSpaceDetail(initialSpaceId);
  }, [initialSpaceId, loadSpaceDetail]);

  useEffect(() => {
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    const parsed = parseDocPath(pathname);
    if (!parsed) { loadInitialData(); return; }
    if (parsed.mode === ViewModes.SPACES_LIST) {
      setViewMode(ViewModes.SPACES_LIST); loadInitialData();
    } else if (parsed.mode === ViewModes.CREATE_SPACE) {
      setViewMode(ViewModes.CREATE_SPACE); loadAuxData();
    } else if (parsed.spaceId) {
      setViewMode(parsed.mode); loadSpaceDetail(parsed.spaceId); loadAuxData();
      if (parsed.mode === ViewModes.ARCHIVED_DOCUMENTS) loadArchivedDocuments(parsed.spaceId);
    }
  }, [pathname, lastPathRef, loadInitialData, loadSpaceDetail, loadArchivedDocuments, loadAuxData]);

  return (
    <div className="doc-feature-root px-[22px] md:px-[40px] pt-[24px]">
      {editSpaceError && (
        <div className="alert alert-error text-[13px] py-2 mb-4 max-w-[959px] mx-auto flex items-center justify-between" data-testid="edit-space-error-banner">
          <span>{typeof editSpaceError === "string" ? editSpaceError : editSpaceError?.message}</span>
          {failedEditTarget && (
            <button type="button" onClick={() => handleStartEditSpace(failedEditTarget.space, failedEditTarget.returnMode)} className="btn btn-xs btn-outline" data-testid="retry-edit-space-btn">
              Retry
            </button>
          )}
        </div>
      )}
      {viewMode === ViewModes.SPACES_LIST && (
        <SpaceListScreen spaces={spaces} loading={loading} error={error} onOpenSpace={handleOpenSpace} onCreateSpace={handleStartCreateSpace} onEditSpace={(space) => handleStartEditSpace(space, ViewModes.SPACES_LIST)} onManagePermissions={(space) => handleStartEditSpace(space, ViewModes.SPACES_LIST)} onRetry={loadInitialData} />
      )}
      {viewMode === ViewModes.CREATE_SPACE && (
        <SpaceFormScreen initialSpace={preselectedProjectId ? { projectId: preselectedProjectId } : null} projects={projects} members={members} projectsError={projectsError} membersError={membersError} onRetryAux={loadAuxData} onSubmit={handleCreateSpaceSubmit} onCancel={() => { setViewMode(ViewModes.SPACES_LIST); navigateSafe("/doc"); }} submitting={submitting} serverError={serverError} />
      )}
      {viewMode === ViewModes.EDIT_SPACE && (
        <SpaceFormScreen initialSpace={selectedSpace} projects={projects} members={members} projectsError={projectsError} membersError={membersError} onRetryAux={loadAuxData} onSubmit={handleEditSpaceSubmit} onCancel={() => { setViewMode(editReturnMode); if (editReturnMode === ViewModes.SPACE_DETAIL && selectedSpace) { navigateSafe(`/doc/spaces/${selectedSpace._id}`); } else { navigateSafe("/doc"); } }} submitting={submitting} serverError={serverError} />
      )}
      {viewMode === ViewModes.SPACE_DETAIL && selectedSpace && (
        <SpaceDetailScreen space={selectedSpace} documents={documents} loading={loading} error={error} activeArea={activeArea} onSelectArea={(area) => setActiveArea(area)} onBack={() => { loadInitialData(); setViewMode(ViewModes.SPACES_LIST); navigateSafe("/doc"); }} onAddDocument={(area) => handleStartAddDocument(area)} onEditSpace={() => handleStartEditSpace(selectedSpace, ViewModes.SPACE_DETAIL)} onEditDocument={(doc) => handleStartEditDocument(doc)} onArchiveDocument={handleArchiveDocument} onViewArchived={handleViewArchived} />
      )}
      {viewMode === ViewModes.ADD_DOCUMENT && selectedSpace && (
        <DocumentFormScreen space={selectedSpace} initialDocument={null} initialArea={activeArea} onSubmit={handleAddDocumentSubmit} onCancel={() => { setViewMode(ViewModes.SPACE_DETAIL); if (selectedSpace) navigateSafe(`/doc/spaces/${selectedSpace._id}`); }} submitting={submitting} serverError={serverError} />
      )}
      {viewMode === ViewModes.EDIT_DOCUMENT && selectedSpace && selectedDocument && (
        <DocumentFormScreen space={selectedSpace} initialDocument={selectedDocument} initialArea={selectedDocument.area} onSubmit={handleEditDocumentSubmit} onCancel={() => { setViewMode(ViewModes.SPACE_DETAIL); if (selectedSpace) navigateSafe(`/doc/spaces/${selectedSpace._id}`); }} submitting={submitting} serverError={serverError} />
      )}
      {viewMode === ViewModes.ARCHIVED_DOCUMENTS && selectedSpace && (
        <ArchivedDocumentsScreen space={selectedSpace} archivedDocuments={archivedDocuments} loading={loading} error={error} onBack={async () => { await loadSpaceDetail(selectedSpace._id); setViewMode(ViewModes.SPACE_DETAIL); if (selectedSpace) navigateSafe(`/doc/spaces/${selectedSpace._id}`); }} onRestore={handleRestoreDocument} restoringId={restoringId} />
      )}
    </div>
  );
};

export default DocumentationPage;
