const mongoose = require('mongoose');
const DocumentationSpace = require('../models/DocumentationSpace');
const Document = require('../models/Document');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const User = require('../models/User');
const Doc = require('../models/docModel');
const {
  isAdmin,
  canViewSpace,
  canUpdateSpace,
  canManageSpace,
  registerProjectRoleResolver,
} = require('../utils/docAccess');
const { emitDocEvent } = require('../utils/docEvents');

/**
 * Custom error class for Documentation service errors.
 */
class DocError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    this.name = 'DocError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Helper to escape special regex characters for safe MongoDB string matching.
 */
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Helper to strictly validate a 24-character hexadecimal ObjectId string.
 */
const isValidObjectId = (id) => {
  if (!id || typeof id !== 'string') return false;
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  return String(new mongoose.Types.ObjectId(id)) === String(id);
};

/**
 * Helper to normalize string whitespace (trim and collapse multiple spaces) in lowercase.
 */
const normalizeWhitespace = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.trim().replace(/\s+/g, ' ').toLowerCase();
};

/**
 * Isolated project membership lookup.
 * Resolves a user's role on a project ('lead', 'advisor', 'member', or null).
 * 
 * Order of resolution:
 * 1. ProjectMember join entity (primary lookup by projectId and userId).
 * 2. Fallback to Project.lead using the strongest unique identifier available:
 *    a. User ObjectId (exact 24-hex match)
 *    b. Email (case-insensitive exact match)
 *    c. Display Name (trimmed, case-insensitive exact match ONLY if exactly ONE active user has that name).
 *       If ambiguous (2+ users), denies and logs a warning with projectId and user count (never user details).
 * Never uses partial or contains matching.
 */
const getUserProjectRole = async (userId, projectId) => {
  if (!userId || !projectId) return null;

  try {
    // 1. Primary lookup: ProjectMember collection (explicit join entity)
    const member = await ProjectMember.findOne({
      projectId,
      userId,
    });
    if (member && member.role) {
      return member.role;
    }

    // 2. Fallback: Project.lead matching
    const project = await Project.findById(projectId);
    if (!project || !project.lead || typeof project.lead !== 'string') {
      return null;
    }

    const leadValue = project.lead.trim();
    if (leadValue.length === 0) {
      return null;
    }

    const user = await User.findById(userId);
    if (!user) {
      return null;
    }

    // 2a. Strongest unique identifier: User ObjectId match
    if (isValidObjectId(leadValue)) {
      if (String(user._id) === leadValue) {
        return 'lead';
      }
      return null;
    }

    // 2b. Second strongest unique identifier: Email match (case-insensitive exact match)
    if (leadValue.includes('@')) {
      if (
        user.email &&
        typeof user.email === 'string' &&
        user.email.trim().toLowerCase() === leadValue.toLowerCase()
      ) {
        return 'lead';
      }
      return null;
    }

    // 2c. Third identifier: Display Name (trimmed, case-insensitive exact match)
    // Never use partial or contains matching.
    const normalizedLead = normalizeWhitespace(leadValue);
    const normalizedUserName = normalizeWhitespace(user.name);

    if (!normalizedUserName || normalizedUserName !== normalizedLead) {
      return null;
    }

    // Current user's display name matches leadValue.
    // Verify that exactly ONE active user has this name.
    const words = leadValue.trim().split(/\s+/).map(escapeRegex);
    const nameRegex = new RegExp(`^\\s*${words.join('\\s+')}\\s*$`, 'i');

    const matchingUsers = await User.find({
      name: { $regex: nameRegex },
    }).select('_id name');

    const count = matchingUsers.length;

    if (count === 1 && String(matchingUsers[0]._id) === String(user._id)) {
      return 'lead';
    }

    if (count > 1) {
      // Ambiguous lead name: deny and log a server-side warning containing only projectId and count (never user details)
      console.warn(
        `[docAccess] Ambiguous project lead display name match for project ${projectId}: ${count} users found. Denying lead role.`
      );
      return null;
    }

    return null;
  } catch (err) {
    console.error('Error fetching user project role:', err);
    return null;
  }
};

// Register role resolver hook with pure docAccess utility
registerProjectRoleResolver(getUserProjectRole);

/**
 * Look up a Project by ID.
 */
const findProjectById = async (projectId) => {
  return await Project.findById(projectId);
};

