# AGENTS.md

Guidelines for AI coding agents working on the Airost Intranet. Read this file fully before editing code. Human contributors follow [CONTRIBUTING.md](CONTRIBUTING.md).

## Project overview
The Airost Intranet is an internal collaboration platform for club members. It provides a member directory with profiles, project management with Kanban task tracking, documentation sharing, and an event calendar with role-based and project-level access control.

Four developers (Lee, Tony, Ahmad, Zi Ping) work on this repository in parallel. Other branches may update the codebase concurrently.

Current stack:
- Client: React 19 (Create React App), Tailwind CSS, DaisyUI, Ant Design, Redux Toolkit, TanStack Query.
- Server: Node.js, Express, Mongoose (MongoDB Atlas), Passport Google OAuth, Google Calendar API (`googleapis`).
- Deployment: Docker on Google Cloud Run.

Planned direction:
The team is migrating from MongoDB to Supabase (PostgreSQL, Supabase Auth, Supabase Storage, and Row Level Security). Migration occurs in phases. Do not assume which backend a given file uses; inspect the file and the assigned issue before making changes.

## Core directives
### 1. Coding standards
- Follow existing project architecture and conventions. Inspect relevant files before making changes.
- Organize code into reusable, single-purpose components. Avoid duplication and unnecessary complexity.
- Keep changes focused. Do not refactor unrelated code or add dependencies without justification.
- Ask for clarification if requirements or architectural decisions are ambiguous.

### 2. UI and styling
- Standard UI stack: Tailwind CSS and DaisyUI.
- Do not introduce new usage of MDB React UI Kit. Use Ant Design only where surrounding components already rely on it (such as existing modals).
- UI tasks must not modify backend code unless explicitly requested.

### 3. Project rules
- Current stack: React, Node.js, and MongoDB. Follow existing implementations; do not introduce alternative technologies without approval.
- Respect existing API contracts, database schemas, authentication mechanisms, and authorization checks.
- Never expose, hardcode, or commit secrets or credentials.
- Understand, test, and review AI-generated code before merging.

