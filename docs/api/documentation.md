# Documentation API Contract

## 1. Overview & Link-Only Principle

The Documentation module provides a centralized platform for Airost project teams and club members to organize, share, and discover external documentation links across structured documentation spaces.

### The Link-Only Principle
In accordance with **Locked Decision 4**, `DESIGN.md`, and `SCREEN_SPEC.md`, the documentation feature operates strictly on a **link-only** architecture:
- Documents store a title, an external URL (such as Google Docs, Google Drive, or other web services), and metadata.
- The system **never** stores raw document contents, uploaded files, or HTML/markdown body text in the database.
- File upload/download capabilities and rich-text editing (such as `react-quill`) are explicitly excluded.
- All documents open externally in a new browser tab with strict security flags (`target="_blank" rel="noopener noreferrer"`).
- Document access and editing permissions within the external document itself are managed entirely by the external provider (e.g., Google Workspace sharing settings), as communicated by the system info banner: *"Document access and editing permissions are managed by the linked service."*

### Locked Architecture Decisions
1. **Separate Collections**: `DOCUMENTATION_SPACE` and `DOCUMENT` are two distinct collections. `DOCUMENT.spaceId` references the parent space via `ObjectId`. Documents are **never** embedded as an array within the space document.
2. **Selected Member Lists**: Users selected for restricted space access or document updating are stored directly on the space as two arrays of `ObjectId` references to `User`: `accessMembers[]` and `updateMembers[]`.
3. **Soft vs. Hard Deletion**:
   - Deleting a document performs a **soft delete** (`archived = true`). Archived documents can be listed and restored by users with update access.
   - Permanent (hard) deletion of a document is restricted to **Platform Admins**.
   - Deleting a documentation space is restricted to **Platform Admins** and performs a **hard cascade delete** (permanently removing the space and all of its associated documents).
4. **Link-Only Storage**: As detailed above, the database holds titles, external URLs, and metadata only.
5. **Strict UI/UX Compliance**: All visual elements, layout structures, colors, typography, spacing, component behaviors, and exact copywriting must strictly follow `DESIGN.md` and `SCREEN_SPEC.md`.

---

## 2. Data Models (MongoDB / Mongoose)

Both models are implemented in MongoDB using Mongoose schemas. User identity is always derived from the authenticated session (`req.user._id`), never accepted from the client request body.

### 2.1 `DOCUMENTATION_SPACE` Collection

Represents a container of documentation links, either tied to a specific project or maintained as a standalone space.

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Primary Key, Auto-generated | Unique space identifier |
| `title` | `String` | Required, Trimmed, 1–120 chars | Name of the space (e.g., *"Engineering Handbook"*) |
| `description` | `String` | Required, Trimmed, 1–1000 chars | Purpose and scope of the space (Required per `SCREEN_SPEC.md`: *"Description \*"*) |
| `projectId` | `ObjectId` | Optional, Nullable, Ref `Project` | Linked project ID; `null` for standalone spaces |
| `createdBy` | `ObjectId` | Required, Ref `User` | User who created the space (from session `req.user._id`) |
| `accessType` | `String` | Required, Enum: `['all', 'project_members', 'selected']` | Who can view the space and its documents (UI: *"All"*, *"Project members"*, *"Selected members"*) |
| `updateType` | `String` | Required, Enum: `['all', 'project_members', 'selected']` | Who can add, edit, archive, and restore documents (UI: *"All"*, *"Project members"*, *"Selected members"*) |
| `accessMembers` | `ObjectId[]` | Required if `accessType === 'selected'`, Ref `User` | De-duplicated array of user IDs permitted to view the space |
| `updateMembers` | `ObjectId[]` | Required if `updateType === 'selected'`, Ref `User` | De-duplicated array of user IDs permitted to update documents |
| `createdAt` | `Date` | Auto timestamp | Creation timestamp |
| `updatedAt` | `Date` | Auto timestamp | Last modification timestamp |

#### Constraints & Validation for `DOCUMENTATION_SPACE`
- When `projectId` is `null` (Standalone space), the `'project_members'` option is **not allowed** for either `accessType` or `updateType` (Screen 6 displays only *"All"* and *"Selected members"*).
- `accessMembers` and `updateMembers` are only valid when their corresponding type is `'selected'`. When `accessType` or `updateType` is set to `'all'` or `'project_members'`, the respective array is automatically reset to `[]`.
- All user IDs in `accessMembers` and `updateMembers` must be valid `ObjectId`s corresponding to existing users, de-duplicated.
- Unknown payload fields are rejected.

---

### 2.2 `DOCUMENT` Collection

Represents an individual external link and its categorization metadata within a space.

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Primary Key, Auto-generated | Unique document identifier |
| `spaceId` | `ObjectId` | Required, Ref `DOCUMENTATION_SPACE` | Parent documentation space ID |
| `title` | `String` | Required, Trimmed, 1–120 chars | Title of the document link (e.g., *"Database Schema"*) |
| `url` | `String` | Required on create, Trimmed, Max 2048 chars | Valid external HTTPS URL |
| `provider` | `String` | Required, Enum: `['google_doc', 'google_drive', 'external_url']` | Derived by server from URL hostname (UI: *"Google Docs"*, *"Google Drive"*, *"External Link"*) |
| `area` | `String` | Required, Enum: `['general', 'requirements', 'design', 'development', 'testing', 'deployment']`, Default: `'general'` | Workflow classification category (UI: *"General"*, *"Requirements"*, *"Design"*, *"Development"*, *"Testing"*, *"Deployment"*) |
| `createdBy` | `ObjectId` | Required, Ref `User` | User who created the link (from session `req.user._id`) |
| `archived` | `Boolean` | Required, Default: `false` | Soft-deletion flag (`true` when archived, `false` when active) |
| `createdAt` | `Date` | Auto timestamp | Creation timestamp |
| `updatedAt` | `Date` | Auto timestamp | Last update timestamp |

#### Constraints & Validation for `DOCUMENT`
- `url` must parse with `new URL()` and use strictly the `https:` scheme. Reject `http:`, `javascript:`, `data:`, and any other protocols with `400 VALIDATION_ERROR`.
- `provider` is strictly server-derived from the URL hostname:
  - `docs.google.com` $\rightarrow$ `google_doc`
  - `drive.google.com` $\rightarrow$ `google_drive`
  - Any other valid HTTPS host $\rightarrow$ `external_url`
  Any `provider` passed in the request body by the client is ignored.
- On `PATCH /doc/documents/:documentId`, `url` is optional. Per Screen 13 (*"Leave empty to keep the current link"*), omitting `url` preserves the existing link and provider.
- `spaceId` and `createdBy` are immutable and cannot be modified after creation.
- Unknown payload fields are rejected.

---

## 3. Standard Error Format & Status Codes

Every error response returned by `/doc` endpoints conforms strictly to the unified error envelope. Server internals, stack traces, and database driver messages are **never** leaked.

### Unified Error Envelope
```json
{
  "error": {
    "code": "<CODE>",
    "message": "<Human-readable explanation>",
    "details": [
      {
        "field": "url",
        "message": "URL must use the https: scheme"
      }
    ]
  }
}
```

### HTTP Status & Error Code Table

