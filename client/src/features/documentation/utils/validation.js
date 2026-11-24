/**
 * Validation rules for Documentation Spaces.
 */
export const validateSpaceForm = ({
  title = "",
  description = "",
  accessType = "all",
  updateType = "selected",
  accessMembers = [],
  updateMembers = [],
  projectsError = null,
  membersError = null,
} = {}) => {
  if (projectsError || membersError) {
    return { isValid: false, errors: {} };
  }

  const errors = {};

  if (!title || !title.trim()) {
    errors.title = "Title is required";
  } else if (title.trim().length > 120) {
    errors.title = "Title must be 120 characters or fewer";
  }

  if (!description || !description.trim()) {
    errors.description = "Description is required";
  } else if (description.trim().length > 1000) {
    errors.description = "Description must be 1000 characters or fewer";
  }

  if (accessType === "selected" && (!accessMembers || accessMembers.length === 0)) {
    errors.accessMembers = "Please select at least one member for access";
  }

  if (updateType === "selected" && (!updateMembers || updateMembers.length === 0)) {
    errors.updateMembers = "Please select at least one member for update permissions";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateSpacePayload = validateSpaceForm;

const validation = {
  validateSpaceForm,
  validateSpacePayload,
};

export default validation;
