/**
 * Shared permission type formatter.
 * Formats accessType and updateType values into human-readable labels.
 */
export const formatPermissionType = (type) => {
  switch (type) {
    case "project_members":
      return "Project Members";
    case "selected":
      return "Selected";
    case "all":
    default:
      return "All Members";
  }
};

export const formatAccessType = (type) => formatPermissionType(type);
export const formatUpdateType = (type) => formatPermissionType(type);

const formatters = {
  formatPermissionType,
  formatAccessType,
  formatUpdateType,
};

export default formatters;
