/**
 * Documentation Feature Slice Public Barrier
 */
import DocumentationPage, { ViewModes, parseDocPath } from "./pages/DocumentationPage";
import ProjectDocumentationLink from "./spaces/components/ProjectDocumentationLink";
import { useSpaceList } from "./spaces/hooks/useSpaceList";
import { useSpaceDetail } from "./spaces/hooks/useSpaceDetail";
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
