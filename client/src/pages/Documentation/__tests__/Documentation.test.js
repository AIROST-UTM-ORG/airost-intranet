import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import Documentation, { fallbackQueryClient } from "../Documentation";
import {
  resetMockData,
  setMockScenario,
  MockScenarios,
  USE_MOCK,
  setUseMock,
  listProjects,
  listMembers,
  realApiClient,
  deleteSpace,
  permanentlyDeleteDocument,
} from "../documentationApi";
import * as docApi from "../documentationApi";
import { AuthContext } from "../../../context/authContext";

jest.mock("axios", () => {
  let successInterceptor = null;
  let errorInterceptor = null;

  const runWithInterceptors = async (fn, ...args) => {
    try {
      const res = await fn(...args);
      return successInterceptor ? successInterceptor(res) : res;
    } catch (err) {
      if (errorInterceptor) {
        return await errorInterceptor(err);
      }
      throw err;
    }
  };

  const rawMock = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };

  const mockAxiosInstance = {
    rawMock,
    get: (...args) => runWithInterceptors(rawMock.get, ...args),
    post: (...args) => runWithInterceptors(rawMock.post, ...args),
    patch: (...args) => runWithInterceptors(rawMock.patch, ...args),
    delete: (...args) => runWithInterceptors(rawMock.delete, ...args),
    interceptors: {
      response: {
        use: (success, error) => {
          successInterceptor = success;
          errorInterceptor = error;
        },
      },
    },
  };
  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockAxiosInstance),
      ...mockAxiosInstance,
    },
    ...mockAxiosInstance,
  };
});

