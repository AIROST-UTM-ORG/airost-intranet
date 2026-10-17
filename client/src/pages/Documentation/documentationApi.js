import axios from "axios";
import { API_URL } from "../../config/api";

/**
 * Flag to toggle between the in-memory mock API and the real backend API.
 * Defaults to false for development/production (real backend API),
 * while defaulting to true in automated test environments.
 */
const getInitialUseMock = () => {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  const mockFlag =
    process.env.REACT_APP_DOCUMENTATION_MOCK ?? process.env.REACT_APP_USE_MOCK;
  if (mockFlag !== undefined) {
    return mockFlag === "true";
  }
  return process.env.NODE_ENV === "test";
};

export let USE_MOCK = getInitialUseMock();

export const isMockMode = () => Boolean(USE_MOCK);

export const setUseMock = (value) => {
  if (process.env.NODE_ENV === "production") {
    USE_MOCK = false;
    return false;
  }
  USE_MOCK = Boolean(value);
  return USE_MOCK;
};

// ---------------------------------------------------------------------------
// Simulation Configuration & Test Hooks
// ---------------------------------------------------------------------------
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

let currentScenario = MockScenarios.DEFAULT;
let artificialDelayMs = 0; // 0 for fast tests by default, configurable

export const setMockScenario = (scenario) => {
  currentScenario = scenario;
};

export const getMockScenario = () => currentScenario;

export const setArtificialDelay = (ms) => {
  artificialDelayMs = ms;
};

export const extractError = (err, defaultMsg = "Operation failed") => {
  const errData = err?.response?.data?.error;
  return {
    message: errData?.message || err?.message || defaultMsg,
    code: errData?.code,
    details: errData?.details || [],
  };
};

// ---------------------------------------------------------------------------
// Seed Data Models matching DESIGN.md & SCREEN_SPEC.md exactly
// ---------------------------------------------------------------------------
export const SEED_USERS = [
  { _id: "65f29d20c571c48201a33331", name: "Jess" },
  { _id: "65f29d20c571c48201a33332", name: "Chang Xi" },
  { _id: "65f29d20c571c48201a33333", name: "Yu Jing" },
  { _id: "65f29d20c571c48201a33334", name: "Wesley" },
  { _id: "65f29d20c571c48201a22222", name: "Current User" },
];

export const SEED_PROJECTS = [
  { _id: "65f29d20c571c48201a11111", title: "Airost Intranet" },
  { _id: "65f29d20c571c48201a11112", title: "Property App" },
  { _id: "65f29d20c571c48201a11113", title: "Rubik's Cube Solver" },
];

const INITIAL_SPACES = [
  {
    _id: "65f29d20c571c48201a00001",
    title: "Engineering Handbook",
    description: "Technical references and delivery guides for the Airost Intranet team.",
    projectId: {
      _id: "65f29d20c571c48201a11111",
      title: "Airost Intranet",
    },
    createdBy: "65f29d20c571c48201a22222",
    accessType: "project_members",
    updateType: "selected",
    accessMembers: [],
    updateMembers: ["65f29d20c571c48201a33331", "65f29d20c571c48201a33332"], // Jess, Chang Xi
    canUpdate: true,
    isManager: true,
    createdAt: "2026-10-14T08:00:00.000Z",
    updatedAt: "2026-10-14T08:00:00.000Z",
  },
  {
    _id: "65f29d20c571c48201a00002",
    title: "Property App Handbook",
    description: "Product requirements, interface designs and implementation references.",
    projectId: {
      _id: "65f29d20c571c48201a11112",
      title: "Property App",
    },
    createdBy: "65f29d20c571c48201a22222",
    accessType: "project_members",
    updateType: "project_members",
    accessMembers: [],
    updateMembers: [],
    canUpdate: true,
    isManager: true,
    createdAt: "2026-10-14T08:30:00.000Z",
    updatedAt: "2026-10-14T08:30:00.000Z",
  },
  {
    _id: "65f29d20c571c48201a00003",
    title: "Solver Research",
    description: "Research notes, model experiments and testing resources for the solver.",
    projectId: {
      _id: "65f29d20c571c48201a11113",
      title: "Rubik's Cube Solver",
    },
    createdBy: "65f29d20c571c48201a22222",
    accessType: "project_members",
    updateType: "project_members",
    accessMembers: [],
    updateMembers: [],
    canUpdate: true,
    isManager: true,
    createdAt: "2026-10-14T08:45:00.000Z",
    updatedAt: "2026-10-14T08:45:00.000Z",
  },
  {
    _id: "65f29d20c571c48201a00004",
    title: "Team Handbook",
    description: "Shared onboarding, team practices and resources for every Airost member.",
    projectId: null,
    createdBy: "65f29d20c571c48201a99999",
    accessType: "all",
    updateType: "selected",
    accessMembers: [],
    updateMembers: ["65f29d20c571c48201a33331", "65f29d20c571c48201a33333"], // Jess, Yu Jing
    canUpdate: false,
    isManager: false,
    createdAt: "2026-10-14T09:00:00.000Z",
    updatedAt: "2026-10-14T09:00:00.000Z",
  },
];

