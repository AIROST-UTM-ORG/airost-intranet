import { useState, useEffect } from "react";
import { validateSpaceForm } from "../../shared/utils/validation";

/**
 * Custom hook managing space form fields, validation, and submission state.
 */
export const useSpaceForm = ({
  initialSpace = null,
  projectsError = null,
  membersError = null,
  serverError = null,
  onSubmit,
}) => {
  const isEditing = Boolean(initialSpace && initialSpace._id);

  // Form State
  const [title, setTitle] = useState(initialSpace?.title || "");
  const [projectId, setProjectId] = useState(
    initialSpace?.projectId?._id || (initialSpace?.projectId ? initialSpace.projectId : "")
  );
  const [description, setDescription] = useState(initialSpace?.description || "");
  const [accessType, setAccessType] = useState(initialSpace?.accessType || "project_members");
  const [updateType, setUpdateType] = useState(initialSpace?.updateType || "selected");
  const [accessMembers, setAccessMembers] = useState(
    (initialSpace?.accessMembers || []).map((m) => (typeof m === "object" ? m._id : m))
  );
  const [updateMembers, setUpdateMembers] = useState(
    (initialSpace?.updateMembers || []).map((m) => (typeof m === "object" ? m._id : m))
  );

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const nextProjectId =
      initialSpace?.projectId?._id || (initialSpace?.projectId ? initialSpace.projectId : "");
    if (nextProjectId && !projectId) {
      setProjectId(nextProjectId);
    }
  }, [initialSpace?.projectId, projectId]);

  const hasProject = Boolean(projectId && projectId !== "");

  // If project is set to "No project" (Standalone), automatically remove "project_members"
  useEffect(() => {
    if (!hasProject) {
      if (accessType === "project_members") {
        setAccessType("all");
      }
      if (updateType === "project_members") {
        setUpdateType("selected");
      }
    }
  }, [hasProject, accessType, updateType]);

  // Map backend field-level validation errors (400 VALIDATION_ERROR details)
  useEffect(() => {
    if (serverError && typeof serverError === "object" && Array.isArray(serverError.details)) {
      const fieldErrs = {};
      serverError.details.forEach((d) => {
        if (d.field) fieldErrs[d.field] = d.message;
      });
      if (Object.keys(fieldErrs).length > 0) {
        setErrors((prev) => ({ ...prev, ...fieldErrs }));
      }
    }
  }, [serverError]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (projectsError || membersError) return;

    const { isValid, errors: validationErrors } = validateSpaceForm({
      title,
      description,
      accessType,
      updateType,
      accessMembers,
      updateMembers,
      projectsError,
      membersError,
    });

    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      projectId: hasProject ? projectId : null,
      accessType,
      updateType,
      accessMembers: accessType === "selected" ? accessMembers : [],
      updateMembers: updateType === "selected" ? updateMembers : [],
    };

    onSubmit(payload);
  };

  return {
    isEditing,
    hasProject,
    title,
    setTitle,
    projectId,
    setProjectId,
    description,
    setDescription,
    accessType,
    setAccessType,
    updateType,
    setUpdateType,
    accessMembers,
    setAccessMembers,
    updateMembers,
    setUpdateMembers,
    errors,
    setErrors,
    handleSubmit,
  };
};

export default useSpaceForm;