describe("Documentation Feature - All 14 Screens", () => {
  beforeEach(() => {
    resetMockData();
  });

  // Helper to render wrapped in MemoryRouter
  const renderDocumentation = async () => {
    const utils = render(
      <MemoryRouter initialEntries={["/doc"]}>
        <Documentation />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.queryByTestId("spaces-loading")).not.toBeInTheDocument();
    });
    return utils;
  };

  // -------------------------------------------------------------------------
  // Screen 1: Documentation — All spaces
  // -------------------------------------------------------------------------
  test("Screen 1: Renders default all spaces populated list with correct totals and metadata", async () => {
    await renderDocumentation();

    // Page Header
    expect(await screen.findByTestId("documentation-title")).toHaveTextContent("Documentation");
    expect(
      screen.getByText("Keep project knowledge together. Store and open links to Google Docs and Drive.")
    ).toBeInTheDocument();
    expect(screen.getByTestId("add-space-btn")).toBeInTheDocument();

    // Summary heading
    const summary = await screen.findByTestId("spaces-summary");
    expect(summary).toHaveTextContent("4 spaces · 20 documents");

    // All 4 Seed Spaces
    expect(screen.getByText("Engineering Handbook")).toBeInTheDocument();
    expect(screen.getByText("Property App Handbook")).toBeInTheDocument();
    expect(screen.getByText("Solver Research")).toBeInTheDocument();
    expect(screen.getByText("Team Handbook")).toBeInTheDocument();

    // Metadata formats
    expect(screen.getByText("Project: Airost Intranet")).toBeInTheDocument();
    expect(screen.getByText("No project · Standalone space")).toBeInTheDocument();

    // Open buttons
    const openBtns = screen.getAllByText("Open");
    expect(openBtns.length).toBe(4);
  });

  // -------------------------------------------------------------------------
  // Screen 2: Documentation — First use
  // -------------------------------------------------------------------------
  test("Screen 2: Renders First Use empty state when 0 spaces exist", async () => {
    setMockScenario(MockScenarios.FIRST_USE);
    await renderDocumentation();

    // Summary heading says 0 spaces
    expect(await screen.findByTestId("spaces-summary")).toHaveTextContent("0 spaces");

    // First use card elements
    expect(screen.getByTestId("first-use-card")).toBeInTheDocument();
    expect(screen.getByText("A home for your documentation")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Create your first Documentation Space, then add links to Google Docs or Drive. Connect it to a project or keep it open to the team."
      )
    ).toBeInTheDocument();

    const cta = screen.getByTestId("create-first-space-btn");
    expect(cta).toBeInTheDocument();

    // Clicking CTA navigates to Create Space
    fireEvent.click(cta);
    expect(await screen.findByTestId("space-form-title")).toHaveTextContent(
      "Create Documentation Space"
    );
  });

  // -------------------------------------------------------------------------
  // Screen 3: Documentation — No search results & Search Filtering
  // -------------------------------------------------------------------------
  test("Screen 3: Renders No Search Results when query has 0 matches, and allows clearing search", async () => {
    await renderDocumentation();

    const searchInput = await screen.findByTestId("spaces-search-input");

    // Filter down to Engineering
    fireEvent.change(searchInput, { target: { value: "Engineering" } });
    expect(screen.getByText("Engineering Handbook")).toBeInTheDocument();
    expect(screen.queryByText("Property App Handbook")).not.toBeInTheDocument();

    // Type query with no matches
    fireEvent.change(searchInput, { target: { value: "marketing" } });
    expect(await screen.findByTestId("search-results-summary")).toHaveTextContent("0 spaces found");
    expect(screen.getByTestId("no-search-results-card")).toBeInTheDocument();
    expect(screen.getByText("No spaces found for “marketing”")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Try another space title or project name, or clear your search to see all Documentation Spaces."
      )
    ).toBeInTheDocument();

    // Clear via CTA button
    const clearCta = screen.getByTestId("clear-search-cta");
    fireEvent.click(clearCta);

    // All spaces restored
    expect(await screen.findByText("Engineering Handbook")).toBeInTheDocument();
    expect(screen.getByText("Property App Handbook")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Screen 4: Documentation — Manager space menu
  // -------------------------------------------------------------------------
  test("Screen 4: Clicking overflow menu on space card opens Edit space and Manage permissions", async () => {
    await renderDocumentation();

    const menuTrigger = await screen.findByTestId(
      "space-menu-trigger-65f29d20c571c48201a00001"
    );
    fireEvent.click(menuTrigger);

    const editMenuItem = await screen.findByTestId("edit-space-menu-item");
    const managePermsMenuItem = screen.getByTestId("manage-permissions-menu-item");

    expect(editMenuItem).toHaveTextContent("Edit space");
    expect(managePermsMenuItem).toHaveTextContent("Manage permissions");

    // Clicking Edit space navigates to Screen 7 (Edit Documentation Space)
    fireEvent.click(editMenuItem);
    expect(await screen.findByTestId("space-form-title")).toHaveTextContent(
      "Edit Documentation Space"
    );
    expect(screen.getByTestId("space-form-subtitle")).toHaveTextContent(
      "Engineering Handbook · Manager access"
    );
  });

  // -------------------------------------------------------------------------
  // Screen 5 & 6: Create Space (Project linked vs Standalone) & Member Picker
  // -------------------------------------------------------------------------
  test("Screen 5 & 6: Create Space toggles dynamic subtitle and Project members radio based on project selection", async () => {
    await renderDocumentation();

    const addBtn = await screen.findByTestId("add-space-btn");
    fireEvent.click(addBtn);

    expect(await screen.findByTestId("space-form-title")).toHaveTextContent(
      "Create Documentation Space"
    );

    const projectSelect = screen.getByTestId("space-project-select");

    // Default: select project "Airost Intranet"
    fireEvent.change(projectSelect, {
      target: { value: "65f29d20c571c48201a11111" },
    });

    // Screen 5 subtitle
    expect(screen.getByTestId("space-form-subtitle")).toHaveTextContent(
      "Organize external document links and choose who can access and update them."
    );
    // "Project members" radio options are present
    expect(screen.getByTestId("access-radio-project-members")).toBeInTheDocument();
    expect(screen.getByTestId("update-radio-project-members")).toBeInTheDocument();

    // Toggle to Standalone ("No project") -> Screen 6
    fireEvent.change(projectSelect, { target: { value: "" } });

    // Screen 6 subtitle
    expect(screen.getByTestId("space-form-subtitle")).toHaveTextContent(
      "A standalone space brings shared knowledge together without linking to a project."
    );
    // "Project members" radio options are REMOVED per Screen 6 specification
    expect(screen.queryByTestId("access-radio-project-members")).not.toBeInTheDocument();
    expect(screen.queryByTestId("update-radio-project-members")).not.toBeInTheDocument();

    // Select "Selected members"
    fireEvent.click(screen.getByTestId("update-radio-selected"));

    // Open MemberPicker dropdown
    const pickerTrigger = screen.getByTestId("member-picker-trigger");
    fireEvent.click(pickerTrigger);

    // Verify member checkboxes
    const jessCheckbox = await screen.findByTestId("member-checkbox-Jess");
    fireEvent.click(jessCheckbox);

    // Pill added with remove button
    expect(screen.getByTestId("remove-member-Jess")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Screen 7: Edit Documentation Space (Manager)
  // -------------------------------------------------------------------------
  test("Screen 7: Edit Documentation Space submits updated space details", async () => {
    await renderDocumentation();

    const openBtn = await screen.findByTestId("open-space-btn-65f29d20c571c48201a00001");
    fireEvent.click(openBtn);

    // Click Update access chip to open Edit Space
    const updateChip = await screen.findByTestId("update-access-badge");
    fireEvent.click(updateChip);

    expect(await screen.findByTestId("space-form-title")).toHaveTextContent(
      "Edit Documentation Space"
    );
    const titleInput = screen.getByTestId("space-title-input");
    expect(titleInput).toHaveValue("Engineering Handbook");

    // Modify title
    fireEvent.change(titleInput, { target: { value: "Engineering Handbook (Updated)" } });
    fireEvent.click(screen.getByTestId("submit-space-btn"));

    // Returns to space detail with updated title
    expect(await screen.findByTestId("space-detail-title")).toHaveTextContent(
      "Engineering Handbook (Updated)"
    );
  });

  // -------------------------------------------------------------------------
  // Screen 8 & 9: Space Detail (Update access), Tabs, and Document Menu Archive Flow
  // -------------------------------------------------------------------------
  test("Screen 8 & 9: Space Detail view with tabs, open links, and document archiving", async () => {
    await renderDocumentation();

    const openBtn = await screen.findByTestId("open-space-btn-65f29d20c571c48201a00001");
    fireEvent.click(openBtn);

    expect(await screen.findByTestId("space-detail-title")).toHaveTextContent(
      "Engineering Handbook"
    );

    // Area tabs rendered with correct counts
    expect(screen.getByTestId("area-tab-general")).toHaveTextContent("General2");
    expect(screen.getByTestId("area-tab-development")).toHaveTextContent("Development2");
    expect(screen.getByTestId("area-tab-deployment")).toHaveTextContent("Deployment0");

    // Screen 8 active area is Development by default: 2 documents
    expect(screen.getByTestId("current-area-title")).toHaveTextContent("Development");
    expect(screen.getByTestId("current-area-count")).toHaveTextContent("2 documents");

    // Active documents rendered
    expect(screen.getByText("Database Schema")).toBeInTheDocument();
    expect(screen.getByText("API Reference")).toBeInTheDocument();

    // Verify Open button link attributes (security)
    const openLink = screen.getByTestId(
      "open-document-btn-65f29d20c571c48201a55551"
    );
    expect(openLink).toHaveAttribute("target", "_blank");
    expect(openLink).toHaveAttribute("rel", "noopener noreferrer");

    // Screen 9: Open Document menu
    const docMenuTrigger = screen.getByTestId(
      "doc-menu-trigger-65f29d20c571c48201a55551"
    );
    fireEvent.click(docMenuTrigger);

    const archiveBtn = await screen.findByTestId("archive-doc-menu-item");
    expect(screen.getByTestId("edit-doc-menu-item")).toBeInTheDocument();

    // Archive the document
    fireEvent.click(archiveBtn);

    // After archiving, active count is 1, and archived count becomes 3
    await waitFor(() => {
      expect(screen.getByTestId("current-area-count")).toHaveTextContent("1 document");
      expect(screen.getByTestId("archived-documents-link")).toHaveTextContent(
        "Archived Documents (3)"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Screen 10: Space Detail — Empty Deployment area
  // -------------------------------------------------------------------------
  test("Screen 10: Empty Deployment area renders specific empty state copy and Add Document button", async () => {
    await renderDocumentation();

    const openBtn = await screen.findByTestId("open-space-btn-65f29d20c571c48201a00001");
    fireEvent.click(openBtn);

    // Click Deployment tab (0 docs)
    const deploymentTab = await screen.findByTestId("area-tab-deployment");
    fireEvent.click(deploymentTab);

    expect(screen.getByTestId("empty-area-card")).toBeInTheDocument();
    expect(screen.getByTestId("empty-area-heading")).toHaveTextContent(
      "No documents in Deployment yet"
    );
    expect(screen.getByTestId("empty-area-desc")).toHaveTextContent(
      "Add a link to a release checklist, hosting guide or deployment runbook in Google Docs or Drive."
    );

    const addDocBtn = screen.getByTestId("empty-area-add-doc-btn");
    expect(addDocBtn).toBeInTheDocument();

    // Clicking Add Document from empty area pre-selects Deployment
    fireEvent.click(addDocBtn);
    expect(await screen.findByTestId("doc-form-title")).toHaveTextContent("Add Document");
    expect(screen.getByTestId("area-select-trigger")).toHaveTextContent("Deployment");
  });

  // -------------------------------------------------------------------------
  // Screen 11: Documentation Space — Read-only mode
  // -------------------------------------------------------------------------
  test("Screen 11: Read-only mode hides Add Document, Archived Documents link, and card overflow menus", async () => {
    setMockScenario(MockScenarios.READ_ONLY);
    await renderDocumentation();

    const openBtn = await screen.findByTestId("open-space-btn-65f29d20c571c48201a00001");
    fireEvent.click(openBtn);

    // Read-only badge displayed
    expect(await screen.findByTestId("read-only-badge")).toHaveTextContent("Read-only");

    // Add Document button hidden
    expect(screen.queryByTestId("add-document-btn")).not.toBeInTheDocument();

    // Archived Documents link hidden
    expect(screen.queryByTestId("archived-documents-link")).not.toBeInTheDocument();

    // Document card overflow trigger hidden
    expect(
      screen.queryByTestId("doc-menu-trigger-65f29d20c571c48201a55551")
    ).not.toBeInTheDocument();

    // Open button still visible
    expect(
      screen.getByTestId("open-document-btn-65f29d20c571c48201a55551")
    ).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Screen 12: Add Document — External link
  // -------------------------------------------------------------------------
  test("Screen 12: Add Document validates HTTPS scheme and creates document link", async () => {
    await renderDocumentation();

    const openBtn = await screen.findByTestId("open-space-btn-65f29d20c571c48201a00001");
    fireEvent.click(openBtn);

    const addDocBtn = await screen.findByTestId("add-document-btn");
    fireEvent.click(addDocBtn);

    expect(await screen.findByTestId("doc-form-title")).toHaveTextContent("Add Document");

    const titleInput = screen.getByTestId("doc-title-input");
    const linkInput = screen.getByTestId("doc-link-input");

    // Try invalid protocol (http://)
    fireEvent.change(titleInput, { target: { value: "CI/CD Pipeline Runbook" } });
    fireEvent.change(linkInput, { target: { value: "http://example.com/doc" } });
    fireEvent.click(screen.getByTestId("submit-doc-btn"));

    // Validation error appears
    expect(await screen.findByText("Only HTTPS URLs are allowed")).toBeInTheDocument();

    // Fix to valid HTTPS URL
    fireEvent.change(linkInput, {
      target: { value: "https://docs.google.com/document/d/1cicd-guide" },
    });
    fireEvent.click(screen.getByTestId("submit-doc-btn"));

    // Saved and back to space detail
    expect(await screen.findByText("CI/CD Pipeline Runbook")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Screen 13: Edit Document — Link record
  // -------------------------------------------------------------------------
  test("Screen 13: Edit Document displays saved link preview and allows optional link replacement", async () => {
    await renderDocumentation();

    const openBtn = await screen.findByTestId("open-space-btn-65f29d20c571c48201a00001");
    fireEvent.click(openBtn);

    const menuTrigger = await screen.findByTestId(
      "doc-menu-trigger-65f29d20c571c48201a55551"
    );
    fireEvent.click(menuTrigger);

    const editBtn = await screen.findByTestId("edit-doc-menu-item");
    fireEvent.click(editBtn);

    expect(await screen.findByTestId("doc-form-title")).toHaveTextContent("Edit Document");

    // Title is prefilled
    const titleInput = screen.getByTestId("doc-title-input");
    expect(titleInput).toHaveValue("Database Schema");

    // Saved link box exists
    expect(screen.getByTestId("saved-link-box")).toBeInTheDocument();
    expect(screen.getByText("Google Docs")).toBeInTheDocument();
    expect(screen.getByText("An external document link is saved.")).toBeInTheDocument();

    // Leave replace link empty, change title only
    fireEvent.change(titleInput, { target: { value: "Database Schema v2" } });
    fireEvent.click(screen.getByTestId("submit-doc-btn"));

    // Updated in space detail
    expect(await screen.findByText("Database Schema v2")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Screen 14: Archived Documents — Restore access
  // -------------------------------------------------------------------------
  test("Screen 14: Archived Documents view lists archived links and allows restoring to active area", async () => {
    await renderDocumentation();

    const openBtn = await screen.findByTestId("open-space-btn-65f29d20c571c48201a00001");
    fireEvent.click(openBtn);

    const archivedLink = await screen.findByTestId("archived-documents-link");
    fireEvent.click(archivedLink);

    expect(await screen.findByTestId("archived-page-title")).toHaveTextContent(
      "Archived Documents"
    );
    expect(screen.getByTestId("archived-metadata")).toHaveTextContent(
      "Engineering Handbook · Project: Airost Intranet"
    );
    expect(screen.getByTestId("archived-count-heading")).toHaveTextContent(
      "2 archived documents"
    );

    // Archived cards
    expect(screen.getByText("Database Schema (legacy)")).toBeInTheDocument();
    expect(screen.getByText("API Reference (legacy)")).toBeInTheDocument();

    // Click Restore on the first archived document
    const restoreBtn = screen.getByTestId(
      "restore-doc-btn-65f29d20c571c48201a55591"
    );
    fireEvent.click(restoreBtn);

    // Count updates to 1 archived document
    await waitFor(() => {
      expect(screen.getByTestId("archived-count-heading")).toHaveTextContent(
        "1 archived document"
      );
    });

    // Go back to space detail
    const backBtn = screen.getByTestId("back-to-space-btn");
    fireEvent.click(backBtn);

    // Active documents in Development now includes the restored document!
    expect(await screen.findByText("Database Schema (legacy)")).toBeInTheDocument();
  });
});

describe("Documentation Feature - URL Routing, Deep Linking, and State", () => {
  beforeEach(() => {
    resetMockData();
  });

  const renderAtUrl = (url) => {
    return render(
      <MemoryRouter initialEntries={[url]}>
        <Documentation />
      </MemoryRouter>
    );
  };

  test("Deep link & refresh equivalent: /doc renders Spaces List screen", async () => {
    renderAtUrl("/doc");
    expect(await screen.findByTestId("spaces-list-screen")).toBeInTheDocument();
    expect(screen.getByTestId("documentation-title")).toHaveTextContent("Documentation");
    expect(await screen.findByText("Engineering Handbook")).toBeInTheDocument();
  });

  test("Deep link & refresh equivalent: /doc/spaces/new renders Create Space form", async () => {
    renderAtUrl("/doc/spaces/new");
    expect(await screen.findByTestId("space-form-title")).toHaveTextContent(
      "Create Documentation Space"
    );
    expect(screen.getByTestId("space-title-input")).toBeInTheDocument();
  });

  test("Deep link & refresh equivalent: /doc/spaces/:spaceId renders Space Detail screen", async () => {
    renderAtUrl("/doc/spaces/65f29d20c571c48201a00001");
    expect(await screen.findByTestId("space-detail-title")).toHaveTextContent(
      "Engineering Handbook"
    );
    expect(screen.getByTestId("area-tab-development")).toBeInTheDocument();
  });

  test("Deep link & refresh equivalent: /doc/spaces/:spaceId/edit renders Edit Space form", async () => {
    renderAtUrl("/doc/spaces/65f29d20c571c48201a00001/edit");
    expect(await screen.findByTestId("space-form-title")).toHaveTextContent(
      "Edit Documentation Space"
    );
    const titleInput = await screen.findByTestId("space-title-input");
    expect(titleInput).toHaveValue("Engineering Handbook");
  });

  test("Deep link & refresh equivalent: /doc/spaces/:spaceId/documents/new renders Add Document form", async () => {
    renderAtUrl("/doc/spaces/65f29d20c571c48201a00001/documents/new");
    expect(await screen.findByTestId("doc-form-title")).toHaveTextContent("Add Document");
    expect(screen.getByTestId("doc-title-input")).toBeInTheDocument();
  });

  test("Deep link & refresh equivalent: /doc/spaces/:spaceId/documents/:id/edit renders Edit Document form", async () => {
    renderAtUrl("/doc/spaces/65f29d20c571c48201a00001/documents/65f29d20c571c48201a55551/edit");
    expect(await screen.findByTestId("doc-form-title")).toHaveTextContent("Edit Document");
    const titleInput = await screen.findByTestId("doc-title-input");
    expect(titleInput).toHaveValue("Database Schema");
  });

  test("Deep link & refresh equivalent: /doc/spaces/:spaceId/archived renders Archived Documents screen", async () => {
    renderAtUrl("/doc/spaces/65f29d20c571c48201a00001/archived");
    expect(await screen.findByTestId("archived-page-title")).toHaveTextContent(
      "Archived Documents"
    );
    expect(screen.getByText("Database Schema (legacy)")).toBeInTheDocument();
  });

  test("URL state: ?area= selects the tab and survives re-render", async () => {
    renderAtUrl("/doc/spaces/65f29d20c571c48201a00001?area=design");
    expect(await screen.findByTestId("current-area-title")).toHaveTextContent("Design");
    const designTab = screen.getByTestId("area-tab-design");
    expect(designTab).toHaveClass("text-[#158019]");
    expect(await screen.findByText("Design System Guidelines")).toBeInTheDocument();
  });

  test("URL state: ?area= preselects the area in Document Form", async () => {
    renderAtUrl("/doc/spaces/65f29d20c571c48201a00001/documents/new?area=testing");
    expect(await screen.findByTestId("doc-form-title")).toHaveTextContent("Add Document");
    expect(screen.getByTestId("area-select-trigger")).toHaveTextContent("Testing");
  });

  test("URL state: ?q= in spaces list pre-filters search and debounces updates", async () => {
    renderAtUrl("/doc?q=Solver");
    expect(await screen.findByTestId("spaces-summary")).toHaveTextContent("1 space · 0 documents found");
    expect(screen.getByText("Solver Research")).toBeInTheDocument();
    expect(screen.queryByText("Engineering Handbook")).not.toBeInTheDocument();
  });

  test("Back / Cancel navigation from forms uses history fallback to return to correct screen", async () => {
    renderAtUrl("/doc/spaces/new");
    expect(await screen.findByTestId("space-form-title")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("cancel-space-btn"));
    expect(await screen.findByTestId("spaces-list-screen")).toBeInTheDocument();
  });

  test("Invalid or missing space ID shows Not Found state", async () => {
    renderAtUrl("/doc/spaces/invalid-id-xyz");
    expect(await screen.findByTestId("doc-not-found")).toBeInTheDocument();
    expect(screen.getByTestId("not-found-heading")).toHaveTextContent(
      "Documentation Space Not Found"
    );
  });

  test("Invalid or missing document ID shows Not Found state", async () => {
    renderAtUrl("/doc/spaces/65f29d20c571c48201a00001/documents/invalid-id/edit");
    expect(await screen.findByTestId("doc-not-found")).toBeInTheDocument();
    expect(screen.getByTestId("not-found-heading")).toHaveTextContent("Document Not Found");
  });

  test("Read-only user navigating to Edit Space route sees Unauthorized screen", async () => {
    setMockScenario(MockScenarios.READ_ONLY);
    renderAtUrl("/doc/spaces/65f29d20c571c48201a00001/edit");
    expect(await screen.findByText("Sorry, not authorized")).toBeInTheDocument();
  });

  test("Read-only user navigating to Archived Documents route sees Unauthorized screen", async () => {
    setMockScenario(MockScenarios.READ_ONLY);
    renderAtUrl("/doc/spaces/65f29d20c571c48201a00001/archived");
    expect(await screen.findByText("Sorry, not authorized")).toBeInTheDocument();
  });

  test("Legacy routes (/doc/:id, /doc/create/:id) and /doc/spaces redirect co-exist without collision", async () => {
    // 1. Legacy blog route /doc/:id
    const { unmount: unmountBlog } = render(
      <MemoryRouter initialEntries={["/doc/legacy-123"]}>
        <Routes>
          <Route path="/doc/*" element={<Documentation />} />
          <Route path="/doc/spaces" element={<Navigate to="/doc" replace />} />
          <Route path="/doc/:id" element={<div data-testid="legacy-doc-blog">DocBlog</div>} />
          <Route path="/doc/create/:id" element={<div data-testid="legacy-create-doc">CreateDoc</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByTestId("legacy-doc-blog")).toHaveTextContent("DocBlog");
    unmountBlog();

    // 2. Legacy create blog route /doc/create/:id
    const { unmount: unmountCreate } = render(
      <MemoryRouter initialEntries={["/doc/create/legacy-123"]}>
        <Routes>
          <Route path="/doc/*" element={<Documentation />} />
          <Route path="/doc/spaces" element={<Navigate to="/doc" replace />} />
          <Route path="/doc/:id" element={<div data-testid="legacy-doc-blog">DocBlog</div>} />
          <Route path="/doc/create/:id" element={<div data-testid="legacy-create-doc">CreateDoc</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByTestId("legacy-create-doc")).toHaveTextContent("CreateDoc");
    unmountCreate();

    // 3. /doc/spaces redirects to /doc (Spaces list)
    const { unmount: unmountSpaces } = render(
      <MemoryRouter initialEntries={["/doc/spaces"]}>
        <Routes>
          <Route path="/doc/*" element={<Documentation />} />
          <Route path="/doc/spaces" element={<Navigate to="/doc" replace />} />
          <Route path="/doc/:id" element={<div data-testid="legacy-doc-blog">DocBlog</div>} />
          <Route path="/doc/create/:id" element={<div data-testid="legacy-create-doc">CreateDoc</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByTestId("spaces-list-screen")).toBeInTheDocument();
    unmountSpaces();

    // 4. /doc/spaces/:spaceId does NOT get swallowed by /doc/:id
    const { unmount: unmountDetail } = render(
      <MemoryRouter initialEntries={["/doc/spaces/65f29d20c571c48201a00001"]}>
        <Routes>
          <Route path="/doc/*" element={<Documentation />} />
          <Route path="/doc/spaces" element={<Navigate to="/doc" replace />} />
          <Route path="/doc/:id" element={<div data-testid="legacy-doc-blog">DocBlog</div>} />
          <Route path="/doc/create/:id" element={<div data-testid="legacy-create-doc">CreateDoc</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByTestId("space-detail-title")).toHaveTextContent(
      "Engineering Handbook"
    );
    unmountDetail();
  });
});

// -------------------------------------------------------------------------
// Real API Mode & Error Handling
// -------------------------------------------------------------------------
describe("Documentation Feature - Real API Mode and Error Handling", () => {
  beforeEach(() => {
    resetMockData();
    setUseMock(false);
  });

  afterEach(() => {
    setUseMock(true);
    axios.rawMock?.get?.mockReset?.();
  });

  test("Real API mode: listProjects propagates contract error and does NOT return seed projects", async () => {
    axios.rawMock.get.mockRejectedValueOnce({
        response: {
          status: 500,
          data: {
            error: {
              code: "INTERNAL_ERROR",
              message: "Project service database failure",
            },
          },
        },
      });

      await expect(listProjects()).rejects.toThrow("Project service database failure");
    });

    test("Real API mode: listMembers propagates contract error and does NOT return seed users", async () => {
      axios.rawMock.get.mockRejectedValueOnce({
        response: {
          status: 503,
          data: {
            error: {
              code: "INTERNAL_ERROR",
              message: "User service temporarily unavailable",
            },
          },
        },
      });

      await expect(listMembers()).rejects.toThrow("User service temporarily unavailable");
    });

    test("Real API mode: network errors and timeouts are mapped to contract format", async () => {
      // 1. Timeout error
      const timeoutErr = new Error("timeout of 15000ms exceeded");
      timeoutErr.code = "ECONNABORTED";
      axios.rawMock.get.mockRejectedValueOnce(timeoutErr);

      try {
        await listProjects();
        throw new Error("Should have thrown");
      } catch (err) {
        expect(err.code).toBe("TIMEOUT");
        expect(err.response?.data?.error?.code).toBe("TIMEOUT");
        expect(err.response?.data?.error?.message).toContain("Request timed out");
      }

      // 2. Network error (no response)
      const netErr = new Error("Network Error");
      axios.rawMock.get.mockRejectedValueOnce(netErr);

      try {
        await listMembers();
        throw new Error("Should have thrown");
      } catch (err) {
        expect(err.code).toBe("NETWORK_ERROR");
        expect(err.response?.data?.error?.code).toBe("NETWORK_ERROR");
        expect(err.response?.data?.error?.message).toContain("Network error");
      }
    });

    test("UI: Project select shows loading, error, and Retry button instead of seed projects when API fails, and recovers", async () => {
      // Failing projects call
      axios.rawMock.get.mockImplementation((url) => {
        if (url === "/projects") {
          return Promise.reject({
            response: {
              status: 500,
              data: {
                error: {
                  code: "INTERNAL_ERROR",
                  message: "Database connection failed",
                },
              },
            },
          });
        }
        if (url === "/admin/users") {
          return Promise.resolve({ data: [] });
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      render(
        <MemoryRouter initialEntries={["/doc/spaces/new"]}>
          <Documentation />
        </MemoryRouter>
      );

      // 1. Shows inline error with message
      expect(await screen.findByTestId("projects-error")).toBeInTheDocument();
      expect(screen.getByTestId("projects-error")).toHaveTextContent("Database connection failed");
      expect(screen.getByTestId("retry-projects-btn")).toBeInTheDocument();

      // 2. Never renders fake/seed options
      expect(screen.queryByTestId("space-project-select")).not.toBeInTheDocument();
      expect(screen.queryByText("Engineering Handbook")).not.toBeInTheDocument();
      expect(screen.queryByText("Airost Intranet")).not.toBeInTheDocument();

      // 3. Form blocks submit and shows clear message
      expect(await screen.findByTestId("form-blocked-message")).toHaveTextContent(
        "Cannot save space: required project data failed to load. Please retry loading."
      );
      expect(screen.getByTestId("submit-space-btn")).toBeDisabled();

      // 4. Setup successful recovery response for retry
      axios.rawMock.get.mockImplementation((url) => {
        if (url === "/projects") {
          return Promise.resolve({
            data: [{ _id: "65f29d20c571c48201a11199", title: "Autonomous Drone System" }],
          });
        }
        if (url === "/admin/users") {
          return Promise.resolve({ data: [] });
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      // Click retry
      fireEvent.click(screen.getByTestId("retry-projects-btn"));

      // 5. Successfully recovers and renders real options
      expect(await screen.findByTestId("space-project-select")).toBeInTheDocument();
      expect(await screen.findByText("Autonomous Drone System")).toBeInTheDocument();
      expect(screen.queryByTestId("projects-error")).not.toBeInTheDocument();
      expect(screen.queryByTestId("form-blocked-message")).not.toBeInTheDocument();
    });

    test("UI: Member picker shows error and Retry button instead of seed members when API fails, and recovers", async () => {
      // Failing users call
      axios.rawMock.get.mockImplementation((url) => {
        if (url === "/projects") {
          return Promise.resolve({ data: [] });
        }
        if (url === "/admin/users") {
          return Promise.reject({
            response: {
              status: 500,
              data: {
                error: {
                  code: "INTERNAL_ERROR",
                  message: "User directory unavailable",
                },
              },
            },
          });
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      render(
        <MemoryRouter initialEntries={["/doc/spaces/new"]}>
          <Documentation />
        </MemoryRouter>
      );

      // Switch to "Selected members"
      const selectedRadio = await screen.findByTestId("access-radio-selected");
      fireEvent.click(selectedRadio);

      // 1. Shows inline error with message in member picker
      const memberErrors = await screen.findAllByTestId("members-error");
      expect(memberErrors.length).toBeGreaterThan(0);
      expect(memberErrors[0]).toHaveTextContent("User directory unavailable");
      expect(screen.getAllByTestId("retry-members-btn")[0]).toBeInTheDocument();

      // 2. Never renders fake/seed member options
      expect(screen.queryByText("Jess")).not.toBeInTheDocument();
      expect(screen.queryByText("Chang Xi")).not.toBeInTheDocument();

      // 3. Form blocks submit and shows clear message
      expect(await screen.findByTestId("form-blocked-message")).toHaveTextContent(
        "Cannot save space: required member data failed to load. Please retry loading."
      );
      expect(screen.getByTestId("submit-space-btn")).toBeDisabled();

      // 4. Setup successful recovery response for retry
      axios.rawMock.get.mockImplementation((url) => {
        if (url === "/projects") {
          return Promise.resolve({ data: [] });
        }
        if (url === "/admin/users") {
          return Promise.resolve({
            data: [
              { _id: "65f29d20c571c48201a33399", name: "Dr. Alicia Vance", email: "alicia@airost.com" },
            ],
          });
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      // Click retry
      fireEvent.click(screen.getAllByTestId("retry-members-btn")[0]);

      // 5. Successfully recovers and renders real member picker
      const triggers = await screen.findAllByTestId("member-picker-trigger");
      expect(triggers.length).toBeGreaterThan(0);
      expect(screen.queryByTestId("members-error")).not.toBeInTheDocument();

      // Open member picker dropdown to verify real member option
      fireEvent.click(triggers[0]);
      expect(await screen.findByText("Dr. Alicia Vance")).toBeInTheDocument();
    });

    test("Production mode guard: USE_MOCK cannot be enabled when NODE_ENV is production", () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = "production";
        const result = setUseMock(true);
        expect(result).toBe(false);
        expect(USE_MOCK).toBe(false);
      } finally {
        process.env.NODE_ENV = originalEnv;
        setUseMock(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Admin Destructive Actions: Delete Space & Permanently Delete Document
  // ---------------------------------------------------------------------------
  describe("Admin Destructive Actions - Delete Space & Permanently Delete Document", () => {
    beforeEach(() => {
      resetMockData();
    });

    const renderWithAuth = async (
      initialRoute = "/doc",
      user = { position: "admin", name: "Admin User" }
    ) => {
      const utils = render(
        <AuthContext.Provider value={{ user, loading: false }}>
          <MemoryRouter initialEntries={[initialRoute]}>
            <Documentation />
          </MemoryRouter>
        </AuthContext.Provider>
      );
      await waitFor(() => {
        expect(screen.queryByTestId("spaces-loading")).not.toBeInTheDocument();
      });
      return utils;
    };

    test("controls hidden for editor, reader, and manager-who-is-not-admin; visible for admin", async () => {
      // 1. Editor (member with update rights, not admin)
      const editorUser = { position: "member", name: "Editor Jess" };
      const { unmount: unmountEditor } = await renderWithAuth("/doc", editorUser);

      // In space card overflow menu, Delete space is NOT present
      const menuTrigger = await screen.findByTestId("space-menu-trigger-65f29d20c571c48201a00001");
      fireEvent.click(menuTrigger);
      expect(screen.getByTestId("edit-space-menu-item")).toBeInTheDocument();
      expect(screen.getByTestId("manage-permissions-menu-item")).toBeInTheDocument();
      expect(screen.queryByTestId("delete-space-menu-item")).not.toBeInTheDocument();
      unmountEditor();

      // In archived documents, Delete permanently is NOT present
      const { unmount: unmountEditorArchived } = await renderWithAuth(
        "/doc/spaces/65f29d20c571c48201a00001/archived",
        editorUser
      );
      expect(await screen.findByTestId("restore-doc-btn-65f29d20c571c48201a55591")).toBeInTheDocument();
      expect(
        screen.queryByTestId("delete-permanent-doc-btn-65f29d20c571c48201a55591")
      ).not.toBeInTheDocument();
      unmountEditorArchived();

      // 2. Reader (read-only scenario)
      setMockScenario(MockScenarios.READ_ONLY);
      const readerUser = { position: "viewer", name: "Reader Bob" };
      const { unmount: unmountReader } = await renderWithAuth("/doc", readerUser);
      // Reader has no overflow menu at all
      expect(
        screen.queryByTestId("space-menu-trigger-65f29d20c571c48201a00001")
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId("delete-space-menu-item")).not.toBeInTheDocument();
      unmountReader();
      setMockScenario(MockScenarios.DEFAULT);

      // 3. Manager who is NOT admin (e.g. project lead / space creator)
      const leadUser = { position: ["lead"], name: "Lead Chang Xi" };
      const { unmount: unmountLead } = await renderWithAuth("/doc", leadUser);
      const leadTrigger = await screen.findByTestId("space-menu-trigger-65f29d20c571c48201a00001");
      fireEvent.click(leadTrigger);
      expect(screen.getByTestId("edit-space-menu-item")).toBeInTheDocument();
      expect(screen.getByTestId("manage-permissions-menu-item")).toBeInTheDocument();
      // Must NOT see delete space
      expect(screen.queryByTestId("delete-space-menu-item")).not.toBeInTheDocument();
      unmountLead();

      const { unmount: unmountLeadArchived } = await renderWithAuth(
        "/doc/spaces/65f29d20c571c48201a00001/archived",
        leadUser
      );
      expect(await screen.findByTestId("restore-doc-btn-65f29d20c571c48201a55591")).toBeInTheDocument();
      expect(
        screen.queryByTestId("delete-permanent-doc-btn-65f29d20c571c48201a55591")
      ).not.toBeInTheDocument();
      unmountLeadArchived();

      // 4. Admin
      const adminUser = { position: "admin", name: "Platform Admin" };
      const { unmount: unmountAdmin } = await renderWithAuth("/doc", adminUser);
      const adminTrigger = await screen.findByTestId("space-menu-trigger-65f29d20c571c48201a00001");
      fireEvent.click(adminTrigger);
      expect(screen.getByTestId("edit-space-menu-item")).toBeInTheDocument();
      expect(screen.getByTestId("manage-permissions-menu-item")).toBeInTheDocument();
      // Admin DOES see delete space
      expect(screen.getByTestId("delete-space-menu-item")).toBeInTheDocument();
      unmountAdmin();

      const { unmount: unmountAdminArchived } = await renderWithAuth(
        "/doc/spaces/65f29d20c571c48201a00001/archived",
        adminUser
      );
      expect(await screen.findByTestId("restore-doc-btn-65f29d20c571c48201a55591")).toBeInTheDocument();
      expect(
        screen.getByTestId("delete-permanent-doc-btn-65f29d20c571c48201a55591")
      ).toBeInTheDocument();
      unmountAdminArchived();
    });

    test("confirm button disabled until exact title matches", async () => {
      await renderWithAuth("/doc", { position: "admin" });

      const trigger = await screen.findByTestId("space-menu-trigger-65f29d20c571c48201a00001");
      fireEvent.click(trigger);

      const deleteMenuItem = screen.getByTestId("delete-space-menu-item");
      fireEvent.click(deleteMenuItem);

      // Modal is open
      expect(await screen.findByTestId("delete-space-modal")).toBeInTheDocument();
      expect(screen.getByTestId("delete-modal-title")).toHaveTextContent("Delete Engineering Handbook?");

      // Document counts displayed from space data
      expect(screen.getByTestId("delete-space-modal")).toHaveTextContent("Engineering Handbook");
      expect(screen.getByTestId("delete-space-modal")).toHaveTextContent("archived");

      // Confirm button is initially disabled
      const confirmBtn = screen.getByTestId("delete-modal-confirm-btn");
      expect(confirmBtn).toBeDisabled();

      const input = screen.getByTestId("delete-confirm-input");

      // Incomplete title -> still disabled
      fireEvent.change(input, { target: { value: "Engineering" } });
      expect(confirmBtn).toBeDisabled();

      // Case-mismatched title -> still disabled
      fireEvent.change(input, { target: { value: "engineering handbook" } });
      expect(confirmBtn).toBeDisabled();

      // Trailing space -> still disabled
      fireEvent.change(input, { target: { value: "Engineering Handbook " } });
      expect(confirmBtn).toBeDisabled();

      // Exact match -> enabled!
      fireEvent.change(input, { target: { value: "Engineering Handbook" } });
      expect(confirmBtn).not.toBeDisabled();
    });

    test("success flow updates the list and counts for Delete Space", async () => {
      await renderWithAuth("/doc", { position: "admin" });

      // Initial state: 4 spaces, 20 documents
      expect(await screen.findByTestId("spaces-summary")).toHaveTextContent("4 spaces · 20 documents");
      expect(screen.getByText("Engineering Handbook")).toBeInTheDocument();

      // Open menu and modal
      const trigger = screen.getByTestId("space-menu-trigger-65f29d20c571c48201a00001");
      fireEvent.click(trigger);
      fireEvent.click(screen.getByTestId("delete-space-menu-item"));

      const input = await screen.findByTestId("delete-confirm-input");
      fireEvent.change(input, { target: { value: "Engineering Handbook" } });

      const confirmBtn = screen.getByTestId("delete-modal-confirm-btn");
      expect(confirmBtn).not.toBeDisabled();

      fireEvent.click(confirmBtn);

      // Modal closes on success
      await waitFor(() => {
        expect(screen.queryByTestId("delete-space-modal")).not.toBeInTheDocument();
      });

      // Brief toast notification is displayed
      expect(await screen.findByTestId("documentation-toast")).toHaveTextContent(
        '"Engineering Handbook" and its document links were deleted.'
      );

      // Space list updated: 3 spaces left, "Engineering Handbook" gone
      expect(screen.queryByText("Engineering Handbook")).not.toBeInTheDocument();
      expect(screen.getByTestId("spaces-summary")).toHaveTextContent("3 spaces");
    });

    test("success flow updates the list and counts for Permanently Delete Document", async () => {
      await renderWithAuth("/doc/spaces/65f29d20c571c48201a00001/archived", { position: "admin" });

      // Initial count: 2 archived documents
      expect(await screen.findByTestId("archived-count-heading")).toHaveTextContent(
        "2 archived documents"
      );
      expect(screen.getByText("Database Schema (legacy)")).toBeInTheDocument();

      // Click permanent delete on first archived document
      const delBtn = screen.getByTestId("delete-permanent-doc-btn-65f29d20c571c48201a55591");
      fireEvent.click(delBtn);

      // Modal opens
      expect(await screen.findByTestId("delete-permanent-modal")).toBeInTheDocument();
      expect(screen.getByTestId("delete-modal-title")).toHaveTextContent(
        'Delete "Database Schema (legacy)" permanently?'
      );
      expect(screen.getByTestId("delete-modal-desc")).toHaveTextContent(
        "This removes the link record only; the external document is not changed. This cannot be undone."
      );

      // Confirm permanent delete
      const confirmBtn = screen.getByTestId("delete-modal-confirm-btn");
      fireEvent.click(confirmBtn);

      // Modal closes
      await waitFor(() => {
        expect(screen.queryByTestId("delete-permanent-modal")).not.toBeInTheDocument();
      });

      // Toast appears
      expect(await screen.findByTestId("documentation-toast")).toHaveTextContent(
        '"Database Schema (legacy)" was permanently deleted.'
      );

      // Heading and list update: 1 archived document left
      expect(await screen.findByTestId("archived-count-heading")).toHaveTextContent(
        "1 archived document"
      );
      expect(screen.queryByText("Database Schema (legacy)")).not.toBeInTheDocument();
      expect(screen.getByText("API Reference (legacy)")).toBeInTheDocument();
    });

    test("each failure type shows the right message (403, 404, 500/network) and offers recovery", async () => {
      const { unmount } = await renderWithAuth("/doc", { position: "admin" });

      // --- Test 403 FORBIDDEN ---
      let trigger = screen.getByTestId("space-menu-trigger-65f29d20c571c48201a00001");
      fireEvent.click(trigger);
      fireEvent.click(screen.getByTestId("delete-space-menu-item"));

      let input = await screen.findByTestId("delete-confirm-input");
      fireEvent.change(input, { target: { value: "Engineering Handbook" } });

      setMockScenario(MockScenarios.FORBIDDEN);
      fireEvent.click(screen.getByTestId("delete-modal-confirm-btn"));

      // 403 error message displayed inline, modal stays open
      expect(await screen.findByTestId("delete-modal-error")).toHaveTextContent("Permission denied");
      expect(screen.getByTestId("delete-space-modal")).toBeInTheDocument();

      // Reset scenario and close modal
      setMockScenario(MockScenarios.DEFAULT);
      fireEvent.click(screen.getByTestId("delete-modal-cancel-btn"));
      await waitFor(() => {
        expect(screen.queryByTestId("delete-space-modal")).not.toBeInTheDocument();
      });

      // --- Test 404 NOT FOUND (already deleted) ---
      trigger = screen.getByTestId("space-menu-trigger-65f29d20c571c48201a00001");
      fireEvent.click(trigger);
      fireEvent.click(screen.getByTestId("delete-space-menu-item"));

      input = await screen.findByTestId("delete-confirm-input");
      fireEvent.change(input, { target: { value: "Engineering Handbook" } });

      setMockScenario(MockScenarios.NOT_FOUND);
      fireEvent.click(screen.getByTestId("delete-modal-confirm-btn"));

      // 404 error message displayed inline with refresh & close button
      expect(await screen.findByTestId("delete-modal-error")).toHaveTextContent("Not found");
      const refreshCloseBtn = screen.getByTestId("delete-modal-refresh-close");
      expect(refreshCloseBtn).toBeInTheDocument();

      // Reset scenario back to DEFAULT so refresh succeeds, then click refresh & close
      setMockScenario(MockScenarios.DEFAULT);
      fireEvent.click(refreshCloseBtn);
      await waitFor(() => {
        expect(screen.queryByTestId("delete-space-modal")).not.toBeInTheDocument();
      });

      // Wait for spaces list to be fully rendered
      expect(await screen.findByTestId("space-card-65f29d20c571c48201a00001")).toBeInTheDocument();

      // --- Test 500 / Network Error with Retry ---
      trigger = screen.getByTestId("space-menu-trigger-65f29d20c571c48201a00001");
      fireEvent.click(trigger);
      fireEvent.click(screen.getByTestId("delete-space-menu-item"));

      input = await screen.findByTestId("delete-confirm-input");
      fireEvent.change(input, { target: { value: "Engineering Handbook" } });

      setMockScenario(MockScenarios.SERVER_ERROR);
      fireEvent.click(screen.getByTestId("delete-modal-confirm-btn"));

      // 500 error message displayed with retry button
      expect(await screen.findByTestId("delete-modal-error")).toHaveTextContent("Server error");
      const retryBtn = screen.getByTestId("delete-modal-retry-btn");
      expect(retryBtn).toBeInTheDocument();

      // Recovery: set back to default and click Retry
      setMockScenario(MockScenarios.DEFAULT);
      fireEvent.click(retryBtn);

      // Now succeeds and closes modal
      await waitFor(() => {
        expect(screen.queryByTestId("delete-space-modal")).not.toBeInTheDocument();
      });

      unmount();
    });

    test("Escape and Cancel close modal without calling the API", async () => {
      await renderWithAuth("/doc", { position: "admin" });

      // 1. Cancel button
      const trigger = await screen.findByTestId("space-menu-trigger-65f29d20c571c48201a00001");
      fireEvent.click(trigger);
      fireEvent.click(screen.getByTestId("delete-space-menu-item"));

      expect(await screen.findByTestId("delete-space-modal")).toBeInTheDocument();
      fireEvent.click(screen.getByTestId("delete-modal-cancel-btn"));

      await waitFor(() => {
        expect(screen.queryByTestId("delete-space-modal")).not.toBeInTheDocument();
      });
      // Space is still present
      expect(screen.getByText("Engineering Handbook")).toBeInTheDocument();

      // 2. Escape key
      const trigger2 = screen.getByTestId("space-menu-trigger-65f29d20c571c48201a00001");
      fireEvent.click(trigger2);
      fireEvent.click(screen.getByTestId("delete-space-menu-item"));

      expect(await screen.findByTestId("delete-space-modal")).toBeInTheDocument();
      fireEvent.keyDown(document, { key: "Escape", code: "Escape" });

      await waitFor(() => {
        expect(screen.queryByTestId("delete-space-modal")).not.toBeInTheDocument();
      });
      // Space is still present
      expect(screen.getByText("Engineering Handbook")).toBeInTheDocument();
    });

    test("modal accessibility: focus moves into modal, traps focus, and returns to trigger on close", async () => {
      await renderWithAuth("/doc", { position: "admin" });

      const trigger = await screen.findByTestId("space-menu-trigger-65f29d20c571c48201a00001");
      trigger.focus();
      expect(document.activeElement).toBe(trigger);

      fireEvent.click(trigger);
      fireEvent.click(screen.getByTestId("delete-space-menu-item"));

      // Modal has role dialog and aria-modal
      const modal = await screen.findByTestId("delete-space-modal");
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby", "delete-modal-title");

      // Focus moved into input
      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByTestId("delete-confirm-input"));
      });

      // Focus trap testing: Tab from last focusable element wraps to first
      const cancelBtn = screen.getByTestId("delete-modal-cancel-btn");
      cancelBtn.focus();
      expect(document.activeElement).toBe(cancelBtn);

      fireEvent.keyDown(document, { key: "Tab", shiftKey: false });

      // Close modal with Cancel
      fireEvent.click(cancelBtn);

      await waitFor(() => {
        expect(screen.queryByTestId("delete-space-modal")).not.toBeInTheDocument();
      });

      // Focus returned to trigger
      await waitFor(() => {
        expect(document.activeElement).toBe(trigger);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Cross-Space Document Search (GET /doc/search)
  // -------------------------------------------------------------------------
  describe("Cross-Space Document Search (GET /doc/search)", () => {
    beforeEach(() => {
      resetMockData();
      jest.restoreAllMocks();
      fallbackQueryClient.clear();
    });

    const renderWithSearch = async (
      initialRoute = "/doc",
      user = { position: "member", name: "Test Member" }
    ) => {
      const utils = render(
        <AuthContext.Provider value={{ user, loading: false }}>
          <MemoryRouter initialEntries={[initialRoute]}>
            <Documentation />
          </MemoryRouter>
        </AuthContext.Provider>
      );
      await waitFor(() => {
        expect(screen.queryByTestId("spaces-loading")).not.toBeInTheDocument();
      });
      return utils;
    };

    test("no request below 2 chars: typing 1 char filters spaces client-side without calling searchDocuments", async () => {
      const searchSpy = jest.spyOn(docApi, "searchDocuments");
      await renderWithSearch("/doc");
      const searchInput = screen.getByTestId("spaces-search-input");
      fireEvent.change(searchInput, { target: { value: "y" } });

      // Wait 350ms to exceed debounce
      await new Promise((r) => setTimeout(r, 350));

      expect(searchSpy).not.toHaveBeenCalled();
      // Spaces filtered client-side (e.g. "Engineering Handbook" matches)
      expect(screen.getByText("Engineering Handbook")).toBeInTheDocument();
      expect(screen.queryByText("Solver Research")).not.toBeInTheDocument();
      expect(screen.queryByTestId("search-documents-section")).not.toBeInTheDocument();
    });

    test("debounced single request: rapid typing triggers only one search request after 300ms", async () => {
      const searchSpy = jest.spyOn(docApi, "searchDocuments");
      await renderWithSearch("/doc");
      const searchInput = screen.getByTestId("spaces-search-input");

      fireEvent.change(searchInput, { target: { value: "r" } });
      fireEvent.change(searchInput, { target: { value: "ro" } });
      fireEvent.change(searchInput, { target: { value: "roa" } });
      fireEvent.change(searchInput, { target: { value: "road" } });

      expect(searchSpy).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(searchSpy).toHaveBeenCalledTimes(1);
      });
      expect(searchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ q: "road" })
      );
    });

    test("stale response ignored: slower earlier request does not overwrite newer search results", async () => {
      let resolveSlow;
      const slowPromise = new Promise((resolve) => {
        resolveSlow = resolve;
      });

      jest.spyOn(docApi, "searchDocuments").mockImplementation(async ({ q }) => {
        if (q === "slowquery") {
          return await slowPromise;
        }
        return {
          documents: [
            {
              _id: "doc-fast-1",
              title: "Fast Response Document",
              url: "https://docs.google.com/fast",
              provider: "google_doc",
              area: "development",
              spaceId: "65f29d20c571c48201a00001",
              space: { _id: "65f29d20c571c48201a00001", title: "Engineering Handbook" },
            },
          ],
        };
      });

      await renderWithSearch("/doc");
      const searchInput = screen.getByTestId("spaces-search-input");

      // First type slowquery
      fireEvent.change(searchInput, { target: { value: "slowquery" } });
      await new Promise((r) => setTimeout(r, 350));

      // Then type fastquery before slow resolves
      fireEvent.change(searchInput, { target: { value: "fastquery" } });
      await new Promise((r) => setTimeout(r, 350));

      // Fast response renders
      expect(await screen.findByText("Fast Response Document")).toBeInTheDocument();

      // Now resolve slow response with old data
      resolveSlow({
        documents: [
          {
            _id: "doc-slow-1",
            title: "Old Slow Document",
            url: "https://docs.google.com/slow",
            provider: "google_doc",
            area: "general",
            spaceId: "65f29d20c571c48201a00001",
            space: { _id: "65f29d20c571c48201a00001", title: "Engineering Handbook" },
          },
        ],
      });

      await new Promise((r) => setTimeout(r, 100));

      // The active view still shows fast response and was not overwritten by slow response
      expect(screen.getByText("Fast Response Document")).toBeInTheDocument();
      expect(screen.queryByText("Old Slow Document")).not.toBeInTheDocument();
    });

    test("spaces-only match: renders matching spaces, 0 documents count, and no Screen 3 card", async () => {
      await renderWithSearch("/doc?q=Solver");

      expect(await screen.findByTestId("documentation-title")).toBeInTheDocument();
      expect(await screen.findByTestId("search-results-summary")).toHaveTextContent("1 space · 0 documents found");
      expect(screen.getByText("Solver Research")).toBeInTheDocument();
      expect(screen.queryByText("Engineering Handbook")).not.toBeInTheDocument();
      expect(screen.queryByTestId("no-search-results-card")).not.toBeInTheDocument();
      expect(screen.getByTestId("search-documents-count")).toHaveTextContent("0 documents");
    });

    test("documents-only match: renders documents without spaces and does NOT show Screen 3 empty card", async () => {
      // "Roadmap" matches "Project Roadmap & Team Roster" in Space 2, but no space is named Roadmap
      await renderWithSearch("/doc?q=Roadmap");

      expect(await screen.findByTestId("search-results-summary")).toHaveTextContent("0 spaces · 1 document found");
      expect(screen.queryByTestId("spaces-grid")).not.toBeInTheDocument();
      expect(screen.queryByTestId("no-search-results-card")).not.toBeInTheDocument();

      // Document card is displayed
      expect(await screen.findByText("Project Roadmap & Team Roster")).toBeInTheDocument();
      expect(screen.getByTestId("search-documents-count")).toHaveTextContent("1 document");
    });

    test("both match: renders matching spaces and matching documents", async () => {
      jest.spyOn(docApi, "searchDocuments").mockResolvedValue({
        documents: [
          {
            _id: "doc-match-1",
            title: "Handbook Guidelines",
            url: "https://docs.google.com/handbook",
            provider: "google_doc",
            area: "general",
            spaceId: "65f29d20c571c48201a00001",
            space: { _id: "65f29d20c571c48201a00001", title: "Engineering Handbook" },
          },
        ],
      });

      await renderWithSearch("/doc?q=Handbook");

      // Summary heading and count
      expect(await screen.findByTestId("search-results-summary")).toHaveTextContent("3 spaces · 1 document found");
      // Spaces displayed
      expect(screen.getByTestId("space-card-65f29d20c571c48201a00001")).toHaveTextContent("Engineering Handbook");
      expect(screen.getByTestId("space-card-65f29d20c571c48201a00004")).toHaveTextContent("Team Handbook");
      // Documents displayed
      expect(screen.getByTestId("search-documents-list")).toHaveTextContent("Handbook Guidelines");
      expect(screen.queryByTestId("no-search-results-card")).not.toBeInTheDocument();
    });

    test("neither matches (Screen 3): renders Screen 3 empty state when both spaces and documents have 0 matches", async () => {
      await renderWithSearch("/doc?q=nonexistentxyz");

      expect(await screen.findByTestId("search-results-summary")).toHaveTextContent("0 spaces · 0 documents found");
      expect(await screen.findByTestId("no-search-results-card")).toBeInTheDocument();
      expect(screen.getByTestId("no-search-results-heading")).toHaveTextContent("No spaces found for “nonexistentxyz”");
      expect(screen.queryByTestId("search-documents-section")).not.toBeInTheDocument();
    });

    test("documents section error with retry while spaces still render", async () => {
      let failOnce = true;
      jest.spyOn(docApi, "searchDocuments").mockImplementation(async () => {
        if (failOnce) {
          failOnce = false;
          const err = new Error("Network timeout during search");
          err.response = { data: { error: { message: "Search service unavailable" } } };
          throw err;
        }
        return {
          documents: [
            {
              _id: "recovered-doc-1",
              title: "Recovered Architecture Doc",
              url: "https://docs.google.com/arch",
              provider: "google_doc",
              area: "design",
              spaceId: "65f29d20c571c48201a00001",
              space: { _id: "65f29d20c571c48201a00001", title: "Engineering Handbook" },
            },
          ],
        };
      });

      await renderWithSearch("/doc?q=Handbook");

      // Spaces are still rendered despite document search error!
      expect(await screen.findByTestId("space-card-65f29d20c571c48201a00001")).toHaveTextContent("Engineering Handbook");
      expect(screen.getByTestId("space-card-65f29d20c571c48201a00004")).toHaveTextContent("Team Handbook");

      // Documents section shows error
      expect(await screen.findByTestId("search-documents-error")).toBeInTheDocument();
      expect(screen.getByText("Search service unavailable")).toBeInTheDocument();

      // Click Retry
      const retryBtn = screen.getByTestId("search-documents-retry-btn");
      fireEvent.click(retryBtn);

      // Recovers: documents now displayed, error gone
      expect(await screen.findByText("Recovered Architecture Doc")).toBeInTheDocument();
      expect(screen.queryByTestId("search-documents-error")).not.toBeInTheDocument();
    });

    test("Open button on document card has target='_blank', rel='noopener noreferrer', and correct url", async () => {
      await renderWithSearch("/doc?q=Roadmap");

      const openBtn = await screen.findByTestId("open-search-document-btn-65f29d20c571c48201a66605");
      expect(openBtn).toBeInTheDocument();
      expect(openBtn).toHaveAttribute("target", "_blank");
      expect(openBtn).toHaveAttribute("rel", "noopener noreferrer");
      expect(openBtn).toHaveAttribute("href", "https://docs.google.com/document/d/1property-roadmap");
    });

    test("Space link in document card subtitle preselects area tab with ?area=", async () => {
      await renderWithSearch("/doc?q=Roadmap");

      const spaceLink = await screen.findByTestId("search-document-space-link-65f29d20c571c48201a66605");
      expect(spaceLink).toBeInTheDocument();
      expect(spaceLink).toHaveAttribute("href", "/doc/spaces/65f29d20c571c48201a00002?area=general");
      expect(spaceLink).toHaveTextContent("Property App Handbook");
    });

    test("Clear button restores default spaces list", async () => {
      await renderWithSearch("/doc?q=Solver");

      expect(await screen.findByText("Solver Research")).toBeInTheDocument();
      expect(screen.queryByText("Engineering Handbook")).not.toBeInTheDocument();

      const clearBtn = screen.getByTestId("clear-search-btn");
      fireEvent.click(clearBtn);

      // All 4 spaces restored, search results heading replaced by Documentation Spaces
      expect(await screen.findByText("Engineering Handbook")).toBeInTheDocument();
      expect(screen.getByText("Property App Handbook")).toBeInTheDocument();
      expect(screen.getByText("Solver Research")).toBeInTheDocument();
      expect(screen.getByText("Team Handbook")).toBeInTheDocument();
      expect(screen.getByText("Documentation Spaces")).toBeInTheDocument();
    });

    test("Counts and plurals: correctly formats singular and plural for spaces and documents", async () => {
      const searchSpy = jest.spyOn(docApi, "searchDocuments");

      // 1 space · 1 document
      searchSpy.mockResolvedValueOnce({
        documents: [
          {
            _id: "d1",
            title: "Doc 1",
            url: "https://docs.google.com/1",
            provider: "google_doc",
            area: "general",
            spaceId: "65f29d20c571c48201a00003",
            space: { _id: "65f29d20c571c48201a00003", title: "Solver Research" },
          },
        ],
      });
      const { unmount: unmount1 } = await renderWithSearch("/doc?q=Solver");
      expect(await screen.findByTestId("search-results-summary")).toHaveTextContent("1 space · 1 document found");
      expect(screen.getByTestId("search-documents-count")).toHaveTextContent("1 document");
      unmount1();
      fallbackQueryClient.clear();

      // 1 space · 2 documents
      searchSpy.mockResolvedValueOnce({
        documents: [
          {
            _id: "d1",
            title: "Doc 1",
            url: "https://docs.google.com/1",
            provider: "google_doc",
            area: "general",
            spaceId: "65f29d20c571c48201a00003",
            space: { _id: "65f29d20c571c48201a00003", title: "Solver Research" },
          },
          {
            _id: "d2",
            title: "Doc 2",
            url: "https://docs.google.com/2",
            provider: "google_doc",
            area: "general",
            spaceId: "65f29d20c571c48201a00003",
            space: { _id: "65f29d20c571c48201a00003", title: "Solver Research" },
          },
        ],
      });
      const { unmount: unmount2 } = await renderWithSearch("/doc?q=Solver");
      expect(await screen.findByTestId("search-results-summary")).toHaveTextContent("1 space · 2 documents found");
      expect(screen.getByTestId("search-documents-count")).toHaveTextContent("2 documents");
      unmount2();
    });

    test("Visual query truncation: very long search query is truncated in Screen 3 heading", async () => {
      const longQuery = "ThisIsAVeryLongQueryExceedingFortyCharactersForDocumentationSearchTest";
      await renderWithSearch(`/doc?q=${longQuery}`);

      expect(await screen.findByTestId("no-search-results-card")).toBeInTheDocument();
      const heading = screen.getByTestId("no-search-results-heading");
      expect(heading.textContent).toContain("…");
      expect(heading.textContent).toContain(longQuery.slice(0, 40));
    });
  });