const INITIAL_DOCUMENTS = [
  // Engineering Handbook (Space 1) - 8 active + 2 archived
  // General (2)
  {
    _id: "65f29d20c571c48201a55501",
    spaceId: "65f29d20c571c48201a00001",
    title: "Engineering Team Onboarding",
    url: "https://docs.google.com/document/d/1onboarding-eng",
    provider: "google_doc",
    area: "general",
    createdBy: "65f29d20c571c48201a22222",
    archived: false,
    createdAt: "2026-10-14T08:05:00.000Z",
    updatedAt: "2026-10-14T08:05:00.000Z",
  },
  {
    _id: "65f29d20c571c48201a55502",
    spaceId: "65f29d20c571c48201a00001",
    title: "Coding Standards & Git Workflow",
    url: "https://drive.google.com/drive/folders/1coding-standards",
    provider: "google_drive",
    area: "general",
    createdBy: "65f29d20c571c48201a22222",
    archived: false,
    createdAt: "2026-10-14T08:10:00.000Z",
    updatedAt: "2026-10-14T08:10:00.000Z",
  },
  // Requirements (1)
  {
    _id: "65f29d20c571c48201a55503",
    spaceId: "65f29d20c571c48201a00001",
    title: "Intranet Architecture Spec",
    url: "https://docs.google.com/document/d/1arch-spec",
    provider: "google_doc",
    area: "requirements",
    createdBy: "65f29d20c571c48201a22222",
    archived: false,
    createdAt: "2026-10-14T08:12:00.000Z",
    updatedAt: "2026-10-14T08:12:00.000Z",
  },
  // Design (1)
  {
    _id: "65f29d20c571c48201a55504",
    spaceId: "65f29d20c571c48201a00001",
    title: "Design System Guidelines",
    url: "https://docs.google.com/document/d/1design-guide",
    provider: "google_doc",
    area: "design",
    createdBy: "65f29d20c571c48201a22222",
    archived: false,
    createdAt: "2026-10-14T08:14:00.000Z",
    updatedAt: "2026-10-14T08:14:00.000Z",
  },
  // Development (2 active: Database Schema & API Reference per Screen 8)
  {
    _id: "65f29d20c571c48201a55551",
    spaceId: "65f29d20c571c48201a00001",
    title: "Database Schema",
    url: "https://docs.google.com/document/d/1exampleDocId/edit",
    provider: "google_doc",
    area: "development",
    createdBy: "65f29d20c571c48201a22222",
    archived: false,
    createdAt: "2026-10-14T08:15:00.000Z",
    updatedAt: "2026-10-14T08:15:00.000Z",
  },
  {
    _id: "65f29d20c571c48201a55552",
    spaceId: "65f29d20c571c48201a00001",
    title: "API Reference",
    url: "https://drive.google.com/drive/folders/1exampleFolderId",
    provider: "google_drive",
    area: "development",
    createdBy: "65f29d20c571c48201a22222",
    archived: false,
    createdAt: "2026-10-14T08:20:00.000Z",
    updatedAt: "2026-10-14T08:20:00.000Z",
  },
  // Testing (2)
  {
    _id: "65f29d20c571c48201a55505",
    spaceId: "65f29d20c571c48201a00001",
    title: "QA Test Matrix",
    url: "https://docs.google.com/spreadsheets/d/1qa-matrix",
    provider: "google_doc",
    area: "testing",
    createdBy: "65f29d20c571c48201a22222",
    archived: false,
    createdAt: "2026-10-14T08:25:00.000Z",
    updatedAt: "2026-10-14T08:25:00.000Z",
  },
  {
    _id: "65f29d20c571c48201a55506",
    spaceId: "65f29d20c571c48201a00001",
    title: "Integration Test Suite Overview",
    url: "https://drive.google.com/drive/folders/1test-suite",
    provider: "google_drive",
    area: "testing",
    createdBy: "65f29d20c571c48201a22222",
    archived: false,
    createdAt: "2026-10-14T08:28:00.000Z",
    updatedAt: "2026-10-14T08:28:00.000Z",
  },
  // Archived (2 in Development per Screen 14)
  {
    _id: "65f29d20c571c48201a55591",
    spaceId: "65f29d20c571c48201a00001",
    title: "Database Schema (legacy)",
    url: "https://docs.google.com/document/d/1schema-legacy/edit",
    provider: "google_doc",
    area: "development",
    createdBy: "65f29d20c571c48201a22222",
    archived: true,
    createdAt: "2026-10-10T08:00:00.000Z",
    updatedAt: "2026-10-12T08:00:00.000Z",
  },
  {
    _id: "65f29d20c571c48201a55592",
    spaceId: "65f29d20c571c48201a00001",
    title: "API Reference (legacy)",
    url: "https://drive.google.com/drive/folders/1api-legacy",
    provider: "google_drive",
    area: "development",
    createdBy: "65f29d20c571c48201a22222",
    archived: true,
    createdAt: "2026-10-10T08:30:00.000Z",
    updatedAt: "2026-10-12T08:30:00.000Z",
  },

  // Property App Handbook (Space 2) - 5 active
  {
    _id: "65f29d20c571c48201a66601",
    spaceId: "65f29d20c571c48201a00002",
    title: "Property Listing Specifications",
    url: "https://docs.google.com/document/d/1property-specs",
    provider: "google_doc",
    area: "requirements",
    createdBy: "65f29d20c571c48201a22222",
    archived: false,
    createdAt: "2026-10-14T08:31:00.000Z",
    updatedAt: "2026-10-14T08:31:00.000Z",
  },
  {
    _id: "65f29d20c571c48201a66602",
    spaceId: "65f29d20c571c48201a00002",
    title: "User Roles & Permissions PRD",
    url: "https://docs.google.com/document/d/1property-roles",
    provider: "google_doc",
    area: "requirements",
    createdBy: "65f29d20c571c48201a22222",
    archived: false,
    createdAt: "2026-10-14T08:32:00.000Z",
    updatedAt: "2026-10-14T08:32:00.000Z",
  },
  {
    _id: "65f29d20c571c48201a66603",
    spaceId: "65f29d20c571c48201a00002",
    title: "Figma Component Library",
    url: "https://drive.google.com/drive/folders/1property-figma",
    provider: "google_drive",
    area: "design",
    createdBy: "65f29d20c571c48201a22222",
    archived: false,
    createdAt: "2026-10-14T08:33:00.000Z",
    updatedAt: "2026-10-14T08:33:00.000Z",
  },
  {
    _id: "65f29d20c571c48201a66604",
    spaceId: "65f29d20c571c48201a00002",
    title: "Real Estate API Integration",
    url: "https://drive.google.com/drive/folders/1property-api",
    provider: "google_drive",
    area: "development",
    createdBy: "65f29d20c571c48201a22222",
    archived: false,
    createdAt: "2026-10-14T08:34:00.000Z",
    updatedAt: "2026-10-14T08:34:00.000Z",
  },
  {
    _id: "65f29d20c571c48201a66605",
    spaceId: "65f29d20c571c48201a00002",
    title: "Project Roadmap & Team Roster",
    url: "https://docs.google.com/document/d/1property-roadmap",
    provider: "google_doc",
    area: "general",
    createdBy: "65f29d20c571c48201a22222",
    archived: false,
    createdAt: "2026-10-14T08:35:00.000Z",
    updatedAt: "2026-10-14T08:35:00.000Z",
  },

  // Solver Research (Space 3) - 4 active
  {
    _id: "65f29d20c571c48201a77701",
    spaceId: "65f29d20c571c48201a00003",
    title: "Kociemba Two-Phase Algorithm Overview",
    url: "https://docs.google.com/document/d/1solver-kociemba",
    provider: "google_doc",
    area: "development",
    createdBy: "65f29d20c571c48201a22222",
    archived: false,
    createdAt: "2026-10-14T08:46:00.000Z",
    updatedAt: "2026-10-14T08:46:00.000Z",
  },
  {
    _id: "65f29d20c571c48201a77702",
    spaceId: "65f29d20c571c48201a00003",
    title: "Computer Vision Cube Detection Notes",
    url: "https://drive.google.com/drive/folders/1solver-cv",
    provider: "google_drive",
    area: "development",
    createdBy: "65f29d20c571c48201a22222",
    archived: false,
    createdAt: "2026-10-14T08:47:00.000Z",
    updatedAt: "2026-10-14T08:47:00.000Z",
  },
  {
    _id: "65f29d20c571c48201a77703",
    spaceId: "65f29d20c571c48201a00003",
    title: "Performance Benchmarks & Move Limits",
    url: "https://docs.google.com/document/d/1solver-benchmarks",
    provider: "google_doc",
    area: "testing",
    createdBy: "65f29d20c571c48201a22222",
    archived: false,
    createdAt: "2026-10-14T08:48:00.000Z",
    updatedAt: "2026-10-14T08:48:00.000Z",
  },
  {
    _id: "65f29d20c571c48201a77704",
    spaceId: "65f29d20c571c48201a00003",
    title: "Weekly Research Meeting Minutes",
    url: "https://docs.google.com/document/d/1solver-minutes",
    provider: "google_doc",
    area: "general",
    createdBy: "65f29d20c571c48201a22222",
    archived: false,
    createdAt: "2026-10-14T08:49:00.000Z",
    updatedAt: "2026-10-14T08:49:00.000Z",
  },

  // Team Handbook (Space 4 - Standalone) - 3 active
  {
    _id: "65f29d20c571c48201a88801",
    spaceId: "65f29d20c571c48201a00004",
    title: "Club Bylaws & Code of Conduct",
    url: "https://docs.google.com/document/d/1team-bylaws",
    provider: "google_doc",
    area: "general",
    createdBy: "65f29d20c571c48201a99999",
    archived: false,
    createdAt: "2026-10-14T09:01:00.000Z",
    updatedAt: "2026-10-14T09:01:00.000Z",
  },
  {
    _id: "65f29d20c571c48201a88802",
    spaceId: "65f29d20c571c48201a00004",
    title: "All-Hands Meeting Schedule",
    url: "https://docs.google.com/document/d/1team-schedule",
    provider: "google_doc",
    area: "general",
    createdBy: "65f29d20c571c48201a99999",
    archived: false,
    createdAt: "2026-10-14T09:02:00.000Z",
    updatedAt: "2026-10-14T09:02:00.000Z",
  },
  {
    _id: "65f29d20c571c48201a88803",
    spaceId: "65f29d20c571c48201a00004",
    title: "Shared Equipment & Lab Access",
    url: "https://drive.google.com/drive/folders/1team-lab",
    provider: "google_drive",
    area: "general",
    createdBy: "65f29d20c571c48201a99999",
    archived: false,
    createdAt: "2026-10-14T09:03:00.000Z",
    updatedAt: "2026-10-14T09:03:00.000Z",
  },
];

