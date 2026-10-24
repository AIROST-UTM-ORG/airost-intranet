const mongoose = require('mongoose');

const VALID_AREAS = [
  'general',
  'requirements',
  'design',
  'development',
  'testing',
  'deployment',
];

const VALID_ACCESS_TYPES = ['all', 'project_members', 'selected'];
const VALID_UPDATE_TYPES = ['all', 'project_members', 'selected'];

/**
 * Validates a MongoDB ObjectId string.
 */
const isValidObjectId = (id) => {
  if (!id) return false;
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  return String(new mongoose.Types.ObjectId(id)) === String(id);
};

/**
 * Parses and validates an external URL.
 * Strictly requires the https: protocol and max 2048 characters.
 */
const parseAndValidateUrl = (urlString) => {
  if (typeof urlString !== 'string') {
    return { valid: false, message: 'URL must be a string' };
  }
  const trimmed = urlString.trim();
  if (trimmed.length === 0) {
    return { valid: false, message: 'URL is required' };
  }
  if (trimmed.length > 2048) {
    return { valid: false, message: 'URL must not exceed 2048 characters' };
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch (err) {
    return { valid: false, message: 'Invalid URL format' };
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, message: 'Only HTTPS URLs are accepted' };
  }

  return { valid: true, url: trimmed, parsed };
};

/**
 * Derives document provider enum from URL hostname.
 */
const deriveProvider = (parsedUrlOrString) => {
  let hostname;
  if (typeof parsedUrlOrString === 'string') {
    const res = parseAndValidateUrl(parsedUrlOrString);
    if (!res.valid) return 'external_url';
    hostname = res.parsed.hostname.toLowerCase();
  } else if (parsedUrlOrString && parsedUrlOrString.hostname) {
    hostname = parsedUrlOrString.hostname.toLowerCase();
  } else {
    return 'external_url';
  }

  if (hostname === 'docs.google.com') {
    return 'google_doc';
  }
  if (hostname === 'drive.google.com') {
    return 'google_drive';
  }
  return 'external_url';
};

/**
 * Validates creation payload for DocumentationSpace.
 */
const validateSpaceCreate = (body) => {
  const allowedFields = [
    'title',
    'description',
    'projectId',
    'accessType',
    'updateType',
    'accessMembers',
    'updateMembers',
  ];

  const details = [];
  let hasInvalidId = false;

  // Unknown fields check
  const bodyKeys = Object.keys(body || {});
  for (const key of bodyKeys) {
    if (!allowedFields.includes(key)) {
      details.push({ field: key, message: `Unknown field '${key}' is not allowed` });
    }
  }

  // Title
  let title = body.title;
  if (title === undefined || title === null || typeof title !== 'string') {
    details.push({ field: 'title', message: 'Title is required' });
  } else {
    title = title.trim();
    if (title.length < 1 || title.length > 120) {
      details.push({ field: 'title', message: 'Title must be between 1 and 120 characters' });
    }
  }

  // Description
  let description = body.description;
  if (description === undefined || description === null || typeof description !== 'string') {
    details.push({ field: 'description', message: 'Description is required' });
  } else {
    description = description.trim();
    if (description.length < 1 || description.length > 1000) {
      details.push({ field: 'description', message: 'Description must be between 1 and 1000 characters' });
    }
  }

  // ProjectId (optional/nullable)
  let projectId = body.projectId;
  if (projectId === undefined || projectId === null || projectId === '') {
    projectId = null;
  } else {
    if (!isValidObjectId(projectId)) {
      hasInvalidId = true;
      details.push({ field: 'projectId', message: 'Invalid projectId format' });
    }
  }

  // AccessType
  let accessType = body.accessType || 'all';
  if (!VALID_ACCESS_TYPES.includes(accessType)) {
    details.push({
      field: 'accessType',
      message: `accessType must be one of: ${VALID_ACCESS_TYPES.join(', ')}`,
    });
  }

  // UpdateType
  let updateType = body.updateType || 'selected';
  if (!VALID_UPDATE_TYPES.includes(updateType)) {
    details.push({
      field: 'updateType',
      message: `updateType must be one of: ${VALID_UPDATE_TYPES.join(', ')}`,
    });
  }

  // Standalone check: if projectId is null, project_members is invalid
  if (!projectId) {
    if (accessType === 'project_members') {
      details.push({
        field: 'accessType',
        message: "accessType 'project_members' cannot be used on a standalone space",
      });
    }
    if (updateType === 'project_members') {
      details.push({
        field: 'updateType',
        message: "updateType 'project_members' cannot be used on a standalone space",
      });
    }
  }

  // AccessMembers & UpdateMembers
  let accessMembers = [];
  if (accessType === 'selected') {
    if (body.accessMembers !== undefined) {
      if (!Array.isArray(body.accessMembers)) {
        details.push({ field: 'accessMembers', message: 'accessMembers must be an array' });
      } else {
        const unique = [];
        for (const id of body.accessMembers) {
          if (!isValidObjectId(id)) {
            hasInvalidId = true;
            details.push({ field: 'accessMembers', message: `Invalid member ID: ${id}` });
          } else if (!unique.includes(String(id))) {
            unique.push(String(id));
          }
        }
        accessMembers = unique;
      }
    }
  }

  let updateMembers = [];
  if (updateType === 'selected') {
    if (body.updateMembers !== undefined) {
      if (!Array.isArray(body.updateMembers)) {
        details.push({ field: 'updateMembers', message: 'updateMembers must be an array' });
      } else {
        const unique = [];
        for (const id of body.updateMembers) {
          if (!isValidObjectId(id)) {
            hasInvalidId = true;
            details.push({ field: 'updateMembers', message: `Invalid member ID: ${id}` });
          } else if (!unique.includes(String(id))) {
            unique.push(String(id));
          }
        }
        updateMembers = unique;
      }
    }
  }

  return {
    valid: details.length === 0,
    hasInvalidId,
    details,
    data: details.length === 0 ? {
      title,
      description,
      projectId,
      accessType,
      updateType,
      accessMembers,
      updateMembers,
    } : null,
  };
};

