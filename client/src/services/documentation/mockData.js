import { MockScenarios } from "./constants";
import { createError } from "./client";
import {
  SEED_USERS,
  SEED_PROJECTS,
  INITIAL_SPACES,
  INITIAL_DOCUMENTS,
} from "./mockSeeds";

export { SEED_USERS, SEED_PROJECTS, INITIAL_SPACES, INITIAL_DOCUMENTS };

/**
 * Flag to toggle between the in-memory mock API and the real backend API.
 * Defaults to false for development/production (real backend API),
 * while defaulting to true in automated test environments.
 */
export let USE_MOCK =
  process.env.REACT_APP_USE_MOCK === "true" ||
  (process.env.NODE_ENV === "test" && process.env.REACT_APP_USE_MOCK !== "false");

export const setUseMock = (value) => {
  USE_MOCK = Boolean(value);
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

export const getArtificialDelay = () => artificialDelayMs;

// Active mock stores
export let mockSpaces = JSON.parse(JSON.stringify(INITIAL_SPACES));
export let mockDocuments = JSON.parse(JSON.stringify(INITIAL_DOCUMENTS));

export const resetMockData = () => {
  mockSpaces = JSON.parse(JSON.stringify(INITIAL_SPACES));
  mockDocuments = JSON.parse(JSON.stringify(INITIAL_DOCUMENTS));
  currentScenario = MockScenarios.DEFAULT;
  artificialDelayMs = 0;
};

export const checkScenario = () => {
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

export const computeSpaceCounts = (spaceId) => {
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