| Status | Error Code | Trigger Condition |
| :--- | :--- | :--- |
| `400` | `VALIDATION_ERROR` | Schema validation failure (missing required field, invalid length, invalid enum value, non-https URL, unknown fields, or 'project_members' on standalone space). |
| `400` | `INVALID_ID` | Any route or payload identifier (e.g. `spaceId`, `documentId`, `projectId`, user ID) is not a valid 24-character hex MongoDB `ObjectId`. Evaluated before querying the database. |
| `401` | `UNAUTHENTICATED` | Request lacks an active authenticated session (`req.isAuthenticated()` is false). |
| `403` | `FORBIDDEN` | Caller is authenticated but lacks required permission to perform the requested operation (e.g., non-admin attempting hard delete, or view-only user attempting to create/edit/archive/restore documents or view archived documents). |
| `404` | `NOT_FOUND` | Target resource does not exist, **or** the caller lacks VIEW permission on the space (**View Stealth Rule**). |
| `500` | `INTERNAL_ERROR` | Unhandled server exception. A generic message is returned without technical details. |

Success HTTP status codes:
- `200 OK`: Successful read, update, archive, restore, or delete operations.
- `201 Created`: Successful creation of a space or document.

---

## 4. Permission Matrix

### 4.1 Roles & Identity Determination
- **Admin**: Platform admin role as determined in the codebase (user with `"admin"` in their position profile, verified via `isAdmin(req.user)`).
- **Space Creator**: The user whose `_id` matches `space.createdBy`. Space creators possess full *"Manager access"* on their space (Screens 4 & 7).
- **Project Member**: A user who belongs to the space's linked project (`space.projectId`) with a role of `lead`, `advisor`, or `member`.
- **Selected User**: A user whose `_id` is included in `space.accessMembers` (for VIEW) or `space.updateMembers` (for UPDATE).
- **Other Authenticated User**: Any signed-in user who does not match the above roles.

> [!IMPORTANT]
> **View Stealth Rule:** A user who cannot view a space receives `404 NOT_FOUND` (never `403 FORBIDDEN`). The server does not reveal the existence of restricted spaces to unauthorized users.
>
> **Implicit View Grant:** Anyone who possesses UPDATE permissions on a space automatically possesses VIEW permissions.
>
> **Read-Only State:** A user who possesses VIEW permission but lacks UPDATE permission sees the **Read-only UI** (Screen 10 in `SCREEN_SPEC.md`): the `"🔒 Read-only"` badge chip is displayed, while the `"+ Add Document"` button, the `"Archived Documents"` button, and document card `⋯` overflow menus are completely hidden.

---

### 4.2 VIEW Permission Matrix (Spaces & Non-Archived Documents)

Governs `GET /doc/spaces`, `GET /doc/spaces/:spaceId`, and `GET /doc/spaces/:spaceId/documents` (with active documents).

| `accessType` | Space Context / Condition | Admin | Space Creator | Project Member (`lead`/`advisor`/`member`) | Selected User (in `accessMembers`) | Other Authenticated User |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `'all'` | Project-linked or Standalone | **Allow** | **Allow** | **Allow** | **Allow** | **Allow** |
| `'project_members'` | Project-linked space | **Allow** | **Allow** | **Allow** | 404 *(unless in `updateMembers`)* | 404 |
| `'project_members'` | Standalone space *(Invalid config)* | **Allow** | **Allow** | 404 | 404 | 404 |
| `'selected'` | User in `accessMembers` | **Allow** | **Allow** | 404 *(unless in `accessMembers`)* | **Allow** | 404 |
| `'selected'` | User not in `accessMembers` | **Allow** | **Allow** | 404 *(unless in `updateMembers`)* | 404 | 404 |
| *Any* | User matches `updateType` or in `updateMembers` | **Allow** | **Allow** | **Allow** | **Allow** | 404 |

*Note: Any cell marked `404` returns `404 NOT_FOUND` on single-space lookups and excludes the space from `GET /doc/spaces` listings.*

---

### 4.3 UPDATE Permission Matrix (Add, Edit, Archive, Restore, View Archived)

Governs `POST /doc/spaces/:spaceId/documents`, `PATCH /doc/documents/:documentId`, `DELETE /doc/documents/:documentId`, and `GET /doc/spaces/:spaceId/documents?includeArchived=true`.

*Precondition: Caller must have VIEW rights on the space. If the caller lacks VIEW rights, the endpoint returns `404 NOT_FOUND` before reaching update evaluation.*

| `updateType` | Space Context / Condition | Admin | Space Creator | Project Member (`lead`/`advisor`/`member`) | Selected User (in `updateMembers`) | Other User (with View rights) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `'all'` | Project-linked or Standalone | **Allow** | **Allow** | **Allow** | **Allow** | **Allow** |
| `'project_members'` | Project-linked space | **Allow** | **Allow** | **Allow** | Deny (403) | Deny (403) |
| `'project_members'` | Standalone space *(Invalid config)* | **Allow** | **Allow** | Deny (403) | Deny (403) | Deny (403) |
| `'selected'` | User in `updateMembers` | **Allow** | **Allow** | Deny *(unless in `updateMembers`)* | **Allow** | Deny (403) |
| `'selected'` | User not in `updateMembers` | **Allow** | **Allow** | Deny (403) | Deny (403) | Deny (403) |

---

### 4.4 Space Governance & Administrative Permissions

| Action | Permitted Roles | Notes |
| :--- | :--- | :--- |
| **Create Space (Project-linked)** | Platform Admin, or Project Lead of `projectId` | Validated against project membership. |
| **Create Space (Standalone)** | Platform Admin only | Spaces without `projectId` cannot be created by regular members. |
| **Edit Space Settings** | Platform Admin, or Space Creator (`space.createdBy`) | Known as *"Manager access"* in UI (Screens 4 & 7). Allows updating title, description, project, permissions, and members. |
| **Delete Space (Hard cascade)** | Platform Admin only | Hard deletes the space document and all child `DOCUMENT` records. |
| **Archive Document (Soft delete)** | Anyone with UPDATE rights on the space | Sets `archived = true`. Document can be restored. |
| **Restore Document** | Anyone with UPDATE rights on the space | Sets `archived = false`. |
| **Permanent Delete Document** | Platform Admin only | Hard removes the `DOCUMENT` record from the database. |

---

## 5. Endpoints Specification

All endpoints are mounted under the `/doc` router and require an authenticated session (`401 UNAUTHENTICATED` if unauthenticated).

```
GET    /doc/spaces                              List spaces the user can view (optional ?projectId=)
POST   /doc/spaces                              Create a documentation space
GET    /doc/spaces/:spaceId                     Read one space with permissions and counts
PATCH  /doc/spaces/:spaceId                     Update space fields and settings (Manager/Admin)
DELETE /doc/spaces/:spaceId                     Hard delete space and child documents (Admin only)
GET    /doc/spaces/:spaceId/documents           List documents (filter by area, includeArchived)
POST   /doc/spaces/:spaceId/documents           Add a document link to a space
PATCH  /doc/documents/:documentId               Edit document metadata or restore
DELETE /doc/documents/:documentId               Archive document (soft delete)
DELETE /doc/documents/:documentId/permanent     Hard delete document (Admin only)
GET    /doc/search                              Search non-archived document titles in visible spaces
GET    /doc/admin/spaces                        Admin paginated list of all spaces with metrics
PATCH  /doc/admin/spaces/:spaceId/owner         Admin reassign space ownership
```

