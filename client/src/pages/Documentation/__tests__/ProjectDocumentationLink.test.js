import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

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

import ProjectDocumentationLink from "../components/ProjectDocumentationLink";
import ProjectDetails from "../../Projects/ProjectDetails";
import Documentation from "../Documentation";
import { AuthContext } from "../../../context/authContext";
import * as docApi from "../documentationApi";

const renderWithAuth = (ui, user = null, initialEntries = ["/"]) => {
  return render(
    <AuthContext.Provider value={{ user, loading: false }}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </AuthContext.Provider>
  );
};

describe("ProjectDocumentationLink Component States", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    docApi.resetMockData();
  });

  test("1. Loading state: renders small skeleton with proper footprint", async () => {
    jest.spyOn(docApi, "listSpaces").mockImplementation(
      () => new Promise(() => {}) // pending promise
    );

    renderWithAuth(
      <ProjectDocumentationLink projectId="65f29d20c571c48201a11111" />
    );

    const skeleton = screen.getByTestId("project-doc-loading");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute("aria-busy", "true");
  });

  test("2. One space: renders button/link with Documentation and document count", async () => {
    jest.spyOn(docApi, "listSpaces").mockResolvedValue([
      {
        _id: "space-alpha",
        title: "Alpha Handbook",
        documentCount: 7,
        activeDocumentCount: 7,
      },
    ]);

    renderWithAuth(
      <ProjectDocumentationLink projectId="65f29d20c571c48201a11111" />
    );

    const link = await screen.findByTestId("project-doc-link-single");
    expect(link).toBeInTheDocument();
    expect(link).toHaveTextContent("Documentation");
    expect(link).toHaveAttribute("href", "/doc/spaces/space-alpha");

    const badge = screen.getByTestId("doc-count-badge");
    expect(badge).toHaveTextContent("7");
  });

  test("3. Several spaces: renders compact menu with titles and counts", async () => {
    jest.spyOn(docApi, "listSpaces").mockResolvedValue([
      {
        _id: "space-1",
        title: "Design System",
        documentCount: 4,
        activeDocumentCount: 4,
      },
      {
        _id: "space-2",
        title: "Backend API Specs",
        documentCount: 12,
        activeDocumentCount: 12,
      },
    ]);

    renderWithAuth(
      <ProjectDocumentationLink projectId="65f29d20c571c48201a11111" />
    );

    const menuBtn = await screen.findByTestId("project-doc-menu-btn");
    expect(menuBtn).toBeInTheDocument();
    expect(menuBtn).toHaveTextContent("Documentation");

    const spacesBadge = screen.getByTestId("spaces-count-badge");
    expect(spacesBadge).toHaveTextContent("2");

    // Menu should be closed initially
    expect(screen.queryByTestId("project-doc-menu")).not.toBeInTheDocument();

    // Click to open menu
    fireEvent.click(menuBtn);
    expect(screen.getByTestId("project-doc-menu")).toBeInTheDocument();

    expect(screen.getByText("Design System")).toBeInTheDocument();
    expect(screen.getByText("4 docs")).toBeInTheDocument();
    expect(screen.getByText("Backend API Specs")).toBeInTheDocument();
    expect(screen.getByText("12 docs")).toBeInTheDocument();

    // Escape closes the menu
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("project-doc-menu")).not.toBeInTheDocument();
  });

  test("4. None + can create: renders link to create route with ?projectId=", async () => {
    jest.spyOn(docApi, "listSpaces").mockResolvedValue([]);

    const adminUser = {
      _id: "u-admin",
      name: "Admin User",
      position: ["admin"],
    };

    renderWithAuth(
      <ProjectDocumentationLink projectId="65f29d20c571c48201a11111" />,
      adminUser
    );

    const createLink = await screen.findByTestId("create-project-doc-link");
    expect(createLink).toBeInTheDocument();
    expect(createLink).toHaveTextContent("Create documentation space");
    expect(createLink).toHaveAttribute(
      "href",
      "/doc/spaces/new?projectId=65f29d20c571c48201a11111"
    );
  });

  test("4b. None + project lead can create: recognizes lead by name/project", async () => {
    jest.spyOn(docApi, "listSpaces").mockResolvedValue([]);

    const leadUser = {
      _id: "u-lead",
      name: "Jess",
      position: ["member"],
    };

    renderWithAuth(
      <ProjectDocumentationLink
        projectId="65f29d20c571c48201a11111"
        project={{ lead: "Jess" }}
      />,
      leadUser
    );

    const createLink = await screen.findByTestId("create-project-doc-link");
    expect(createLink).toBeInTheDocument();
    expect(createLink).toHaveTextContent("Create documentation space");
  });

  test("5. None + cannot create: renders quieter muted 'No documentation yet'", async () => {
    jest.spyOn(docApi, "listSpaces").mockResolvedValue([]);

    const memberUser = {
      _id: "u-member",
      name: "Normal Member",
      position: ["member"],
    };

    renderWithAuth(
      <ProjectDocumentationLink
        projectId="65f29d20c571c48201a11111"
        project={{ lead: "Jess" }}
      />,
      memberUser
    );

    const mutedLine = await screen.findByTestId("project-doc-none");
    expect(mutedLine).toBeInTheDocument();
    expect(mutedLine).toHaveTextContent("No documentation yet");
    expect(screen.queryByTestId("create-project-doc-link")).not.toBeInTheDocument();
  });

  test("6. Error state: renders inline error message with Retry button and recovers", async () => {
    const listSpy = jest
      .spyOn(docApi, "listSpaces")
      .mockRejectedValueOnce(new Error("Network timeout"))
      .mockResolvedValueOnce([
        {
          _id: "space-recovered",
          title: "Recovered Space",
          documentCount: 2,
        },
      ]);

    renderWithAuth(
      <ProjectDocumentationLink projectId="65f29d20c571c48201a11111" />
    );

    const errorSpan = await screen.findByTestId("project-doc-error");
    expect(errorSpan).toBeInTheDocument();
    expect(errorSpan).toHaveTextContent("Failed to load documentation");

    const retryBtn = screen.getByTestId("project-doc-retry-btn");
    expect(retryBtn).toBeInTheDocument();

    // Click retry
    fireEvent.click(retryBtn);

    // Recovers and displays the single space link
    const recoveredLink = await screen.findByTestId("project-doc-link-single");
    expect(recoveredLink).toBeInTheDocument();
    expect(recoveredLink).toHaveTextContent("Documentation");
    expect(screen.queryByTestId("project-doc-error")).not.toBeInTheDocument();
    expect(listSpy).toHaveBeenCalledTimes(2);
  });
});

