/**
 * Documentation Feature Slice Public Barrier
 */
import DocumentationPage, { ViewModes, parseDocPath } from "./pages/DocumentationPage";
import ProjectDocumentationLink from "./components/ProjectDocumentationLink";
import { useSpaceList } from "./hooks/useSpaceList";
import { useSpaceDetail } from "./hooks/useSpaceDetail";
import docServices from "./services";

export {
  DocumentationPage,
  DocumentationPage as default,
  ProjectDocumentationLink,
  useSpaceList,
  useSpaceDetail,
  docServices as services,
  ViewModes,
  parseDocPath,
};