---

### 5.1 `GET /doc/spaces`
List all documentation spaces the authenticated user is permitted to view, optionally filtered by project ID.

- **Who may call**: Any authenticated user.
- **Query Parameters**:
  - `projectId` (optional): 24-character hex MongoDB `ObjectId`. If supplied, must be a valid `ObjectId` (returns `400 INVALID_ID` otherwise). When present, restricts the result set to only those spaces whose `projectId` matches the query value.
- **Behavior**:
  - Validates `projectId` syntax if present; rejects malformed hex strings with `400 INVALID_ID`.
  - Filters spaces according to the VIEW permission matrix.
  - When `projectId` is provided, further filters spaces where `space.projectId` matches the given `projectId`.
  - Aggregates the count of active (non-archived) documents for each space (`activeDocumentCount`).
  - Computes `canUpdate` (whether caller has update rights) and `isManager` (whether caller is Admin or space creator) for each space.
  - Populates `projectId` with `{ _id, title }` when linked, or `null` for standalone spaces.
- **Success Response (`200 OK`)**:
```json
[
  {
    "_id": "65f29d20c571c48201a00001",
    "title": "Engineering Handbook",
    "description": "Technical references and delivery guides for the Airost Intranet team.",
    "projectId": {
      "_id": "65f29d20c571c48201a11111",
      "title": "Airost Intranet"
    },
    "createdBy": "65f29d20c571c48201a22222",
    "accessType": "project_members",
    "updateType": "selected",
    "accessMembers": [],
    "updateMembers": ["65f29d20c571c48201a33333"],
    "activeDocumentCount": 8,
    "canUpdate": true,
    "isManager": true,
    "createdAt": "2026-10-14T08:00:00.000Z",
    "updatedAt": "2026-10-14T08:00:00.000Z"
  },
  {
    "_id": "65f29d20c571c48201a00004",
    "title": "Team Handbook",
    "description": "Shared onboarding, team practices and resources for every Airost member.",
    "projectId": null,
    "createdBy": "65f29d20c571c48201a22222",
    "accessType": "all",
    "updateType": "selected",
    "accessMembers": [],
    "updateMembers": ["65f29d20c571c48201a33333"],
    "activeDocumentCount": 3,
    "canUpdate": false,
    "isManager": false,
    "createdAt": "2026-10-14T09:00:00.000Z",
    "updatedAt": "2026-10-14T09:00:00.000Z"
  }
]
```
- **Error Responses**:
  - `400 INVALID_ID`: Provided `projectId` query parameter is not a valid 24-character hex ObjectId.
  - `401 UNAUTHENTICATED`: Session missing or expired.
  - `500 INTERNAL_ERROR`: Internal server error.

---

### 5.2 `POST /doc/spaces`
Create a new documentation space.

- **Who may call**: Platform Admin, or Project Lead of the linked `projectId`. For standalone spaces (`projectId: null` or omitted), Platform Admin only.
- **Request Body**:
```json
{
  "title": "Engineering Handbook",
  "description": "Technical references and delivery guides for the Airost Intranet team.",
  "projectId": "65f29d20c571c48201a11111",
  "accessType": "project_members",
  "updateType": "selected",
  "accessMembers": [],
  "updateMembers": ["65f29d20c571c48201a33333", "65f29d20c571c48201a44444"]
}
```
- **Validation Rules**:
  - `title`: String, required, trimmed, 1–120 characters.
  - `description`: String, required, trimmed, 1–1000 characters.
  - `projectId`: Optional/nullable valid `ObjectId` of existing project.
  - `accessType`: String, required, enum `['all', 'project_members', 'selected']`. If `projectId` is null/omitted, `'project_members'` is rejected.
  - `updateType`: String, required, enum `['all', 'project_members', 'selected']`. If `projectId` is null/omitted, `'project_members'` is rejected.
  - `accessMembers`: Array of unique valid User `ObjectId`s. Used if `accessType === 'selected'`, reset to `[]` otherwise.
  - `updateMembers`: Array of unique valid User `ObjectId`s. Used if `updateType === 'selected'`, reset to `[]` otherwise.
  - `createdBy`: Injected from `req.user._id`.
  - Reject unknown fields with `400 VALIDATION_ERROR`.
  - Reject invalid `ObjectId` strings in `projectId`, `accessMembers`, or `updateMembers` with `400 INVALID_ID`.
- **Success Response (`201 Created`)**:
```json
{
  "_id": "65f29d20c571c48201a00001",
  "title": "Engineering Handbook",
  "description": "Technical references and delivery guides for the Airost Intranet team.",
  "projectId": "65f29d20c571c48201a11111",
  "createdBy": "65f29d20c571c48201a22222",
  "accessType": "project_members",
  "updateType": "selected",
  "accessMembers": [],
  "updateMembers": ["65f29d20c571c48201a33333", "65f29d20c571c48201a44444"],
  "createdAt": "2026-10-14T08:00:00.000Z",
  "updatedAt": "2026-10-14T08:00:00.000Z"
}
```
- **Error Responses**:
  - `400 VALIDATION_ERROR`: Missing title/description, string length exceeded, invalid enum, 'project_members' on standalone space, or unknown fields.
  - `400 INVALID_ID`: Malformed `projectId`, `accessMembers`, or `updateMembers` ID.
  - `401 UNAUTHENTICATED`: Session missing.
  - `403 FORBIDDEN`: Caller is not Admin and not Lead of the linked project (or trying to create standalone space without Admin role).
  - `404 NOT_FOUND`: Specified `projectId` does not exist.
  - `500 INTERNAL_ERROR`: Internal server error.

---

### 5.3 `GET /doc/spaces/:spaceId`
Read one space by ID, returning metadata, permission flags for the caller, and document counts.

- **Who may call**: Any authenticated user with VIEW permission on the space.
- **URL Parameters**:
  - `spaceId`: 24-character hex `ObjectId`.
- **Behavior**:
  - If user lacks VIEW permission, returns `404 NOT_FOUND` (View Stealth Rule).
  - Computes `canUpdate` and `isManager` flags.
  - Computes `activeDocumentCount`, `archivedDocumentCount`, and breakdown by area (`areaCounts`) to feed Area tabs (Screen 8).
  - Populates `projectId` with `{ _id, title }` or `null`.
- **Success Response (`200 OK`)**:
```json
{
  "_id": "65f29d20c571c48201a00001",
  "title": "Engineering Handbook",
  "description": "Technical references and delivery guides for the Airost Intranet team.",
  "projectId": {
    "_id": "65f29d20c571c48201a11111",
    "title": "Airost Intranet"
  },
  "createdBy": "65f29d20c571c48201a22222",
  "accessType": "project_members",
  "updateType": "selected",
  "accessMembers": [],
  "updateMembers": ["65f29d20c571c48201a33333", "65f29d20c571c48201a44444"],
  "canUpdate": true,
  "isManager": true,
  "activeDocumentCount": 8,
  "archivedDocumentCount": 2,
  "areaCounts": {
    "general": 2,
    "requirements": 1,
    "design": 1,
    "development": 2,
    "testing": 2,
    "deployment": 0
  },
  "createdAt": "2026-10-14T08:00:00.000Z",
  "updatedAt": "2026-10-14T08:00:00.000Z"
}
```
- **Error Responses**:
  - `400 INVALID_ID`: `spaceId` is not a valid 24-char hex ObjectId.
  - `401 UNAUTHENTICATED`: Session missing.
  - `404 NOT_FOUND`: Space does not exist, or caller lacks VIEW permission.
  - `500 INTERNAL_ERROR`: Internal server error.