/* ========================================================================== */
/*                           SPACE SERVICE FUNCTIONS                          */
/* ========================================================================== */

/**
 * Resolves all documentation spaces that the user is permitted to view.
 * Single source of truth for space visibility across listSpaces and searchDocuments,
 * ensuring the two never drift apart.
 */
const getViewableSpaces = async (user, filter = {}) => {
  if (!user) return [];

  const query = {};
  if (filter.projectId) {
    query.projectId = filter.projectId;
  }

  const candidateSpaces = await DocumentationSpace.find(query)
    .populate('projectId', '_id title name')
    .sort({ createdAt: -1 });

  if (isAdmin(user)) {
    return candidateSpaces;
  }

  const visible = [];
  for (const space of candidateSpaces) {
    const role = space.projectId
      ? await getUserProjectRole(user._id, space.projectId._id || space.projectId)
      : null;

    const canView = await canViewSpace(user, space, role);
    if (canView) {
      visible.push(space);
    }
  }

  return visible;
};

/**
 * List all spaces visible to the authenticated user.
 * Performs query, permission filtering, and document count aggregations in ONE query (no N+1).
 */
const listSpaces = async (user, filter = {}) => {
  const visibleSpaces = await getViewableSpaces(user, filter);
  if (visibleSpaces.length === 0) {
    return [];
  }

  // Aggregate active document counts across all visible spaces in one query
  const spaceIds = visibleSpaces.map((s) => s._id);
  const countAggregations = await Document.aggregate([
    { $match: { spaceId: { $in: spaceIds }, archived: false } },
    { $group: { _id: '$spaceId', count: { $sum: 1 } } },
  ]);

  const countMap = new Map();
  for (const item of countAggregations) {
    countMap.set(String(item._id), item.count);
  }

  const formattedSpaces = [];
  for (const space of visibleSpaces) {
    const role = space.projectId
      ? await getUserProjectRole(user._id, space.projectId._id || space.projectId)
      : null;

    const canUpdate = await canUpdateSpace(user, space, role);
    const canManage = canManageSpace(user, space);
    const activeCount = countMap.get(String(space._id)) || 0;

    formattedSpaces.push({
      _id: space._id,
      title: space.title,
      description: space.description,
      projectId: space.projectId
        ? {
            _id: space.projectId._id,
            title: space.projectId.title || space.projectId.name || '',
          }
        : null,
      createdBy: space.createdBy,
      accessType: space.accessType,
      updateType: space.updateType,
      accessMembers: space.accessMembers,
      updateMembers: space.updateMembers,
      documentCount: activeCount,
      activeDocumentCount: activeCount,
      canUpdate,
      canManage,
      isManager: canManage,
      myAccess: canUpdate ? 'update' : 'view',
      createdAt: space.createdAt,
      updatedAt: space.updatedAt,
    });
  }

  return formattedSpaces;
};

/**
 * Search active (non-archived) document titles in visible spaces.
 * Case-insensitive, escapes user regex characters, strictly non-archived documents only.
 * Sort order: titles starting with q first, then alphabetical ascending.
 */
const searchDocuments = async (user, { q, limit = 10 }) => {
  // Use the SAME reusable viewable spaces resolver
  const viewableSpaces = await getViewableSpaces(user);
  if (viewableSpaces.length === 0) {
    return { documents: [] };
  }

  const spaceMap = new Map();
  const viewableSpaceIds = [];
  for (const s of viewableSpaces) {
    viewableSpaceIds.push(s._id);
    spaceMap.set(String(s._id), {
      _id: s._id,
      title: s.title,
    });
  }

  // Escape regex to prevent ReDoS and RegExp injection
  const escaped = escapeRegex(q);
  const titleRegex = new RegExp(escaped, 'i');

  const docs = await Document.find({
    spaceId: { $in: viewableSpaceIds },
    archived: false,
    title: { $regex: titleRegex },
  })
    .select('_id title url provider area spaceId')
    .lean();

  // Sorting order:
  // 1. Prefix match (case-insensitive title starts with q) first
  // 2. Alphabetical (case-insensitive ascending by title) second
  const lowerQ = q.toLowerCase();
  docs.sort((a, b) => {
    const aTitle = (a.title || '').toLowerCase();
    const bTitle = (b.title || '').toLowerCase();
    const aStarts = aTitle.startsWith(lowerQ);
    const bStarts = bTitle.startsWith(lowerQ);

    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;

    return aTitle.localeCompare(bTitle);
  });

  const limitedDocs = docs.slice(0, limit);

  const formattedDocuments = limitedDocs.map((doc) => ({
    _id: doc._id,
    title: doc.title,
    url: doc.url,
    provider: doc.provider,
    area: doc.area,
    spaceId: doc.spaceId,
    space: spaceMap.get(String(doc.spaceId)) || { _id: doc.spaceId, title: '' },
  }));

  return { documents: formattedDocuments };
};

