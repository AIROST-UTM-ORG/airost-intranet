/**
 * Documentation Feature Slice Public Barrier
 */
import DocumentationPage, { ViewModes, parseDocPath } from "./pages/DocumentationPage";
import ProjectDocumentationLink from "./components/ProjectDocumentationLink";
import { useSpaceList } from "./hooks/useSpaceList";
import { useSpaceDetail } from "./hooks/useSpaceDetail";
import * as spaceApi from "./spaces/api/spaceApi";
import * as documentApi from "./documents/api/documentApi";
import * as adminApi from "./admin/api/adminApi";

export {
  DocumentationPage,
  DocumentationPage as default,
  ProjectDocumentationLink,
  useSpaceList,
  useSpaceDetail,
  spaceApi,
  documentApi,
  adminApi,
  ViewModes,
  parseDocPath,
};