// Active mock stores
let mockSpaces = JSON.parse(JSON.stringify(INITIAL_SPACES));
let mockDocuments = JSON.parse(JSON.stringify(INITIAL_DOCUMENTS));

export const resetMockData = () => {
  mockSpaces = JSON.parse(JSON.stringify(INITIAL_SPACES));
  mockDocuments = JSON.parse(JSON.stringify(INITIAL_DOCUMENTS));
  currentScenario = MockScenarios.DEFAULT;
  artificialDelayMs = 0;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createError = (status, code, message, details = []) => {
  const err = new Error(message);
  err.status = status;
  err.response = {
    status,
    data: {
      error: {
        code,
        message,
        details,
      },
    },
  };
  return err;
};

const checkScenario = () => {
  if (currentScenario === MockScenarios.LOADING) {
    return new Promise(() => {}); // never resolves
  }
  if (currentScenario === MockScenarios.VALIDATION_ERROR) {
    throw createError(400, "VALIDATION_ERROR", "Simulated validation error", [
      { field: "title", message: "Title is required" },
    ]);
  }
  if (currentScenario === MockScenarios.FORBIDDEN) {
    throw createError(403, "FORBIDDEN", "You do not have permission to perform this action.");
  }
  if (currentScenario === MockScenarios.NOT_FOUND) {
    throw createError(404, "NOT_FOUND", "The requested resource could not be found.");
  }
  if (currentScenario === MockScenarios.SERVER_ERROR) {
    throw createError(500, "INTERNAL_ERROR", "An unexpected server error occurred.");
  }
  return null;
};

const computeSpaceCounts = (spaceId) => {
  const activeDocs = mockDocuments.filter((d) => d.spaceId === spaceId && !d.archived);
  const archivedDocs = mockDocuments.filter((d) => d.spaceId === spaceId && d.archived);

  const areaCounts = {
    general: 0,
    requirements: 0,
    design: 0,
    development: 0,
    testing: 0,
    deployment: 0,
  };

  activeDocs.forEach((d) => {
    if (areaCounts[d.area] !== undefined) {
      areaCounts[d.area] += 1;
    }
  });

  return {
    activeDocumentCount: activeDocs.length,
    archivedDocumentCount: archivedDocs.length,
    areaCounts,
  };
};

// ---------------------------------------------------------------------------
// Real API Axios Client
// ---------------------------------------------------------------------------
export const realApiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

realApiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    // Standardize error envelope when server already provided it
    if (error.response?.data?.error?.code) {
      const err = new Error(error.response.data.error.message || "Request failed");
      err.status = error.response.status;
      err.response = error.response;
      err.code = error.response.data.error.code;
      return Promise.reject(err);
    }

    const status = error.response?.status || 500;
    let code = "INTERNAL_ERROR";
    let message =
      error.response?.data?.message ||
      error.message ||
      "An unexpected server error occurred.";
    let details = error.response?.data?.details || [];

    // Map network errors and timeouts explicitly
    if (error.code === "ECONNABORTED" || error.message?.toLowerCase().includes("timeout")) {
      code = "TIMEOUT";
      message = "Request timed out. Please check your connection and try again.";
    } else if (!error.response) {
      code = "NETWORK_ERROR";
      message = "Network error. Please check your connection and try again.";
    } else if (status === 400) {
      code = "VALIDATION_ERROR";
    } else if (status === 401) {
      code = "UNAUTHENTICATED";
      message = "Your session has expired or is invalid. Please log in again.";
    } else if (status === 403) {
      code = "FORBIDDEN";
    } else if (status === 404) {
      code = "NOT_FOUND";
    }

    const customErr = new Error(message);
    customErr.status = status;
    customErr.code = code;
    customErr.response = {
      status,
      data: {
        error: {
          code,
          message,
          details,
        },
      },
    };
    return Promise.reject(customErr);
  }
);

