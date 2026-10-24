import { realApiClient, createError, sleep } from "./client";
import { MockScenarios } from "./constants";
import {
  USE_MOCK,
  getArtificialDelay,
  getMockScenario,
  checkScenario,
  computeSpaceCounts,
  mockSpaces,
  mockDocuments,
  SEED_PROJECTS,
  SEED_USERS,
} from "./mockData";

/**
 * List all spaces the user can view.
 */
export const listSpaces = async (filter = {}) => {
  if (USE_MOCK) {
    const delay = getArtificialDelay();
    if (delay > 0) await sleep(delay);
    checkScenario();

    const currentScenario = getMockScenario();
    if (currentScenario === MockScenarios.FIRST_USE) {
      return [];
    }

    let spaces = mockSpaces;
    if (filter && filter.projectId) {
      const targetId = String(
        typeof filter.projectId === "object" ? filter.projectId._id : filter.projectId
      );
      spaces = spaces.filter((space) => {
        const pId = space.projectId
          ? typeof space.projectId === "object"
            ? space.projectId._id
            : space.projectId
          : null;
        return pId && String(pId) === targetId;
      });
    }

    return spaces.map((space) => {
      const counts = computeSpaceCounts(space._id);
      const isReadOnly = currentScenario === MockScenarios.READ_ONLY;
      return {
        ...space,
        activeDocumentCount: counts.activeDocumentCount,
        documentCount: counts.activeDocumentCount,
        archivedDocumentCount: counts.archivedDocumentCount,
        archivedCount: counts.archivedDocumentCount,
        canUpdate: isReadOnly ? false : space.canUpdate,
        isManager: isReadOnly ? false : space.isManager,
      };
    });
  }

  const params = {};
  if (filter && filter.projectId) {
    params.projectId =
      typeof filter.projectId === "object" ? filter.projectId._id : filter.projectId;
  }
  const response = await realApiClient.get("/doc/spaces", {
    params: Object.keys(params).length > 0 ? params : undefined,
  });
  return (response.data || []).map((space) => ({
    ...space,
    isManager: Boolean(space.canManage ?? space.isManager),
    canManage: Boolean(space.canManage ?? space.isManager),
    documentCount: space.documentCount ?? space.activeDocumentCount ?? 0,
    activeDocumentCount: space.documentCount ?? space.activeDocumentCount ?? 0,
    archivedCount: space.archivedCount ?? space.archivedDocumentCount ?? 0,
    archivedDocumentCount: space.archivedCount ?? space.archivedDocumentCount ?? 0,
  }));
};

/**
 * Read one space by ID with full metadata, permission flags, and area counts.
 */
export const getSpace = async (spaceId) => {
  if (USE_MOCK) {
    const delay = getArtificialDelay();
    if (delay > 0) await sleep(delay);
    checkScenario();

    const space = mockSpaces.find((s) => s._id === spaceId);
    if (!space) {
      throw createError(404, "NOT_FOUND", "Space not found");
    }

    const counts = computeSpaceCounts(spaceId);
    const currentScenario = getMockScenario();
    const isReadOnly = currentScenario === MockScenarios.READ_ONLY;

    // Populate members with names if selected
    const populatedAccessMembers = (space.accessMembers || []).map((id) => {
      const found = SEED_USERS.find((u) => u._id === id);
      return found || { _id: id, name: "Member" };
    });
    const populatedUpdateMembers = (space.updateMembers || []).map((id) => {
      const found = SEED_USERS.find((u) => u._id === id);
      return found || { _id: id, name: "Member" };
    });

    return {
      ...space,
      accessMembers: populatedAccessMembers,
      updateMembers: populatedUpdateMembers,
      activeDocumentCount: counts.activeDocumentCount,
      archivedDocumentCount: counts.archivedDocumentCount,
      archivedCount: counts.archivedDocumentCount,
      areaCounts: counts.areaCounts,
      canUpdate: isReadOnly ? false : space.canUpdate,
      isManager: isReadOnly ? false : space.isManager,
      canManage: isReadOnly ? false : space.isManager,
    };
  }

  const response = await realApiClient.get(`/doc/spaces/${spaceId}`);
  const data = response.data;
  return {
    ...data,
    isManager: Boolean(data.canManage ?? data.isManager),
    canManage: Boolean(data.canManage ?? data.isManager),
    documentCount: data.documentCount ?? data.activeDocumentCount ?? 0,
    activeDocumentCount: data.documentCount ?? data.activeDocumentCount ?? 0,
    archivedCount: data.archivedCount ?? data.archivedDocumentCount ?? 0,
    archivedDocumentCount: data.archivedCount ?? data.archivedDocumentCount ?? 0,
  };
};