---

### 5.4 `PATCH /doc/spaces/:spaceId`
Update space fields and settings (Manager access).

- **Who may call**: Platform Admin or Space Creator (`space.createdBy`).
- **URL Parameters**:
  - `spaceId`: 24-character hex `ObjectId`.
- **Request Body** (all fields optional, at least one required):
```json
{
  "title": "Engineering Handbook",
  "description": "Technical references and delivery guides for the Airost Intranet team.",
  "projectId": "65f29d20c571c48201a11111",
  "accessType": "project_members",
  "updateType": "selected",
  "accessMembers": [],
  "updateMembers": ["65f29d20c571c48201a33333", "65f29d20c571c48201a44444"]
}
```
- **Validation Rules**:
  - Validates provided fields against creation rules.
  - If `projectId` is updated to `null`, `accessType` and `updateType` cannot be `'project_members'`.
  - If `accessType` transitions away from `'selected'`, `accessMembers` is cleared to `[]`.
  - If `updateType` transitions away from `'selected'`, `updateMembers` is cleared to `[]`.
  - Reject unknown fields with `400 VALIDATION_ERROR`.
  - Reject invalid `ObjectId`s with `400 INVALID_ID`.
- **Success Response (`200 OK`)**:
```json
{
  "_id": "65f29d20c571c48201a00001",
  "title": "Engineering Handbook",
  "description": "Technical references and delivery guides for the Airost Intranet team.",
  "projectId": "65f29d20c571c48201a11111",
  "createdBy": "65f29d20c571c48201a22222",
  "accessType": "project_members",
  "updateType": "selected",
  "accessMembers": [],
  "updateMembers": ["65f29d20c571c48201a33333", "65f29d20c571c48201a44444"],
  "createdAt": "2026-10-14T08:00:00.000Z",
  "updatedAt": "2026-10-14T09:30:00.000Z"
}
```
- **Error Responses**:
  - `400 VALIDATION_ERROR`: Field validation failure or unknown fields.
  - `400 INVALID_ID`: Invalid `spaceId` or member ID.
  - `401 UNAUTHENTICATED`: Session missing.
  - `403 FORBIDDEN`: Caller has VIEW rights but is neither Admin nor Space Creator.
  - `404 NOT_FOUND`: Space does not exist, or caller lacks VIEW permission.
  - `500 INTERNAL_ERROR`: Internal server error.

---

### 5.5 `DELETE /doc/spaces/:spaceId`
Permanently delete a space and cascade hard-delete all documents inside it.

- **Who may call**: Platform Admin only.
- **URL Parameters**:
  - `spaceId`: 24-character hex `ObjectId`.
- **Behavior**:
  - Performs a cascade hard delete: deletes all documents where `spaceId === space._id`, then deletes the space.
- **Success Response (`200 OK`)**:
```json
{
  "message": "Space and associated documents deleted successfully",
  "deletedSpaceId": "65f29d20c571c48201a00001",
  "deletedDocumentsCount": 10
}
```
- **Error Responses**:
  - `400 INVALID_ID`: Invalid `spaceId`.
  - `401 UNAUTHENTICATED`: Session missing.
  - `403 FORBIDDEN`: Caller is not a Platform Admin.
  - `404 NOT_FOUND`: Space does not exist.
  - `500 INTERNAL_ERROR`: Internal server error.

---

### 5.6 `GET /doc/spaces/:spaceId/documents`
List documents within a documentation space, optionally filtered by area or archived status.

- **Who may call**: Users with VIEW permission for the space.
- **URL Parameters**:
  - `spaceId`: 24-character hex `ObjectId`.
- **Query Parameters**:
  - `area` (optional): String enum `['general', 'requirements', 'design', 'development', 'testing', 'deployment']`.
  - `includeArchived` (optional): String enum `'true'` | `'false'` (default: `'false'`).
- **Validation & Permissions**:
  - By default (`includeArchived="false"`), returns active documents (`archived: false`).
  - Requesting `includeArchived="true"` requires **UPDATE rights** on the space. If a user with VIEW-only access passes `includeArchived=true`, the server responds with `403 FORBIDDEN`.
- **Success Response (`200 OK`)**:
```json
[
  {
    "_id": "65f29d20c571c48201a55551",
    "spaceId": "65f29d20c571c48201a00001",
    "title": "Database Schema",
    "url": "https://docs.google.com/document/d/1exampleDocId/edit",
    "provider": "google_doc",
    "area": "development",
    "createdBy": "65f29d20c571c48201a22222",
    "archived": false,
    "createdAt": "2026-10-14T08:15:00.000Z",
    "updatedAt": "2026-10-14T08:15:00.000Z"
  },
  {
    "_id": "65f29d20c571c48201a55552",
    "spaceId": "65f29d20c571c48201a00001",
    "title": "API Reference",
    "url": "https://drive.google.com/drive/folders/1exampleFolderId",
    "provider": "google_drive",
    "area": "development",
    "createdBy": "65f29d20c571c48201a22222",
    "archived": false,
    "createdAt": "2026-10-14T08:20:00.000Z",
    "updatedAt": "2026-10-14T08:20:00.000Z"
  }
]
```
- **Error Responses**:
  - `400 VALIDATION_ERROR`: Invalid `area` or `includeArchived` query value.
  - `400 INVALID_ID`: Invalid `spaceId`.
  - `401 UNAUTHENTICATED`: Session missing.
  - `403 FORBIDDEN`: Caller requested `includeArchived=true` without UPDATE permission.
  - `404 NOT_FOUND`: Space does not exist, or caller lacks VIEW permission.
  - `500 INTERNAL_ERROR`: Internal server error.

---

### 5.7 `POST /doc/spaces/:spaceId/documents`
Add a new external document link to a space.

- **Who may call**: Users with UPDATE rights on the target space.
- **URL Parameters**:
  - `spaceId`: 24-character hex `ObjectId`.
- **Request Body**:
```json
{
  "title": "Database Schema",
  "url": "https://docs.google.com/document/d/1exampleDocId/edit",
  "area": "development"
}
```
- **Validation Rules**:
  - `title`: String, required, trimmed, 1–120 characters.
  - `url`: String, required, trimmed, max 2048 characters. Must parse with `new URL()` and use `https:` protocol.
  - `area`: String, optional, enum `['general', 'requirements', 'design', 'development', 'testing', 'deployment']`, defaults to `'general'`.
  - `provider`: Server-derived from URL hostname. Any client-sent `provider` is ignored.
  - `createdBy`: Injected from `req.user._id`.
  - `archived`: Initialized to `false`.
  - Reject unknown fields with `400 VALIDATION_ERROR`.
  - Reject invalid `spaceId` with `400 INVALID_ID`.
