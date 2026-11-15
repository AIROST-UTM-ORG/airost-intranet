/**
 * Centralizes platform and project role names for authorization checks.
 */
const PLATFORM_ROLES = Object.freeze({
  ADMIN: 'admin',
  MEMBER: 'member',
});

const PROJECT_ROLES = Object.freeze({
  LEAD: 'lead',
  ADVISOR: 'advisor',
  MEMBER: 'member',
});

module.exports = { PLATFORM_ROLES, PROJECT_ROLES };
