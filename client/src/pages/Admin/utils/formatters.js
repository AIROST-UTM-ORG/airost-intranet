export const formatAccessType = (type) => {
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

export const formatUpdateType = (type) => {
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
