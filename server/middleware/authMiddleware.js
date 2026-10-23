
/**
 * Middleware to ensure the requester is authenticated.
 */
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Unauthorized: Please log in to continue',
  });
};

/**
 * Helper to check if a user is an admin.
 */
const isAdmin = (user) => {
  if (!user || !user.position) return false;
  if (Array.isArray(user.position)) {
    return user.position.includes('admin');
  }
  return user.position === 'admin';
};

/**
 * Checks permissions for a specific project.
 * Returns { canView, canEdit, canDelete, role }
 */
const checkProjectPermission = (project, user) => {
  if (!user) {
    return { canView: false, canEdit: false, canDelete: false, role: 'unauthenticated' };
  }

  if (isAdmin(user)) {
    return { canView: true, canEdit: true, canDelete: true, role: 'admin' };
  }

  const userEmail = (user.email || '').toLowerCase().trim();
  const userName = (user.name || '').toLowerCase().trim();

  const isLead = (
    (project.lead && (
      project.lead.toLowerCase().trim() === userEmail ||
      project.lead.toLowerCase().trim() === userName
    ))
  );

  const isOwner = (
    (project.createdBy && (
      project.createdBy.toLowerCase().trim() === userEmail ||
      project.createdBy.toLowerCase().trim() === userName
    )) ||
    (project.owner && (
      project.owner.toLowerCase().trim() === userEmail ||
      project.owner.toLowerCase().trim() === userName
    ))
  );

  const isTeamMember = Array.isArray(project.teamMembers) && project.teamMembers.some((m) => {
    const mem = (m || '').toLowerCase().trim();
    return mem === userEmail || mem === userName;
  });

  const hasAccess = Array.isArray(project.access) && project.access.some((a) => {
    const acc = (a || '').toLowerCase().trim();
    return acc === userEmail || acc === userName;
  });

  if (isLead || isOwner) {
    return { canView: true, canEdit: true, canDelete: true, role: 'lead' };
  }

  if (isTeamMember || hasAccess) {
    return { canView: true, canEdit: true, canDelete: false, role: 'member' };
  }

  // Any verified member has read view access, but cannot edit or delete
  return { canView: true, canEdit: false, canDelete: false, role: 'viewer' };
};

/**
 * Optional authentication: Pass-through middleware that allows requests to proceed.
 * Passport session middleware is responsible for populating req.user when authenticated.
 */
const optionalAuth = (req, res, next) => {
  return next();
};

module.exports = {
  requireAuth,
  optionalAuth,
  isAdmin,
  checkProjectPermission,
};
