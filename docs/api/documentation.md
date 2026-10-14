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
GET    /doc/spaces                              List spaces the user can view
POST   /doc/spaces                              Create a documentation space
GET    /doc/spaces/:spaceId                     Read one space with permissions and counts
PATCH  /doc/spaces/:spaceId                     Update space fields and settings (Manager/Admin)
DELETE /doc/spaces/:spaceId                     Hard delete space and child documents (Admin only)
GET    /doc/spaces/:spaceId/documents           List documents (filter by area, includeArchived)
POST   /doc/spaces/:spaceId/documents           Add a document link to a space
PATCH  /doc/documents/:documentId               Edit document metadata or restore
DELETE /doc/documents/:documentId               Archive document (soft delete)
DELETE /doc/documents/:documentId/permanent     Hard delete document (Admin only)
```

---

### 5.1 `GET /doc/spaces`
List all documentation spaces the authenticated user is permitted to view.

- **Who may call**: Any authenticated user.
- **Query Parameters**: None.
- **Behavior**:
  - Filters spaces according to the VIEW permission matrix.
  - Aggregates the count of active (non-archived) documents for each space.
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

## 7. Open Questions & Codebase Observations

During inspection of the active codebase against `database_schema.md`, `features.md`, `DESIGN.md`, and `SCREEN_SPEC.md`, several key architectural discrepancies and legacy states were observed:

### 1. Project Membership Model (`server/models/Project.js` vs `PROJECT_MEMBER`)
- **Current State in Codebase:**
  - `server/models/Project.js` currently stores:
    ```javascript
    {
      projectId: { type: Number, required: true },
      title: String,
      description: String,
      lead: String,
    }
    ```
  - `projectId` is stored as a `Number` (e.g. 1, 2, 3) alongside Mongoose's default `_id: ObjectId`.
  - `lead` is stored as a plain `String` (name or handle), not an `ObjectId` ref to `User`.
  - There is currently **no** `PROJECT_MEMBER` Mongoose model in `server/models/`, nor are `advisor` or `member` lists present on `Project`.
- **Discrepancy with `database_schema.md`:**
  - `database_schema.md` defines a separate `PROJECT_MEMBER` collection with `projectId: ObjectId`, `userId: ObjectId`, and `role: enum ['lead', 'advisor', 'member']`.
- **Open Questions & Recommendation for Team:**
  1. *How should project membership and lead checks be verified right now in Mongoose?*
     - Option A: Implement the `PROJECT_MEMBER` Mongoose model as specified in `database_schema.md` during the current sprint.
     - Option B: Temporarily verify `lead` by matching `Project.lead` against `req.user.name` until `PROJECT_MEMBER` is introduced.
  2. *Space Project Reference:* In `DOCUMENTATION_SPACE`, `projectId` should reference `Project._id` (`ObjectId`). When querying spaces, the API should populate `{ _id, title }` so the frontend can display `"Project: <title>"` (Screen 1).

### 2. Legacy `/airost/doc` Routes & `docModel.js` Transition
- **Current State in Codebase:**
  - `server/server.js` currently mounts routes at `app.use("/airost/doc", DocRoutes)` rather than `/doc`.
  - `server/models/docModel.js` defines an article/blog schema with fields: `image`, `title`, `profile`, `author`, `date`, `type`, `description`, `content` (all required Strings).
  - `server/controller/docController.js` handles CRUD for these blog posts.
  - `client/src/pages/Documentation/` (`Doc.js`, `Doc-card.js`, `CreateDoc.js`) is an article blog viewer and editor that uses `ReactQuill` and iframe embeds, fetching from `/airost/doc`.
- **Open Questions for Team:**
  1. *Route Mount:* To avoid breaking ongoing parallel work, should `server.js` mount the new Documentation Space API at `app.use("/doc", newDocRoutes)` concurrently with the legacy `app.use("/airost/doc", legacyDocRoutes)` until client migration is complete?
  2. *Legacy Data:* Should existing article records in `Doc` be archived, migrated into a default *"Club General"* documentation space, or cleanly retired once the 14 new screens are connected?

### 3. Platform Admin Role Consistency
- **Current State in Codebase:**
  - In `server/models/User.js`, `position` is defined as `Array`.
  - In `server/models/VerifiedUser.js`, `position` is defined as `Array`.
  - In `server/passport.js`, `userPosition = verifiedUser ? verifiedUser.position[0] : " "` (storing a single String).
  - In `server/controller/adminController.js`, `position: [req.body.position]`.
  - In `client/src/components/Sidepanel/Sidepanel.js`, the check handles both:
    ```javascript
    Array.isArray(user.position) ? user.position.includes("admin") : user.position === "admin"
    ```
- **Recommendation:** Implement a server-side helper `isAdmin(user)` in `server/utils/authHelper.js` that checks both array and string variants case-insensitively (`(Array.isArray(user.position) ? user.position : [user.position]).some(p => typeof p === 'string' && p.toLowerCase().includes('admin'))`), ensuring uniform authorization logic across all route guards.

### 4. `area` Enum & Workflow Alignment
- **Discrepancy:**
  - `database_schema.md` Section 4 listed `['general', 'meeting', 'technical', 'resource', 'other']`.
  - `SCREEN_SPEC.md` and `DESIGN.md` explicitly specify 6 project delivery workflow areas across all screens (Screens 8, 11, 12, 13):
    1. `general` (UI: *"General"*)
    2. `requirements` (UI: *"Requirements"*)
    3. `design` (UI: *"Design"*)
    4. `development` (UI: *"Development"*)
    5. `testing` (UI: *"Testing"*)
    6. `deployment` (UI: *"Deployment"*)
- **Resolution:** This contract follows the prompt rule (*"Where database_schema.md or features.md differ from DESIGN.md and SCREEN_SPEC.md, DESIGN.md and SCREEN_SPEC.md take precedence"*), locking the 6 workflow areas defined in `SCREEN_SPEC.md`.

### 5. Supabase & PostgreSQL Migration (Phase 1 / Phase 4)
- **Context:** [AGENTS.md](file:///c:/Users/ganru/Documents/airost-intranet/AGENTS.md) outlines an upcoming migration from MongoDB to Supabase (PostgreSQL + RLS).
- **Recommendation:** When implementing this API in Node/Express/Mongoose, encapsulate all database access and permission evaluations inside a dedicated service layer (`server/services/docService.js`) rather than inlining queries in `docController.js`. This will allow seamless substitution with Supabase client calls and PostgreSQL queries when Phase 4 is executed.
