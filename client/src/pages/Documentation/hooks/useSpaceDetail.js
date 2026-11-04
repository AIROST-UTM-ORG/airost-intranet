import { useState, useCallback } from "react";
import {
  getSpace,
  listDocuments,
  archiveDocument,
  restoreDocument,
} from "../../../services/documentation";

/**
 * Custom hook to manage active space detail, documents, archived documents,
 * active area, and document archive/restore actions.
 */
export const useSpaceDetail = ({ setLoading, setError, handleAuthError }) => {
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [archivedDocuments, setArchivedDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [activeArea, setActiveArea] = useState("development");
  const [restoringId, setRestoringId] = useState(null);

  // Load space details & active documents
  const loadSpaceDetail = useCallback(
    async (spaceId) => {
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
    },
    [setLoading, setError, handleAuthError]
  );

  // Load archived documents for a space
  const loadArchivedDocuments = useCallback(
    async (spaceId) => {
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
    },
    [setLoading, setError, handleAuthError]
  );

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

  return {
    selectedSpace,
    setSelectedSpace,
    documents,
    setDocuments,
    archivedDocuments,
    setArchivedDocuments,
    selectedDocument,
    setSelectedDocument,
    activeArea,
    setActiveArea,
    restoringId,
    loadSpaceDetail,
    loadArchivedDocuments,
    handleArchiveDocument,
    handleRestoreDocument,
  };
};
