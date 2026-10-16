import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

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

import Admin from "../Admin";
import AdminDocumentationPanel from "../AdminDocumentationPanel";
import { AuthContext } from "../../../context/authContext";
import * as docApi from "../../Documentation/documentationApi";

const renderWithAuth = (ui, user = null) => {
  return render(
    <AuthContext.Provider value={{ user, loading: false }}>
      <MemoryRouter initialEntries={["/admin"]}>{ui}</MemoryRouter>
    </AuthContext.Provider>
  );
};

describe("Admin Console - Documentation Oversight Panel", () => {
  const adminUser = {
    _id: "admin-1",
    name: "Admin Alice",
    position: ["admin"],
  };

  const memberUser = {
    _id: "member-1",
    name: "Member Bob",
    position: ["member"],
  };

  beforeEach(() => {
    docApi.resetMockData();
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Guard & Tabs
  // ---------------------------------------------------------------------------
  test("tab hidden for non-admins and panel refuses to render for them", async () => {
    // A. Render Admin with non-admin
    const { unmount: unmountMember } = renderWithAuth(<Admin />, memberUser);
    expect(screen.queryByTestId("admin-tab-documentation")).not.toBeInTheDocument();
    unmountMember();

    // B. Attempt to render AdminDocumentationPanel directly with non-admin
    const { unmount: unmountDirect } = renderWithAuth(<AdminDocumentationPanel />, memberUser);
    expect(screen.getByTestId("admin-doc-unauthorized")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-spaces-table")).not.toBeInTheDocument();
    unmountDirect();

    // C. Render Admin with admin
    renderWithAuth(<Admin />, adminUser);
    expect(screen.getByTestId("admin-tab-documentation")).toBeInTheDocument();
    expect(screen.getByTestId("admin-tab-users")).toBeInTheDocument();

    // Click Documentation Tab
    fireEvent.click(screen.getByTestId("admin-tab-documentation"));
    expect(await screen.findByTestId("admin-documentation-panel")).toBeInTheDocument();
    expect(screen.getByTestId("admin-doc-heading")).toHaveTextContent(
      "Documentation Spaces Oversight"
    );
  });

  // ---------------------------------------------------------------------------
  // 2. Table renders rows with counts
  // ---------------------------------------------------------------------------
  test("table renders all spaces with projects, owners, metrics, and links", async () => {
    renderWithAuth(<AdminDocumentationPanel />, adminUser);

    expect(await screen.findByTestId("admin-spaces-table")).toBeInTheDocument();

    // Check Engineering Handbook row
    const row = await screen.findByTestId("admin-space-row-65f29d20c571c48201a00001");
    expect(row).toBeInTheDocument();

    // Space title link
    const titleLink = screen.getByTestId("space-title-link-65f29d20c571c48201a00001");
    expect(titleLink).toHaveAttribute("href", "/doc/spaces/65f29d20c571c48201a00001");
    expect(titleLink).toHaveTextContent("Engineering Handbook");

    // Project title
    expect(row).toHaveTextContent("Airost Intranet");

    // Metrics
    expect(screen.getByTestId("active-docs-count-65f29d20c571c48201a00001")).toHaveTextContent("8");
    expect(screen.getByTestId("archived-docs-count-65f29d20c571c48201a00001")).toHaveTextContent("2");
  });

  // ---------------------------------------------------------------------------
  // 3. Pagination
  // ---------------------------------------------------------------------------
  test("pagination: navigates previous and next pages with server-side page count", async () => {
    const listSpy = jest.spyOn(docApi, "getAdminSpaces").mockImplementation(async ({ page }) => {
      return {
        spaces: [
          {
            _id: `space-${page}`,
            title: `Space on Page ${page}`,
            project: { _id: "p1", title: "Project 1" },
            owner: { _id: "u1", name: "User 1", email: "u1@airost.org" },
            accessType: "all",
            updateType: "all",
            documentCount: 5,
            archivedCount: 1,
            updatedAt: "2026-10-15T00:00:00.000Z",
          },
        ],
        page,
        limit: 25,
        total: 55, // 3 pages total
      };
    });

    renderWithAuth(<AdminDocumentationPanel />, adminUser);

    expect(await screen.findByTestId("pagination-info")).toHaveTextContent(
      "Showing 1 to 25 of 55 spaces"
    );
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();

    const prevBtn = screen.getByTestId("pagination-prev");
    const nextBtn = screen.getByTestId("pagination-next");

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    // Go to next page
    fireEvent.click(nextBtn);
    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
    });
    expect(await screen.findByTestId("pagination-info")).toHaveTextContent(
      "Showing 26 to 50 of 55 spaces"
    );
    expect(prevBtn).not.toBeDisabled();

    // Go to previous page
    fireEvent.click(prevBtn);
    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Search
  // ---------------------------------------------------------------------------
  test("search: debounces input, queries server with q, and clear button restores list", async () => {
    const listSpy = jest.spyOn(docApi, "getAdminSpaces");

    renderWithAuth(<AdminDocumentationPanel />, adminUser);
    expect(await screen.findByTestId("admin-spaces-table")).toBeInTheDocument();

    const searchInput = screen.getByTestId("admin-spaces-search-input");
    fireEvent.change(searchInput, { target: { value: "Solver" } });

    // Wait debounce
    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({ q: "Solver", page: 1 }));
    });

    // Clear search via clear button
    const clearBtn = screen.getByTestId("admin-spaces-search-clear");
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({ q: "", page: 1 }));
    });
    expect(searchInput).toHaveValue("");
  });

  // ---------------------------------------------------------------------------
  // 5. Reassign Owner Success & Errors
  // ---------------------------------------------------------------------------
  test("reassign owner: success flow reassigns owner, displays toast, and refreshes list", async () => {
    const reassignSpy = jest.spyOn(docApi, "reassignSpaceOwner").mockResolvedValue({
      space: { _id: "65f29d20c571c48201a00001", createdBy: "65f29d20c571c48201a33331" },
    });
    const listSpy = jest.spyOn(docApi, "getAdminSpaces");

    renderWithAuth(<AdminDocumentationPanel />, adminUser);
    expect(await screen.findByTestId("admin-space-row-65f29d20c571c48201a00001")).toBeInTheDocument();

    // Open action menu
    fireEvent.click(screen.getByTestId("space-actions-trigger-65f29d20c571c48201a00001"));
    const reassignBtn = screen.getByTestId("reassign-owner-btn-65f29d20c571c48201a00001");
    fireEvent.click(reassignBtn);

    // Modal open
    expect(await screen.findByTestId("reassign-owner-modal")).toBeInTheDocument();
    expect(screen.getByTestId("reassign-modal-title")).toHaveTextContent("Reassign Space Owner");

    // Select Jess (user ID: 65f29d20c571c48201a33331)
    const jessOption = await screen.findByTestId("member-option-65f29d20c571c48201a33331");
    fireEvent.click(jessOption);

    // Confirm button enabled
    const confirmBtn = screen.getByTestId("reassign-confirm-btn");
    expect(confirmBtn).not.toBeDisabled();
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(reassignSpy).toHaveBeenCalledWith("65f29d20c571c48201a00001", "65f29d20c571c48201a33331");
    });

    // Toast and modal closed
    expect(await screen.findByTestId("admin-doc-toast")).toHaveTextContent(
      "Space owner reassigned successfully"
    );
    expect(screen.queryByTestId("reassign-owner-modal")).not.toBeInTheDocument();
  });

  test("reassign owner: handles 400, 404, and 500 error responses inline", async () => {
    renderWithAuth(<AdminDocumentationPanel />, adminUser);
    expect(await screen.findByTestId("admin-space-row-65f29d20c571c48201a00001")).toBeInTheDocument();

    // Open modal
    fireEvent.click(screen.getByTestId("space-actions-trigger-65f29d20c571c48201a00001"));
    fireEvent.click(screen.getByTestId("reassign-owner-btn-65f29d20c571c48201a00001"));
    expect(await screen.findByTestId("reassign-owner-modal")).toBeInTheDocument();

    const jessOption = await screen.findByTestId("member-option-65f29d20c571c48201a33331");
    fireEvent.click(jessOption);

    // 1. 400 Validation Error
    const err400 = new Error("User is inactive");
    err400.response = { data: { error: { code: "VALIDATION_ERROR", message: "Selected user is inactive" } } };
    jest.spyOn(docApi, "reassignSpaceOwner").mockRejectedValueOnce(err400);

    fireEvent.click(screen.getByTestId("reassign-confirm-btn"));
    expect(await screen.findByTestId("reassign-error-message")).toHaveTextContent(
      "Selected user is inactive"
    );

    // 2. 404 Not Found Error
    const err404 = new Error("Space not found");
    err404.response = { data: { error: { code: "NOT_FOUND", message: "Documentation space not found" } } };
    jest.spyOn(docApi, "reassignSpaceOwner").mockRejectedValueOnce(err404);

    fireEvent.click(screen.getByTestId("reassign-confirm-btn"));
    expect(await screen.findByTestId("reassign-error-message")).toHaveTextContent(
      "Documentation space not found"
    );

    // 3. 500 Internal Error
    const err500 = new Error("Server error");
    err500.response = { data: { error: { code: "INTERNAL_ERROR", message: "Internal server error" } } };
    jest.spyOn(docApi, "reassignSpaceOwner").mockRejectedValueOnce(err500);

    fireEvent.click(screen.getByTestId("reassign-confirm-btn"));
    expect(await screen.findByTestId("reassign-error-message")).toHaveTextContent(
      "Internal server error"
    );

    // Cancel closes modal
    fireEvent.click(screen.getByTestId("reassign-cancel-btn"));
    await waitFor(() => {
      expect(screen.queryByTestId("reassign-owner-modal")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Delete Space with Typed Confirmation
  // ---------------------------------------------------------------------------
  test("delete space: requires exact typed title to confirm and calls deleteSpace API", async () => {
    const deleteSpy = jest.spyOn(docApi, "deleteSpace").mockResolvedValue({
      deletedSpaceId: "65f29d20c571c48201a00001",
    });

    renderWithAuth(<AdminDocumentationPanel />, adminUser);
    expect(await screen.findByTestId("admin-space-row-65f29d20c571c48201a00001")).toBeInTheDocument();

    // Trigger delete action
    fireEvent.click(screen.getByTestId("space-actions-trigger-65f29d20c571c48201a00001"));
    fireEvent.click(screen.getByTestId("delete-space-btn-65f29d20c571c48201a00001"));

    // Modal opens
    const modal = await screen.findByTestId("admin-delete-space-modal");
    expect(modal).toBeInTheDocument();
    expect(screen.getByTestId("delete-modal-title")).toHaveTextContent("Delete Engineering Handbook?");

    const confirmBtn = screen.getByTestId("delete-modal-confirm-btn");
    expect(confirmBtn).toBeDisabled();

    // Partial text
    const input = screen.getByTestId("delete-confirm-input");
    fireEvent.change(input, { target: { value: "Engineering" } });
    expect(confirmBtn).toBeDisabled();

    // Exact title
    fireEvent.change(input, { target: { value: "Engineering Handbook" } });
    expect(confirmBtn).not.toBeDisabled();

    // Confirm delete
    fireEvent.click(confirmBtn);
    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith("65f29d20c571c48201a00001");
    });

    expect(await screen.findByTestId("admin-doc-toast")).toHaveTextContent(
      "permanently deleted"
    );
  });

  // ---------------------------------------------------------------------------
  // 7. Empty and Error States with Retry
  // ---------------------------------------------------------------------------
  test("empty states: renders 'No documentation spaces yet' or 'No spaces match your search'", async () => {
    // 1. No spaces total
    jest.spyOn(docApi, "getAdminSpaces").mockResolvedValueOnce({
      spaces: [],
      page: 1,
      limit: 25,
      total: 0,
    });

    const { unmount } = renderWithAuth(<AdminDocumentationPanel />, adminUser);
    expect(await screen.findByTestId("empty-spaces-state")).toHaveTextContent(
      "No documentation spaces yet"
    );
    unmount();

    // 2. Search returns 0 matches
    jest.spyOn(docApi, "getAdminSpaces").mockResolvedValueOnce({
      spaces: [],
      page: 1,
      limit: 25,
      total: 0,
    });

    renderWithAuth(<AdminDocumentationPanel />, adminUser);
    const searchInput = await screen.findByTestId("admin-spaces-search-input");
    fireEvent.change(searchInput, { target: { value: "NonExistent" } });

    expect(await screen.findByTestId("no-search-results")).toHaveTextContent(
      "No spaces match your search"
    );
    expect(screen.getByTestId("admin-clear-search-btn")).toBeInTheDocument();
  });

  test("error state with retry: displays error alert and recovers upon retry", async () => {
    let failOnce = true;
    jest.spyOn(docApi, "getAdminSpaces").mockImplementation(async () => {
      if (failOnce) {
        failOnce = false;
        throw new Error("Network error connecting to documentation admin service");
      }
      return {
        spaces: [
          {
            _id: "space-recovered",
            title: "Recovered Space",
            accessType: "all",
            updateType: "all",
            documentCount: 1,
            archivedCount: 0,
            updatedAt: "2026-10-16T00:00:00.000Z",
          },
        ],
        page: 1,
        limit: 25,
        total: 1,
      };
    });

    renderWithAuth(<AdminDocumentationPanel />, adminUser);

    expect(await screen.findByTestId("spaces-fetch-error")).toHaveTextContent(
      "Network error connecting to documentation admin service"
    );

    // Click Retry
    const retryBtn = screen.getByTestId("retry-fetch-btn");
    fireEvent.click(retryBtn);

    // Recovers
    expect(await screen.findByText("Recovered Space")).toBeInTheDocument();
    expect(screen.queryByTestId("spaces-fetch-error")).not.toBeInTheDocument();
  });
});