/**
 * Create a new documentation space.
 */
export const createSpace = async (payload) => {
  if (USE_MOCK) {
    const delay = getArtificialDelay();
    if (delay > 0) await sleep(delay);
    checkScenario();

    const {
      title,
      description,
      projectId = null,
      accessType = "all",
      updateType = "all",
      accessMembers = [],
      updateMembers = [],
    } = payload;

    if (!title || !title.trim()) {
      throw createError(400, "VALIDATION_ERROR", "Title is required", [
        { field: "title", message: "Title is required" },
      ]);
    }
    if (!description || !description.trim()) {
      throw createError(400, "VALIDATION_ERROR", "Description is required", [
        { field: "description", message: "Description is required" },
      ]);
    }
    if (!projectId && (accessType === "project_members" || updateType === "project_members")) {
      throw createError(
        400,
        "VALIDATION_ERROR",
        "'project_members' is invalid for standalone spaces"
      );
    }

    let projectObj = null;
    if (projectId) {
      const p = SEED_PROJECTS.find((item) => item._id === projectId || item.title === projectId);
      projectObj = p ? { _id: p._id, title: p.title } : { _id: projectId, title: "Project" };
    }

    const newSpace = {
      _id: "space-" + Date.now(),
      title: title.trim(),
      description: description.trim(),
      projectId: projectObj,
      createdBy: "65f29d20c571c48201a22222",
      accessType,
      updateType,
      accessMembers: accessType === "selected" ? [...new Set(accessMembers)] : [],
      updateMembers: updateType === "selected" ? [...new Set(updateMembers)] : [],
      canUpdate: true,
      isManager: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockSpaces.unshift(newSpace);
    return newSpace;
  }

  const sanitizedPayload = {
    ...payload,
    ...(payload.accessMembers
      ? {
          accessMembers: payload.accessMembers.filter(
            (id) => typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id)
          ),
        }
      : {}),
    ...(payload.updateMembers
      ? {
          updateMembers: payload.updateMembers.filter(
            (id) => typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id)
          ),
        }
      : {}),
  };

  const response = await realApiClient.post("/doc/spaces", sanitizedPayload);
  const data = response.data;
  return {
    ...data,
    canManage: true,
    isManager: true,
    canUpdate: true,
    documentCount: 0,
    activeDocumentCount: 0,
    archivedCount: 0,
    archivedDocumentCount: 0,
  };
};

/**
 * Update space fields and settings.
 */
