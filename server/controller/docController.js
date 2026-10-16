const docService = require('../services/docService');
const {
  VALID_AREAS,
  isValidObjectId,
  validateSpaceCreate,
  validateSpaceUpdate,
  validateDocumentCreate,
  validateDocumentUpdate,
  validateDocSearch,
  validateAdminSpacesQuery,
  validateReassignOwner,
} = require('../utils/docValidation');
const {
  isAdmin,
  canCreateSpace,
  canManageSpace,
  canViewSpace,
  canUpdateSpace,
} = require('../utils/docAccess');

/**
 * Standard error response helper adhering to unified error envelope.
 */
const sendError = (res, status, code, message, details = []) => {
  return res.status(status).json({
    error: {
      code,
      message,
      ...(details && details.length > 0 ? { details } : {}),
    },
  });
};

/**
 * Helper to handle errors thrown by the service layer.
 */
const handleServiceError = (res, err, defaultMsg) => {
  if (err instanceof docService.DocError || (err && err.status && err.code)) {
    return sendError(res, err.status, err.code, err.message, err.details);
  }
  console.error(defaultMsg, err);
  return sendError(res, 500, 'INTERNAL_ERROR', defaultMsg);
};

/* ========================================================================== */
/*                NEW DOCUMENTATION SPACE & DOCUMENT ENDPOINTS                */
/* ========================================================================== */

/**
 * GET /doc/spaces
 * List all documentation spaces the authenticated user can view.
 * Supports optional projectId filter validated with 400 INVALID_ID.
 */
const listSpaces = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'UNAUTHENTICATED', 'User session is not authenticated');
    }

    if (
      req.query.projectId !== undefined &&
      req.query.projectId !== null &&
      req.query.projectId !== ''
    ) {
      if (!isValidObjectId(req.query.projectId)) {
        return sendError(res, 400, 'INVALID_ID', 'Invalid projectId query parameter format');
      }
    }

    const visibleSpaces = await docService.listSpaces(req.user, req.query);
    return res.status(200).json(visibleSpaces);
  } catch (err) {
    return handleServiceError(res, err, 'An unexpected error occurred while listing spaces');
  }
};

/**
 * GET /doc/search
 * Search non-archived document titles in visible spaces.
 */
const searchDocuments = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'UNAUTHENTICATED', 'User session is not authenticated');
    }

    const validation = validateDocSearch(req.query);
    if (!validation.valid) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Validation failed for search query', validation.details);
    }

    const result = await docService.searchDocuments(req.user, validation.data);
    return res.status(200).json(result);
  } catch (err) {
    return handleServiceError(res, err, 'An unexpected error occurred while searching documents');
  }
};

/**
 * POST /doc/spaces
 * Create a new documentation space.
 */
const createSpace = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'UNAUTHENTICATED', 'User session is not authenticated');
    }

    const validation = validateSpaceCreate(req.body);
    if (validation.hasInvalidId) {
      return sendError(res, 400, 'INVALID_ID', 'Invalid ObjectId format in request payload', validation.details);
    }
    if (!validation.valid) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Request validation failed', validation.details);
    }

    if (validation.data.projectId) {
      const project = await docService.findProjectById(validation.data.projectId);
      if (!project) {
        return sendError(res, 404, 'NOT_FOUND', 'Linked project not found');
      }
    }

    const role = validation.data.projectId
      ? await docService.getUserProjectRole(req.user._id, validation.data.projectId)
      : null;

    const permitted = await canCreateSpace(req.user, validation.data.projectId, role);
    if (!permitted) {
      return sendError(
        res,
        403,
        'FORBIDDEN',
        validation.data.projectId
          ? 'Only platform admins or the project lead can create spaces for this project'
          : 'Only platform admins can create standalone documentation spaces'
      );
    }

    const space = await docService.createSpace(req.user._id, validation.data);
    return res.status(201).json(space);
  } catch (err) {
    return handleServiceError(res, err, 'An unexpected error occurred while creating space');
  }
};

/**
 * GET /doc/spaces/:spaceId
 * Read details of a single documentation space.
 */
const getSpace = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'UNAUTHENTICATED', 'User session is not authenticated');
    }

    const { spaceId } = req.params;
    if (!isValidObjectId(spaceId)) {
      return sendError(res, 400, 'INVALID_ID', 'Invalid spaceId format');
    }

    const space = await docService.getSpaceById(spaceId);
    if (!space) {
      return sendError(res, 404, 'NOT_FOUND', 'Documentation space not found');
    }

    const role = space.projectId
      ? await docService.getUserProjectRole(req.user._id, space.projectId._id || space.projectId)
      : null;

    const canView = await canViewSpace(req.user, space, role);
    if (!canView) {
      // View Stealth Rule: return 404 to avoid leaking space existence
      return sendError(res, 404, 'NOT_FOUND', 'Documentation space not found');
    }

    const responseData = await docService.getSpaceDetail(space, req.user, role);
    return res.status(200).json(responseData);
  } catch (err) {
    return handleServiceError(res, err, 'An unexpected error occurred while retrieving space');
  }
};

