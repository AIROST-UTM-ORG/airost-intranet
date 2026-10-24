import { realApiClient, createError, sleep } from "./client";
import { MockScenarios } from "./constants";
import {
  USE_MOCK,
  getArtificialDelay,
  getMockScenario,
  checkScenario,
  mockSpaces,
  mockDocuments,
  SEED_USERS,
} from "./mockData";

/**
 * Admin: List all spaces across the intranet with metrics, pagination, and search.
 */
export const getAdminSpaces = async ({ page = 1, limit = 25, q = "" } = {}) => {
  if (USE_MOCK) {
    const delay = getArtificialDelay();
    if (delay > 0) await sleep(delay);
    checkScenario();

    const scenario = getMockScenario();
    if (scenario === MockScenarios.READ_ONLY || scenario === MockScenarios.FORBIDDEN) {
      throw createError(
        403,
        "FORBIDDEN",
        "Only platform admins can access administrative spaces oversight"
      );
    }

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const trimmedQ = (q || "").trim().toLowerCase();

    const matched = mockSpaces.filter((space) => {
      if (!trimmedQ) return true;
      const title = (space.title || "").toLowerCase();
      const projectTitle = (space.projectId?.title || "").toLowerCase();
      const owner = SEED_USERS.find((u) => u._id === space.createdBy);
      const ownerName = (owner?.name || "").toLowerCase();
      return (
        title.includes(trimmedQ) ||
        projectTitle.includes(trimmedQ) ||
        ownerName.includes(trimmedQ)
      );
    });

    const total = matched.length;
    const startIndex = (p - 1) * l;
    const paginated = matched.slice(startIndex, startIndex + l);

    const formattedSpaces = paginated.map((space) => {
      const activeDocs = mockDocuments.filter(
        (d) => d.spaceId === space._id && !d.archived
      ).length;
      const archivedDocs = mockDocuments.filter(
        (d) => d.spaceId === space._id && d.archived
      ).length;
      const owner = SEED_USERS.find((u) => u._id === space.createdBy) || {
        _id: space.createdBy,
        name: "Admin User",
        email: "admin@airost.org",
      };

      return {
        _id: space._id,
        title: space.title,
        description: space.description,
        project: space.projectId
          ? {
              _id: space.projectId._id || space.projectId,
              title: space.projectId.title || "Project",
            }
          : null,
        owner: {
          _id: owner._id,
          name: owner.name,
          email: owner.email || `${owner.name.toLowerCase().replace(/\s+/g, "")}@airost.org`,
        },
        accessType: space.accessType,
        updateType: space.updateType,
        accessMembersCount: space.accessMembers ? space.accessMembers.length : 0,
        updateMembersCount: space.updateMembers ? space.updateMembers.length : 0,
        documentCount: activeDocs,
        archivedCount: archivedDocs,
        createdAt: space.createdAt,
        updatedAt: space.updatedAt,
      };
    });

    return {
      spaces: formattedSpaces,
      page: p,
      limit: l,
      total,
    };
  }

  const response = await realApiClient.get("/doc/admin/spaces", {
    params: { page, limit, q: q || undefined },
  });
  return response.data;
};

/**
 * Admin: Reassign space ownership (createdBy).
 */
export const reassignSpaceOwner = async (spaceId, userId) => {
  if (USE_MOCK) {
    const delay = getArtificialDelay();
    if (delay > 0) await sleep(delay);
    checkScenario();

    const scenario = getMockScenario();
    if (scenario === MockScenarios.READ_ONLY || scenario === MockScenarios.FORBIDDEN) {
      throw createError(403, "FORBIDDEN", "Only platform admins can reassign space ownership");
    }

    if (!userId) {
      throw createError(400, "VALIDATION_ERROR", "User ID is required", [
        { field: "userId", message: "User ID is required" },
      ]);
    }

    const space = mockSpaces.find((s) => s._id === spaceId);
    if (!space) {
      throw createError(404, "NOT_FOUND", "Documentation space not found");
    }

    const targetUser = SEED_USERS.find((u) => u._id === userId);
    if (!targetUser) {
      throw createError(400, "VALIDATION_ERROR", "User not found or inactive", [
        { field: "userId", message: "User not found" },
      ]);
    }

    space.createdBy = userId;
    space.updatedAt = new Date().toISOString();

    return {
      space: { ...space },
    };
  }

  const response = await realApiClient.patch(`/doc/admin/spaces/${spaceId}/owner`, {
    userId,
  });
  return response.data;
};
