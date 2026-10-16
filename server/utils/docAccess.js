let _projectRoleResolver = null;

/**
 * Registers an external role resolver function (provided by docService).
 */
const registerProjectRoleResolver = (resolver) => {
  _projectRoleResolver = resolver;
};

/**
 * Checks whether the given user has platform admin privileges.
 * Matches existing codebase patterns in User, VerifiedUser, passport, and Sidepanel.
 */
const isAdmin = (user) => {
  if (!user || !user.position) return false;
  const positions = Array.isArray(user.position) ? user.position : [user.position];
  return positions.some(
    (pos) => typeof pos === 'string' && pos.toLowerCase().includes('admin')
  );
};

/**
 * Checks whether user is the creator of the space.
 */
const isCreator = (user, space) => {
  if (!user || !space || !space.createdBy) return false;
  const creatorId = space.createdBy._id ? space.createdBy._id : space.createdBy;
  const userId = user._id ? user._id : user.id || user;
  return String(creatorId) === String(userId);
};

/**
 * Checks whether a user ID exists in an array of ObjectIds or populated documents.
 */
const isUserInList = (userId, list) => {
  if (!userId || !Array.isArray(list) || list.length === 0) return false;
  const targetIdStr = String(userId._id || userId.id || userId);
  return list.some((item) => {
    const itemIdStr = String(item._id || item.id || item);
    return itemIdStr === targetIdStr;
  });
};

/**
 * Resolves a user's role on a specific project ('lead', 'advisor', 'member', or null).
 * Delegates to the registered service-layer resolver.
 */
const getUserProjectRole = async (userId, projectId) => {
  if (!userId || !projectId) return null;
  if (typeof _projectRoleResolver === 'function') {
    return await _projectRoleResolver(userId, projectId);
  }
  return null;
};

/**
 * Permission to CREATE a documentation space:
 * - Platform Admin: always.
 * - Lead of the specified project (if projectId is given).
 * - Standalone space (projectId null): Admin only.
 */
const canCreateSpace = async (user, projectId, projectRole) => {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (!projectId) return false;

  const role = projectRole !== undefined
    ? projectRole
    : await getUserProjectRole(user._id, projectId);

  return role === 'lead';
};

/**
 * Permission to MANAGE space settings (title, description, permissions, project):
 * - Platform Admin or Space Creator ("Manager access").
 */
const canManageSpace = (user, space) => {
  if (!user || !space) return false;
  return isAdmin(user) || isCreator(user, space);
};

/**
 * Permission to VIEW a space and its active documents:
 * - Admin or Creator: always.
 * - Anyone with update rights also has view rights.
 * - accessType 'all': any authenticated user.
 * - accessType 'project_members': members/advisors/leads of the project.
 * - accessType 'selected': users in accessMembers.
 */
const canViewSpace = async (user, space, projectRole) => {
  if (!user || !space) return false;
  if (isAdmin(user)) return true;
  if (isCreator(user, space)) return true;

  // Resolve role if needed
  let role = projectRole;
  if (role === undefined && space.projectId && user._id) {
    role = await getUserProjectRole(user._id, space.projectId);
  }

  // Implicit View Grant: If user has direct update permission via selected or project_members
  if (space.updateType === 'selected' && isUserInList(user._id, space.updateMembers)) {
    return true;
  }
  if (
    space.updateType === 'project_members' &&
    space.projectId &&
    ['lead', 'advisor', 'member'].includes(role)
  ) {
    return true;
  }

  // Base Access Type
  if (space.accessType === 'all') {
    return true;
  }

  if (space.accessType === 'project_members') {
    if (!space.projectId) return false;
    return ['lead', 'advisor', 'member'].includes(role);
  }

  if (space.accessType === 'selected') {
    return isUserInList(user._id, space.accessMembers);
  }

  return false;
};

/**
 * Permission to UPDATE documents (add, edit, archive, restore, view archived):
 * - Admin or Creator: always.
 * - updateType 'all': any authenticated user who can view the space.
 * - updateType 'project_members': project members (lead/advisor/member) of projectId.
 * - updateType 'selected': users in updateMembers.
 */
const canUpdateSpace = async (user, space, projectRole) => {
  if (!user || !space) return false;
  if (isAdmin(user)) return true;
  if (isCreator(user, space)) return true;

  // Resolve role if needed
  let role = projectRole;
  if (role === undefined && space.projectId && user._id) {
    role = await getUserProjectRole(user._id, space.projectId);
  }

  if (space.updateType === 'selected') {
    return isUserInList(user._id, space.updateMembers);
  }

  if (space.updateType === 'project_members') {
    if (!space.projectId) return false;
    return ['lead', 'advisor', 'member'].includes(role);
  }

  if (space.updateType === 'all') {
    // Any authenticated user who can view the space
    return canViewSpace(user, space, role);
  }

  return false;
};

module.exports = {
  isAdmin,
  isCreator,
  isUserInList,
  getUserProjectRole,
  canCreateSpace,
  canManageSpace,
  canViewSpace,
  canUpdateSpace,
  registerProjectRoleResolver,
};