- **Success Response (`201 Created`)**:
```json
{
  "_id": "65f29d20c571c48201a55551",
  "spaceId": "65f29d20c571c48201a00001",
  "title": "Database Schema",
  "url": "https://docs.google.com/document/d/1exampleDocId/edit",
  "provider": "google_doc",
  "area": "development",
  "createdBy": "65f29d20c571c48201a22222",
  "archived": false,
  "createdAt": "2026-10-14T08:15:00.000Z",
  "updatedAt": "2026-10-14T08:15:00.000Z"
}
```
- **Error Responses**:
  - `400 VALIDATION_ERROR`: Missing title/url, URL not HTTPS, title > 120 chars, invalid area, unknown fields.
  - `400 INVALID_ID`: Invalid `spaceId`.
  - `401 UNAUTHENTICATED`: Session missing.
  - `403 FORBIDDEN`: Caller lacks UPDATE rights on this space.
  - `404 NOT_FOUND`: Space does not exist, or caller lacks VIEW permission.
  - `500 INTERNAL_ERROR`: Internal server error.

---

### 5.8 `PATCH /doc/documents/:documentId`
Edit document metadata (title, url, area) or restore an archived document.

- **Who may call**: Users with UPDATE rights on the document's parent space.
- **URL Parameters**:
  - `documentId`: 24-character hex `ObjectId`.
- **Request Body** (all fields optional, at least one required):
```json
{
  "title": "Database Schema (v2)",
  "url": "https://docs.google.com/document/d/1newDocId/edit",
  "area": "development",
  "archived": false
}
```
- **Validation Rules**:
  - `title`: Optional String, trimmed, 1–120 characters.
  - `url`: Optional String, trimmed, max 2048 characters, valid HTTPS URL. Per Screen 13 (*"Leave empty to keep the current link"*), omitting `url` preserves the current link and provider. If `url` is provided, `provider` is re-derived.
  - `area`: Optional String enum `['general', 'requirements', 'design', 'development', 'testing', 'deployment']`.
  - `archived`: Optional Boolean. Passing `archived: false` restores an archived document; passing `archived: true` archives it.
  - `spaceId` and `createdBy` are immutable and cannot be updated.
  - Reject unknown fields with `400 VALIDATION_ERROR`.
  - Reject invalid `documentId` with `400 INVALID_ID`.
- **Success Response (`200 OK`)**:
```json
{
  "_id": "65f29d20c571c48201a55551",
  "spaceId": "65f29d20c571c48201a00001",
  "title": "Database Schema (v2)",
  "url": "https://docs.google.com/document/d/1newDocId/edit",
  "provider": "google_doc",
  "area": "development",
  "createdBy": "65f29d20c571c48201a22222",
  "archived": false,
  "createdAt": "2026-10-14T08:15:00.000Z",
  "updatedAt": "2026-10-14T10:00:00.000Z"
}
```
- **Error Responses**:
  - `400 VALIDATION_ERROR`: Invalid URL format, title empty, invalid area, empty body, unknown fields.
  - `400 INVALID_ID`: Invalid `documentId`.
  - `401 UNAUTHENTICATED`: Session missing.
  - `403 FORBIDDEN`: Caller lacks UPDATE rights on the parent space.
  - `404 NOT_FOUND`: Document does not exist, or caller lacks VIEW permission on parent space.
  - `500 INTERNAL_ERROR`: Internal server error.

---

### 5.9 `DELETE /doc/documents/:documentId`
Archive a document (soft delete: `archived = true`).

- **Who may call**: Users with UPDATE rights on the document's parent space.
- **URL Parameters**:
  - `documentId`: 24-character hex `ObjectId`.
- **Behavior**:
  - Sets `archived = true` on the target document. The link is removed from its active Area list and placed in the space's archived list (Screens 8, 9, 14).
- **Success Response (`200 OK`)**:
```json
{
  "message": "Document archived successfully",
  "document": {
    "_id": "65f29d20c571c48201a55551",
    "spaceId": "65f29d20c571c48201a00001",
    "title": "Database Schema",
    "archived": true,
    "updatedAt": "2026-10-14T10:15:00.000Z"
  }
}
```
- **Error Responses**:
  - `400 INVALID_ID`: Invalid `documentId`.
  - `401 UNAUTHENTICATED`: Session missing.
  - `403 FORBIDDEN`: Caller lacks UPDATE rights on the parent space.
  - `404 NOT_FOUND`: Document does not exist, or caller lacks VIEW permission on parent space.
  - `500 INTERNAL_ERROR`: Internal server error.

---

### 5.10 `DELETE /doc/documents/:documentId/permanent`
Permanently delete a document record from the database (Hard delete).

- **Who may call**: Platform Admin only.
- **URL Parameters**:
  - `documentId`: 24-character hex `ObjectId`.
- **Behavior**:
  - Hard removes the document record from the `DOCUMENT` collection. This cannot be undone.
- **Success Response (`200 OK`)**:
```json
{
  "message": "Document permanently deleted",
  "deletedDocumentId": "65f29d20c571c48201a55551"
}
```
- **Error Responses**:
  - `400 INVALID_ID`: Invalid `documentId`.
  - `401 UNAUTHENTICATED`: Session missing.
  - `403 FORBIDDEN`: Caller is not a Platform Admin.
  - `404 NOT_FOUND`: Document does not exist.
  - `500 INTERNAL_ERROR`: Internal server error.

---

### 5.11 `GET /doc/search`
Search active (non-archived) document titles across all documentation spaces the authenticated user is permitted to view.

- **Who may call**: Any authenticated user.
- **Query Parameters**:
  - `q` (required): String search query. Must be trimmed, between 2 and 100 characters in length. If missing, whitespace-only, shorter than 2 characters, or longer than 100 characters, returns `400 VALIDATION_ERROR`.
  - `limit` (optional): Integer number of matching documents to return. Valid range is 1 to 20, default is `10`. If non-integer or outside 1..20, returns `400 VALIDATION_ERROR`.
- **Behavior & Security Rules**:
  - Searches non-archived document TITLES only (`archived: false`). Archived documents are **never** returned in search results.
  - Case-insensitive search.
  - User input in `q` must be strictly escaped (regex metacharacters escaped) and **never** used as a raw regular expression, eliminating RegExp injection and ReDoS vulnerabilities.
  - Scoped strictly to spaces that the caller has permission to VIEW per the VIEW permission matrix. Restricted spaces invisible to the user are completely excluded from the search scope.
  - Each matching document object includes its parent space metadata populated as `space: { _id, title }`.
  - **Sorting Order**:
    1. Documents whose titles start with the query string `q` (case-insensitive prefix match) appear first.
    2. Remaining matching documents are sorted alphabetically (case-insensitive ascending by title).