/**
 * PATCH /doc/spaces/:spaceId
 * Update space settings (Manager / Admin access).
 */
const updateSpace = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'UNAUTHENTICATED', 'User session is not authenticated');
    }

    const { spaceId } = req.params;
    if (!isValidObjectId(spaceId)) {
      return sendError(res, 400, 'INVALID_ID', 'Invalid spaceId format');
    }

    const space = await docService.getSpaceById(spaceId);
    if (!space) {
      return sendError(res, 404, 'NOT_FOUND', 'Documentation space not found');
    }

    const role = space.projectId
      ? await docService.getUserProjectRole(req.user._id, space.projectId._id || space.projectId)
      : null;

    const canView = await canViewSpace(req.user, space, role);
    if (!canView) {
      return sendError(res, 404, 'NOT_FOUND', 'Documentation space not found');
    }

    const canManage = canManageSpace(req.user, space);
    if (!canManage) {
      return sendError(res, 403, 'FORBIDDEN', 'You do not have permission to manage this space');
    }

    const validation = validateSpaceUpdate(req.body, space);
    if (validation.hasInvalidId) {
      return sendError(res, 400, 'INVALID_ID', 'Invalid ObjectId format in request payload', validation.details);
    }
    if (!validation.valid) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Request validation failed', validation.details);
    }

    if (validation.data.projectId) {
      const project = await docService.findProjectById(validation.data.projectId);
      if (!project) {
        return sendError(res, 404, 'NOT_FOUND', 'Linked project not found');
      }
    }

    const updatedSpace = await docService.updateSpace(spaceId, validation.data, req.user._id);
    return res.status(200).json(updatedSpace);
  } catch (err) {
    return handleServiceError(res, err, 'An unexpected error occurred while updating space');
  }
};

/**
 * DELETE /doc/spaces/:spaceId
 * Hard delete a space and cascade delete all its documents (Admin only).
 */
const deleteSpace = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'UNAUTHENTICATED', 'User session is not authenticated');
    }

    const { spaceId } = req.params;
    if (!isValidObjectId(spaceId)) {
      return sendError(res, 400, 'INVALID_ID', 'Invalid spaceId format');
    }

    if (!isAdmin(req.user)) {
      return sendError(res, 403, 'FORBIDDEN', 'Only platform admins can delete documentation spaces');
    }

    const space = await docService.getSpaceById(spaceId);
    if (!space) {
      return sendError(res, 404, 'NOT_FOUND', 'Documentation space not found');
    }

    const result = await docService.deleteSpaceCascade(spaceId, req.user._id);
    return res.status(200).json({
      message: 'Space and associated documents deleted successfully',
      deletedSpaceId: spaceId,
      deletedDocumentsCount: result.deletedDocumentsCount,
    });
  } catch (err) {
    return handleServiceError(res, err, 'An unexpected error occurred while deleting space');
  }
};

/**
 * GET /doc/admin/spaces
 * List all documentation spaces across the intranet with administrative metrics, pagination, and search filtering.
 * Platform Admin only (no stealth rule: 401 unauthenticated, 403 non-admin).
 */
const adminListSpaces = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'UNAUTHENTICATED', 'User session is not authenticated');
    }

    if (!isAdmin(req.user)) {
      return sendError(res, 403, 'FORBIDDEN', 'Only platform admins can access administrative spaces oversight');
    }

    const validation = validateAdminSpacesQuery(req.query);
    if (!validation.valid) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Validation failed for admin spaces query', validation.details);
    }

    const result = await docService.adminListSpaces(validation.data);
    return res.status(200).json(result);
  } catch (err) {
    return handleServiceError(res, err, 'An unexpected error occurred while fetching admin spaces');
  }
};

/**
 * PATCH /doc/admin/spaces/:spaceId/owner
 * Reassign the owner (creator) of a documentation space to another active user.
 * Platform Admin only (no stealth rule: 401 unauthenticated, 403 non-admin).
 */
const adminReassignSpaceOwner = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'UNAUTHENTICATED', 'User session is not authenticated');
    }

    if (!isAdmin(req.user)) {
      return sendError(res, 403, 'FORBIDDEN', 'Only platform admins can reassign space ownership');
    }

    const { spaceId } = req.params;
    if (!isValidObjectId(spaceId)) {
      return sendError(res, 400, 'INVALID_ID', 'Invalid spaceId format');
    }

    const validation = validateReassignOwner(req.body);
    if (validation.hasInvalidId) {
      return sendError(res, 400, 'INVALID_ID', 'Invalid userId format', validation.details);
    }
    if (!validation.valid) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Request validation failed', validation.details);
    }

    const result = await docService.adminReassignSpaceOwner(spaceId, validation.data.userId, req.user._id);
    return res.status(200).json(result);
  } catch (err) {
    return handleServiceError(res, err, 'An unexpected error occurred while reassigning space owner');
  }
};