// ---------------------------------------------------------------------------
// Exported API Functions
// ---------------------------------------------------------------------------

/**
 * List all spaces the user can view, optionally filtered by projectId.
 */
export const listSpaces = async (filter = {}) => {
  if (USE_MOCK) {
    if (artificialDelayMs > 0) await sleep(artificialDelayMs);
    checkScenario();

    if (currentScenario === MockScenarios.FIRST_USE) {
      return [];
    }

    let spaces = mockSpaces;
    if (filter && filter.projectId) {
      const targetId = String(
        typeof filter.projectId === "object" ? filter.projectId._id : filter.projectId
      );
      spaces = spaces.filter((space) => {
        const pId = space.projectId
          ? typeof space.projectId === "object"
            ? space.projectId._id
            : space.projectId
          : null;
        return pId && String(pId) === targetId;
      });
    }

    return spaces.map((space) => {
      const counts = computeSpaceCounts(space._id);
      const isReadOnly = currentScenario === MockScenarios.READ_ONLY;
      return {
        ...space,
        activeDocumentCount: counts.activeDocumentCount,
        archivedDocumentCount: counts.archivedDocumentCount,
        documentCount: counts.activeDocumentCount,
        canUpdate: isReadOnly ? false : space.canUpdate,
        isManager: isReadOnly ? false : space.isManager,
      };
    });
  }

  const params = {};
  if (filter && filter.projectId) {
    params.projectId =
      typeof filter.projectId === "object" ? filter.projectId._id : filter.projectId;
  }
  const response = await realApiClient.get("/doc/spaces", {
    params: Object.keys(params).length > 0 ? params : undefined,
  });

  const rawList = Array.isArray(response.data)
    ? response.data
    : Array.isArray(response.data?.spaces)
    ? response.data.spaces
    : Array.isArray(response.data?.data)
    ? response.data.data
    : null;

  if (!rawList) {
    if (
      response.data &&
      typeof response.data === "object" &&
      (response.data.message || response.data.error)
    ) {
      throw new Error(
        response.data.error?.message ||
          response.data.message ||
          "Invalid server response format for spaces"
      );
    }
    return [];
  }

  return rawList.map((space) => ({
    ...space,
    isManager: Boolean(space.canManage ?? space.isManager),
    canManage: Boolean(space.canManage ?? space.isManager),
    documentCount: space.documentCount ?? space.activeDocumentCount ?? 0,
    activeDocumentCount: space.documentCount ?? space.activeDocumentCount ?? 0,
  }));
};