- **Success Response (`200 OK`)**:
```json
{
  "documents": [
    {
      "_id": "65f29d20c571c48201a55551",
      "title": "Database Schema",
      "url": "https://docs.google.com/document/d/1exampleDocId/edit",
      "provider": "google_doc",
      "area": "development",
      "spaceId": "65f29d20c571c48201a00001",
      "space": {
        "_id": "65f29d20c571c48201a00001",
        "title": "Engineering Handbook"
      }
    },
    {
      "_id": "65f29d20c571c48201a55553",
      "title": "Database Migration Guide",
      "url": "https://docs.google.com/document/d/1migrationDocId/edit",
      "provider": "google_doc",
      "area": "development",
      "spaceId": "65f29d20c571c48201a00001",
      "space": {
        "_id": "65f29d20c571c48201a00001",
        "title": "Engineering Handbook"
      }
    }
  ]
}
```
- **Error Responses**:
  - `400 VALIDATION_ERROR`: Missing `q`, trimmed `q` length < 2 or > 100 characters, or `limit` not an integer between 1 and 20.
  - `401 UNAUTHENTICATED`: Session missing or expired.
  - `500 INTERNAL_ERROR`: Internal server error.

---

### 5.12 `GET /doc/admin/spaces`
List all documentation spaces across the intranet with administrative metrics, pagination, and search filtering.

- **Who may call**: Platform Admin only (`isAdmin(req.user)`).
- **Stealth Rule Exception**: The View Stealth Rule does **not** apply to administrative endpoints. Unauthenticated requests receive `401 UNAUTHENTICATED`; authenticated non-admin callers receive `403 FORBIDDEN`.
- **Query Parameters**:
  - `page` (optional): Positive integer page number. Default: `1`, minimum: `1`.
  - `limit` (optional): Integer items per page. Default: `25`, maximum: `100`, minimum: `1`.
  - `q` (optional): String search filter. Matches case-insensitively as a substring against space title, linked project title, or space owner (creator) user name. If omitted or empty, matches all spaces.
- **Behavior**:
  - Returns spaces across all projects and standalone spaces without access restrictions.
  - Aggregates document counts:
    - `documentCount`: Total active (non-archived) documents in the space.
    - `archivedCount`: Total archived documents in the space.
    - `accessMembersCount`: Number of users in `space.accessMembers` (`accessMembers.length`).
    - `updateMembersCount`: Number of users in `space.updateMembers` (`updateMembers.length`).
  - Populates linked project as `project: { _id, title }` or `null` for standalone spaces.
  - Populates owner (creator `createdBy`) as `owner: { _id, name, email }`.
  - Returns pagination metadata: `page`, `limit`, and `total` matching spaces.
- **Success Response (`200 OK`)**:
```json
{
  "spaces": [
    {
      "_id": "65f29d20c571c48201a00001",
      "title": "Engineering Handbook",
      "description": "Technical references and delivery guides for the Airost Intranet team.",
      "project": {
        "_id": "65f29d20c571c48201a11111",
        "title": "Airost Intranet"
      },
      "owner": {
        "_id": "65f29d20c571c48201a22222",
        "name": "Tony Stark",
        "email": "tony@airost.org"
      },
      "accessType": "project_members",
      "updateType": "selected",
      "accessMembersCount": 0,
      "updateMembersCount": 2,
      "documentCount": 8,
      "archivedCount": 2,
      "createdAt": "2026-10-14T08:00:00.000Z",
      "updatedAt": "2026-10-14T08:00:00.000Z"
    },
    {
      "_id": "65f29d20c571c48201a00004",
      "title": "Club General Guidelines",
      "description": "General club onboarding and constitution documents.",
      "project": null,
      "owner": {
        "_id": "65f29d20c571c48201a22222",
        "name": "Tony Stark",
        "email": "tony@airost.org"
      },
      "accessType": "all",
      "updateType": "selected",
      "accessMembersCount": 0,
      "updateMembersCount": 1,
      "documentCount": 3,
      "archivedCount": 0,
      "createdAt": "2026-10-14T09:00:00.000Z",
      "updatedAt": "2026-10-14T09:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 25,
  "total": 2
}
```
- **Error Responses**:
  - `400 VALIDATION_ERROR`: `page` < 1, `limit` < 1, or `limit` > 100.
  - `401 UNAUTHENTICATED`: Session missing.
  - `403 FORBIDDEN`: Caller is not a Platform Admin.
  - `500 INTERNAL_ERROR`: Internal server error.

---

### 5.13 `PATCH /doc/admin/spaces/:spaceId/owner`
Reassign the owner (creator) of a documentation space to another active user.

- **Who may call**: Platform Admin only (`isAdmin(req.user)`).
- **Stealth Rule Exception**: Unauthenticated requests receive `401 UNAUTHENTICATED`; non-admin callers receive `403 FORBIDDEN`.
- **URL Parameters**:
  - `spaceId`: 24-character hex `ObjectId`. Must exist.
- **Request Body**:
```json
{
  "userId": "65f29d20c571c48201a33333"
}
```
- **Validation Rules & Behavior**:
  - `spaceId` must be a valid 24-character hex `ObjectId` (`400 INVALID_ID` if invalid hex).
  - `userId` must be a valid 24-character hex `ObjectId` (`400 INVALID_ID` if invalid hex).
  - `userId` must correspond to an existing, active user in the `User` database (`400 VALIDATION_ERROR` if user not found or inactive).
  - Reject unknown payload fields with `400 VALIDATION_ERROR`.
  - If target space does not exist: returns `404 NOT_FOUND`.
  - Reassigns `space.createdBy` to `userId`. Space manager rights transfer to the new owner.
  - Triggers internal server event `space.owner_reassigned`.
- **Success Response (`200 OK`)**:
```json
{
  "space": {
    "_id": "65f29d20c571c48201a00001",
    "title": "Engineering Handbook",
    "description": "Technical references and delivery guides for the Airost Intranet team.",
    "projectId": "65f29d20c571c48201a11111",
    "createdBy": "65f29d20c571c48201a33333",
    "accessType": "project_members",
    "updateType": "selected",
    "accessMembers": [],
    "updateMembers": ["65f29d20c571c48201a33333"],
    "createdAt": "2026-10-14T08:00:00.000Z",
    "updatedAt": "2026-10-16T04:00:00.000Z"
  }
}
```
- **Error Responses**:
  - `400 INVALID_ID`: Malformed `spaceId` or `userId`.
  - `400 VALIDATION_ERROR`: Missing `userId`, unknown fields, or specified user is not found/inactive.
  - `401 UNAUTHENTICATED`: Session missing.
  - `403 FORBIDDEN`: Caller is not a Platform Admin.
  - `404 NOT_FOUND`: Space does not exist.
  - `500 INTERNAL_ERROR`: Internal server error.

---

## 6. Document Opening Behaviour & Link Security

### 6.1 Frontend Opening Behaviour
When a user clicks the `"Open"` button (`↗ Open`) on any document card (Screens 1, 8, 10):
- The link **must** open in a separate browser tab or window.
- The anchor tag or programmatic trigger must enforce `target="_blank"` with `rel="noopener noreferrer"`:
  ```jsx
  <a
    href={document.url}
    target="_blank"
    rel="noopener noreferrer"
    className="..."
  >
    <ExternalLinkIcon className="w-3.5 h-3.5 mr-1.5" />
    Open
  </a>
  ```
- **Security Rationale**:
  - `noopener`: Prevents the opened external page from acquiring access to `window.opener`, protecting the intranet from reverse tabnabbing and window tampering.
  - `noreferrer`: Prevents the browser from leaking internal intranet URLs and referrers to external hosts.