/**
 * Create a new documentation space.
 */
const createSpace = async (userId, spaceData) => {
  const space = await DocumentationSpace.create({
    ...spaceData,
    createdBy: userId,
  });

  emitDocEvent('space.created', {
    actorId: String(userId),
    spaceId: String(space._id),
    projectId: space.projectId ? String(space.projectId._id || space.projectId) : null,
    title: space.title,
  });

  return space;
};

/**
 * Get space by ID with populated references.
 */
const getSpaceById = async (spaceId) => {
  return await DocumentationSpace.findById(spaceId)
    .populate('projectId', '_id title name')
    .populate('accessMembers', '_id name')
    .populate('updateMembers', '_id name');
};

/**
 * Aggregate space details including active document count, archived count, and area breakdown.
 */
const getSpaceDetail = async (space, user, projectRole) => {
  const canUpdate = await canUpdateSpace(user, space, projectRole);
  const canManage = canManageSpace(user, space);

  const activeCount = await Document.countDocuments({
    spaceId: space._id,
    archived: false,
  });

  const archivedCount = canUpdate
    ? await Document.countDocuments({ spaceId: space._id, archived: true })
    : 0;

  // Calculate per-area breakdown for active documents
  const activeDocs = await Document.find({ spaceId: space._id, archived: false }, 'area');
  const areaCounts = {
    general: 0,
    requirements: 0,
    design: 0,
    development: 0,
    testing: 0,
    deployment: 0,
  };
  for (const doc of activeDocs) {
    if (areaCounts[doc.area] !== undefined) {
      areaCounts[doc.area] += 1;
    }
  }

  return {
    _id: space._id,
    title: space.title,
    description: space.description,
    projectId: space.projectId
      ? {
          _id: space.projectId._id,
          title: space.projectId.title || space.projectId.name || '',
        }
      : null,
    createdBy: space.createdBy,
    accessType: space.accessType,
    updateType: space.updateType,
    accessMembers: space.accessMembers,
    updateMembers: space.updateMembers,
    canUpdate,
    canManage,
    documentCount: activeCount,
    archivedCount,
    areaCounts,
    createdAt: space.createdAt,
    updatedAt: space.updatedAt,
  };
};

/**
 * Update space settings.
 */
const updateSpace = async (spaceId, updateData, actorId = null) => {
  const space = await DocumentationSpace.findById(spaceId);
  if (!space) {
    throw new DocError(404, 'NOT_FOUND', 'Documentation space not found');
  }
  Object.assign(space, updateData);
  await space.save();

  emitDocEvent('space.updated', {
    actorId: String(actorId || space.createdBy),
    spaceId: String(space._id),
    projectId: space.projectId ? String(space.projectId._id || space.projectId) : null,
    title: space.title,
  });

  return space;
};

/**
 * Permanently delete a space and cascade delete all associated documents.
 */
const deleteSpaceCascade = async (spaceId, actorId = null) => {
  const space = await DocumentationSpace.findById(spaceId);
  if (!space) {
    throw new DocError(404, 'NOT_FOUND', 'Documentation space not found');
  }

  const spaceTitle = space.title;
  const projectId = space.projectId ? String(space.projectId._id || space.projectId) : null;

  const deleteDocsResult = await Document.deleteMany({ spaceId: space._id });
  await DocumentationSpace.findByIdAndDelete(spaceId);

  emitDocEvent('space.deleted', {
    actorId: String(actorId || ''),
    spaceId: String(spaceId),
    projectId,
    title: spaceTitle,
  });

  return {
    deletedSpaceId: spaceId,
    deletedDocumentsCount: deleteDocsResult.deletedCount,
  };
};

/**
 * List all spaces across the intranet with administrative metrics, pagination, and search filtering.
 * Platform admin only. Document counts aggregated in one batch query.
 */
