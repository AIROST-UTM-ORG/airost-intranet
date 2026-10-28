const mongoose = require('mongoose');
const DocumentationSpace = require('../models/DocumentationSpace');
const Document = require('../models/Document');
const Project = require('../models/Project');
const Doc = require('../models/docModel'); // Legacy model preserved
const {
  VALID_AREAS,
  isValidObjectId,
  validateSpaceCreate,
  validateSpaceUpdate,
  validateDocumentCreate,
  validateDocumentUpdate,
} = require('../utils/docValidation');
const {
  isAdmin,
  canCreateSpace,
  canManageSpace,
  canViewSpace,
  canUpdateSpace,
  getUserProjectRole,
} = require('../utils/docAccess');

/**
 * Standard error response helper.
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

/* ========================================================================== */
/*                NEW DOCUMENTATION SPACE & DOCUMENT ENDPOINTS                */
/* ========================================================================== */

/**
 * GET /doc/spaces
 * List all documentation spaces the authenticated user can view.
 */
const listSpaces = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'UNAUTHENTICATED', 'User session is not authenticated');
    }

    const spaces = await DocumentationSpace.find()
      .populate('projectId', '_id title name')
      .sort({ createdAt: -1 });

    const visibleSpaces = [];
    for (const space of spaces) {
      const canView = await canViewSpace(req.user, space);
      if (canView) {
        const canUpdate = await canUpdateSpace(req.user, space);
        const canManage = canManageSpace(req.user, space);
        const activeCount = await Document.countDocuments({
          spaceId: space._id,
          archived: false,
        });

        visibleSpaces.push({
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
          createdAt: space.createdAt,
          updatedAt: space.updatedAt,
        });
      }
    }

    return res.status(200).json(visibleSpaces);
  } catch (err) {
    console.error('Error in listSpaces:', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred while listing spaces');
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

    // If projectId provided, ensure project exists
    if (validation.data.projectId) {
      const project = await Project.findById(validation.data.projectId);
      if (!project) {
        return sendError(res, 404, 'NOT_FOUND', 'Linked project not found');
      }
    }

    // Permission check
    const permitted = await canCreateSpace(req.user, validation.data.projectId);
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

    const space = await DocumentationSpace.create({
      ...validation.data,
      createdBy: req.user._id,
    });

    return res.status(201).json(space);
  } catch (err) {
    console.error('Error in createSpace:', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred while creating space');
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

    const space = await DocumentationSpace.findById(spaceId)
      .populate('projectId', '_id title name')
      .populate('accessMembers', '_id name')
      .populate('updateMembers', '_id name');

    if (!space) {
      return sendError(res, 404, 'NOT_FOUND', 'Documentation space not found');
    }

    const canView = await canViewSpace(req.user, space);
    if (!canView) {
      // View Stealth Rule: return 404 to avoid leaking space existence
      return sendError(res, 404, 'NOT_FOUND', 'Documentation space not found');
    }

    const canUpdate = await canUpdateSpace(req.user, space);
    const canManage = canManageSpace(req.user, space);

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

    const responseData = {
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
      isManager: canManage,
      documentCount: activeCount,
      activeDocumentCount: activeCount,
      archivedCount,
      archivedDocumentCount: archivedCount,
      areaCounts,
      createdAt: space.createdAt,
      updatedAt: space.updatedAt,
    };

    return res.status(200).json(responseData);
  } catch (err) {
    console.error('Error in getSpace:', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred while retrieving space');
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

    const space = await DocumentationSpace.findById(spaceId);
    if (!space) {
      return sendError(res, 404, 'NOT_FOUND', 'Documentation space not found');
    }

    const canView = await canViewSpace(req.user, space);
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
      const project = await Project.findById(validation.data.projectId);
      if (!project) {
        return sendError(res, 404, 'NOT_FOUND', 'Linked project not found');
      }
    }

    if (!isAdmin(req.user)) {
      if (validation.data.hasOwnProperty('projectId')) {
        if (!validation.data.projectId) {
          return sendError(res, 403, 'FORBIDDEN', 'Only platform admins can convert spaces to standalone');
        }
        const currentProjId = space.projectId ? String(space.projectId._id || space.projectId) : null;
        const targetProjId = String(validation.data.projectId);
        if (currentProjId !== targetProjId) {
          const targetRole = await getUserProjectRole(req.user._id, validation.data.projectId);
          if (targetRole !== 'lead') {
            return sendError(
              res,
              403,
              'FORBIDDEN',
              'You must be the project lead of the target project to transfer this space'
            );
          }
        }
      }
    }

    Object.assign(space, validation.data);
    await space.save();

    return res.status(200).json(space);
  } catch (err) {
    console.error('Error in updateSpace:', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred while updating space');
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

    const space = await DocumentationSpace.findById(spaceId);
    if (!space) {
      return sendError(res, 404, 'NOT_FOUND', 'Documentation space not found');
    }

    const deleteDocsResult = await Document.deleteMany({ spaceId: space._id });
    await DocumentationSpace.findByIdAndDelete(spaceId);

    return res.status(200).json({
      message: 'Space and associated documents deleted successfully',
      deletedSpaceId: spaceId,
      deletedDocumentsCount: deleteDocsResult.deletedCount,
    });
  } catch (err) {
    console.error('Error in deleteSpace:', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred while deleting space');
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

    const space = await DocumentationSpace.findById(spaceId);
    if (!space) {
      return sendError(res, 404, 'NOT_FOUND', 'Documentation space not found');
    }

    const canView = await canViewSpace(req.user, space);
    if (!canView) {
      return sendError(res, 404, 'NOT_FOUND', 'Documentation space not found');
    }

    const canUpdate = await canUpdateSpace(req.user, space);
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

    const query = { spaceId: space._id };
    if (area) {
      query.area = area;
    }

    if (includeArchived === 'true') {
      if (archivedOnly === 'true') {
        query.archived = true;
      }
      // If includeArchived=true without archivedOnly, return both active and archived
    } else {
      query.archived = false;
    }

    const documents = await Document.find(query).sort({ createdAt: -1 });
    return res.status(200).json(documents);
  } catch (err) {
    console.error('Error in listDocuments:', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred while listing documents');
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

    const space = await DocumentationSpace.findById(spaceId);
    if (!space) {
      return sendError(res, 404, 'NOT_FOUND', 'Documentation space not found');
    }

    const canView = await canViewSpace(req.user, space);
    if (!canView) {
      return sendError(res, 404, 'NOT_FOUND', 'Documentation space not found');
    }

    const canUpdate = await canUpdateSpace(req.user, space);
    if (!canUpdate) {
      return sendError(res, 403, 'FORBIDDEN', 'You do not have permission to add documents to this space');
    }

    const validation = validateDocumentCreate(req.body);
    if (!validation.valid) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Request validation failed', validation.details);
    }

    const doc = await Document.create({
      spaceId: space._id,
      ...validation.data,
      createdBy: req.user._id,
      archived: false,
    });

    return res.status(201).json(doc);
  } catch (err) {
    console.error('Error in createDocument:', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred while adding document');
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

    const doc = await Document.findById(documentId);
    if (!doc) {
      return sendError(res, 404, 'NOT_FOUND', 'Document not found');
    }

    const space = await DocumentationSpace.findById(doc.spaceId);
    if (!space) {
      return sendError(res, 404, 'NOT_FOUND', 'Parent documentation space not found');
    }

    const canView = await canViewSpace(req.user, space);
    if (!canView) {
      return sendError(res, 404, 'NOT_FOUND', 'Document not found');
    }

    const canUpdate = await canUpdateSpace(req.user, space);
    if (!canUpdate) {
      return sendError(res, 403, 'FORBIDDEN', 'You do not have permission to edit documents in this space');
    }

    const validation = validateDocumentUpdate(req.body, doc);
    if (!validation.valid) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Request validation failed', validation.details);
    }

    Object.assign(doc, validation.data);
    await doc.save();

    return res.status(200).json(doc);
  } catch (err) {
    console.error('Error in updateDocument:', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred while updating document');
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

    const doc = await Document.findById(documentId);
    if (!doc) {
      return sendError(res, 404, 'NOT_FOUND', 'Document not found');
    }

    const space = await DocumentationSpace.findById(doc.spaceId);
    if (!space) {
      return sendError(res, 404, 'NOT_FOUND', 'Parent documentation space not found');
    }

    const canView = await canViewSpace(req.user, space);
    if (!canView) {
      return sendError(res, 404, 'NOT_FOUND', 'Document not found');
    }

    const canUpdate = await canUpdateSpace(req.user, space);
    if (!canUpdate) {
      return sendError(res, 403, 'FORBIDDEN', 'You do not have permission to archive documents in this space');
    }

    doc.archived = true;
    await doc.save();

    return res.status(200).json({
      message: 'Document archived successfully',
      document: doc,
    });
  } catch (err) {
    console.error('Error in archiveDocument:', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred while archiving document');
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

    const doc = await Document.findById(documentId);
    if (!doc) {
      return sendError(res, 404, 'NOT_FOUND', 'Document not found');
    }

    await Document.findByIdAndDelete(documentId);

    return res.status(200).json({
      message: 'Document permanently deleted',
      deletedDocumentId: documentId,
    });
  } catch (err) {
    console.error('Error in deleteDocumentPermanent:', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred while deleting document');
  }
};

/* ========================================================================== */
/*                LEGACY DOC CONTROLLER FUNCTIONS (PRESERVED)                 */
/* ========================================================================== */

// get all Docs (legacy)
const getDocs = async (req, res) => {
  if (!req.user) {
    return sendError(res, 401, 'UNAUTHENTICATED', 'User session is not authenticated');
  }

  try {
    const Docs = await Doc.find({}).sort({ createdAt: -1 });
    res.status(200).json(Docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// get a single Doc (legacy)
const getDoc = async (req, res) => {
  if (!req.user) {
    return sendError(res, 401, 'UNAUTHENTICATED', 'User session is not authenticated');
  }

  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'No Doc' });
  }

  try {
    const DOC = await Doc.findById(id);
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
  if (!req.user) {
    return sendError(res, 401, 'UNAUTHENTICATED', 'User session is not authenticated');
  }

  if (!isAdmin(req.user)) {
    return sendError(res, 403, 'FORBIDDEN', 'Only platform admins can create legacy documents');
  }

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
    const DOC = await Doc.create({ image, title, profile, author, date, type, description, content });
    res.status(200).json(DOC);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// delete a Doc (legacy)
const deleteDoc = async (req, res) => {
  if (!req.user) {
    return sendError(res, 401, 'UNAUTHENTICATED', 'User session is not authenticated');
  }

  if (!isAdmin(req.user)) {
    return sendError(res, 403, 'FORBIDDEN', 'Only platform admins can delete legacy documents');
  }

  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'No Doc' });
  }

  try {
    const deleted = await Doc.findOneAndDelete({ _id: id });
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
  if (!req.user) {
    return sendError(res, 401, 'UNAUTHENTICATED', 'User session is not authenticated');
  }

  if (!isAdmin(req.user)) {
    return sendError(res, 403, 'FORBIDDEN', 'Only platform admins can update legacy documents');
  }

  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'No Doc' });
  }

  try {
    const updated = await Doc.findByIdAndUpdate({ _id: id }, { ...req.body }, { new: true });
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
  createSpace,
  getSpace,
  updateSpace,
  deleteSpace,
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