import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Documentation from "../../../pages/Documentation/Documentation";
import {
  resetMockData,
  setMockScenario,
  MockScenarios,
} from "../../../pages/Documentation/documentationApi";

jest.mock("axios", () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      response: { use: jest.fn() },
    },
  };
  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockAxiosInstance),
      ...mockAxiosInstance,
    },
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

  // -------------------------------------------------------------------------
  // Review Feedback Verification: Deep Links & Navigation
  // -------------------------------------------------------------------------
  test("Deep Link: Directly routes to /doc/spaces/new and renders Create Space screen", async () => {
    render(
      <MemoryRouter initialEntries={["/doc/spaces/new"]}>
        <Documentation />
      </MemoryRouter>
    );

    expect(await screen.findByTestId("space-form-title")).toHaveTextContent(
      "Create Documentation Space"
    );
  });

  test("Deep Link: Directly routes to /doc/spaces/:id and renders Space Detail screen", async () => {
    render(
      <MemoryRouter initialEntries={["/doc/spaces/65f29d20c571c48201a00001"]}>
        <Documentation />
      </MemoryRouter>
    );

    expect(await screen.findByTestId("space-detail-title")).toHaveTextContent(
      "Engineering Handbook"
    );
  });

  test("Cancel Space Edit: Canceling edit started from Spaces List returns to Spaces List", async () => {
    await renderDocumentation();

    // Click overflow menu on space card
    const trigger = await screen.findByTestId("space-menu-trigger-65f29d20c571c48201a00001");
    fireEvent.click(trigger);

    // Click Edit space
    const editMenuItem = await screen.findByTestId("edit-space-menu-item");
    fireEvent.click(editMenuItem);

    expect(await screen.findByTestId("space-form-title")).toHaveTextContent(
      "Edit Documentation Space"
    );

    // Click Cancel
    const cancelBtn = screen.getByTestId("cancel-space-btn");
    fireEvent.click(cancelBtn);

    // Should return to Spaces List, NOT Space Detail
    expect(await screen.findByTestId("documentation-title")).toHaveTextContent("Documentation");
    expect(screen.queryByTestId("space-detail-screen")).not.toBeInTheDocument();
  });
});

