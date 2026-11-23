/**
 * Services Index - Documentation Feature
 * Explicit named exports are kept for full Jest spyOn and CommonJS test compatibility
 */
import * as constants from "./constants";
import * as client from "./client";
import * as mockData from "./mockData";
import * as spaceApi from "./spaceApi";
import * as documentApi from "./documentApi";
import * as adminApi from "./adminApi";

export const SEED_USERS = mockData.SEED_USERS;
export const SEED_PROJECTS = mockData.SEED_PROJECTS;
export const INITIAL_SPACES = mockData.INITIAL_SPACES;
export const INITIAL_DOCUMENTS = mockData.INITIAL_DOCUMENTS;
export const MockScenarios = constants.MockScenarios;
export const VALID_AREAS = constants.VALID_AREAS;
export const AREA_LABELS = constants.AREA_LABELS;
export const deriveProviderFromUrl = constants.deriveProviderFromUrl;
export const getProviderDisplayName = constants.getProviderDisplayName;

export const apiClient = client.realApiClient;
export const extractError = client.extractError;

export const isMockMode = mockData.isMockMode;
export const setIsMockData = mockData.setIsMockData;
export const setUseMock = mockData.setUseMock;
export const setMockScenario = mockData.setMockScenario;
export const getMockScenario = mockData.getMockScenario;
export const resetMockData = mockData.resetMockData;

export const listSpaces = (...args) => spaceApi.listSpaces(...args);
export const getSpace = (...args) => spaceApi.getSpace(...args);
export const createSpace = (...args) => spaceApi.createSpace(...args);
export const updateSpace = (...args) => spaceApi.updateSpace(...args);
export const deleteSpace = (...args) => spaceApi.deleteSpace(...args);
export const listProjects = (...args) => spaceApi.listProjects(...args);
export const listMembers = (...args) => spaceApi.listMembers(...args);

export const listDocuments = (...args) => documentApi.listDocuments(...args);
export const getDocument = (...args) => documentApi.getDocument(...args);
export const createDocument = (...args) => documentApi.createDocument(...args);
export const updateDocument = (...args) => documentApi.updateDocument(...args);
export const deleteDocument = (...args) => documentApi.deleteDocument(...args);
export const archiveDocument = (...args) => documentApi.archiveDocument(...args);
export const restoreDocument = (...args) => documentApi.restoreDocument(...args);
export const permanentlyDeleteDocument = (...args) => documentApi.permanentlyDeleteDocument(...args);
export const searchDocuments = (...args) => documentApi.searchDocuments(...args);

export const getAdminSpaces = (...args) => adminApi.getAdminSpaces(...args);
export const reassignSpaceOwner = (...args) => adminApi.reassignSpaceOwner(...args);

const docServices = {
  SEED_USERS,
  SEED_PROJECTS,
  INITIAL_SPACES,
  INITIAL_DOCUMENTS,
  MockScenarios,
  VALID_AREAS,
  AREA_LABELS,
  deriveProviderFromUrl,
  getProviderDisplayName,
  apiClient,
  extractError,
  isMockMode,
  setIsMockData,
  setUseMock,
  setMockScenario,
  getMockScenario,
  resetMockData,
  listSpaces,
  getSpace,
  createSpace,
  updateSpace,
  deleteSpace,
  listProjects,
  listMembers,
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  archiveDocument,
  restoreDocument,
  permanentlyDeleteDocument,
  searchDocuments,
  getAdminSpaces,
  reassignSpaceOwner,
};

export default docServices;