/**
 * GET /doc/spaces/:spaceId/documents
 * List documents within a space (filtered by area or includeArchived).
 */
const listDocuments = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'UNAUTHENTICATED', 'User session is not authenticated');
    }

    const { spaceId } = req.params;
    if (!isValidObjectId(spaceId)) {
      return sendError(res, 400, 'INVALID_ID', 'Invalid spaceId format');
    }

    const space = await docService.getSpaceById(spaceId);
    if (!space) {
      return sendError(res, 404, 'NOT_FOUND', 'Documentation space not found');
    }

    const role = space.projectId
      ? await docService.getUserProjectRole(req.user._id, space.projectId._id || space.projectId)
      : null;

    const canView = await canViewSpace(req.user, space, role);
    if (!canView) {
      return sendError(res, 404, 'NOT_FOUND', 'Documentation space not found');
    }

    const canUpdate = await canUpdateSpace(req.user, space, role);
    const { area, includeArchived, archivedOnly } = req.query;

    if (area && !VALID_AREAS.includes(area)) {
      return sendError(res, 400, 'VALIDATION_ERROR', `area must be one of: ${VALID_AREAS.join(', ')}`);
    }

    if (includeArchived === 'true' && !canUpdate) {
      return sendError(
        res,
        403,
        'FORBIDDEN',
        'You do not have permission to view archived documents in this space'
      );
    }

    const documents = await docService.listDocuments(spaceId, { area, includeArchived, archivedOnly });
    return res.status(200).json(documents);
  } catch (err) {
    return handleServiceError(res, err, 'An unexpected error occurred while listing documents');
  }
};

/**
 * POST /doc/spaces/:spaceId/documents
 * Add a new document link to a space.
 */
const createDocument = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'UNAUTHENTICATED', 'User session is not authenticated');
    }

    const { spaceId } = req.params;
    if (!isValidObjectId(spaceId)) {
      return sendError(res, 400, 'INVALID_ID', 'Invalid spaceId format');
    }

    const space = await docService.getSpaceById(spaceId);
    if (!space) {
      return sendError(res, 404, 'NOT_FOUND', 'Documentation space not found');
    }

    const role = space.projectId
      ? await docService.getUserProjectRole(req.user._id, space.projectId._id || space.projectId)
      : null;

    const canView = await canViewSpace(req.user, space, role);
    if (!canView) {
      return sendError(res, 404, 'NOT_FOUND', 'Documentation space not found');
    }

    const canUpdate = await canUpdateSpace(req.user, space, role);
    if (!canUpdate) {
      return sendError(res, 403, 'FORBIDDEN', 'You do not have permission to add documents to this space');
    }

    const validation = validateDocumentCreate(req.body);
    if (!validation.valid) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Request validation failed', validation.details);
    }

    const doc = await docService.createDocument(spaceId, req.user._id, validation.data);
    return res.status(201).json(doc);
  } catch (err) {
    return handleServiceError(res, err, 'An unexpected error occurred while adding document');
  }
};

/**
 * PATCH /doc/documents/:documentId
 * Edit document title, area, replacement url, or restore.
 */
const updateDocument = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'UNAUTHENTICATED', 'User session is not authenticated');
    }

    const { documentId } = req.params;
    if (!isValidObjectId(documentId)) {
      return sendError(res, 400, 'INVALID_ID', 'Invalid documentId format');
    }

    const doc = await docService.getDocumentById(documentId);
    if (!doc) {
      return sendError(res, 404, 'NOT_FOUND', 'Document not found');
    }

    const space = await docService.getSpaceById(doc.spaceId);
    if (!space) {
      return sendError(res, 404, 'NOT_FOUND', 'Parent documentation space not found');
    }

    const role = space.projectId
      ? await docService.getUserProjectRole(req.user._id, space.projectId._id || space.projectId)
      : null;

    const canView = await canViewSpace(req.user, space, role);
    if (!canView) {
      return sendError(res, 404, 'NOT_FOUND', 'Document not found');
    }

    const canUpdate = await canUpdateSpace(req.user, space, role);
    if (!canUpdate) {
      return sendError(res, 403, 'FORBIDDEN', 'You do not have permission to edit documents in this space');
    }

    const validation = validateDocumentUpdate(req.body, doc);
    if (!validation.valid) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Request validation failed', validation.details);
    }

    const updatedDoc = await docService.updateDocument(documentId, validation.data, req.user._id);
    return res.status(200).json(updatedDoc);
  } catch (err) {
    return handleServiceError(res, err, 'An unexpected error occurred while updating document');
  }
};