/**
 * Validates update payload for DocumentationSpace.
 */
const validateSpaceUpdate = (body, currentSpace) => {
  const allowedFields = [
    'title',
    'description',
    'projectId',
    'accessType',
    'updateType',
    'accessMembers',
    'updateMembers',
  ];

  const details = [];
  let hasInvalidId = false;

  const bodyKeys = Object.keys(body || {});
  if (bodyKeys.length === 0) {
    return {
      valid: false,
      hasInvalidId: false,
      details: [{ field: 'body', message: 'At least one field must be provided for update' }],
      data: null,
    };
  }

  for (const key of bodyKeys) {
    if (!allowedFields.includes(key)) {
      details.push({ field: key, message: `Unknown field '${key}' is not allowed` });
    }
  }

  const updateData = {};

  // Title
  if (body.title !== undefined) {
    if (typeof body.title !== 'string') {
      details.push({ field: 'title', message: 'Title must be a string' });
    } else {
      const trimmed = body.title.trim();
      if (trimmed.length < 1 || trimmed.length > 120) {
        details.push({ field: 'title', message: 'Title must be between 1 and 120 characters' });
      } else {
        updateData.title = trimmed;
      }
    }
  }

  // Description
  if (body.description !== undefined) {
    if (typeof body.description !== 'string') {
      details.push({ field: 'description', message: 'Description must be a string' });
    } else {
      const trimmed = body.description.trim();
      if (trimmed.length < 1 || trimmed.length > 1000) {
        details.push({ field: 'description', message: 'Description must be between 1 and 1000 characters' });
      } else {
        updateData.description = trimmed;
      }
    }
  }

  // ProjectId
  let effectiveProjectId = currentSpace ? currentSpace.projectId : null;
  if (body.projectId !== undefined) {
    if (body.projectId === null || body.projectId === '') {
      updateData.projectId = null;
      effectiveProjectId = null;
    } else {
      if (!isValidObjectId(body.projectId)) {
        hasInvalidId = true;
        details.push({ field: 'projectId', message: 'Invalid projectId format' });
      } else {
        updateData.projectId = body.projectId;
        effectiveProjectId = body.projectId;
      }
    }
  }

  // AccessType
  let effectiveAccessType = currentSpace ? currentSpace.accessType : 'all';
  if (body.accessType !== undefined) {
    if (!VALID_ACCESS_TYPES.includes(body.accessType)) {
      details.push({
        field: 'accessType',
        message: `accessType must be one of: ${VALID_ACCESS_TYPES.join(', ')}`,
      });
    } else {
      updateData.accessType = body.accessType;
      effectiveAccessType = body.accessType;
    }
  }

  // UpdateType
  let effectiveUpdateType = currentSpace ? currentSpace.updateType : 'selected';
  if (body.updateType !== undefined) {
    if (!VALID_UPDATE_TYPES.includes(body.updateType)) {
      details.push({
        field: 'updateType',
        message: `updateType must be one of: ${VALID_UPDATE_TYPES.join(', ')}`,
      });
    } else {
      updateData.updateType = body.updateType;
      effectiveUpdateType = body.updateType;
    }
  }

  // Standalone check with effective values
  if (!effectiveProjectId) {
    if (effectiveAccessType === 'project_members') {
      details.push({
        field: 'accessType',
        message: "accessType 'project_members' cannot be used on a standalone space",
      });
    }
    if (effectiveUpdateType === 'project_members') {
      details.push({
        field: 'updateType',
        message: "updateType 'project_members' cannot be used on a standalone space",
      });
    }
  }

  // AccessMembers
  if (effectiveAccessType === 'selected') {
    if (body.accessMembers !== undefined) {
      if (!Array.isArray(body.accessMembers)) {
        details.push({ field: 'accessMembers', message: 'accessMembers must be an array' });
      } else {
        const unique = [];
        for (const id of body.accessMembers) {
          if (!isValidObjectId(id)) {
            hasInvalidId = true;
            details.push({ field: 'accessMembers', message: `Invalid member ID: ${id}` });
          } else if (!unique.includes(String(id))) {
            unique.push(String(id));
          }
        }
        updateData.accessMembers = unique;
      }
    }
  } else {
    updateData.accessMembers = [];
  }

  // UpdateMembers
  if (effectiveUpdateType === 'selected') {
    if (body.updateMembers !== undefined) {
      if (!Array.isArray(body.updateMembers)) {
        details.push({ field: 'updateMembers', message: 'updateMembers must be an array' });
      } else {
        const unique = [];
        for (const id of body.updateMembers) {
          if (!isValidObjectId(id)) {
            hasInvalidId = true;
            details.push({ field: 'updateMembers', message: `Invalid member ID: ${id}` });
          } else if (!unique.includes(String(id))) {
            unique.push(String(id));
          }
        }
        updateData.updateMembers = unique;
      }
    }
  } else {
    updateData.updateMembers = [];
  }

  return {
    valid: details.length === 0,
    hasInvalidId,
    details,
    data: details.length === 0 ? updateData : null,
  };
};

