import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Routes,
  Route,
  useParams,
  useSearchParams,
  Navigate,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import SpaceListScreen from "./components/SpaceListScreen";
import SpaceFormScreen from "./components/SpaceFormScreen";
import SpaceDetailScreen from "./components/SpaceDetailScreen";
import DocumentFormScreen from "./components/DocumentFormScreen";
import ArchivedDocumentsScreen from "./components/ArchivedDocumentsScreen";
import Unauthorized from "../Unauthorized/Unauthorized";
import { DocLink, useDocNavigate } from "./DocLink";
import {
  listSpaces,
  getSpace,
  createSpace,
  updateSpace,
  listDocuments,
  createDocument,
  updateDocument,
  archiveDocument,
  restoreDocument,
  deleteSpace,
  permanentlyDeleteDocument,
  listProjects,
  listMembers,
  isMockMode,
  SEED_PROJECTS,
  SEED_USERS,
  VALID_AREAS,
} from "./documentationApi";
import "./Documentation.css";

export const ViewModes = {
  SPACES_LIST: "SPACES_LIST",
  CREATE_SPACE: "CREATE_SPACE",
  EDIT_SPACE: "EDIT_SPACE",
  SPACE_DETAIL: "SPACE_DETAIL",
  ADD_DOCUMENT: "ADD_DOCUMENT",
  EDIT_DOCUMENT: "EDIT_DOCUMENT",
  ARCHIVED_DOCUMENTS: "ARCHIVED_DOCUMENTS",
};

const handleAuthError = (err) => {
  if (err?.response?.status === 401 || err?.response?.data?.error?.code === "UNAUTHENTICATED") {
    window.location.href = "/login";
    return true;
  }
  return false;
};

const extractError = (err, defaultMsg = "Operation failed") => {
  const errData = err?.response?.data?.error;
  return {
    message: errData?.message || err?.message || defaultMsg,
    code: errData?.code,
    details: errData?.details || [],
  };
};

export const DocNotFound = ({
  message = "Documentation Space Not Found",
  description = "The space or document you are looking for does not exist, has been removed, or you don't have access to view it.",
}) => (
  <div className="w-full max-w-[959px] mx-auto pb-12 font-varela" data-testid="doc-not-found">
    <div className="doc-card w-full min-h-[300px] p-[32px] flex flex-col items-center justify-center text-center">
      <div className="w-[56px] h-[56px] rounded-full bg-[#F5F5F5] flex items-center justify-center mb-[18px]">
        <svg
          className="w-[24px] h-[24px] text-[#686868]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </div>
      <h2
        className="font-varela text-[22px] text-[#171717] mb-[12px] font-normal"
        data-testid="not-found-heading"
      >
        {message}
      </h2>
      <p
        className="font-varela text-[14px] text-[#686868] max-w-[520px] leading-[150%] mb-[24px]"
        data-testid="not-found-desc"
      >
        {description}
      </p>
      <DocLink
        to="/doc"
        className="doc-btn-primary h-[42px] px-[24px] gap-[8px] no-underline inline-flex items-center justify-center"
        data-testid="not-found-back-btn"
      >
        <span className="font-varela text-[14px]">Back to Documentation</span>
      </DocLink>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Route Elements
// ---------------------------------------------------------------------------

const SpaceListRoute = () => {
  const navigate = useDocNavigate();
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listSpaces();
      setSpaces(data);
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(err?.response?.data?.error?.message || err?.message || "Failed to load spaces");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <SpaceListScreen
      spaces={spaces}
      loading={loading}
      error={error}
      onRetry={loadData}
      onOpenSpace={(sp) => navigate(`/doc/spaces/${sp._id}`)}
      onCreateSpace={() => navigate("/doc/spaces/new")}
      onEditSpace={(sp) => navigate(`/doc/spaces/${sp._id}/edit`)}
      onManagePermissions={(sp) => navigate(`/doc/spaces/${sp._id}/edit`)}
      onDeleteSpace={async (sp) => {
        await deleteSpace(sp._id);
        if (window.location.pathname.includes(`/spaces/${sp._id}`)) {
          navigate("/doc");
        }
        await loadData();
      }}
    />
  );
};