/**
 * Read one space by ID with full metadata, permission flags, and area counts.
 */
export const getSpace = async (spaceId) => {
  if (USE_MOCK) {
    if (artificialDelayMs > 0) await sleep(artificialDelayMs);
    checkScenario();

    const space = mockSpaces.find((s) => s._id === spaceId);
    if (!space) {
      throw createError(404, "NOT_FOUND", "Space not found");
    }

    const counts = computeSpaceCounts(spaceId);
    const isReadOnly = currentScenario === MockScenarios.READ_ONLY;

    // Populate members with names if selected
    const populatedAccessMembers = (space.accessMembers || []).map((id) => {
      const found = SEED_USERS.find((u) => u._id === id);
      return found || { _id: id, name: "Member" };
    });
    const populatedUpdateMembers = (space.updateMembers || []).map((id) => {
      const found = SEED_USERS.find((u) => u._id === id);
      return found || { _id: id, name: "Member" };
    });

    return {
      ...space,
      accessMembers: populatedAccessMembers,
      updateMembers: populatedUpdateMembers,
      activeDocumentCount: counts.activeDocumentCount,
      archivedDocumentCount: isReadOnly ? 0 : counts.archivedDocumentCount,
      areaCounts: counts.areaCounts,
      canUpdate: isReadOnly ? false : space.canUpdate,
      isManager: isReadOnly ? false : space.isManager,
    };
  }

  const response = await realApiClient.get(`/doc/spaces/${spaceId}`);
  const data = response.data;
  return {
    ...data,
    isManager: Boolean(data.canManage ?? data.isManager),
    canManage: Boolean(data.canManage ?? data.isManager),
    documentCount: data.documentCount ?? data.activeDocumentCount ?? 0,
    activeDocumentCount: data.documentCount ?? data.activeDocumentCount ?? 0,
    archivedCount: data.archivedCount ?? data.archivedDocumentCount ?? 0,
    archivedDocumentCount: data.archivedCount ?? data.archivedDocumentCount ?? 0,
  };
};

/**
 * Create a new documentation space.
 */
