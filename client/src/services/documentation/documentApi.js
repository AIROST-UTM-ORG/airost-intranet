import { realApiClient, createError, sleep } from "./client";
import { MockScenarios, VALID_AREAS, deriveProviderFromUrl } from "./constants";
import {
  USE_MOCK,
  getArtificialDelay,
  getMockScenario,
  checkScenario,
  mockSpaces,
  mockDocuments,
} from "./mockData";

/**
 * List documents in a space with optional filters.
 */
export const listDocuments = async (spaceId, { area, includeArchived = false } = {}) => {
  if (USE_MOCK) {
    const delay = getArtificialDelay();
    if (delay > 0) await sleep(delay);
    checkScenario();

    const space = mockSpaces.find((s) => s._id === spaceId);
    if (!space) {
      throw createError(404, "NOT_FOUND", "Space not found");
    }

    const wantArchived = String(includeArchived) === "true";
    if (wantArchived && (getMockScenario() === MockScenarios.READ_ONLY || !space.canUpdate)) {
      throw createError(403, "FORBIDDEN", "Only update-permitted members may view archived links");
    }

    let docs = mockDocuments.filter((d) => d.spaceId === spaceId);

    if (wantArchived) {
      docs = docs.filter((d) => d.archived);
    } else {
      docs = docs.filter((d) => !d.archived);
    }

    if (area) {
      docs = docs.filter((d) => d.area === area);
    }

    return docs;
  }

  const params = {};
  if (area) params.area = area;
  if (includeArchived) {
    params.includeArchived = "true";
    params.archivedOnly = "true";
  }

  const response = await realApiClient.get(`/doc/spaces/${spaceId}/documents`, { params });
  const docs = response.data || [];
  return docs.filter((d) => (includeArchived ? Boolean(d.archived) : !d.archived));
};

/**
 * Add a new document link to a space.
 */
export const createDocument = async (spaceId, payload) => {
  if (USE_MOCK) {
    const delay = getArtificialDelay();
    if (delay > 0) await sleep(delay);
    checkScenario();

    const space = mockSpaces.find((s) => s._id === spaceId);
    if (!space) {
      throw createError(404, "NOT_FOUND", "Space not found");
    }
    if (getMockScenario() === MockScenarios.READ_ONLY || !space.canUpdate) {
      throw createError(403, "FORBIDDEN", "Read-only users cannot add documents");
    }

    const { title, url, area = "general" } = payload;
    if (!title || !title.trim()) {
      throw createError(400, "VALIDATION_ERROR", "Title is required", [
        { field: "title", message: "Document title is required" },
      ]);
    }
    if (!url || !url.trim()) {
      throw createError(400, "VALIDATION_ERROR", "Link URL is required", [
        { field: "url", message: "Document link is required" },
      ]);
    }

    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== "https:") {
        throw new Error();
      }
    } catch {
      throw createError(400, "VALIDATION_ERROR", "URL must use the https: scheme", [
        { field: "url", message: "Only HTTPS URLs are allowed" },
      ]);
    }

    const provider = deriveProviderFromUrl(url.trim());
    const newDoc = {
      _id: "doc-" + Date.now(),
      spaceId,
      title: title.trim(),
      url: url.trim(),
      provider,
      area: VALID_AREAS.includes(area) ? area : "general",
      createdBy: "65f29d20c571c48201a22222",
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockDocuments.unshift(newDoc);
    return newDoc;
  }

  const response = await realApiClient.post(`/doc/spaces/${spaceId}/documents`, payload);
  return response.data;
};

/**
 * Edit document metadata or restore an archived document.
 */
export const updateDocument = async (documentId, payload) => {
  if (USE_MOCK) {
    const delay = getArtificialDelay();
    if (delay > 0) await sleep(delay);
    checkScenario();

    const docIndex = mockDocuments.findIndex((d) => d._id === documentId);
    if (docIndex === -1) {
      throw createError(404, "NOT_FOUND", "Document not found");
    }

    const currentDoc = mockDocuments[docIndex];
    const space = mockSpaces.find((s) => s._id === currentDoc.spaceId);
    if (getMockScenario() === MockScenarios.READ_ONLY || (space && !space.canUpdate)) {
      throw createError(403, "FORBIDDEN", "Read-only users cannot edit documents");
    }

    const updated = { ...currentDoc, updatedAt: new Date().toISOString() };

    if (payload.title !== undefined) {
      if (!payload.title.trim()) {
        throw createError(400, "VALIDATION_ERROR", "Title cannot be empty");
      }
      updated.title = payload.title.trim();
    }

    if (payload.url !== undefined && payload.url.trim() !== "") {
      try {
        const parsed = new URL(payload.url.trim());
        if (parsed.protocol !== "https:") throw new Error();
      } catch {
        throw createError(400, "VALIDATION_ERROR", "URL must use the https: scheme", [
          { field: "url", message: "Only HTTPS URLs are allowed" },
        ]);
      }
      updated.url = payload.url.trim();
      updated.provider = deriveProviderFromUrl(payload.url.trim());
    }

    if (payload.area !== undefined) {
      if (VALID_AREAS.includes(payload.area)) {
        updated.area = payload.area;
      }
    }

    if (payload.archived !== undefined) {
      updated.archived = Boolean(payload.archived);
    }

    mockDocuments[docIndex] = updated;
    return updated;
  }

  const response = await realApiClient.patch(`/doc/documents/${documentId}`, payload);
  return response.data;
};

/**
 * Archive a document (soft delete: archived = true).
 */
export const archiveDocument = async (documentId) => {
  if (USE_MOCK) {
    const delay = getArtificialDelay();
    if (delay > 0) await sleep(delay);
    checkScenario();

    const doc = mockDocuments.find((d) => d._id === documentId);
    if (!doc) {
      throw createError(404, "NOT_FOUND", "Document not found");
    }

    doc.archived = true;
    doc.updatedAt = new Date().toISOString();

    return {
      message: "Document archived successfully",
      document: { ...doc },
    };
  }

  const response = await realApiClient.delete(`/doc/documents/${documentId}`);
  return response.data;
};

/**
 * Restore an archived document (archived = false).
 */
export const restoreDocument = async (documentId) => {
  return updateDocument(documentId, { archived: false });
};

/**
 * Hard delete a document record (admin only).
 */
export const permanentlyDeleteDocument = async (documentId) => {
  if (USE_MOCK) {
    const delay = getArtificialDelay();
    if (delay > 0) await sleep(delay);
    checkScenario();

    const index = mockDocuments.findIndex((d) => d._id === documentId);
    if (index === -1) {
      throw createError(404, "NOT_FOUND", "Document not found");
    }

    mockDocuments.splice(index, 1);
    return {
      message: "Document permanently deleted",
      deletedDocumentId: documentId,
    };
  }

  const response = await realApiClient.delete(`/doc/documents/${documentId}/permanent`);
  return response.data;
};
