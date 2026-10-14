# Documentation Backend Manual Testing Guide

This guide provides step-by-step cURL commands to manually test the Documentation Spaces and Documents backend API running on `http://localhost:4000` (or the proxy on `http://localhost:3000`).

---

## 1. Prerequisites & Session Authentication

All endpoints under `/doc` require an authenticated session (`req.user`).

```bash
# Export the API base URL
API_URL="http://localhost:4000"

# Store session cookie in cookies.txt after logging in through Google OAuth
COOKIE_JAR="cookies.txt"
```

To test unauthenticated requests:
```bash
# 1.1 Expect 401 UNAUTHENTICATED
curl -X GET "$API_URL/doc/spaces"
```
**Expected Response:** `401 Unauthorized`
```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "User session is not authenticated"
  }
}
```

---

## 2. Documentation Spaces Testing

### 2.1 List Accessible Spaces
```bash
curl -X GET "$API_URL/doc/spaces" \
  -b "$COOKIE_JAR"
```
**Expected Response:** `200 OK`
Returns an array of spaces the caller can view, including populated project info, `documentCount`, `canUpdate`, and `canManage`.

---

### 2.2 Create a Project-Linked Space
*(Caller must be Platform Admin or Project Lead)*
```bash
curl -X POST "$API_URL/doc/spaces" \
  -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Engineering Handbook",
    "description": "Technical references and delivery guides for the team.",
    "projectId": "<VALID_PROJECT_OBJECT_ID>",
    "accessType": "project_members",
    "updateType": "selected",
    "accessMembers": [],
    "updateMembers": ["<VALID_USER_OBJECT_ID>"]
  }'
```
**Expected Response:** `201 Created`

---

### 2.3 Create a Standalone Space
*(Platform Admin only)*
```bash
curl -X POST "$API_URL/doc/spaces" \
  -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Team Handbook",
    "description": "Shared onboarding and team practices.",
    "projectId": null,
    "accessType": "all",
    "updateType": "all"
  }'
```
**Expected Response:** `201 Created`

---

### 2.4 Validation Failure: Standalone with `project_members`
```bash
curl -X POST "$API_URL/doc/spaces" \
  -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Invalid Standalone",
    "description": "Attempting project_members without projectId",
    "accessType": "project_members"
  }'
```
**Expected Response:** `400 Bad Request` (`VALIDATION_ERROR`)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "accessType",
        "message": "accessType 'project_members' cannot be used on a standalone space"
      }
    ]
  }
}
```

---

### 2.5 Read Space Details (Counts & Area Breakdown)
```bash
curl -X GET "$API_URL/doc/spaces/<SPACE_ID>" \
  -b "$COOKIE_JAR"
```
**Expected Response:** `200 OK`
```json
{
  "_id": "<SPACE_ID>",
  "title": "Engineering Handbook",
  "description": "Technical references and delivery guides for the team.",
  "projectId": {
    "_id": "<PROJECT_ID>",
    "title": "Airost Intranet"
  },
  "canUpdate": true,
  "canManage": true,
  "documentCount": 2,
  "archivedCount": 1,
  "areaCounts": {
    "general": 0,
    "requirements": 0,
    "design": 0,
    "development": 2,
    "testing": 0,
    "deployment": 0
  }
}
```

---

### 2.6 View Stealth Rule Verification
When an authenticated user who is not permitted to view `<RESTRICTED_SPACE_ID>` sends a request:
```bash
curl -X GET "$API_URL/doc/spaces/<RESTRICTED_SPACE_ID>" \
  -b "$NON_MEMBER_COOKIE_JAR"
```
**Expected Response:** `404 Not Found` (`NOT_FOUND` - space existence is concealed).

---

### 2.7 Update Space Settings
*(Creator or Admin only)*
```bash
curl -X PATCH "$API_URL/doc/spaces/<SPACE_ID>" \
  -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Engineering Handbook (Updated)",
    "description": "Updated description text"
  }'
```
**Expected Response:** `200 OK`

---

## 3. Documents Testing

### 3.1 Add a Document Link
*(Caller must have update rights on space)*
```bash
curl -X POST "$API_URL/doc/spaces/<SPACE_ID>/documents" \
  -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Database Schema",
    "url": "https://docs.google.com/document/d/1exampleDoc/edit",
    "area": "development"
  }'
```
**Expected Response:** `201 Created`
```json
{
  "_id": "<DOCUMENT_ID>",
  "spaceId": "<SPACE_ID>",
  "title": "Database Schema",
  "url": "https://docs.google.com/document/d/1exampleDoc/edit",
  "provider": "google_doc",
  "area": "development",
  "archived": false
}
```

---

### 3.2 List Active Documents in Space (Filtered by Area)
```bash
curl -X GET "$API_URL/doc/spaces/<SPACE_ID>/documents?area=development" \
  -b "$COOKIE_JAR"
```
**Expected Response:** `200 OK` (returns array of active documents in development).

---

### 3.3 List Archived Documents in Space
*(Caller must have update rights; view-only users receive 403)*
```bash
curl -X GET "$API_URL/doc/spaces/<SPACE_ID>/documents?includeArchived=true&archivedOnly=true" \
  -b "$COOKIE_JAR"
```
**Expected Response:** `200 OK` (returns array of archived documents).

---

### 3.4 Edit Document (Keeping Current Link)
*(Per Screen 13: "Leave empty to keep current link")*
```bash
curl -X PATCH "$API_URL/doc/documents/<DOCUMENT_ID>" \
  -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Database Schema (v2)",
    "url": ""
  }'
```
**Expected Response:** `200 OK` (title is updated; url and provider remain unchanged).

---

### 3.5 Soft Delete (Archive Document)
```bash
curl -X DELETE "$API_URL/doc/documents/<DOCUMENT_ID>" \
  -b "$COOKIE_JAR"
```
**Expected Response:** `200 OK`
```json
{
  "message": "Document archived successfully",
  "document": {
    "_id": "<DOCUMENT_ID>",
    "archived": true
  }
}
```

---

### 3.6 Restore Archived Document
```bash
curl -X PATCH "$API_URL/doc/documents/<DOCUMENT_ID>" \
  -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d '{
    "archived": false
  }'
```
**Expected Response:** `200 OK` (archived flag set to `false`).

---

### 3.7 Permanent Hard Delete of Document
*(Platform Admin only)*
```bash
curl -X DELETE "$API_URL/doc/documents/<DOCUMENT_ID>/permanent" \
  -b "$ADMIN_COOKIE_JAR"
```
**Expected Response:** `200 OK`
```json
{
  "message": "Document permanently deleted",
  "deletedDocumentId": "<DOCUMENT_ID>"
}
```

---

### 3.8 Hard Cascade Delete of Space and Documents
*(Platform Admin only)*
```bash
curl -X DELETE "$API_URL/doc/spaces/<SPACE_ID>" \
  -b "$ADMIN_COOKIE_JAR"
```
**Expected Response:** `200 OK`
```json
{
  "message": "Space and associated documents deleted successfully",
  "deletedSpaceId": "<SPACE_ID>",
  "deletedDocumentsCount": 3
}
```