### 4. Team collaboration
Follow [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming, commit formats, pull request standards, and code review expectations. Communicate breaking changes, API or schema updates, and shared-file conflicts. Never overwrite teammate work without coordination.

## Migration status
Legacy code uses Mongoose models in `server/models/` and Passport sessions with `connect-mongo`. Target code uses Supabase tables with foreign keys, Supabase Auth (Google provider), Supabase Storage, and Row Level Security (RLS) for platform and project access.

Rules:
- Do not start migrating a module unless the assigned issue specifies it. Major architecture or database changes require prior team discussion.
- Do not mix data layers within one feature. A module is either fully legacy or fully migrated.
- Access data through a dedicated data-access layer (such as `client/src/services/` or `server/services/`) rather than inline queries, allowing clean backend swaps.
- Flag all AI-generated schemas, SQL, and RLS policies for review by Tony or another senior developer.
- Migration phases:
  1. Supabase Migration
  2. Auth & Users
  3. Projects & Tasks
  4. Documents & Events
  5. Admin & Integration
  6. Testing & Deployment

## Repository structure
```
airost-intranet/
├── AGENTS.md                  # Agent guidelines
├── CONTRIBUTING.md            # Contributor and Git workflow rules
├── techstack.md               # Tech stack reference
├── database_schema.md         # Database schema
├── features.md                # Feature roadmap and scope
├── client/                    # React SPA (port 3000, proxies to port 4000)
│   ├── public/
│   └── src/
│       ├── assets/            # Static images and SVGs
│       ├── components/        # Shared reusable UI (Layout/, Sidepanel/, ProjectList.js, RequireAuth.js)
│       ├── config/            # Client configuration and API endpoints
│       ├── consts/            # Constants
│       ├── context/           # authContext.js (global auth session)
│       ├── data/              # Mock static data (never use as real data source)
│       ├── hooks/             # Custom hooks (useAuth.js, useFetchUsers.js)
│       ├── pages/             # Route views: Admin/, Dashboard/, Documentation/, Events/,
│       │                      #   Login/, Projects/, ProjectTracking/, Unauthorized/
│       ├── App.js             # Top-level routing and providers
│       └── index.js
└── server/                    # Express REST API (port 4000 dev, port 8080 prod)
    ├── controller/            # Route handlers (admin, doc, event, projects, user)
    ├── models/                # Mongoose schemas (legacy; see Migration status)
    ├── routes/                # Express routers (/admin, /auth, /doc, /event, /projects, /user)
    ├── utils/                 # Helpers (historyHelper.js)
    ├── google_calendar.js     # Google Calendar integration (service account JWT)
    ├── passport.js            # Google OAuth strategy
    ├── server.js              # Entry point, middleware, DB connection
    └── Dockerfile
```

### Where new code goes
- One feature, one folder: place page-level code in `client/src/pages/<Feature>/` and keep feature-specific components, hooks, and helpers inside that folder. Only move code to `components/` or `hooks/` when at least two features share it.
- Server architecture: each domain uses a matching trio of `routes/<domain>Routes.js` -> `controller/<domain>Controller.js` -> model or service. Keep routes thin and controllers free of direct database queries.
- Do not create new top-level directories or reorganize folders without team agreement.

## Avoiding conflicts in parallel development
Multiple developers edit the following files. Make minimal, additive edits only (add a line; do not reformat or reorder):
- `client/src/App.js` (routes and providers)
- `server/server.js` (middleware and route mounting)
- `client/package.json`, `server/package.json`, and lockfiles
- `client/src/components/Sidepanel/` and `Layout/` (navigation entries)
- `client/tailwind.config.js`

Rules:
- Stay inside the scope of the assigned issue. Do not refactor, rename, or reformat untouched files.
- Never run repository-wide formatters or auto-fixers that rewrite unchanged files.
- Do not add or upgrade dependencies unless the issue requires it. Document every dependency change in the PR description. Generate lockfile updates with `npm install` inside the relevant package directory, never by manual edits.
- Never work on another developer's feature branch without explicit agreement.
- Pull and rebase or merge `main` before opening a PR. Resolve conflicts carefully and rerun tests.

## Build and development commands
`client/` and `server/` are independent packages without npm workspaces. Run commands in the appropriate directory:

- Install dependencies: `cd client && npm install` and `cd server && npm install` (run separately)
- Run backend (dev): `cd server && npm run dev` (nodemon, `NODE_ENV=development`, port 4000)
- Run backend (prod-like): `cd server && npm start`
- Run frontend: `cd client && npm start` (port 3000)
- Build frontend: `cd client && npm run build`
- Run client tests: `cd client && npm test` (Jest and React Testing Library)
- Run server tests: `cd server && npm test` (Jest, Supertest, and in-memory MongoDB via `mongodb-memory-server`; runs in-band without connecting to remote Atlas or reading `.env`)
- Node version: Docker uses Node 18. Local machines may run newer versions. Avoid features unsupported in Node 18 unless Dockerfile updates are part of the issue.

## Code style and conventions
- Follow existing patterns, naming conventions, and formatting in each edited file.
- Write clear, self-documenting code with concise comments for non-obvious logic.
- UI stack: Tailwind CSS and DaisyUI. Do not introduce new MDB usage. Use Ant Design only where already present.
- Use `date-fns` for date manipulation. Do not introduce new `moment` usage.
- Use TanStack Query for server state. Use Redux Toolkit only for complex client state (such as Project Tracking boards). Do not introduce a third state library.
- Use `axios` through shared client configuration; do not hardcode API URLs.
- Use `react-hook-form` for forms.
- Handle errors explicitly: provide loading, empty, and error states in UI; return meaningful HTTP status codes and messages from APIs.
- Enforce authorization on the server and database, not only by hiding UI elements. `RequireAuth` is a UX guard, not a security boundary.

## Domain rules
- Platform roles are Admin, Project Lead, and Member. Project-level roles are `lead`, `advisor`, and `member`. Permission checks must evaluate both platform roles and project memberships.
- Projects: project members live in the join entity (`PROJECT_MEMBER`), not as direct fields on the project record.
- Events: categories are `meeting`, `workshop`, and `competition`. Statuses are `draft`, `published`, `cancelled`, and `completed`. Enforce capacity and registration status on the server.
- Event attendance statuses: `registered`, `attended`, `cancelled`, and `no_show`.
- Documents: link-only architecture (Locked Decision 4) stores titles, external URLs (Google Docs or Google Drive, HTTPS), and metadata only. Do not add file upload, file download, binary storage, file size metadata, or version history. Soft delete archives documents. Hard delete of documents and space deletion are admin only. Space access uses `accessType` and `updateType` (`all`, `project_members`, `selected`), with member lists stored directly on the space (`accessMembers[]`, `updateMembers[]`). Six workflow areas exist: `general`, `requirements`, `design`, `development`, `testing`, `deployment`. See `docs/api/documentation.md`.
- Task history: record all task modifications through `server/utils/historyHelper.js`. Never bypass task history logging.
- Source documents: `features.md` for scope and priorities, `database_schema.md` for data model, `techstack.md` for stack details, and `CONTRIBUTING.md` for contributor workflow. Flag any discrepancies between code and documentation.

## Git and workflow rules
All branching rules, commit standards, pull request templates, code review approval policies, and Definition of Done criteria are defined in [CONTRIBUTING.md](CONTRIBUTING.md). Follow those instructions for all changes. Never push directly to `main` or force-push shared branches.

## Testing strategy
- Write real, working tests. Do not mock, fake, or stub implementations solely to pass a check.
- Run the relevant test suite after changes and resolve regressions before submitting. If tests cannot run, state the reason explicitly.
- For authorization features, test negative cases (for example, verifying that a standard Member cannot edit an event, or an unauthorized user cannot modify project members).
- Bug fixes should include a regression test reproducing the issue where practical.
- Report results honestly: never mark work complete if acceptance criteria are unmet.

## Security and secrets
- Never commit `.env` files, API keys, Supabase service-role keys, Google OAuth secrets, GitHub tokens, passwords, or Google service account credentials.
- Use environment variables. Client-exposed variables must only contain public values prefixed with `REACT_APP_` (such as Supabase public URLs and anon keys). Server keys must never reach client bundles.
- `server/.env` is ignored by Git; never print, copy, or echo its contents into output logs.
- Validate and sanitize all input on the server. Never trust client-supplied roles or user IDs.
- Never disable authentication, CORS restrictions, or RLS policies to bypass errors.

## Known technical debt
Only address these when an issue explicitly requests it:
- `@tanstack/react-query` and `git-filter-repo` are erroneously listed in `server/package.json`.
- Three UI libraries coexist (DaisyUI, Ant Design, MDB); `moment` and `date-fns` are both installed.
- Node version differences exist between local environments and the Node 18 Docker image.

## Agent guardrails and constraints
- Do not edit `.env` files, production credentials, deployment configurations (`server/Dockerfile`, Cloud Run settings), CI settings, or lockfiles by hand without explicit approval.
- Do not execute destructive commands (dropping collections or tables, `git reset --hard`, `git push --force`, deleting branches) or alter production databases.
- Ask clarifying questions before editing multiple files if requirements, scope, or target data layers are ambiguous.
- Stay in scope: implement only what the assigned issue requests. Document adjacent concerns in summaries instead of fixing them opportunistically.
- Do not introduce new dependencies or top-level folders without prior approval.
- Maintain AI transparency: explain changes clearly, list touched files, and detail testing performed so that PR descriptions remain accurate.
- If documentation, schemas, and implementation code disagree, report the discrepancy and confirm which is authoritative.

## Before you finish
1. Verify changes remain within the assigned issue scope and target directories.
2. Ensure no secrets, credentials, or `.env` entries were staged.
3. Confirm authorization is enforced server-side or in the database.
4. Run relevant tests and report results accurately.
5. Keep changes to shared files (`App.js`, `server.js`, `package.json`) minimal and additive.
6. Update documentation if behavior, schemas, or commands changed.
7. Provide a concise summary of modified files, assumptions made, and any remaining questions.
