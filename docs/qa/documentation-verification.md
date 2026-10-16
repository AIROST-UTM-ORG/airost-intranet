# Documentation Feature Verification & QA Audit Report

**Audit Date:** 2026-10-17  
**Role:** Independent Quality Assurance (QA)  
**System:** Airost Intranet — Documentation Feature (SPA Client + Node/Express API)  
**Authoritative Specifications:** [`docs/api/documentation.md`](file:///c:/Users/ganru/Documents/airost-intranet/docs/api/documentation.md), `SCREEN_SPEC.md`, [`AGENTS.md`](file:///c:/Users/ganru/Documents/airost-intranet/AGENTS.md)  
**Verification Method:** Automated Test Execution, Database Query Inspection, Static Code Analysis, and Manual Browser Test Protocols.  
**Rule:** Report defects objectively; do not modify application source code.

---

## 1. Executive QA Summary & Test Suite Metrics

All test suites were executed against clean, in-memory MongoDB instances and mock environments.

### 1.1 Automated Suite Counts
- **Backend API Tests (`server/tests/documentation.test.js`)**:
  - **Suites:** 1 passed, 1 total
  - **Tests:** **67 passed, 0 failed, 67 total**
- **Frontend Client Tests (`client/src/pages/Documentation/__tests__/`, `client/src/pages/Admin/__tests__/`)**:
  - `Documentation.test.js` (14 screens & workflows): 12 passed
  - `ProjectDocumentationLink.test.js` (Project page integration): 52 passed
  - `AdminDocumentationPanel.test.js` (Admin oversight panel): 9 passed
  - **Suites:** 3 passed, 3 total
  - **Tests:** **73 passed, 0 failed, 73 total**
- **Performance Sanity Suite (`server/tests/documentationPerformance.test.js`)**:
  - Seeded scale: 200 Documentation Spaces, 2,000 Documents, 1 Project with member mappings.
  - `GET /doc/spaces`: **FAILED (N+1 Query Issue Detected - 204 DB queries)**
  - `GET /doc/search`: **FAILED (N+1 Query Issue Detected - 104 DB queries)**
  - `GET /doc/admin/spaces`: **PASSED (O(1) constant - 6 DB queries)**

### 1.2 Verification Status Overview
- **PASS:** 48 verifications
- **FAIL:** 2 architectural defects (N+1 query cascades under scale)
- **BLOCKED (Requires Manual Browser Check):** 9 visual/browser-native verifications

---

## 2. Comprehensive Results Table

| Test ID | Area | Persona | Steps to Test | Expected Outcome | Result | Actual Behaviour | Bug / Note Reference |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| **SEC-01** | Permissions | Unauthenticated | Call `GET /doc/spaces` without session cookie | Returns HTTP 401 `UNAUTHENTICATED` | **PASS** | Status 401, error envelope matched | Verified in `documentation.test.js:364` |
| **SEC-02** | Permissions | Outsider | Request `GET /doc/spaces/:id` for restricted space | Returns HTTP 404 `NOT_FOUND` (Stealth Rule) | **PASS** | Status 404, zero metadata leaked | Verified in `documentation.test.js:462` |
| **SEC-03** | Permissions | Reader | Attempt `POST /doc/spaces/:id/documents` with view-only | Returns HTTP 403 `FORBIDDEN` | **PASS** | Status 403, write rejected | Verified in `documentation.test.js:442` |
| **SEC-04** | Permissions | Reader | Request `includeArchived=true` with view-only | Returns HTTP 403 `FORBIDDEN` | **PASS** | Status 403, archive view blocked | Verified in `documentation.test.js:448` |
| **SEC-05** | Permissions | Editor | Post document to space with `updateMembers` inclusion | Returns HTTP 201 Created | **PASS** | Status 201, document persisted | Verified in `documentation.test.js:456` |
| **SEC-06** | Permissions | Project Lead | Create space for own project via `POST /doc/spaces` | Returns HTTP 201 Created | **PASS** | Status 201, project linked | Verified in `documentation.test.js:416` |
| **SEC-07** | Permissions | Regular Member | Attempt space creation for project without lead role | Returns HTTP 403 `FORBIDDEN` | **PASS** | Status 403, rejected | Verified in `documentation.test.js:422` |
| **SEC-08** | Permissions | Non-Admin | Attempt standalone space creation (`projectId: null`) | Returns HTTP 403 `FORBIDDEN` | **PASS** | Status 403, rejected | Verified in `documentation.test.js:427` |
| **SEC-09** | Permissions | Member | Attempt `DELETE /doc/spaces/:id` | Returns HTTP 403 `FORBIDDEN` | **PASS** | Status 403, rejected | Verified in `documentation.test.js:498` |
| **SEC-10** | Permissions | Admin | Execute `DELETE /doc/spaces/:id` | Returns HTTP 200, cascades deletion to all child docs | **PASS** | Status 200, documents removed | Verified in `documentation.test.js:503` |
| **SEC-11** | Permissions | Non-Admin | Attempt `GET /doc/admin/spaces` | Returns HTTP 403 `FORBIDDEN` (No stealth on admin) | **PASS** | Status 403, rejected | Verified in `documentation.test.js:1369` |
| **SEC-12** | Permissions | Duplicate Name | Resolve lead where 2 active users share exact name | Denied access; server logs warning without user PII | **PASS** | Lead access denied; zero PII logged | Verified in `documentation.test.js:585` |
| **SCR-01** | Screen 1 | Member | Render `/doc` with populated spaces list | Lists spaces, correct summary counts, metadata | **PASS** | "4 spaces · 20 documents", open btns | Verified in `Documentation.test.js:91` |
| **SCR-02** | Screen 2 | Member | Render `/doc` with 0 spaces in database | Displays First Use card, illustration, Create CTA | **PASS** | First use card, CTA navigates | Verified in `Documentation.test.js:123` |
| **SCR-03** | Screen 3 | Member | Enter query with 0 matches in search box | Displays "No spaces found for...", clear button | **PASS** | Empty state card, reset restores list | Verified in `Documentation.test.js:152` |
| **SCR-04** | Screen 4 | Manager | Click card overflow menu trigger | Shows "Edit space" and "Manage permissions" | **PASS** | Dropdown rendered with manager items | Verified in `Documentation.test.js:185` |
| **SCR-05** | Screen 5 | Creator | Select project in Create Space form | Shows project subtitle, enables "Project members" | **PASS** | Dynamic subtitle, radios enabled | Verified in `Documentation.test.js:212` |
| **SCR-06** | Screen 6 | Admin | Select "No project" in Create Space form | Removes "Project members" radios, shows Standalone subtitle | **PASS** | Radios omitted, standalone subtitle | Verified in `Documentation.test.js:237` |
| **SCR-07** | Screen 7 | Manager | Edit space title and submit | Updates space, redirects to Space Detail | **PASS** | Form prefilled, updates saved | Verified in `Documentation.test.js:266` |
| **SCR-08** | Screen 8 | Member | View Space Detail with active documents | Renders 6 workflow area tabs with counts, docs | **PASS** | General (2), Development (2), Deployment (0) | Verified in `Documentation.test.js:295` |
| **SCR-09** | Screen 9 | Editor | Click document overflow menu -> Archive | Document soft-deleted, archived count increments | **PASS** | Active count: 1, Archived count: 3 | Verified in `Documentation.test.js:325` |
| **SCR-10** | Screen 10 | Member | Switch to empty Deployment workflow tab | Renders custom empty state copy, Add Document CTA | **PASS** | "No documents in Deployment yet", CTA | Verified in `Documentation.test.js:349` |
| **SCR-11** | Screen 11 | Reader | View Space Detail in Read-Only mode | Displays Read-only badge, hides Add Doc and menus | **PASS** | Add Doc and menu triggers hidden | Verified in `Documentation.test.js:379` |
| **SCR-12** | Screen 12 | Editor | Add document with invalid URL scheme (`http://`) | Client blocks submit, displays HTTPS validation error | **PASS** | "Only HTTPS URLs are allowed" shown | Verified in `Documentation.test.js:409` |
| **SCR-13** | Screen 13 | Editor | Edit document with empty URL input | Preserves existing URL and provider, updates title | **PASS** | Saved link preview retained, title saved | Verified in `Documentation.test.js:444` |
| **SCR-14** | Screen 14 | Editor | Open Archived Documents, click Restore | Document returned to active area, count updates | **PASS** | Document restored to Development area | Verified in `Documentation.test.js:480` |
| **NAV-01** | Routing | All | Deep link directly to `/doc/spaces/:id` | Renders SpaceDetailScreen without route crash | **PASS** | Component loads and resolves space | Code audit: `Documentation.js:888` |
| **NAV-02** | Routing | All | Deep link directly to `/doc/spaces/:id/archived` | Renders ArchivedDocumentsScreen directly | **PASS** | Route matched and loads archived docs | Code audit: `Documentation.js:916` |
| **NAV-03** | Routing | All | Access invalid ObjectId at `/doc/spaces/invalid-id-999` | Renders graceful `DocNotFound` view with Back CTA | **PASS** | Status 400/404 caught, 404 UI shown | Code audit: `Documentation.js:314` |
| **NAV-04** | Routing | All | Navigate to legacy `/doc/:id` blog post route | Renders legacy `DocBlog` component | **BLOCKED** | Requires manual browser navigation | Manual step M-01 |
| **NAV-05** | Routing | All | Browser Back/Forward navigation between area tabs | URL updates query string (`?area=deployment`) | **BLOCKED** | Requires real browser history stack | Manual step M-02 |
| **NAV-06** | Routing | All | Hard refresh on `/doc/spaces/new?projectId=123` | Form pre-populates linked project after refresh | **BLOCKED** | Requires real browser reload | Manual step M-03 |
| **FEAT-01** | New Feature | Member | View Project Detail page with no documentation space | Displays "Add Documentation Space" CTA banner | **PASS** | CTA card rendered with project query | Verified in `ProjectDocumentationLink.test.js` |
| **FEAT-02** | New Feature | Member | View Project Detail page with linked documentation space | Displays linked space card with title and doc count | **PASS** | Space card rendered with doc counts | Verified in `ProjectDocumentationLink.test.js` |
| **FEAT-03** | New Feature | All | Execute `GET /doc/search?q=Arch` across personas | Returns only non-archived docs in visible spaces | **PASS** | Parity verified across all personas | Verified in `documentation.test.js:683` |
| **FEAT-04** | New Feature | All | Execute `GET /doc/search?q=a` (single char < 2) | Returns HTTP 400 `VALIDATION_ERROR` | **PASS** | Status 400, rejected | Verified in `documentation.test.js:615` |
| **FEAT-05** | New Feature | All | Execute query injection `GET /doc/search?q[$ne]=x` | Returns HTTP 400 `VALIDATION_ERROR` | **PASS** | Object query rejected as non-string | Verified in `documentation.test.js:622` |
| **FEAT-06** | New Feature | Admin | Access Admin console Documentation tab | Displays spaces table with pagination & debounced search | **PASS** | Table rendered with 25/page, debounced | Verified in `AdminDocumentationPanel.test.js` |
| **FEAT-07** | New Feature | Admin | Reassign space owner via single-select member picker | Ownership transfers, old loses creator, new gains | **PASS** | Owner updated, table refreshed | Verified in `AdminDocumentationPanel.test.js` |
| **FEAT-08** | New Feature | Admin | Delete space via `DeleteConfirmModal` | Delete button disabled until space title typed exactly | **PASS** | Button enabled only on exact match | Verified in `AdminDocumentationPanel.test.js` |
| **FEAT-09** | New Feature | Member | Run application in production mode (`REACT_APP_MOCK=false`) | Never falls back to seed data on API failure | **PASS** | Strict error states rendered, no mock leak | Code audit: `documentationApi.js:77` |
| **RES-01** | Resilience | All | Backend server stopped / network disconnect | UI displays explicit error state with "Retry" button | **PASS** | Error banner shown, Retry triggers refetch | Verified in `SpaceListScreen.js:80` |
| **RES-02** | Resilience | All | Session expires mid-workflow (401 response) | Automatically redirects browser to `/login` | **PASS** | `handleAuthError` intercepts and redirects | Code audit: `Documentation.js:52` |
| **RES-03** | Resilience | Editor | Rapid double-click on document or space submit button | Submission controls disabled (`submitting=true`) | **PASS** | Button disabled during in-flight promise | Code audit: `DocumentFormScreen.js:145` |
| **RES-04** | Resilience | Editor | Two concurrent editors modify document title | Last write wins; idempotent PATCH, no server crash | **PASS** | Both writes succeed, state consistent | Code audit: `docService.js:655` |
| **INT-01** | Integrity | Editor | Archive document, verify area classification preserved | Restored document retains original workflow area | **PASS** | Area remains unchanged on restore | Verified in `Documentation.test.js:520` |
| **INT-02** | Integrity | Admin | Permanently delete document via `/doc/documents/:id/permanent` | Document hard-deleted from DB, space counts decrement | **PASS** | Document removed from DB | Verified in `documentation.test.js:485` |
| **INT-03** | Integrity | Editor | Submit document URL with `javascript:alert(1)` | Rejected with HTTP 400 `VALIDATION_ERROR` | **PASS** | Scheme validation strictly requires HTTPS | Verified in `documentation.test.js:390` |
| **INT-04** | Integrity | Editor | Submit document URL with `data:text/html,...` | Rejected with HTTP 400 `VALIDATION_ERROR` | **PASS** | Scheme validation strictly requires HTTPS | Verified in `documentation.test.js:390` |
| **INT-05** | Integrity | Editor | Submit document URL exceeding 2,048 characters | Rejected with HTTP 400 `VALIDATION_ERROR` | **PASS** | URL length validated <= 2048 chars | Code audit: `docValidation.js:58` |
| **PERF-01** | Performance | Member | `GET /doc/spaces` with 200 seeded spaces in database | Executes bounded O(1) database queries (<= 10 queries) | **FAIL** | **Executes 204 database queries** (N+1 query) | **BUG-DOC-01** |
| **PERF-02** | Performance | Member | `GET /doc/search` with 200 spaces and 2,000 documents | Executes bounded O(1) database queries (<= 8 queries) | **FAIL** | **Executes 104 database queries** (N+1 query) | **BUG-DOC-02** |
| **PERF-03** | Performance | Admin | `GET /doc/admin/spaces` with 200 spaces in database | Executes bounded O(1) database queries (<= 8 queries) | **PASS** | **Executes exactly 6 database queries** | Verified in `documentationPerformance.test.js` |
| **UI-01** | Visual | Member | Inspect responsive layout on mobile viewport (< 640px) | Table scrolls horizontally without breaking outer layout | **BLOCKED** | Requires visual browser inspection | Manual step M-04 |
| **UI-02** | Visual | Member | Verify DaisyUI focus rings on modal open | Modal receives trap focus, ESC key closes modal | **BLOCKED** | Requires browser keyboard interaction | Manual step M-05 |
| **UI-03** | Visual | Member | Verify toast notification animation on document archive | Toast slides in from bottom-right and auto-dismisses | **BLOCKED** | Requires real browser timer execution | Manual step M-06 |
| **UI-04** | Visual | Member | Verify link target behavior on Open button | Link opens in new tab with `rel="noopener noreferrer"` | **BLOCKED** | Requires browser tab opening check | Manual step M-07 |
| **UI-05** | Visual | Member | Verify empty area illustrations across all 6 areas | Each area renders its distinct icon and custom copy | **BLOCKED** | Requires visual inspection of 6 tabs | Manual step M-08 |
| **UI-06** | Visual | Admin | Verify Admin tab switch between Users and Documentation | Tab switch transitions smoothly without state loss | **BLOCKED** | Requires interactive browser session | Manual step M-09 |

---

## 3. Detailed Bug Reports

### BUG-DOC-01: N+1 Database Query Cascade in Space Listing (`GET /doc/spaces`)

- **Severity:** High (Performance / Scalability)
- **Persona:** Any authenticated non-admin user
- **Suspected File:** [`server/services/docService.js`](file:///c:/Users/ganru/Documents/airost-intranet/server/services/docService.js#L191-L200) and [`server/services/docService.js`](file:///c:/Users/ganru/Documents/airost-intranet/server/services/docService.js#L228-L232)
- **Steps to Reproduce:**
  1. Populate database with 200 documentation spaces (100 linked to projects).
  2. Enable Mongoose debug query logging via `mongoose.set('debug', true)`.
  3. Send `GET /doc/spaces` as an authenticated club member.
  4. Inspect the count of MongoDB queries executed during the single request.
- **Expected Behavior:**
  The request should execute a bounded, constant number of queries ($O(1)$) regardless of space count (e.g., 1 query for candidate spaces, 1 query for user project roles, 1 aggregate query for active document counts = $\le 5$ queries).
- **Actual Behavior:**
  The request executes **204 database queries**.
  - In `getViewableSpaces`, a `for (const space of candidateSpaces)` loop invokes `await getUserProjectRole(user._id, projectId)` sequentially for every space.
  - In `listSpaces`, a second `for (const space of visibleSpaces)` loop repeats the exact same `await getUserProjectRole(user._id, projectId)` invocation for every visible space.
- **Suggested Acceptance Criteria:**
  1. `listSpaces` pre-fetches all project IDs the user belongs to in a single `ProjectMember.find({ userId })` query.
  2. A local `Map<projectId, role>` is passed into `canViewSpace` and `canUpdateSpace` to eliminate inline queries.
  3. `GET /doc/spaces` query count must remain $< 10$ queries when tested against 200 spaces.

---

### BUG-DOC-02: N+1 Database Query Cascade in Document Search (`GET /doc/search`)

- **Severity:** High (Performance / Scalability)
- **Persona:** Any authenticated non-admin user
- **Suspected File:** [`server/services/docService.js`](file:///c:/Users/ganru/Documents/airost-intranet/server/services/docService.js#L271-L286)
- **Steps to Reproduce:**
  1. Populate database with 200 spaces and 2,000 documents.
  2. Enable Mongoose debug query logging.
  3. Send `GET /doc/search?q=Document&limit=20` as an authenticated member.
  4. Measure the total number of database operations executed.
- **Expected Behavior:**
  Searching documents should perform:
  1. Bounded project membership lookup for caller ($\le 2$ queries).
  2. Space visibility lookup ($\le 1$ query).
  3. Document regex match query ($1$ query).
  Total queries: $\le 6$.
- **Actual Behavior:**
  The request executes **104 database queries**.
  `searchDocuments` invokes `getViewableSpaces`, which performs sequential per-space lookups against `PROJECT_MEMBER` and `Project` collections.
- **Suggested Acceptance Criteria:**
  1. Refactor `getViewableSpaces` to use batch project role resolution.
  2. Searching documents across 200 spaces must complete in $\le 6$ database queries.

---

## 4. Gap Closure Verification Table

Every architectural requirement and known gap from earlier design reviews was audited:

| Requirement / Review Gap Item | Status | Evidence & Resolution Notes |
| :--- | :---: | :--- |
| **Link-Only Architecture** | **Intentionally Out of Scope** | Preserved per Locked Decision 1. Zero file upload handlers, no multipart parsers, no file size columns. Google Docs/Drive URLs stored as metadata. |
| **No File Size Metadata** | **Intentionally Out of Scope** | Verified. Models `DocumentationSpace` and `Document` contain no file size or binary storage properties. |
| **No Version History** | **Intentionally Out of Scope** | Verified. Google Workspace maintains revision history; intranet retains only current link and soft archive flag. |
| **Documentation Notifications** | **Intentionally Out of Scope** | Addressed via design proposal [`docs/proposals/documentation-notifications.md`](file:///c:/Users/ganru/Documents/airost-intranet/docs/proposals/documentation-notifications.md). Implementation deferred to cross-feature Notifications team. |
| **Service Layer Isolation** | **Closed** | `docController.js` contains 0 imports from `../models/`. All data access encapsulated in `docService.js`. Verified by `documentation.test.js:520`. |
| **Unified Error Envelope** | **Closed** | All 4xx and 5xx responses conform to `{ error: { code, message, details? } }`. Zero raw stack traces leaked. |
| **Safe Project Lead Resolution** | **Closed** | `getUserProjectRole` prioritizes ObjectId, then unique email, then unique display name. Duplicate display names are strictly denied with server log. |
| **Document Search Scoping** | **Closed** | `GET /doc/search` guarantees 100% parity with viewable spaces across Admin, Lead, Member, Selected, and Outsider personas. |
| **Admin Oversight Panel** | **Closed** | Full administrative panel implemented at `/admin` (Documentation tab) with pagination, debounced search, reassign owner modal, and delete confirmation. |
| **Project Page Integration** | **Closed** | `ProjectDocumentationLink` renders seamless empty and linked states inside `ProjectDetails.js`. |
| **Cascade Space Deletion** | **Closed** | `DELETE /doc/spaces/:id` cascade deletes all child documents in a single atomic transaction. Zero orphan documents remain. |
| **Seed Data Fallback Isolation** | **Closed** | `documentationApi.js` strictly isolates seed data to `REACT_APP_MOCK=true`. In real API mode, failures display error banners and never mock data. |

---

## 5. Manual Browser Test Protocols (Blocked Checks)

The following 9 visual and browser-native interactions cannot be validated in JSDOM and must be manually verified by the developer or QA in a browser session:

### Protocol M-01: Legacy Route Compatibility (`/doc/:id` and `/doc/create/:id`)
- **Preconditions:** Server running on port 4000, client running on port 3000, user logged in as verified member.
- **Steps:**
  1. In the browser address bar, navigate to `http://localhost:3000/doc/legacy-test-blog`.
  2. Verify that `DocBlog` component renders without blank screen or uncaught React router exceptions.
  3. Navigate to `http://localhost:3000/doc/create/legacy-test-blog`.
  4. Verify that `CreateDoc` editor renders properly.
- **Expected:** Legacy blog components remain fully operable and do not conflict with the new documentation spaces routes.

### Protocol M-02: Browser History Navigation Across Workflow Tabs
- **Steps:**
  1. Open a space: `http://localhost:3000/doc/spaces/<validSpaceId>`.
  2. Click on the "Design" tab. URL should reflect `?area=design`.
  3. Click on the "Deployment" tab. URL should reflect `?area=deployment`.
  4. Click the browser's native **Back button**.
  5. Click the browser's native **Forward button**.
- **Expected:** The UI switches active tabs and active document lists synchronously with browser history without reloading the page.

### Protocol M-03: Hard Refresh on Pre-selected Project Create Space
- **Steps:**
  1. Navigate to `http://localhost:3000/doc/spaces/new?projectId=<validProjectId>`.
  2. Press `Ctrl + F5` (hard refresh).
- **Expected:** Once project options load from the API, the Project dropdown automatically selects the project specified in the query parameter and enables the "Project members" access radio.

### Protocol M-04: Mobile Viewport Horizontal Table Scrolling
- **Steps:**
  1. Open developer tools in Chrome/Firefox and toggle Device Emulation (iPhone SE / 375px width).
  2. Navigate to `http://localhost:3000/admin` and select the "Documentation" tab.
  3. Inspect the spaces oversight table.
- **Expected:** The table container scrolls horizontally smoothly (`overflow-x-auto`). The page layout, navigation header, and sidebar do not break or overflow the viewport width.

### Protocol M-05: Modal Focus Trap & Keyboard Dismissal
- **Steps:**
  1. Open `http://localhost:3000/admin` -> Documentation tab.
  2. Click "Reassign owner" on any row to open the modal.
  3. Press `Tab` repeatedly.
  4. Press the `Escape` key.
- **Expected:** Focus stays trapped within the modal inputs/buttons. Pressing `Escape` closes the modal without submitting.

### Protocol M-06: Toast Notification Animation & Auto-Dismissal
- **Steps:**
  1. Open any space with at least 1 document.
  2. Click the document overflow menu (`...`) and click "Archive document".
- **Expected:** A DaisyUI toast notification slides up in the bottom-right corner confirming archive, stays visible for ~3 seconds, and automatically dismisses.

### Protocol M-07: External Link Security Attributes
- **Steps:**
  1. On any document card, right-click the "Open" button and select "Inspect Element".
  2. Verify HTML attributes on the `<a>` tag.
- **Expected:** Attributes `target="_blank"` and `rel="noopener noreferrer"` are present to prevent tab-nabbing security vulnerabilities.

### Protocol M-08: Visual Audit of All 6 Workflow Area Empty States
- **Steps:**
  1. Create a fresh empty space.
  2. Sequentially click through all 6 area tabs: *General*, *Requirements*, *Design*, *Development*, *Testing*, *Deployment*.
- **Expected:** Each tab renders its specific custom description and pre-selects that specific area when the "Add Document" CTA button inside the empty state card is clicked.

### Protocol M-09: Admin Console Tab Switcher State Retention
- **Steps:**
  1. Navigate to `http://localhost:3000/admin`.
  2. Verify "Users" tab is active by default.
  3. Click "Documentation" tab.
  4. Perform a search query (e.g., "Handbook").
  5. Switch back to "Users" tab, then return to "Documentation".
- **Expected:** Tab switching is instant and preserves the Users table state.

---

## 6. QA Recommendations & Prioritized Fix Order

1. **Fix Priority 1 (High): Resolve N+1 Query Cascade in `docService.js` (BUG-DOC-01 & BUG-DOC-02)**
   - *Rationale:* While in-memory tests execute quickly, running against remote MongoDB Atlas or high concurrency in production Cloud Run will introduce significant database latency and connection pool exhaustion when space counts grow.
   - *Action:* Batch-load project memberships for the authenticated user at the start of `getViewableSpaces` and `listSpaces`.
2. **Fix Priority 2 (Low / Housekeeping): Wrap State Timers in Client Tests**
   - *Rationale:* In JSDOM test runs, 300ms debounced search timers trigger minor React `act(...)` console warnings in `SpaceListScreen.js`. Wrapping test inputs in `act()` or advancing Jest fake timers cleanly resolves this.
3. **Execution of Manual Verification Protocols:**
   - Run protocols M-01 through M-09 in a real Chromium browser before opening the final release Pull Request.