export const createSpace = async (payload) => {
  if (USE_MOCK) {
    if (artificialDelayMs > 0) await sleep(artificialDelayMs);
    checkScenario();

    const {
      title,
      description,
      projectId = null,
      accessType = "all",
      updateType = "all",
      accessMembers = [],
      updateMembers = [],
    } = payload;

    if (!title || !title.trim()) {
      throw createError(400, "VALIDATION_ERROR", "Title is required", [
        { field: "title", message: "Title is required" },
      ]);
    }
    if (!description || !description.trim()) {
      throw createError(400, "VALIDATION_ERROR", "Description is required", [
        { field: "description", message: "Description is required" },
      ]);
    }
    if (!projectId && (accessType === "project_members" || updateType === "project_members")) {
      throw createError(
        400,
        "VALIDATION_ERROR",
        "'project_members' is invalid for standalone spaces"
      );
    }

    let projectObj = null;
    if (projectId) {
      const p = SEED_PROJECTS.find((item) => item._id === projectId || item.title === projectId);
      projectObj = p ? { _id: p._id, title: p.title } : { _id: projectId, title: "Project" };
    }

    const newSpace = {
      _id: "space-" + Date.now(),
      title: title.trim(),
      description: description.trim(),
      projectId: projectObj,
      createdBy: "65f29d20c571c48201a22222",
      accessType,
      updateType,
      accessMembers: accessType === "selected" ? [...new Set(accessMembers)] : [],
      updateMembers: updateType === "selected" ? [...new Set(updateMembers)] : [],
      canUpdate: true,
      isManager: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockSpaces.unshift(newSpace);
    return newSpace;
  }

  const response = await realApiClient.post("/doc/spaces", payload);
  const data = response.data;
  return {
    ...data,
    canManage: true,
    isManager: true,
    canUpdate: true,
    documentCount: 0,
    activeDocumentCount: 0,
    archivedCount: 0,
    archivedDocumentCount: 0,
  };
};

/**
 * Update space fields and settings.
 */
export const updateSpace = async (spaceId, payload) => {
  if (USE_MOCK) {
    if (artificialDelayMs > 0) await sleep(artificialDelayMs);
    checkScenario();

    const spaceIndex = mockSpaces.findIndex((s) => s._id === spaceId);
    if (spaceIndex === -1) {
      throw createError(404, "NOT_FOUND", "Space not found");
    }

    const current = mockSpaces[spaceIndex];
    const updated = { ...current, ...payload, updatedAt: new Date().toISOString() };

    if (payload.projectId !== undefined) {
      if (!payload.projectId) {
        updated.projectId = null;
        if (updated.accessType === "project_members" || updated.updateType === "project_members") {
          throw createError(
            400,
            "VALIDATION_ERROR",
            "'project_members' cannot be used on a standalone space"
          );
        }
      } else {
        const p = SEED_PROJECTS.find(
          (item) => item._id === payload.projectId || item.title === payload.projectId
        );
        updated.projectId = p
          ? { _id: p._id, title: p.title }
          : { _id: payload.projectId, title: "Project" };
      }
    }

    if (payload.accessType && payload.accessType !== "selected") {
      updated.accessMembers = [];
    }
    if (payload.updateType && payload.updateType !== "selected") {
      updated.updateMembers = [];
    }

    mockSpaces[spaceIndex] = updated;
    return updated;
  }

  const response = await realApiClient.patch(`/doc/spaces/${spaceId}`, payload);
  const data = response.data;
  return {
    ...data,
    canManage: Boolean(data.canManage ?? data.isManager ?? true),
    isManager: Boolean(data.canManage ?? data.isManager ?? true),
    documentCount: data.documentCount ?? data.activeDocumentCount ?? 0,
    activeDocumentCount: data.documentCount ?? data.activeDocumentCount ?? 0,
  };
};

/**
 * Permanently delete a space (admin only).
 */
export const deleteSpace = async (spaceId) => {
  if (USE_MOCK) {
    if (artificialDelayMs > 0) await sleep(artificialDelayMs);
    checkScenario();

    if (currentScenario === MockScenarios.READ_ONLY) {
      throw createError(403, "FORBIDDEN", "Only platform administrators can delete documentation spaces");
    }

    const spaceIndex = mockSpaces.findIndex((s) => s._id === spaceId);
    if (spaceIndex === -1) {
      throw createError(404, "NOT_FOUND", "Documentation space not found");
    }

    mockSpaces.splice(spaceIndex, 1);
    const beforeCount = mockDocuments.length;
    mockDocuments = mockDocuments.filter((d) => d.spaceId !== spaceId);
    const deletedDocs = beforeCount - mockDocuments.length;

    return {
      message: "Documentation space and associated documents deleted successfully",
      deletedSpaceId: spaceId,
      deletedDocumentsCount: deletedDocs,
    };
  }

  const response = await realApiClient.delete(`/doc/spaces/${spaceId}`);
  return response.data;
};

/**
 * List documents in a space with optional filters.
 */
export const listDocuments = async (spaceId, { area, includeArchived = false } = {}) => {
  if (USE_MOCK) {
    if (artificialDelayMs > 0) await sleep(artificialDelayMs);
    checkScenario();

    const space = mockSpaces.find((s) => s._id === spaceId);
    if (!space) {
      throw createError(404, "NOT_FOUND", "Space not found");
    }

    const wantArchived = String(includeArchived) === "true";
    if (wantArchived && (currentScenario === MockScenarios.READ_ONLY || !space.canUpdate)) {
      throw createError(403, "FORBIDDEN", "Only update-permitted members may view archived links");
    }

    let docs = mockDocuments.filter((d) => d.spaceId === spaceId);

    if (wantArchived) {
      docs = docs.filter((d) => d.archived);
    } else {
      docs = docs.filter((d) => !d.archived);
    }

    if (area) {
      docs = docs.filter((d) => d.area === area);
    }

    return docs;
  }

  const params = {};
  if (area) params.area = area;
  if (includeArchived) {
    params.includeArchived = "true";
    params.archivedOnly = "true";
  }

  const response = await realApiClient.get(`/doc/spaces/${spaceId}/documents`, { params });
  const rawDocs = Array.isArray(response.data)
    ? response.data
    : Array.isArray(response.data?.documents)
    ? response.data.documents
    : Array.isArray(response.data?.data)
    ? response.data.data
    : [];
  return rawDocs.filter((d) => (includeArchived ? Boolean(d.archived) : !d.archived));
};

/**
 * Add a new document link to a space.
 */
export const createDocument = async (spaceId, payload) => {
  if (USE_MOCK) {
    if (artificialDelayMs > 0) await sleep(artificialDelayMs);
    checkScenario();

    const space = mockSpaces.find((s) => s._id === spaceId);
    if (!space) {
      throw createError(404, "NOT_FOUND", "Space not found");
    }
    if (currentScenario === MockScenarios.READ_ONLY || !space.canUpdate) {
      throw createError(403, "FORBIDDEN", "Read-only users cannot add documents");
    }

    const { title, url, area = "general" } = payload;
    if (!title || !title.trim()) {
      throw createError(400, "VALIDATION_ERROR", "Title is required", [
        { field: "title", message: "Document title is required" },
      ]);
    }
    if (!url || !url.trim()) {
      throw createError(400, "VALIDATION_ERROR", "Link URL is required", [
        { field: "url", message: "Document link is required" },
      ]);
    }

    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== "https:") {
        throw new Error();
      }
    } catch {
      throw createError(400, "VALIDATION_ERROR", "URL must use the https: scheme", [
        { field: "url", message: "Only HTTPS URLs are allowed" },
      ]);
    }

    const provider = deriveProviderFromUrl(url.trim());
    const newDoc = {
      _id: "doc-" + Date.now(),
      spaceId,
      title: title.trim(),
      url: url.trim(),
      provider,
      area: VALID_AREAS.includes(area) ? area : "general",
      createdBy: "65f29d20c571c48201a22222",
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockDocuments.unshift(newDoc);
    return newDoc;
  }

  const response = await realApiClient.post(`/doc/spaces/${spaceId}/documents`, payload);
  return response.data;
};