/**
 * DELETE /doc/documents/:documentId
 * Archive a document (soft delete: archived = true).
 */
const archiveDocument = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'UNAUTHENTICATED', 'User session is not authenticated');
    }

    const { documentId } = req.params;
    if (!isValidObjectId(documentId)) {
      return sendError(res, 400, 'INVALID_ID', 'Invalid documentId format');
    }

    const doc = await docService.getDocumentById(documentId);
    if (!doc) {
      return sendError(res, 404, 'NOT_FOUND', 'Document not found');
    }

    const space = await docService.getSpaceById(doc.spaceId);
    if (!space) {
      return sendError(res, 404, 'NOT_FOUND', 'Parent documentation space not found');
    }

    const role = space.projectId
      ? await docService.getUserProjectRole(req.user._id, space.projectId._id || space.projectId)
      : null;

    const canView = await canViewSpace(req.user, space, role);
    if (!canView) {
      return sendError(res, 404, 'NOT_FOUND', 'Document not found');
    }

    const canUpdate = await canUpdateSpace(req.user, space, role);
    if (!canUpdate) {
      return sendError(res, 403, 'FORBIDDEN', 'You do not have permission to archive documents in this space');
    }

    const result = await docService.archiveDocument(documentId, req.user._id);
    return res.status(200).json(result);
  } catch (err) {
    return handleServiceError(res, err, 'An unexpected error occurred while archiving document');
  }
};

/**
 * DELETE /doc/documents/:documentId/permanent
 * Permanently hard delete a document (Admin only).
 */
const deleteDocumentPermanent = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'UNAUTHENTICATED', 'User session is not authenticated');
    }

    const { documentId } = req.params;
    if (!isValidObjectId(documentId)) {
      return sendError(res, 400, 'INVALID_ID', 'Invalid documentId format');
    }

    if (!isAdmin(req.user)) {
      return sendError(res, 403, 'FORBIDDEN', 'Only platform admins can permanently delete documents');
    }

    const doc = await docService.getDocumentById(documentId);
    if (!doc) {
      return sendError(res, 404, 'NOT_FOUND', 'Document not found');
    }

    const result = await docService.deleteDocumentPermanent(documentId, req.user._id);
    return res.status(200).json(result);
  } catch (err) {
    return handleServiceError(res, err, 'An unexpected error occurred while deleting document');
  }
};

/* ========================================================================== */
/*                LEGACY DOC CONTROLLER FUNCTIONS (PRESERVED)                 */
/* ========================================================================== */

// get all Docs (legacy)
const getDocs = async (req, res) => {
  try {
    const Docs = await docService.getLegacyDocs();
    res.status(200).json(Docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// get a single Doc (legacy)
const getDoc = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(404).json({ error: 'No Doc' });
  }

  try {
    const DOC = await docService.getLegacyDocById(id);
    if (!DOC) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.status(200).json(DOC);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// create new Doc (legacy)
const createDoc = async (req, res) => {
  const { image, title, profile, author, date, type, description, content } = req.body;

  let emptyFields = [];
  if (!image) emptyFields.push('image');
  if (!title) emptyFields.push('title');
  if (!profile) emptyFields.push('profile');
  if (!author) emptyFields.push('author');
  if (!date) emptyFields.push('date');
  if (!type) emptyFields.push('type');
  if (!description) emptyFields.push('description');
  if (!content) emptyFields.push('content');

  if (emptyFields.length > 0) {
    return res.status(400).json({ error: 'Please fill in all the fields', emptyFields });
  }

  try {
    const DOC = await docService.createLegacyDoc({ image, title, profile, author, date, type, description, content });
    res.status(200).json(DOC);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// delete a Doc (legacy)
const deleteDoc = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(404).json({ error: 'No Doc' });
  }

  try {
    const deleted = await docService.deleteLegacyDoc(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.status(200).json({ message: 'Doc deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// update a Doc (legacy)
const updateDoc = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(404).json({ error: 'No Doc' });
  }

  try {
    const updated = await docService.updateLegacyDoc(id, { ...req.body });
    if (!updated) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  // New Documentation Space & Document Handlers
  listSpaces,
  searchDocuments,
  createSpace,
  getSpace,
  updateSpace,
  deleteSpace,
  adminListSpaces,
  adminReassignSpaceOwner,
  listDocuments,
  createDocument,
  updateDocument,
  archiveDocument,
  deleteDocumentPermanent,
  // Legacy Handlers
  getDocs,
  getDoc,
  createDoc,
  deleteDoc,
  updateDoc,
};