### 6.2 URL Scheme Validation (Server-side)
All incoming URLs undergo strict server validation before insertion or update:
```javascript
let parsedUrl;
try {
  parsedUrl = new URL(url);
} catch (err) {
  throw new ValidationError("Invalid URL format");
}

if (parsedUrl.protocol !== 'https:') {
  throw new ValidationError("Only HTTPS URLs are allowed");
}
```
- Only the `https:` protocol is permitted. Plain `http:`, `javascript:`, `data:`, `file:`, `vbscript:`, and protocol-relative URLs (`//`) are rejected with `400 VALIDATION_ERROR`.
- Maximum URL length is capped at 2048 characters.

### 6.3 Hostname-based Provider Derivation
The server derives the `provider` attribute automatically from `parsedUrl.hostname`:
- `docs.google.com` $\rightarrow$ `google_doc` (rendered as *"Google Docs"* in UI)
- `drive.google.com` $\rightarrow$ `google_drive` (rendered as *"Google Drive"* in UI)
- Any other valid HTTPS host $\rightarrow$ `external_url` (rendered as *"External Link"* in UI)
- Any client-submitted `provider` field is ignored.

---

## 7. Server Event Hook (Internal Notification Integration)

The documentation module implements an internal pub/sub event hook system. This is an internal server mechanism, **not** an HTTP API. It serves as the decoupled integration boundary for audit logging, activity tracking, and future notification dispatch (e.g., email alerts, in-app notifications).

### 7.1 Event Types
The following event types are emitted across space and document lifecycles:

| Event Name | Trigger Condition |
| :--- | :--- |
| `space.created` | Emitted when a new space is successfully created (`POST /doc/spaces`). |
| `space.updated` | Emitted when space metadata or permissions are updated (`PATCH /doc/spaces/:spaceId`). |
| `space.deleted` | Emitted when a space and its documents are hard deleted by an Admin (`DELETE /doc/spaces/:spaceId`). |
| `space.owner_reassigned` | Emitted when space ownership is transferred by an Admin (`PATCH /doc/admin/spaces/:spaceId/owner`). |
| `document.created` | Emitted when a new document link is added to a space (`POST /doc/spaces/:spaceId/documents`). |
| `document.updated` | Emitted when document metadata or URL is modified (`PATCH /doc/documents/:documentId`). |
| `document.archived` | Emitted when a document is soft-deleted / archived (`DELETE /doc/documents/:documentId` or `PATCH` with `archived: true`). |
| `document.restored` | Emitted when an archived document is restored (`PATCH /doc/documents/:documentId` with `archived: false`). |
| `document.deleted` | Emitted when a document is permanently deleted from the database (`DELETE /doc/documents/:documentId/permanent`). |

### 7.2 Event Payload Specification
Every event carries a standardized payload object:

```typescript
interface DocEventPayload {
  actorId: string;            // ObjectId string of the user who performed the action (from req.user._id)
  spaceId: string;            // ObjectId string of the affected documentation space
  projectId: string | null;   // ObjectId string of linked project, or null for standalone spaces
  documentId?: string;        // ObjectId string of the affected document (for document.* events)
  title?: string;             // Human-readable title of the affected space or document
}
```

### 7.3 Operational Invariants
1. **Post-Write Execution**: Events are dispatched **strictly after** the database write operation has successfully completed and committed. If a database transaction or operation fails, no event is emitted.
2. **Failure Isolation**: Listener execution errors **must never break or delay the HTTP request**. Event dispatchers must execute listeners asynchronously or wrap listener execution in protective try/catch blocks so that notification, caching, or logging failures never return an error to the client.
3. **Future Notification Integration**: This hook architecture allows notification handlers (Phase 4 / Phase 5) to subscribe to space and document updates without modifying core controller or data-access logic.

---

## 8. Client Routes & Legacy Coexistence

The documentation feature is accessed on the client under the base path `/doc`.

### 8.1 Client Route Definitions
The following table defines the official client URL routes, corresponding screen representations, and query parameter specifications:

| View / Action | Route Pattern | Query Parameters | Screen Spec Ref | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Spaces List** | `/doc` | None | Screen 1, 2, 3, 4 | Main documentation landing page. Displays all visible spaces with search and filters. |
| **Create Space** | `/doc/spaces/new` | None | Screen 5, 6 | Creation form for project-linked or standalone spaces. |
| **Space Detail** | `/doc/spaces/:spaceId` | `?area=<area>` (optional)<br>`?q=<searchText>` (optional) | Screen 8, 9, 10, 11 | Space overview showing categorized document links by workflow area tab (default `'general'`), area counts, read-only badges, and in-space document filtering. |
| **Edit Space** | `/doc/spaces/:spaceId/edit` | None | Screen 7 | Space settings, project linkage, and permission management for Space Managers / Admins. |
| **Add Document** | `/doc/spaces/:spaceId/documents/new` | `?area=<area>` (optional) | Screen 12 | Modal/form to add a new document link. Preselects target workflow area if `?area=` is supplied. |
| **Edit Document** | `/doc/spaces/:spaceId/documents/:documentId/edit` | None | Screen 13 | Modal/form to edit document title, area, or optionally replace the external URL. |
| **Archived Documents** | `/doc/spaces/:spaceId/archived` | None | Screen 14 | View soft-deleted documents within a space with one-click restore functionality. |

### 8.2 Legacy Route Coexistence (`/doc/:id`, `/doc/create/:id`)
The codebase currently contains legacy routes in `client/src/App.js`:
- `/doc/:id` $\rightarrow$ `DocBlog` (legacy article blog viewer)
- `/doc/create/:id` $\rightarrow$ `CreateDoc` (legacy Google Doc embedded editor)

**Coexistence Strategy**:
1. **Explicit Segment Isolation**: All new documentation screens use explicit nested sub-routes under `/doc/spaces/...` (e.g., `/doc/spaces/:spaceId`, `/doc/spaces/new`). In React Router v6, static path segments (`/doc/spaces/...`) are evaluated with higher specificity than dynamic parameter routes (`/doc/:id`), completely avoiding URL conflicts.
2. **Preservation of Legacy Articles**: Existing blog articles remain fully functional under `/doc/:id` during the transition period without interfering with space navigation.
3. **Legacy Creation Isolation**: The legacy creator route `/doc/create/:id` uses the `create/:id` subpath, which is distinct from `/doc/spaces/new` and `/doc/spaces/:spaceId/documents/new`.

### 8.3 Required Client Link Updates
When transitioning from the legacy views to the new documentation system, the following existing client links must be updated:
1. `client/src/pages/Projects/ProjectDetails.js`:
   - *Current*: Displays a hardcoded static presentation URL in project details (`Project handbook: https://docs.google.com/...`).
   - *Target*: Update to link to the project's documentation spaces via `/doc/spaces?projectId=${project._id}` or directly to the linked space `/doc/spaces/${space._id}`.
2. `client/src/pages/Documentation/component/Doc-card.js`:
   - *Current*: Links directly to `/doc/${doc._id}` for legacy article cards.
   - *Target*: Retained for legacy blog cards; new documentation space cards in `SpaceListScreen.js` navigate to `/doc/spaces/${space._id}`.