const CreateSpaceRoute = ({ projects: propProjects, members: propMembers }) => {
  const navigate = useDocNavigate();
  const [searchParams] = useSearchParams();
  const requestedProjectId = searchParams.get("projectId");
  const mock = isMockMode();
  const [localProjects, setLocalProjects] = useState(
    propProjects && propProjects.length > 0 ? propProjects : (mock ? SEED_PROJECTS : [])
  );
  const [localMembers, setLocalMembers] = useState(
    propMembers && propMembers.length > 0 ? propMembers : (mock ? SEED_USERS : [])
  );
  const [projectsLoading, setProjectsLoading] = useState(
    !mock && (!propProjects || propProjects.length === 0)
  );
  const [projectsError, setProjectsError] = useState(null);
  const [membersLoading, setMembersLoading] = useState(
    !mock && (!propMembers || propMembers.length === 0)
  );
  const [membersError, setMembersError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const validPreselectedProjectId = useMemo(() => {
    if (!requestedProjectId || !localProjects || localProjects.length === 0) {
      return "";
    }
    const match = localProjects.find((p, idx) => {
      const pId = String(p._id || p.id || "");
      if (pId === String(requestedProjectId)) return true;
      if (p.id !== undefined && String(p.id) === String(requestedProjectId)) return true;
      if (p.projectId && String(p.projectId) === String(requestedProjectId)) return true;
      if (String(idx + 1) === String(requestedProjectId)) return true;
      return false;
    });
    return match ? (match._id || match.id) : "";
  }, [requestedProjectId, localProjects]);

  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const p = await listProjects();
      setLocalProjects(p);
    } catch (err) {
      if (handleAuthError(err)) return;
      setProjectsError(extractError(err, "Failed to load projects").message);
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    setMembersError(null);
    try {
      const m = await listMembers();
      setLocalMembers(m);
    } catch (err) {
      if (handleAuthError(err)) return;
      setMembersError(extractError(err, "Failed to load members").message);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (propProjects && propProjects.length > 0) {
      setLocalProjects(propProjects);
      setProjectsLoading(false);
      setProjectsError(null);
    } else if (!mock) {
      fetchProjects();
    }
  }, [propProjects, mock, fetchProjects]);

  useEffect(() => {
    if (propMembers && propMembers.length > 0) {
      setLocalMembers(propMembers);
      setMembersLoading(false);
      setMembersError(null);
    } else if (!mock) {
      fetchMembers();
    }
  }, [propMembers, mock, fetchMembers]);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setServerError(null);
    try {
      const created = await createSpace(payload);
      navigate(`/doc/spaces/${created._id}`, { replace: true });
    } catch (err) {
      if (handleAuthError(err)) return;
      setServerError(extractError(err, "Failed to create space"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SpaceFormScreen
      initialSpace={null}
      initialProjectId={validPreselectedProjectId}
      projects={localProjects}
      projectsLoading={projectsLoading}
      projectsError={projectsError}
      onRetryProjects={fetchProjects}
      members={localMembers}
      membersLoading={membersLoading}
      membersError={membersError}
      onRetryMembers={fetchMembers}
      onSubmit={handleSubmit}
      submitting={submitting}
      serverError={serverError}
      onCancel={() => navigate("/doc")}
    />
  );
};

const SpaceDetailRoute = () => {
  const { spaceId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useDocNavigate();
  const areaQuery = searchParams.get("area");
  const activeArea = areaQuery && VALID_AREAS.includes(areaQuery) ? areaQuery : "development";

  const [space, setSpace] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  const loadData = useCallback(async () => {
    if (!spaceId || !/^[0-9a-fA-F]{24}$/.test(spaceId)) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [spData, docData] = await Promise.all([
        getSpace(spaceId),
        listDocuments(spaceId, { includeArchived: false }),
      ]);
      setSpace(spData);
      setDocuments(docData);
    } catch (err) {
      if (handleAuthError(err)) return;
      const status = err?.response?.status || err?.status;
      const code = err?.response?.data?.error?.code;
      if (status === 404 || code === "NOT_FOUND" || code === "INVALID_ID") {
        setNotFound(true);
      } else if (status === 403 || code === "FORBIDDEN") {
        setUnauthorized(true);
      } else {
        setError(err?.response?.data?.error?.message || err?.message || "Failed to load space");
      }
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleArchiveDocument = async (doc) => {
    try {
      await archiveDocument(doc._id);
      await loadData();
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(err?.response?.data?.error?.message || err?.message || "Failed to archive document");
    }
  };

  if (notFound) {
    return <DocNotFound message="Documentation Space Not Found" />;
  }
  if (unauthorized) {
    return <Unauthorized />;
  }

  return (
    <SpaceDetailScreen
      space={space}
      documents={documents}
      loading={loading}
      error={error}
      activeArea={activeArea}
      onArchiveDocument={handleArchiveDocument}
      onSelectArea={(area) => navigate(`/doc/spaces/${spaceId}?area=${area}`)}
      onBack={() => navigate("/doc")}
      onAddDocument={(area) =>
        navigate(`/doc/spaces/${spaceId}/documents/new?area=${area || activeArea}`)
      }
      onEditSpace={() => navigate(`/doc/spaces/${spaceId}/edit`)}
      onEditDocument={(doc) =>
        navigate(`/doc/spaces/${spaceId}/documents/${doc._id}/edit`)
      }
      onViewArchived={() => navigate(`/doc/spaces/${spaceId}/archived`)}
    />
  );
};

const EditSpaceRoute = ({ projects: propProjects, members: propMembers }) => {
  const { spaceId } = useParams();
  const navigate = useDocNavigate();
  const mock = isMockMode();
  const [space, setSpace] = useState(null);
  const [localProjects, setLocalProjects] = useState(
    propProjects && propProjects.length > 0 ? propProjects : (mock ? SEED_PROJECTS : [])
  );
  const [localMembers, setLocalMembers] = useState(
    propMembers && propMembers.length > 0 ? propMembers : (mock ? SEED_USERS : [])
  );
  const [projectsLoading, setProjectsLoading] = useState(
    !mock && (!propProjects || propProjects.length === 0)
  );
  const [projectsError, setProjectsError] = useState(null);
  const [membersLoading, setMembersLoading] = useState(
    !mock && (!propMembers || propMembers.length === 0)
  );
  const [membersError, setMembersError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const p = await listProjects();
      setLocalProjects(p);
    } catch (err) {
      if (handleAuthError(err)) return;
      setProjectsError(extractError(err, "Failed to load projects").message);
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    setMembersError(null);
    try {
      const m = await listMembers();
      setLocalMembers(m);
    } catch (err) {
      if (handleAuthError(err)) return;
      setMembersError(extractError(err, "Failed to load members").message);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (propProjects && propProjects.length > 0) {
      setLocalProjects(propProjects);
      setProjectsLoading(false);
      setProjectsError(null);
    } else if (!mock) {
      fetchProjects();
    }
  }, [propProjects, mock, fetchProjects]);

  useEffect(() => {
    if (propMembers && propMembers.length > 0) {
      setLocalMembers(propMembers);
      setMembersLoading(false);
      setMembersError(null);
    } else if (!mock) {
      fetchMembers();
    }
  }, [propMembers, mock, fetchMembers]);

  useEffect(() => {
    if (!spaceId || !/^[0-9a-fA-F]{24}$/.test(spaceId)) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);

    getSpace(spaceId)
      .then((spData) => {
        if (!mounted) return;
        if (!spData.canManage && !spData.isManager) {
          setUnauthorized(true);
        } else {
          setSpace(spData);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        if (handleAuthError(err)) return;
        const status = err?.response?.status || err?.status;
        const code = err?.response?.data?.error?.code;
        if (status === 404 || code === "NOT_FOUND" || code === "INVALID_ID") {
          setNotFound(true);
        } else if (status === 403 || code === "FORBIDDEN") {
          setUnauthorized(true);
        } else {
          setServerError(extractError(err, "Failed to load space"));
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [spaceId]);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setServerError(null);
    try {
      const updated = await updateSpace(spaceId, payload);
      navigate(`/doc/spaces/${updated._id || spaceId}`);
    } catch (err) {
      if (handleAuthError(err)) return;
      setServerError(extractError(err, "Failed to update space"));
    } finally {
      setSubmitting(false);
    }
  };

  if (notFound) {
    return <DocNotFound message="Documentation Space Not Found" />;
  }
  if (unauthorized) {
    return <Unauthorized />;
  }
  if (loading || !space) {
    return (
      <div
        className="w-full max-w-[959px] mx-auto pb-12 animate-pulse font-varela"
        data-testid="edit-space-loading"
      >
        <div className="doc-card h-[300px] bg-gray-50 p-6"></div>
      </div>
    );
  }

  return (
    <SpaceFormScreen
      initialSpace={space}
      projects={localProjects}
      projectsLoading={projectsLoading}
      projectsError={projectsError}
      onRetryProjects={fetchProjects}
      members={localMembers}
      membersLoading={membersLoading}
      membersError={membersError}
      onRetryMembers={fetchMembers}
      onSubmit={handleSubmit}
      submitting={submitting}
      serverError={serverError}
      onCancel={() => navigate(`/doc/spaces/${spaceId}`)}
    />
  );
};

const AddDocumentRoute = () => {
  const { spaceId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useDocNavigate();
  const areaQuery = searchParams.get("area");
  const initialArea = areaQuery && VALID_AREAS.includes(areaQuery) ? areaQuery : "development";

  const [space, setSpace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    if (!spaceId || !/^[0-9a-fA-F]{24}$/.test(spaceId)) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    getSpace(spaceId)
      .then((spData) => {
        if (!mounted) return;
        if (!spData.canUpdate) {
          setUnauthorized(true);
        } else {
          setSpace(spData);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        if (handleAuthError(err)) return;
        const status = err?.response?.status || err?.status;
        const code = err?.response?.data?.error?.code;
        if (status === 404 || code === "NOT_FOUND" || code === "INVALID_ID") {
          setNotFound(true);
        } else if (status === 403 || code === "FORBIDDEN") {
          setUnauthorized(true);
        } else {
          setServerError(extractError(err, "Failed to load space"));
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [spaceId]);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setServerError(null);
    try {
      await createDocument(spaceId, payload);
      navigate(`/doc/spaces/${spaceId}?area=${payload.area || initialArea}`);
    } catch (err) {
      if (handleAuthError(err)) return;
      setServerError(extractError(err, "Failed to add document"));
    } finally {
      setSubmitting(false);
    }
  };

  if (notFound) {
    return <DocNotFound message="Documentation Space Not Found" />;
  }
  if (unauthorized) {
    return <Unauthorized />;
  }
  if (loading || !space) {
    return (
      <div
        className="w-full max-w-[959px] mx-auto pb-12 animate-pulse font-varela"
        data-testid="add-doc-loading"
      >
        <div className="doc-card h-[300px] bg-gray-50 p-6"></div>
      </div>
    );
  }

  return (
    <DocumentFormScreen
      space={space}
      initialDocument={null}
      initialArea={initialArea}
      onSubmit={handleSubmit}
      submitting={submitting}
      serverError={serverError}
      onCancel={() => navigate(`/doc/spaces/${spaceId}?area=${initialArea}`)}
    />
  );
};

const EditDocumentRoute = () => {
  const { spaceId, documentId } = useParams();
  const navigate = useDocNavigate();
  const [space, setSpace] = useState(null);
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    if (
      !spaceId ||
      !documentId ||
      !/^[0-9a-fA-F]{24}$/.test(spaceId) ||
      !/^[0-9a-fA-F]{24}$/.test(documentId)
    ) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    Promise.all([
      getSpace(spaceId),
      listDocuments(spaceId, { includeArchived: false }),
    ])
      .then(([spData, docs]) => {
        if (!mounted) return;
        if (!spData.canUpdate) {
          setUnauthorized(true);
          return;
        }
        const doc = docs.find((d) => d._id === documentId);
        if (!doc) {
          setNotFound(true);
          return;
        }
        setSpace(spData);
        setDocument(doc);
      })
      .catch((err) => {
        if (!mounted) return;
        if (handleAuthError(err)) return;
        const status = err?.response?.status || err?.status;
        const code = err?.response?.data?.error?.code;
        if (status === 404 || code === "NOT_FOUND" || code === "INVALID_ID") {
          setNotFound(true);
        } else if (status === 403 || code === "FORBIDDEN") {
          setUnauthorized(true);
        } else {
          setServerError(extractError(err, "Failed to load document"));
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [spaceId, documentId]);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setServerError(null);
    try {
      await updateDocument(documentId, payload);
      navigate(`/doc/spaces/${spaceId}?area=${payload.area || document?.area || "general"}`);
    } catch (err) {
      if (handleAuthError(err)) return;
      setServerError(extractError(err, "Failed to update document"));
    } finally {
      setSubmitting(false);
    }
  };

  if (notFound) {
    return (
      <DocNotFound
        message="Document Not Found"
        description="The document you are looking for does not exist or has been removed."
      />
    );
  }
  if (unauthorized) {
    return <Unauthorized />;
  }
  if (loading || !space || !document) {
    return (
      <div
        className="w-full max-w-[959px] mx-auto pb-12 animate-pulse font-varela"
        data-testid="edit-doc-loading"
      >
        <div className="doc-card h-[300px] bg-gray-50 p-6"></div>
      </div>
    );
  }

  return (
    <DocumentFormScreen
      space={space}
      initialDocument={document}
      initialArea={document.area}
      onSubmit={handleSubmit}
      submitting={submitting}
      serverError={serverError}
      onCancel={() =>
        navigate(`/doc/spaces/${spaceId}?area=${document.area || "general"}`)
      }
    />
  );
};

const ArchivedDocumentsRoute = () => {
  const { spaceId } = useParams();
  const navigate = useDocNavigate();
  const [space, setSpace] = useState(null);
  const [archivedDocuments, setArchivedDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restoringId, setRestoringId] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  const loadData = useCallback(async () => {
    if (!spaceId || !/^[0-9a-fA-F]{24}$/.test(spaceId)) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [spData, docs] = await Promise.all([
        getSpace(spaceId),
        listDocuments(spaceId, { includeArchived: true }),
      ]);
      if (!spData.canUpdate) {
        setUnauthorized(true);
      } else {
        setSpace(spData);
        setArchivedDocuments(docs);
      }
    } catch (err) {
      if (handleAuthError(err)) return;
      const status = err?.response?.status || err?.status;
      const code = err?.response?.data?.error?.code;
      if (status === 404 || code === "NOT_FOUND" || code === "INVALID_ID") {
        setNotFound(true);
      } else if (status === 403 || code === "FORBIDDEN") {
        setUnauthorized(true);
      } else {
        setError(err?.response?.data?.error?.message || err?.message || "Failed to load archived documents");
      }
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRestore = async (doc) => {
    setRestoringId(doc._id);
    try {
      await restoreDocument(doc._id);
      await loadData();
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(err?.response?.data?.error?.message || err?.message || "Failed to restore document");
    } finally {
      setRestoringId(null);
    }
  };

  if (notFound) {
    return <DocNotFound message="Documentation Space Not Found" />;
  }
  if (unauthorized) {
    return <Unauthorized />;
  }

  return (
    <ArchivedDocumentsScreen
      space={space}
      archivedDocuments={archivedDocuments}
      loading={loading}
      error={error}
      onRestore={handleRestore}
      onDeletePermanently={async (doc) => {
        await permanentlyDeleteDocument(doc._id);
        await loadData();
      }}
      onRefresh={loadData}
      restoringId={restoringId}
      onBack={() => navigate(`/doc/spaces/${spaceId}`)}
    />
  );
};

// ---------------------------------------------------------------------------
// Main Route Container
// ---------------------------------------------------------------------------

export const fallbackQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const SafeQueryProvider = ({ children }) => {
  let hasClient = true;
  try {
    useQueryClient();
  } catch (err) {
    hasClient = false;
  }

  if (!hasClient) {
    return (
      <QueryClientProvider client={fallbackQueryClient}>
        {children}
      </QueryClientProvider>
    );
  }
  return children;
};

const Documentation = () => {
  return (
    <SafeQueryProvider>
      <div className="doc-feature-root px-[22px] md:px-[40px] pt-[24px]">
      <Routes>
        {/* Support both relative (nested under /doc/*) and direct root paths */}
        <Route index element={<SpaceListRoute />} />
        <Route path="" element={<SpaceListRoute />} />
        <Route path="/" element={<SpaceListRoute />} />
        <Route path="doc" element={<SpaceListRoute />} />

        {/* Redirect /doc/spaces to /doc */}
        <Route path="spaces" element={<Navigate to="/doc" replace />} />
        <Route path="doc/spaces" element={<Navigate to="/doc" replace />} />

        {/* Create Space */}
        <Route
          path="spaces/new"
          element={<CreateSpaceRoute />}
        />
        <Route
          path="doc/spaces/new"
          element={<CreateSpaceRoute />}
        />

        {/* Space Detail */}
        <Route path="spaces/:spaceId" element={<SpaceDetailRoute />} />
        <Route path="doc/spaces/:spaceId" element={<SpaceDetailRoute />} />

        {/* Edit Space */}
        <Route
          path="spaces/:spaceId/edit"
          element={<EditSpaceRoute />}
        />
        <Route
          path="doc/spaces/:spaceId/edit"
          element={<EditSpaceRoute />}
        />

        {/* Add Document */}
        <Route path="spaces/:spaceId/documents/new" element={<AddDocumentRoute />} />
        <Route path="doc/spaces/:spaceId/documents/new" element={<AddDocumentRoute />} />

        {/* Edit Document */}
        <Route
          path="spaces/:spaceId/documents/:documentId/edit"
          element={<EditDocumentRoute />}
        />
        <Route
          path="doc/spaces/:spaceId/documents/:documentId/edit"
          element={<EditDocumentRoute />}
        />

        {/* Archived Documents */}
        <Route path="spaces/:spaceId/archived" element={<ArchivedDocumentsRoute />} />
        <Route path="doc/spaces/:spaceId/archived" element={<ArchivedDocumentsRoute />} />

        {/* 404 Catch All */}
        <Route path="*" element={<DocNotFound message="Page Not Found" />} />
      </Routes>
    </div>
    </SafeQueryProvider>
  );
};

export default Documentation;