describe("Create Space Form Project Preselection (?projectId=)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    docApi.resetMockData();
  });

  test("preselects allowed project from ?projectId= in linkable list", async () => {
    renderWithAuth(
      <Routes>
        <Route path="/doc/*" element={<Documentation />} />
      </Routes>,
      null,
      ["/doc/spaces/new?projectId=65f29d20c571c48201a11111"]
    );

    const projectSelect = await screen.findByTestId("space-project-select");
    expect(projectSelect).toBeInTheDocument();
    expect(projectSelect.value).toBe("65f29d20c571c48201a11111");

    // Dynamic subtitle and project_members access option for project-linked spaces should be visible
    expect(
      screen.getByTestId("space-form-subtitle")
    ).toHaveTextContent("Organize external document links and choose who can access and update them.");
    expect(
      screen.getByTestId("access-radio-project-members")
    ).toBeInTheDocument();
  });

  test("ignores disallowed/invalid project from ?projectId= not in linkable list", async () => {
    renderWithAuth(
      <Routes>
        <Route path="/doc/*" element={<Documentation />} />
      </Routes>,
      null,
      ["/doc/spaces/new?projectId=non_existent_unlinked_project_id"]
    );

    const projectSelect = await screen.findByTestId("space-project-select");
    expect(projectSelect).toBeInTheDocument();
    // Should default to Standalone ("")
    expect(projectSelect.value).toBe("");

    // Dynamic subtitle for standalone spaces should be visible
    expect(
      screen.getByTestId("space-form-subtitle")
    ).toHaveTextContent("A standalone space brings shared knowledge together without linking to a project.");
    // Project members option is not rendered for standalone spaces
    expect(
      screen.queryByTestId("access-radio-project-members")
    ).not.toBeInTheDocument();
  });
});

describe("ProjectDetails Integration", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    docApi.resetMockData();
  });

  test("renders ProjectDocumentationLink and no longer contains hardcoded Google Slides URL", async () => {
    const adminUser = {
      _id: "u-admin",
      name: "Admin User",
      position: ["admin"],
    };

    renderWithAuth(
      <Routes>
        <Route path="/projects/:id" element={<ProjectDetails />} />
      </Routes>,
      adminUser,
      ["/projects/1"]
    );

    // Title and content still render properly
    expect(screen.getByText("Airost Intranet")).toBeInTheDocument();
    expect(screen.getByText("Problem Statement")).toBeInTheDocument();
    expect(screen.getByText("Resources")).toBeInTheDocument();

    // Verify dynamic documentation link is present
    expect(
      await screen.findByTestId("project-doc-link-single")
    ).toBeInTheDocument();

    // Verify the hardcoded URL is completely gone from the document
    expect(
      screen.queryByText(/docs\.google\.com\/presentation/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/1WfgjvnfRSWaVgm8x5XaVtvL-xEgQaSZOiLbw7OlUGM4/i)
    ).not.toBeInTheDocument();
  });
});
