/**
 * Documentation API Service
 * Explicit named exports from ./api/ for full Jest spyOn and CommonJS test compatibility
 */
import * as api from "./api";

export const SEED_USERS = api.SEED_USERS;
export const SEED_PROJECTS = api.SEED_PROJECTS;
export const INITIAL_SPACES = api.INITIAL_SPACES;
export const INITIAL_DOCUMENTS = api.INITIAL_DOCUMENTS;
export const MockScenarios = api.MockScenarios;
export const VALID_AREAS = api.VALID_AREAS;
export const isMockMode = api.isMockMode;
export const setIsMockData = api.setIsMockData;
export const setUseMock = api.setUseMock;
export const setMockScenario = api.setMockScenario;
export const getMockScenario = api.getMockScenario;
export const resetMockData = api.resetMockData;
export const extractError = api.extractError;
export const deriveProviderFromUrl = api.deriveProviderFromUrl;

export const listSpaces = (...args) => api.listSpaces(...args);
export const getSpace = (...args) => api.getSpace(...args);
export const createSpace = (...args) => api.createSpace(...args);
export const updateSpace = (...args) => api.updateSpace(...args);
export const deleteSpace = (...args) => api.deleteSpace(...args);
export const listProjects = (...args) => api.listProjects(...args);
export const listMembers = (...args) => api.listMembers(...args);

export const listDocuments = (...args) => api.listDocuments(...args);
export const getDocument = (...args) => api.getDocument(...args);
export const createDocument = (...args) => api.createDocument(...args);
export const updateDocument = (...args) => api.updateDocument(...args);
export const deleteDocument = (...args) => api.deleteDocument(...args);
export const archiveDocument = (...args) => api.archiveDocument(...args);
export const restoreDocument = (...args) => api.restoreDocument(...args);
export const permanentlyDeleteDocument = (...args) => api.permanentlyDeleteDocument(...args);
export const searchDocuments = (...args) => api.searchDocuments(...args);

export const getAdminSpaces = (...args) => api.getAdminSpaces(...args);
export const reassignSpaceOwner = (...args) => api.reassignSpaceOwner(...args);

export default api;