/**
 * Validates document creation payload.
 */
const validateDocumentCreate = (body) => {
  const allowedFields = ['title', 'url', 'area', 'provider'];
  const details = [];

  const bodyKeys = Object.keys(body || {});
  for (const key of bodyKeys) {
    if (!allowedFields.includes(key)) {
      details.push({ field: key, message: `Unknown field '${key}' is not allowed` });
    }
  }

  // Title
  let title = body.title;
  if (title === undefined || title === null || typeof title !== 'string') {
    details.push({ field: 'title', message: 'Title is required' });
  } else {
    title = title.trim();
    if (title.length < 1 || title.length > 120) {
      details.push({ field: 'title', message: 'Title must be between 1 and 120 characters' });
    }
  }

  // URL (Required on create)
  let parsedUrlResult;
  if (body.url === undefined || body.url === null) {
    details.push({ field: 'url', message: 'URL is required' });
  } else {
    parsedUrlResult = parseAndValidateUrl(body.url);
    if (!parsedUrlResult.valid) {
      details.push({ field: 'url', message: parsedUrlResult.message });
    }
  }

  // Area (optional, defaults to 'general')
  let area = body.area || 'general';
  if (!VALID_AREAS.includes(area)) {
    details.push({
      field: 'area',
      message: `area must be one of: ${VALID_AREAS.join(', ')}`,
    });
  }

  // Provider (Derived from hostname, ignoring client provider)
  let provider;
  if (parsedUrlResult && parsedUrlResult.valid) {
    provider = deriveProvider(parsedUrlResult.parsed);
  }

  return {
    valid: details.length === 0,
    details,
    data: details.length === 0 ? {
      title,
      url: parsedUrlResult.url,
      provider,
      area,
    } : null,
  };
};

/**
 * Validates document patch payload.
 */
const validateDocumentUpdate = (body, currentDocument) => {
  const allowedFields = ['title', 'url', 'area', 'archived', 'provider'];
  const details = [];

  const bodyKeys = Object.keys(body || {});
  if (bodyKeys.length === 0) {
    return {
      valid: false,
      details: [{ field: 'body', message: 'At least one field must be provided for update' }],
      data: null,
    };
  }

  for (const key of bodyKeys) {
    if (!allowedFields.includes(key)) {
      details.push({ field: key, message: `Unknown field '${key}' is not allowed` });
    }
  }

  const updateData = {};

  // Title
  if (body.title !== undefined) {
    if (typeof body.title !== 'string') {
      details.push({ field: 'title', message: 'Title must be a string' });
    } else {
      const trimmed = body.title.trim();
      if (trimmed.length < 1 || trimmed.length > 120) {
        details.push({ field: 'title', message: 'Title must be between 1 and 120 characters' });
      } else {
        updateData.title = trimmed;
      }
    }
  }

  // URL (Optional on update per Screen 13: "Leave empty to keep the current link")
  if (body.url !== undefined && body.url !== null && body.url !== '') {
    const urlResult = parseAndValidateUrl(body.url);
    if (!urlResult.valid) {
      details.push({ field: 'url', message: urlResult.message });
    } else {
      updateData.url = urlResult.url;
      updateData.provider = deriveProvider(urlResult.parsed);
    }
  }

  // Area
  if (body.area !== undefined) {
    if (!VALID_AREAS.includes(body.area)) {
      details.push({
        field: 'area',
        message: `area must be one of: ${VALID_AREAS.join(', ')}`,
      });
    } else {
      updateData.area = body.area;
    }
  }

  // Archived (boolean)
  if (body.archived !== undefined) {
    if (typeof body.archived !== 'boolean') {
      details.push({ field: 'archived', message: 'archived must be a boolean' });
    } else {
      updateData.archived = body.archived;
    }
  }

  return {
    valid: details.length === 0,
    details,
    data: details.length === 0 ? updateData : null,
  };
};

module.exports = {
  VALID_AREAS,
  VALID_ACCESS_TYPES,
  VALID_UPDATE_TYPES,
  isValidObjectId,
  parseAndValidateUrl,
  deriveProvider,
  validateSpaceCreate,
  validateSpaceUpdate,
  validateDocumentCreate,
  validateDocumentUpdate,
};
