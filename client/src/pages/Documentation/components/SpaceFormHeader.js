import React from "react";

/**
 * SpaceFormHeader component for SpaceFormScreen.
 * Displays page title and context subtitle depending on whether
 * creating a project space, standalone space, or editing space.
 */
const SpaceFormHeader = ({ isEditing, hasProject, initialTitle }) => {
  let subtitleText = "";
  if (isEditing) {
    subtitleText = `${initialTitle || "Space"} · Manager access`;
  } else if (hasProject) {
    subtitleText = "Organize external document links and choose who can access and update them.";
  } else {
    subtitleText =
      "A standalone space brings shared knowledge together without linking to a project.";
  }

  return (
    <div className="mb-[24px]">
      <h1 className="doc-page-title" data-testid="space-form-title">
        {isEditing ? "Edit Documentation Space" : "Create Documentation Space"}
      </h1>
      <p className="font-varela text-[14px] text-[#686868] mt-[12px]" data-testid="space-form-subtitle">
        {subtitleText}
      </p>
    </div>
  );
};

export default SpaceFormHeader;