/**
 * Edit document metadata or restore an archived document.
 */
export const updateDocument = async (documentId, payload) => {
  if (USE_MOCK) {
    if (artificialDelayMs > 0) await sleep(artificialDelayMs);
    checkScenario();

    const docIndex = mockDocuments.findIndex((d) => d._id === documentId);
    if (docIndex === -1) {
      throw createError(404, "NOT_FOUND", "Document not found");
    }

    const currentDoc = mockDocuments[docIndex];
    const space = mockSpaces.find((s) => s._id === currentDoc.spaceId);
    if (currentScenario === MockScenarios.READ_ONLY || (space && !space.canUpdate)) {
      throw createError(403, "FORBIDDEN", "Read-only users cannot edit documents");
    }

    const updated = { ...currentDoc, updatedAt: new Date().toISOString() };

    if (payload.title !== undefined) {
      if (!payload.title.trim()) {
        throw createError(400, "VALIDATION_ERROR", "Title cannot be empty");
      }
      updated.title = payload.title.trim();
    }

    if (payload.url !== undefined && payload.url.trim() !== "") {
      try {
        const parsed = new URL(payload.url.trim());
        if (parsed.protocol !== "https:") throw new Error();
      } catch {
        throw createError(400, "VALIDATION_ERROR", "URL must use the https: scheme", [
          { field: "url", message: "Only HTTPS URLs are allowed" },
        ]);
      }
      updated.url = payload.url.trim();
      updated.provider = deriveProviderFromUrl(payload.url.trim());
    }

    if (payload.area !== undefined) {
      if (VALID_AREAS.includes(payload.area)) {
        updated.area = payload.area;
      }
    }

    if (payload.archived !== undefined) {
      updated.archived = Boolean(payload.archived);
    }

    mockDocuments[docIndex] = updated;
    return updated;
  }

  const response = await realApiClient.patch(`/doc/documents/${documentId}`, payload);
  return response.data;
};

/**
 * Archive a document (soft delete: archived = true).
 */
export const archiveDocument = async (documentId) => {
  if (USE_MOCK) {
    if (artificialDelayMs > 0) await sleep(artificialDelayMs);
    checkScenario();

    const doc = mockDocuments.find((d) => d._id === documentId);
    if (!doc) {
      throw createError(404, "NOT_FOUND", "Document not found");
    }

    doc.archived = true;
    doc.updatedAt = new Date().toISOString();

    return {
      message: "Document archived successfully",
      document: { ...doc },
    };
  }

  const response = await realApiClient.delete(`/doc/documents/${documentId}`);
  return response.data;
};

/**
 * Restore an archived document (archived = false).
 */
export const restoreDocument = async (documentId) => {
  return updateDocument(documentId, { archived: false });
};

/**
 * Hard delete a document record (admin only).
 */
export const permanentlyDeleteDocument = async (documentId) => {
  if (USE_MOCK) {
    if (artificialDelayMs > 0) await sleep(artificialDelayMs);
    checkScenario();

    if (currentScenario === MockScenarios.READ_ONLY) {
      throw createError(403, "FORBIDDEN", "Only platform administrators can permanently delete documents");
    }

    const index = mockDocuments.findIndex((d) => d._id === documentId);
    if (index === -1) {
      throw createError(404, "NOT_FOUND", "Document not found");
    }

    mockDocuments.splice(index, 1);
    return {
      message: "Document permanently deleted",
      deletedDocumentId: documentId,
    };
  }

  const response = await realApiClient.delete(`/doc/documents/${documentId}/permanent`);
  return response.data;
};

/**
 * Helper: List available projects for selection in Create/Edit Space.
 */
export const listProjects = async () => {
  if (USE_MOCK) {
    if (artificialDelayMs > 0) await sleep(artificialDelayMs);
    checkScenario();
    return [...SEED_PROJECTS];
  }

  const res = await realApiClient.get("/projects");
  const data = Array.isArray(res.data) ? res.data : [];
  return data.map((p) => ({
    _id: p._id,
    title: p.title || p.name || `Project ${p.projectId || ""}`,
  }));
};

/**
 * Helper: List users/members for member picker.
 */
export const listMembers = async () => {
  if (USE_MOCK) {
    if (artificialDelayMs > 0) await sleep(artificialDelayMs);
    checkScenario();
    return [...SEED_USERS];
  }

  const res = await realApiClient.get("/admin/users");
  const data = Array.isArray(res.data) ? res.data : [];
  return data.map((u, idx) => ({
    _id: u._id || u.id || `user-${idx}`,
    name: u.name || u.email || "Member",
    email: u.email,
  }));
};

/**
 * Search non-archived document titles across visible spaces via GET /doc/search.
 */
