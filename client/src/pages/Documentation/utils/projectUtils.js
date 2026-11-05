import { SEED_PROJECTS } from "../documentationApi";

/**
 * Resolves a raw projectId or project object to an effective project ID.
 * Supports MongoDB ObjectIds, mock numeric IDs, and SEED_PROJECTS matching.
 */
export const resolveProjectId = (rawId, projectObj) => {
  if (!rawId && !projectObj) return "";
  const candidate = rawId || projectObj?._id || projectObj?.id;
  if (!candidate) return "";
  const strId = String(candidate);

  // Valid 24-character hex MongoDB ObjectId
  if (/^[0-9a-fA-F]{24}$/.test(strId)) {
    return strId;
  }

  // Try matching against SEED_PROJECTS by title if projectObj has title
  if (projectObj?.title) {
    const match = SEED_PROJECTS.find(
      (sp) => sp.title.toLowerCase() === projectObj.title.toLowerCase()
    );
    if (match) return match._id;
  }

  // Numeric index lookup in SEED_PROJECTS (e.g. 1 -> index 0, 2 -> index 1)
  const num = parseInt(strId, 10);
  if (!isNaN(num) && num >= 1 && num <= SEED_PROJECTS.length) {
    return SEED_PROJECTS[num - 1]._id;
  }

  return strId;
};
