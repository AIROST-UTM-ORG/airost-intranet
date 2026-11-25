import { useState } from "react";
import { ViewModes } from "./useDocumentationRouter";
import {
  getSpace,
  createSpace,
  updateSpace,
} from "../spaces/api/spaceApi";
import {
  createDocument,
  updateDocument,
} from "../documents/api/documentApi";

/**
 * Custom hook to encapsulate actions for creating, editing, and viewing documentation spaces and documents.
 */
export const useSpaceActions = ({
  navigateSafe,
  loadInitialData,
  loadSpaceDetail,
  loadArchivedDocuments,
  selectedSpace,
  setSelectedSpace,
  selectedDocument,
  setSelectedDocument,
  setActiveArea,
  setViewMode,
  handleAuthError,
  extractError,
}) => {
  const [editReturnMode, setEditReturnMode] = useState(ViewModes.SPACES_LIST);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [editSpaceError, setEditSpaceError] = useState(null);
  const [failedEditTarget, setFailedEditTarget] = useState(null);

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
    setEditSpaceError(null);
    setFailedEditTarget(null);
    setEditReturnMode(returnMode);
    try {
      const fullSpace = await getSpace(space._id);
      setSelectedSpace(fullSpace);
      setViewMode(ViewModes.EDIT_SPACE);
      navigateSafe(`/doc/spaces/${space._id}/edit`);
    } catch (err) {
      if (handleAuthError(err)) return;
      setEditSpaceError(extractError(err, "Failed to load space details for editing"));
      setFailedEditTarget({ space, returnMode });
    }
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

  return {
    editReturnMode,
    setEditReturnMode,
    submitting,
    serverError,
    setServerError,
    editSpaceError,
    setEditSpaceError,
    failedEditTarget,
    setFailedEditTarget,
    handleOpenSpace,
    handleStartCreateSpace,
    handleStartEditSpace,
    handleCreateSpaceSubmit,
    handleEditSpaceSubmit,
    handleStartAddDocument,
    handleStartEditDocument,
    handleAddDocumentSubmit,
    handleEditDocumentSubmit,
    handleViewArchived,
  };
};

export default useSpaceActions;