const adminListSpaces = async ({ page = 1, limit = 25, q = '' } = {}) => {
  const filter = {};
  if (q && q.trim().length > 0) {
    const trimmedQ = q.trim();
    const escaped = escapeRegex(trimmedQ);
    const regex = new RegExp(escaped, 'i');

    const matchingProjects = await Project.find({
      $or: [{ title: { $regex: regex } }, { name: { $regex: regex } }],
    }).select('_id');
    const projectIds = matchingProjects.map((p) => p._id);

    const matchingUsers = await User.find({
      name: { $regex: regex },
    }).select('_id');
    const userIds = matchingUsers.map((u) => u._id);

    filter.$or = [
      { title: { $regex: regex } },
      { projectId: { $in: projectIds } },
      { createdBy: { $in: userIds } },
    ];
  }

  const total = await DocumentationSpace.countDocuments(filter);
  const skip = (page - 1) * limit;

  const spaces = await DocumentationSpace.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('projectId', '_id title name')
    .populate('createdBy', '_id name email');

  const spaceIds = spaces.map((s) => s._id);
  const activeCountMap = new Map();
  const archivedCountMap = new Map();

  if (spaceIds.length > 0) {
    const countsAggregation = await Document.aggregate([
      { $match: { spaceId: { $in: spaceIds } } },
      {
        $group: {
          _id: { spaceId: '$spaceId', archived: '$archived' },
          count: { $sum: 1 },
        },
      },
    ]);

    for (const item of countsAggregation) {
      const sId = String(item._id.spaceId);
      if (item._id.archived) {
        archivedCountMap.set(sId, item.count);
      } else {
        activeCountMap.set(sId, item.count);
      }
    }
  }

  const formattedSpaces = spaces.map((space) => ({
    _id: space._id,
    title: space.title,
    description: space.description,
    project: space.projectId
      ? {
          _id: space.projectId._id,
          title: space.projectId.title || space.projectId.name || '',
        }
      : null,
    owner: space.createdBy
      ? {
          _id: space.createdBy._id,
          name: space.createdBy.name || '',
          email: space.createdBy.email || '',
        }
      : null,
    accessType: space.accessType,
    updateType: space.updateType,
    accessMembersCount: Array.isArray(space.accessMembers) ? space.accessMembers.length : 0,
    updateMembersCount: Array.isArray(space.updateMembers) ? space.updateMembers.length : 0,
    documentCount: activeCountMap.get(String(space._id)) || 0,
    archivedCount: archivedCountMap.get(String(space._id)) || 0,
    createdAt: space.createdAt,
    updatedAt: space.updatedAt,
  }));

  return {
    spaces: formattedSpaces,
    page,
    limit,
    total,
  };
};

/**
 * Reassign the owner (creator) of a documentation space to another active user.
 * Admin only. Emits space.owner_reassigned.
 */
const adminReassignSpaceOwner = async (spaceId, newOwnerId, actorId) => {
  const space = await DocumentationSpace.findById(spaceId);
  if (!space) {
    throw new DocError(404, 'NOT_FOUND', 'Documentation space not found');
  }

  const user = await User.findById(newOwnerId);
  if (!user || user.isActive === false) {
    throw new DocError(
      400,
      'VALIDATION_ERROR',
      'Target user does not exist or is inactive'
    );
  }

  space.createdBy = user._id;
  await space.save();

  emitDocEvent('space.owner_reassigned', {
    actorId: String(actorId),
    spaceId: String(space._id),
    projectId: space.projectId ? String(space.projectId._id || space.projectId) : null,
    title: space.title,
  });

  return { space };
};

/* ========================================================================== */
/*                         DOCUMENT SERVICE FUNCTIONS                         */
/* ========================================================================== */

/**
 * List documents within a space, filtered by area or archive status.
 */
const listDocuments = async (spaceId, options = {}) => {
  const { area, includeArchived, archivedOnly } = options;
  const query = { spaceId };

  if (area) {
    query.area = area;
  }

  if (includeArchived === 'true') {
    if (archivedOnly === 'true') {
      query.archived = true;
    }
  } else {
    query.archived = false;
  }

  return await Document.find(query).sort({ createdAt: -1 });
};

/**
 * Add a new document link to a space.
 */
