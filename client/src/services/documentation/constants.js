/**
 * Documentation Module Constants & Helpers
 */

export const MockScenarios = {
  DEFAULT: "default",
  FIRST_USE: "first-use",
  READ_ONLY: "read-only",
  LOADING: "loading",
  VALIDATION_ERROR: "validation-error",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "not-found",
  SERVER_ERROR: "server-error",
};

export const AREA_LABELS = {
  general: "General",
  requirements: "Requirements",
  design: "Design",
  development: "Development",
  testing: "Testing",
  deployment: "Deployment",
};

export const VALID_AREAS = [
  "general",
  "requirements",
  "design",
  "development",
  "testing",
  "deployment",
];

export const deriveProviderFromUrl = (urlString) => {
  try {
    const parsed = new URL(urlString);
    const host = parsed.hostname.toLowerCase();
    if (host === "docs.google.com" || host.endsWith(".docs.google.com")) {
      return "google_doc";
    }
    if (host === "drive.google.com" || host.endsWith(".drive.google.com")) {
      return "google_drive";
    }
    return "external_url";
  } catch {
    return "external_url";
  }
};

export const getProviderDisplayName = (provider) => {
  switch (provider) {
    case "google_doc":
      return "Google Docs";
    case "google_drive":
      return "Google Drive";
    case "external_url":
    default:
      return "External Link";
  }
};
