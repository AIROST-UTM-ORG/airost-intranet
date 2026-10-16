# Documentation Data Layer Architecture

## 1. Overview & Service Boundary

To support the club platform's upcoming migration to **Supabase (PostgreSQL + Auth + Storage + RLS)** (Phase 1 & Phase 4) and prevent coupling of business and HTTP logic to MongoDB Mongoose models, all data access for the Documentation feature is isolated inside a dedicated service layer:

- **Service Layer**: [`server/services/docService.js`](file:///c:/Users/ganru/Documents/airost-intranet/server/services/docService.js)
- **Controller**: [`server/controller/docController.js`](file:///c:/Users/ganru/Documents/airost-intranet/server/controller/docController.js) (thin HTTP adapter: parses input, validates schemas, invokes access guards, calls services, formats errors)
- **Access Guard**: [`server/utils/docAccess.js`](file:///c:/Users/ganru/Documents/airost-intranet/server/utils/docAccess.js) (pure authorization logic, zero database model imports)
- **Validation**: [`server/utils/docValidation.js`](file:///c:/Users/ganru/Documents/airost-intranet/server/utils/docValidation.js) (pure schema validation)

Controllers and utility modules **must never import** Mongoose models from `server/models/`.

---

## 2. Repository Interface (Service Functions)

The service layer provides plain JavaScript function contracts taking scalar arguments, session context, or validated DTOs, and returning plain objects. Operations throw typed `DocError(status, code, message, details)` instances to communicate error states.

### 2.1 Project Membership Lookup
| Service Function | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `getUserProjectRole` | `(userId, projectId)` | `Promise<string \| null>` | Resolves user's project role (`'lead'`, `'advisor'`, `'member'`, or `null`). Checks `PROJECT_MEMBER` first, then falls back to `Project.lead`. Isolated behind service for clean Supabase replacement. |
| `findProjectById` | `(projectId)` | `Promise<object \| null>` | Retrieves basic project record by ID to verify existence. |

### 2.2 Space Operations
| Service Function | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `getViewableSpaces` | `(user, filter = {})` | `Promise<object[]>` | Core visibility resolver returning spaces the user is permitted to view. Shared by `listSpaces` and `searchDocuments` to guarantee zero rule drift. |
| `listSpaces` | `(user, filter = {})` | `Promise<object[]>` | Retrieves documentation spaces visible to the user, with populated project titles, active document counts (aggregated in a single query with no N+1), and caller permission flags (`canUpdate`, `canManage`, `myAccess`). Supports optional `projectId` filter. |
| `createSpace` | `(userId, spaceData)` | `Promise<object>` | Persists a new documentation space record owned by `userId`. |
| `getSpaceById` | `(spaceId)` | `Promise<object \| null>` | Retrieves a single space record with populated project and member references. |
| `getSpaceDetail` | `(space, user, projectRole)` | `Promise<object>` | Computes complete space details including active document count, archived count, and per-workflow-area breakdown (`areaCounts`). |
| `updateSpace` | `(spaceId, updateData)` | `Promise<object>` | Applies updates to space metadata, project linkage, or permission rules. Throws 404 if not found. |
| `deleteSpaceCascade` | `(spaceId)` | `Promise<{ deletedSpaceId, deletedDocumentsCount }>` | Permanently hard deletes a space and cascades deletion to all child documents. |

### 2.3 Document Operations
| Service Function | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `listDocuments` | `(spaceId, options = {})` | `Promise<object[]>` | Retrieves documents belonging to `spaceId`. Supports filtering by `area` and `includeArchived`. Sorted newest first. |
| `searchDocuments` | `(user, { q, limit })` | `Promise<{ documents: object[] }>` | Searches non-archived document titles across spaces the user is permitted to view. Escapes regex characters to prevent injection, sorts prefix match first, then alphabetical. |
| `createDocument` | `(spaceId, userId, documentData)` | `Promise<object>` | Creates a new external document link associated with `spaceId`. |
| `getDocumentById` | `(documentId)` | `Promise<object \| null>` | Retrieves a single document by ID. |
| `updateDocument` | `(documentId, updateData)` | `Promise<object>` | Updates title, URL, provider, or area. Throws 404 if not found. |
| `archiveDocument` | `(documentId)` | `Promise<{ message, document }>` | Soft-deletes a document by setting `archived = true`. |
| `deleteDocumentPermanent` | `(documentId)` | `Promise<{ message, deletedDocumentId }>` | Permanently hard-deletes a document record from the database. |

---

## 3. PostgreSQL Schema Mapping (Supabase Target)

In the planned Supabase migration (Phase 1 & Phase 4), Mongoose models map to normalized PostgreSQL relational tables with foreign keys and cascading constraints:

```sql
-- 1. Documentation Spaces
CREATE TABLE documentation_spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(120) NOT NULL,
    description TEXT NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    access_type VARCHAR(20) NOT NULL CHECK (access_type IN ('all', 'project_members', 'selected')),
    update_type VARCHAR(20) NOT NULL CHECK (update_type IN ('all', 'project_members', 'selected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Selected Space Members (Normalized from MongoDB arrays)
CREATE TABLE space_access_members (
    space_id UUID NOT NULL REFERENCES documentation_spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    PRIMARY KEY (space_id, user_id)
);

CREATE TABLE space_update_members (
    space_id UUID NOT NULL REFERENCES documentation_spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    PRIMARY KEY (space_id, user_id)
);

-- 3. Documents
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES documentation_spaces(id) ON DELETE CASCADE,
    title VARCHAR(120) NOT NULL,
    url VARCHAR(2048) NOT NULL,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('google_doc', 'google_drive', 'external_url')),
    area VARCHAR(20) NOT NULL CHECK (area IN ('general', 'requirements', 'design', 'development', 'testing', 'deployment')),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance
CREATE INDEX idx_documents_space_id ON documents(space_id);
CREATE INDEX idx_documents_area ON documents(area);
CREATE INDEX idx_documents_archived ON documents(archived);
CREATE INDEX idx_documentation_spaces_project ON documentation_spaces(project_id);
```

---

## 4. Row Level Security (RLS) Policy Mapping

When migrated to Supabase, the Documentation permission matrix maps to PostgreSQL Row Level Security policies:

### 4.1 Helper Functions
```sql
-- Check if current user is platform admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
          AND ('admin' = ANY(position) OR 'executive' = ANY(position))
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- Check user's project role
CREATE OR REPLACE FUNCTION get_user_project_role(p_project_id UUID) RETURNS VARCHAR AS $$
    SELECT role FROM project_members
    WHERE project_id = p_project_id AND user_id = auth.uid()
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;
```

### 4.2 Space Policies (`documentation_spaces`)
- **`SELECT` (View Stealth Rule)**:
  Returns rows only if the user is an Admin, Space Creator, or meets `accessType` / `updateType` criteria. Unauthorized queries return 0 rows (triggering 404 in client UX, never leaking space existence).
  ```sql
  CREATE POLICY space_view_policy ON documentation_spaces
  FOR SELECT TO authenticated
  USING (
      is_admin()
      OR created_by = auth.uid()
      OR access_type = 'all'
      OR (access_type = 'project_members' AND get_user_project_role(project_id) IS NOT NULL)
      OR (access_type = 'selected' AND EXISTS (
          SELECT 1 FROM space_access_members WHERE space_id = id AND user_id = auth.uid()
      ))
      OR update_type = 'all'
      OR (update_type = 'project_members' AND get_user_project_role(project_id) IS NOT NULL)
      OR (update_type = 'selected' AND EXISTS (
          SELECT 1 FROM space_update_members WHERE space_id = id AND user_id = auth.uid()
      ))
  );
  ```
- **`INSERT` (Create Space)**:
  ```sql
  CREATE POLICY space_create_policy ON documentation_spaces
  FOR INSERT TO authenticated
  WITH CHECK (
      is_admin()
      OR (project_id IS NOT NULL AND get_user_project_role(project_id) = 'lead')
  );
  ```
- **`UPDATE` (Manager Access)**:
  ```sql
  CREATE POLICY space_update_policy ON documentation_spaces
  FOR UPDATE TO authenticated
  USING (is_admin() OR created_by = auth.uid());
  ```
- **`DELETE` (Hard Cascade Delete)**:
  ```sql
  CREATE POLICY space_delete_policy ON documentation_spaces
  FOR DELETE TO authenticated
  USING (is_admin());
  ```

### 4.3 Document Policies (`documents`)
- **`SELECT`**:
  Users who can view the parent space can view active documents. Viewing archived documents requires update permission on the space.
- **`INSERT` & `UPDATE`**:
  Requires update permissions on the parent space (`is_admin()`, creator, in `space_update_members`, or project member if `update_type = 'project_members'`).
- **`DELETE`**:
  Hard deletion allowed only for platform admins (`is_admin()`). Soft deletion is handled via `UPDATE documents SET archived = true`.