const createDocument = async (spaceId, userId, documentData) => {
  const space = await DocumentationSpace.findById(spaceId);
  const doc = await Document.create({
    spaceId,
    ...documentData,
    createdBy: userId,
    archived: false,
  });

  emitDocEvent('document.created', {
    actorId: String(userId),
    spaceId: String(spaceId),
    projectId: space && space.projectId ? String(space.projectId._id || space.projectId) : null,
    documentId: String(doc._id),
    title: doc.title,
  });

  return doc;
};

/**
 * Get a single document by ID.
 */
const getDocumentById = async (documentId) => {
  return await Document.findById(documentId);
};

/**
 * Update document metadata or URL.
 */
const updateDocument = async (documentId, updateData, actorId = null) => {
  const doc = await Document.findById(documentId);
  if (!doc) {
    throw new DocError(404, 'NOT_FOUND', 'Document not found');
  }

  const space = await DocumentationSpace.findById(doc.spaceId);
  const prevArchived = doc.archived;
  const isArchiving = updateData.archived === true && prevArchived === false;
  const isRestoring = updateData.archived === false && prevArchived === true;

  Object.assign(doc, updateData);
  await doc.save();

  let eventType = 'document.updated';
  if (isArchiving) {
    eventType = 'document.archived';
  } else if (isRestoring) {
    eventType = 'document.restored';
  }

  emitDocEvent(eventType, {
    actorId: String(actorId || doc.createdBy),
    spaceId: String(doc.spaceId),
    projectId: space && space.projectId ? String(space.projectId._id || space.projectId) : null,
    documentId: String(doc._id),
    title: doc.title,
  });

  return doc;
};

/**
 * Archive a document (soft delete: archived = true).
 */
const archiveDocument = async (documentId, actorId = null) => {
  const doc = await Document.findById(documentId);
  if (!doc) {
    throw new DocError(404, 'NOT_FOUND', 'Document not found');
  }

  const space = await DocumentationSpace.findById(doc.spaceId);
  doc.archived = true;
  await doc.save();

  emitDocEvent('document.archived', {
    actorId: String(actorId || doc.createdBy),
    spaceId: String(doc.spaceId),
    projectId: space && space.projectId ? String(space.projectId._id || space.projectId) : null,
    documentId: String(doc._id),
    title: doc.title,
  });

  return {
    message: 'Document archived successfully',
    document: doc,
  };
};

/**
 * Permanently delete a document record from the database.
 */
const deleteDocumentPermanent = async (documentId, actorId = null) => {
  const doc = await Document.findById(documentId);
  if (!doc) {
    throw new DocError(404, 'NOT_FOUND', 'Document not found');
  }

  const space = await DocumentationSpace.findById(doc.spaceId);
  const docTitle = doc.title;
  const spaceId = doc.spaceId;

  await Document.findByIdAndDelete(documentId);

  emitDocEvent('document.deleted', {
    actorId: String(actorId || ''),
    spaceId: String(spaceId),
    projectId: space && space.projectId ? String(space.projectId._id || space.projectId) : null,
    documentId: String(documentId),
    title: docTitle,
  });

  return {
    message: 'Document permanently deleted',
    deletedDocumentId: documentId,
  };
};

/* ========================================================================== */
/*                        LEGACY DOC SERVICE FUNCTIONS                        */
/* ========================================================================== */

const getLegacyDocs = async () => {
  return await Doc.find({}).sort({ createdAt: -1 });
};

const getLegacyDocById = async (id) => {
  return await Doc.findById(id);
};

const createLegacyDoc = async (data) => {
  return await Doc.create(data);
};

const deleteLegacyDoc = async (id) => {
  return await Doc.findOneAndDelete({ _id: id });
};

const updateLegacyDoc = async (id, data) => {
  return await Doc.findByIdAndUpdate({ _id: id }, { ...data }, { new: true });
};

module.exports = {
  DocError,
  getUserProjectRole,
  findProjectById,
  getViewableSpaces,
  listSpaces,
  searchDocuments,
  createSpace,
  getSpaceById,
  getSpaceDetail,
  updateSpace,
  deleteSpaceCascade,
  adminListSpaces,
  adminReassignSpaceOwner,
  listDocuments,
  createDocument,
  getDocumentById,
  updateDocument,
  archiveDocument,
  deleteDocumentPermanent,
  getLegacyDocs,
  getLegacyDocById,
  createLegacyDoc,
  deleteLegacyDoc,
  updateLegacyDoc,
};