export const updateSpace = async (spaceId, payload) => {
  if (USE_MOCK) {
    const delay = getArtificialDelay();
    if (delay > 0) await sleep(delay);
    checkScenario();

    const spaceIndex = mockSpaces.findIndex((s) => s._id === spaceId);
    if (spaceIndex === -1) {
      throw createError(404, "NOT_FOUND", "Space not found");
    }

    const current = mockSpaces[spaceIndex];
    const updated = { ...current, ...payload, updatedAt: new Date().toISOString() };

    if (payload.projectId !== undefined) {
      if (!payload.projectId) {
        updated.projectId = null;
        if (updated.accessType === "project_members" || updated.updateType === "project_members") {
          throw createError(
            400,
            "VALIDATION_ERROR",
            "'project_members' cannot be used on a standalone space"
          );
        }
      } else {
        const p = SEED_PROJECTS.find(
          (item) => item._id === payload.projectId || item.title === payload.projectId
        );
        updated.projectId = p
          ? { _id: p._id, title: p.title }
          : { _id: payload.projectId, title: "Project" };
      }
    }

    if (payload.accessType && payload.accessType !== "selected") {
      updated.accessMembers = [];
    }
    if (payload.updateType && payload.updateType !== "selected") {
      updated.updateMembers = [];
    }

    mockSpaces[spaceIndex] = updated;
    return updated;
  }

  const sanitizedPayload = {
    ...payload,
    ...(payload.accessMembers
      ? {
          accessMembers: payload.accessMembers.filter(
            (id) => typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id)
          ),
        }
      : {}),
    ...(payload.updateMembers
      ? {
          updateMembers: payload.updateMembers.filter(
            (id) => typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id)
          ),
        }
      : {}),
  };

  const response = await realApiClient.patch(`/doc/spaces/${spaceId}`, sanitizedPayload);
  const data = response.data;
  return {
    ...data,
    canManage: Boolean(data.canManage ?? data.isManager ?? true),
    isManager: Boolean(data.canManage ?? data.isManager ?? true),
    documentCount: data.documentCount ?? data.activeDocumentCount ?? 0,
    activeDocumentCount: data.documentCount ?? data.activeDocumentCount ?? 0,
  };
};

/**
 * Permanently delete a space (admin only).
 */
export const deleteSpace = async (spaceId) => {
  if (USE_MOCK) {
    const delay = getArtificialDelay();
    if (delay > 0) await sleep(delay);
    checkScenario();

    const spaceIndex = mockSpaces.findIndex((s) => s._id === spaceId);
    if (spaceIndex === -1) {
      throw createError(404, "NOT_FOUND", "Space not found");
    }

    mockSpaces.splice(spaceIndex, 1);
    const beforeCount = mockDocuments.length;
    for (let i = mockDocuments.length - 1; i >= 0; i--) {
      if (mockDocuments[i].spaceId === spaceId) {
        mockDocuments.splice(i, 1);
      }
    }
    const deletedDocs = beforeCount - mockDocuments.length;

    return {
      message: "Space and associated documents deleted successfully",
      deletedSpaceId: spaceId,
      deletedDocumentsCount: deletedDocs,
    };
  }

  const response = await realApiClient.delete(`/doc/spaces/${spaceId}`);
  return response.data;
};

/**
 * Helper: List available projects for selection in Create/Edit Space.
 */
export const listProjects = async () => {
  if (USE_MOCK) {
    const delay = getArtificialDelay();
    if (delay > 0) await sleep(delay);
    checkScenario();
    return [...SEED_PROJECTS];
  }

  try {
    const res = await realApiClient.get("/projects");
    return (res.data || []).map((p) => ({
      _id: p._id,
      title: p.title || p.name || `Project ${p.projectId || ""}`,
    }));
  } catch (err) {
    return [...SEED_PROJECTS];
  }
};

/**
 * Helper: List users/members for member picker.
 */
export const listMembers = async () => {
  if (USE_MOCK) {
    const delay = getArtificialDelay();
    if (delay > 0) await sleep(delay);
    checkScenario();
    return [...SEED_USERS];
  }

  try {
    const res = await realApiClient.get("/admin/users");
    if (Array.isArray(res.data) && res.data.length > 0) {
      return res.data
        .map((u) => ({
          _id: u._id || u.id,
          name: u.name || u.email || "Member",
          email: u.email,
        }))
        .filter((u) => u._id && /^[0-9a-fA-F]{24}$/.test(String(u._id)));
    }
    return [...SEED_USERS];
  } catch (err) {
    return [...SEED_USERS];
  }
};