3. `client/src/components/Sidepanel/Sidepanel.js`:
   - *Current*: Points to `/doc` (`<Link to="/doc">Documentation</Link>`).
   - *Target*: No change required; it serves as the entry point to the documentation spaces list.

---

## 9. Screen / Feature to Endpoint Map

This matrix maps UI screens and integration points to the corresponding backend API endpoints:

| Feature / Screen | UI Context & Trigger | HTTP Method & Endpoint | Caller Permission | Purpose & Response Summary |
| :--- | :--- | :--- | :--- | :--- |
| **Project Page Link** | Project Details screen (`/projects/:id`) "Documentation" tab/link | `GET /doc/spaces?projectId=:projectId` | Authenticated member with VIEW rights | Fetches documentation spaces associated with the current project. Returns array of matching spaces. |
| **Document Search** | Global header search modal or quick navigation bar | `GET /doc/search?q=:text&limit=:n` | Any authenticated user | Fast case-insensitive title search across non-archived documents in spaces the user can view. Returns `{ documents: [...] }`. |
| **Admin Panel (Spaces List & Filter)** | Platform Admin panel (`/admin/documentation`) | `GET /doc/admin/spaces?page=:p&limit=:l&q=:query` | Platform Admin only (`403` if not admin) | Paginated list of all spaces with metrics (`documentCount`, `archivedCount`, member counts) and owner info. Returns `{ spaces, page, limit, total }`. |
| **Admin Panel (Reassign Owner)** | Admin space actions modal / dropdown | `PATCH /doc/admin/spaces/:spaceId/owner` | Platform Admin only (`403` if not admin) | Reassigns space creator/owner to a designated active user. Body `{ userId }`. Returns `{ space }`. |
| **Admin Delete (Space Cascade)** | Admin space management "Delete Space" danger action | `DELETE /doc/spaces/:spaceId` | Platform Admin only (`403` if not admin) | Permanently hard-deletes space and cascades deletion to all child documents. Returns `{ deletedSpaceId, deletedDocumentsCount }`. |
| **Admin Delete (Permanent Document Delete)** | Admin archived documents / cleanup screen | `DELETE /doc/documents/:documentId/permanent` | Platform Admin only (`403` if not admin) | Permanently hard-deletes a single document record from the database. Returns `{ deletedDocumentId }`. |

---

## 10. Out-of-Scope Register (Link-Only Architecture)

In adherence to **Locked Decision 4**, the documentation module operates strictly as a metadata and link catalog. The following capabilities are explicitly excluded from the feature scope:

1. **File Upload and Download**:
   - File storage, binary asset serving, and download bandwidth are delegated entirely to external cloud providers (such as Google Drive and Docs), keeping the intranet backend lightweight, stateless, and free from binary storage maintenance.
2. **File Size Metadata**:
   - External URLs and web-native collaboration assets (such as Google Docs, Sheets, and Slides) do not have fixed binary byte counts or expose reliable size metrics, rendering static file size indicators inapplicable and misleading.
3. **Document Version History**:
   - Collaborative document platforms (e.g., Google Workspace) natively maintain robust version history, granular diffs, and editor attribution, making intranet-level document version tracking redundant and prone to synchronization drift.
4. **Storing Document Content**:
   - Storing raw document text, HTML bodies, or Markdown strings in the intranet database introduces data synchronization hazards, content-parsing vulnerabilities, and complex formatting discrepancies.

> [!NOTE]
> Revisit only if the team changes Locked Decision 4; this would require a storage solution such as Supabase Storage.

---

## 11. Known Risks & Codebase Observations

### 11.1 Known Technical & Architectural Risks

1. **Project Lead Plain Name String (`server/models/Project.js`)**:
   - *Risk*: `server/models/Project.js` currently stores `lead` as a plain `String` (e.g. `"John Doe"`), rather than an `ObjectId` referencing the `User` collection.
   - *Impact*: Authorizing project-level space creation or manager rights via string matching (`Project.lead === req.user.name`) is inherently unsafe if user names are not strictly unique, contain whitespace discrepancies, or are updated.
   - *Mitigation (Implemented in Documentation Service)*: In `server/services/docService.js` (`getUserProjectRole`), project role resolution prioritizes the explicit `ProjectMember` join collection. When falling back to `Project.lead`, it matches against the strongest unique identifier available in strict priority order:
     1. User `ObjectId` (exact 24-character hexadecimal match)
     2. User email (case-insensitive exact match)
     3. User display name (trimmed, case-insensitive exact match). Crucially, a display-name match counts **only if exactly ONE active user** in the system possesses that name. If the name is ambiguous (two or more users), lead access is denied for all candidates and a server-side warning is logged with the project ID and count (never exposing user details). Partial and substring matching are strictly prohibited.
   - *Recommendation for Projects Owner*: Migrate `Project.lead` to store a direct `ObjectId` reference to the `User` collection (e.g. `lead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }`), or standardize all project membership, advisory, and lead assignments exclusively through the `ProjectMember` join collection (`{ projectId, userId, role: 'lead' | 'advisor' | 'member' }`).

2. **Direct Mongoose Model Invocation in Controller**:
   - *Risk*: Historical controllers executed database operations directly in `server/controller/docController.js` using Mongoose model methods.
   - *Impact*: Tightly couples HTTP request handling to MongoDB, increasing regression risks and complicating the upcoming migration to Supabase/PostgreSQL (Phase 1 & Phase 4).
   - *Mitigation (Implemented)*: Addressed by the Documentation service layer (`server/services/docService.js`), which encapsulates all database queries and aggregations behind clean repository interfaces and pure authorization guards (`server/utils/docAccess.js`). The controller imports zero models.

### 11.2 Codebase Observations & Transition Items

1. **Legacy `/airost/doc` Routes & `docModel.js`**:
   - `server/server.js` currently mounts routes at `app.use("/airost/doc", DocRoutes)` and `app.use("/doc", docRoutes)`.
   - Legacy article blog records (`docModel.js`) and editor (`CreateDoc.js`) coexist with the new link-only documentation space system.
   - Legacy blog endpoints and new documentation space endpoints are completely isolated under separate router paths (`/airost/doc` vs `/doc`).

2. **Platform Admin Role Consistency**:
   - In `User` and `VerifiedUser` schemas, `position` can appear as an Array or String.
   - Centralized server helper `isAdmin(user)` inspects both representations case-insensitively (`(Array.isArray(user.position) ? user.position : [user.position]).some(p => typeof p === 'string' && p.toLowerCase().includes('admin'))`), ensuring uniform authorization logic across all route guards.

3. **Workflow Area Alignment**:
   - The 6 delivery workflow areas defined in `SCREEN_SPEC.md` (`general`, `requirements`, `design`, `development`, `testing`, `deployment`) remain locked across all document operations.

4. **Upcoming Supabase & PostgreSQL Migration (Phase 1 / Phase 4)**:
   - All schema designs, foreign keys, and permission boundaries in this contract are structured to map cleanly to PostgreSQL tables (`documentation_spaces`, `documents`, `space_access_members`, `space_update_members`) and Supabase Row Level Security (RLS) policies.