export const searchDocuments = async ({ q, limit = 10, signal } = {}) => {
  if (USE_MOCK) {
    if (artificialDelayMs > 0) await sleep(artificialDelayMs);
    checkScenario();

    if (!q || q.trim().length < 2) {
      return { documents: [] };
    }

    const trimmedQ = q.trim().toLowerCase();

    // Map of active spaces in mock mode
    const spaceMap = new Map();
    mockSpaces.forEach((s) => {
      spaceMap.set(String(s._id), {
        _id: s._id,
        title: s.title,
      });
    });

    // Search active (non-archived) documents in viewable spaces
    const matchingDocs = mockDocuments.filter((doc) => {
      if (doc.archived) return false;
      if (!spaceMap.has(String(doc.spaceId))) return false;
      const title = (doc.title || "").toLowerCase();
      return title.includes(trimmedQ);
    });

    // Sort: prefix match first, then alphabetical by title
    matchingDocs.sort((a, b) => {
      const aTitle = (a.title || "").toLowerCase();
      const bTitle = (b.title || "").toLowerCase();
      const aStarts = aTitle.startsWith(trimmedQ);
      const bStarts = bTitle.startsWith(trimmedQ);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return aTitle.localeCompare(bTitle);
    });

    const sliced = matchingDocs.slice(0, limit);

    return {
      documents: sliced.map((doc) => ({
        _id: doc._id,
        title: doc.title,
        url: doc.url,
        provider: doc.provider,
        area: doc.area,
        spaceId: doc.spaceId,
        space: spaceMap.get(String(doc.spaceId)) || {
          _id: doc.spaceId,
          title: "",
        },
      })),
    };
  }

  const response = await realApiClient.get("/doc/search", {
    params: { q, limit },
    signal,
  });
  return response.data;
};

/**
 * Admin: List all spaces across the intranet with metrics, pagination, and search.
 */
export const getAdminSpaces = async ({ page = 1, limit = 25, q = "" } = {}) => {
  if (USE_MOCK) {
    if (artificialDelayMs > 0) await sleep(artificialDelayMs);
    checkScenario();

    if (currentScenario === MockScenarios.READ_ONLY || currentScenario === MockScenarios.FORBIDDEN) {
      throw createError(403, "FORBIDDEN", "Only platform admins can access administrative spaces oversight");
    }

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const trimmedQ = (q || "").trim().toLowerCase();

    const matched = mockSpaces.filter((space) => {
      if (!trimmedQ) return true;
      const title = (space.title || "").toLowerCase();
      const projectTitle = (space.projectId?.title || "").toLowerCase();
      const owner = SEED_USERS.find((u) => u._id === space.createdBy);
      const ownerName = (owner?.name || "").toLowerCase();
      return (
        title.includes(trimmedQ) ||
        projectTitle.includes(trimmedQ) ||
        ownerName.includes(trimmedQ)
      );
    });

    const total = matched.length;
    const startIndex = (p - 1) * l;
    const paginated = matched.slice(startIndex, startIndex + l);

    const formattedSpaces = paginated.map((space) => {
      const activeDocs = mockDocuments.filter(
        (d) => d.spaceId === space._id && !d.archived
      ).length;
      const archivedDocs = mockDocuments.filter(
        (d) => d.spaceId === space._id && d.archived
      ).length;
      const owner = SEED_USERS.find((u) => u._id === space.createdBy) || {
        _id: space.createdBy,
        name: "Admin User",
        email: "admin@airost.org",
      };

      return {
        _id: space._id,
        title: space.title,
        description: space.description,
        project: space.projectId
          ? {
              _id: space.projectId._id || space.projectId,
              title: space.projectId.title || "Project",
            }
          : null,
        owner: {
          _id: owner._id,
          name: owner.name,
          email: owner.email || `${owner.name.toLowerCase().replace(/\s+/g, "")}@airost.org`,
        },
        accessType: space.accessType,
        updateType: space.updateType,
        accessMembersCount: space.accessMembers ? space.accessMembers.length : 0,
        updateMembersCount: space.updateMembers ? space.updateMembers.length : 0,
        documentCount: activeDocs,
        archivedCount: archivedDocs,
        createdAt: space.createdAt,
        updatedAt: space.updatedAt,
      };
    });

    return {
      spaces: formattedSpaces,
      page: p,
      limit: l,
      total,
    };
  }

  const response = await realApiClient.get("/doc/admin/spaces", {
    params: { page, limit, q: q || undefined },
  });
  return response.data;
};

/**
 * Admin: Reassign space ownership (createdBy).
 */
export const reassignSpaceOwner = async (spaceId, userId) => {
  if (USE_MOCK) {
    if (artificialDelayMs > 0) await sleep(artificialDelayMs);
    checkScenario();

    if (currentScenario === MockScenarios.READ_ONLY || currentScenario === MockScenarios.FORBIDDEN) {
      throw createError(403, "FORBIDDEN", "Only platform admins can reassign space ownership");
    }

    if (!userId) {
      throw createError(400, "VALIDATION_ERROR", "User ID is required", [
        { field: "userId", message: "User ID is required" },
      ]);
    }

    const space = mockSpaces.find((s) => s._id === spaceId);
    if (!space) {
      throw createError(404, "NOT_FOUND", "Documentation space not found");
    }

    const targetUser = SEED_USERS.find((u) => u._id === userId);
    if (!targetUser) {
      throw createError(400, "VALIDATION_ERROR", "User not found or inactive", [
        { field: "userId", message: "User not found" },
      ]);
    }

    space.createdBy = userId;
    space.updatedAt = new Date().toISOString();

    return {
      space: { ...space },
    };
  }

  const response = await realApiClient.patch(`/doc/admin/spaces/${spaceId}/owner`, {
    userId,
  });
  return response.data;
};
