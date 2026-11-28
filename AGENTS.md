# AGENTS.md

Instructions for AI coding agents working on the Airost Intranet. Read this file before editing code. Human contributors follow the same rules (see [CONTRIBUTING.md](CONTRIBUTING.md)).

## Project overview
- **Description:** A club-internal platform where team members collaborate: member directory and profiles, project management with Kanban task tracking, documentation sharing, and an event calendar, with role-based and project-level access control.
- **Team:** 4 developers (Lee, Tony, Ahmad, Zi Ping) working in parallel. Expect other branches to be changing the repository at the same time.
- **Current stack:** React 19 (Create React App) + Tailwind CSS/DaisyUI/Ant Design + Redux Toolkit + TanStack Query on the client; Node.js + Express + Mongoose (MongoDB Atlas) + Passport Google OAuth on the server; Google Calendar API via `googleapis`; server deployed with Docker to Google Cloud Run.
- **Planned direction:** The team has decided to migrate from MongoDB to Supabase (PostgreSQL + Auth + Storage + RLS). This migration is planned in phases. See "Migration status" below. Do not assume which backend a given file uses; check the file and the assigned issue.

## Core directives and AI context
### 1. Coding standards
- Follow existing project architecture and conventions. Inspect relevant files before making changes.
- Organize code into reusable, single-purpose components. Avoid duplication and unnecessary complexity.
- Keep changes focused; do not refactor unrelated code or add dependencies without justification.
- If requirements or architectural decisions are unclear, ask before proceeding.

### 2. UI stack
- Use Tailwind CSS and DaisyUI for new components.
- Do not introduce new usage of MDB React UI Kit. Use Ant Design only where the surrounding page already uses it (for example, existing modals).
- Maintain existing visual identity, accessibility, responsiveness, and functionality.
- UI tasks must not modify backend code unless explicitly requested.

### 3. Project rules
- Current stack uses React, Node.js, and MongoDB. Follow the existing implementation; do not introduce alternative technologies without approval.
- Respect existing API contracts, database schemas, authentication, and authorization.
- Never expose, hardcode, or commit secrets or credentials.
- AI-generated code must be understood, tested, and reviewed before merging.

### 4. Git workflow delegation
All branching, commit messages, PR templates, code review policies, and definition of done rules are centralized in [CONTRIBUTING.md](CONTRIBUTING.md). Follow the protocols defined there:
- Branch naming: `feature/<name>`, `fix/<name>`, `refactor/<name>`, `docs/<name>`.
- Commit format: Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).
- PR requirements: summary of changes, motivation, test verification, and issue closure reference (`Closes #<issue>`).
- Review and approvals: two approvals for auth, permissions, database access, deployment, and shared architecture; one approval for standard features and UI.
- Definition of done: acceptance criteria met, tests passing locally, proper labels applied, and project board linked.

## Migration status (read before touching data or auth code)
- Legacy code: Mongoose models in `server/models/`, Passport sessions with `connect-mongo`.
- Target code: Supabase tables with foreign keys, Supabase Auth (Google provider), Supabase Storage, Row Level Security for platform and project-level access.
- Rules:
  - Do not start migrating a module unless the assigned issue says so. Major architecture or database changes require prior team discussion.
  - Do not mix both data layers inside one feature. A module is either fully legacy or fully migrated.
  - New code for a migrated module must access data through a dedicated data-access layer (for example, `client/src/services/` or `server/services/`), not scattered inline queries, so the data source can be swapped cleanly.
  - AI-generated schema, SQL, and RLS policies are security-sensitive. Always flag them for review by Tony or another experienced developer.
- Phases: 1 Supabase Migration -> 2 Auth & Users -> 3 Projects & Tasks -> 4 Documents & Events -> 5 Admin & Integration -> 6 Testing & Deployment.

## Repository structure
```
airost-intranet/
├── AGENTS.md                  # This file
├── CONTRIBUTING.md            # Contribution guidelines and Git workflow
├── README.md                  # Repository overview
├── client/                    # React SPA (dev port 3000, proxies to :4000)
│   ├── public/
│   └── src/
│       ├── assets/            # Static images / SVGs
│       ├── components/        # Shared reusable UI (Layout/, Sidepanel/, ProjectList.js, RequireAuth.js)
│       ├── config/            # Client config and API endpoints
│       ├── consts/            # Constants
│       ├── context/           # authContext.js (global auth/session)
│       ├── data/              # Mock/static data (never use as real data source)
│       ├── hooks/             # Custom hooks (useAuth.js, useFetchUsers.js)
│       ├── pages/             # Route views: Admin/, Dashboard/, Documentation/, Events/,
│       │                      #   Login/, Projects/, ProjectTracking/, Unauthorized/
│       ├── App.js             # Top-level routing and providers
│       └── index.js
├── docs/                      # Documentation and architecture contracts
│   ├── api/                   # API specifications
│   ├── architecture/          # Active architecture contracts (database_schema, features, techstack)
│   └── proposals/             # Architecture and design proposals
└── server/                    # Express REST API (dev port 4000, production port 8080)
    ├── controller/            # Route handler logic (admin, doc, event, projects, user)
    ├── models/                # Mongoose schemas (legacy; see Migration status)
    ├── routes/                # Express routers (/admin, /auth, /doc, /event, /projects, /user)
    ├── utils/                 # Helpers (historyHelper.js)
    ├── google_calendar.js     # Google Calendar integration (service account JWT)
    ├── passport.js            # Google OAuth strategy
    ├── server.js              # App entry, middleware, DB connection
    └── Dockerfile
```

### Where new code goes
- **One feature, one folder:** Put page-level code in `client/src/pages/<Feature>/` and keep feature-specific components, hooks, and helpers inside that folder. Only move code to `components/` or `hooks/` when at least two features use it.
- **Server:** Each domain has a matching trio: `routes/<domain>Routes.js` -> `controller/<domain>Controller.js` -> model/service. Keep routes thin (wiring only), controllers free of raw DB details where practical.
- **Do not create new top-level folders** or reorganize directories without team agreement.

## Avoiding conflicts in parallel development
These files are touched across features. Make minimal, additive edits (add a line, do not reformat or reorder):
- `client/src/App.js` (routes and providers)
- `server/server.js` (middleware and route mounting)
- `client/package.json`, `server/package.json` and lockfiles
- `client/src/components/Sidepanel/` and `Layout/` (navigation entries)
- `client/tailwind.config.js`

Rules:
- Stay inside the scope of your assigned issue. Do not refactor, rename, or clean up unrelated files in the same branch.
- Never run repository-wide formatters or auto-fixers that rewrite files you did not change.
- Do not add or upgrade dependencies unless the issue requires it; mention any change in the PR description. Lockfile changes must come from `npm install` run in the correct folder, never hand-edited.
- Never work on another developer's feature branch unless explicitly asked.
- Pull and rebase or merge `main` before opening a PR; resolve conflicts carefully and re-test.

## Build and development commands
`client/` and `server/` are independent packages without npm workspaces. Run commands in the corresponding folder:

- **Install dependencies:** `cd client && npm install` and `cd server && npm install` (separately)
- **Run backend (dev):** `cd server && npm run dev` (nodemon, `NODE_ENV=development`, port 4000)
- **Run backend (prod-like):** `cd server && npm start`
- **Run frontend:** `cd client && npm start` (port 3000)
- **Build frontend:** `cd client && npm run build`
- **Run client tests:** `cd client && npm test` (Jest + React Testing Library)
- **Server tests:** `cd server && npm test` (runs Jest with Supertest and in-memory MongoDB via `mongodb-memory-server`; runs in-band and never connects to remote Atlas or reads `.env`).
- **Node version:** Docker uses Node 18; local machines may run newer versions. Do not use features unavailable in Node 18 unless the Dockerfile is upgraded as part of the task.

## Code style and conventions
- Follow existing patterns, naming, and formatting in the file you are editing.
- Write clear, self-documenting code; add concise comments only for non-obvious logic.
- Use `date-fns` for dates. Do not add new `moment` usage.
- Use TanStack Query for server state; Redux Toolkit only for complex client state (for example, Project Tracking boards). Do not add a third state mechanism.
- Use `axios` through the shared client config; do not hardcode API URLs.
- Use `react-hook-form` for forms.
- Handle errors explicitly (loading, empty, and error states in UI; meaningful HTTP status codes and messages on the API).
- Authorization must be enforced on the server and database, not only by hiding UI elements. `RequireAuth` is a UX guard, not security.

## Domain rules
- **Roles:** At minimum Admin, Project Lead, Member. Project-level roles are `lead`, `advisor`, `member`. Permission checks must consider both platform role and project membership.
- **Projects:** Project members live in the join entity (`PROJECT_MEMBER`), not as fields on the project.
- **Events:** Categories `meeting` / `workshop` / `competition`; statuses `draft` / `published` / `cancelled` / `completed`. Capacity and registration status are enforced server-side.
- **Event attendance statuses:** `registered` / `attended` / `cancelled` / `no_show`.
- **Documents:** Link-only architecture (Locked Decision 4): stores titles, external URLs (Google Docs/Drive, HTTPS), and metadata only. No file upload or download, no content storage, no file size metadata, and no version history. Soft delete archives documents; hard delete of documents and space deletion are admin only. Space access uses `accessType` and `updateType` (`all` / `project_members` / `selected`), with member lists stored directly on the space (`accessMembers[]`, `updateMembers[]`). 6 workflow areas: `general`, `requirements`, `design`, `development`, `testing`, `deployment`. See `docs/api/documentation.md`.
- **Task changes:** Must be recorded in task history (see `server/utils/historyHelper.js`). Do not bypass it.
- **Source of truth docs:** [`docs/architecture/features.md`](docs/architecture/features.md) (scope and priorities), [`docs/architecture/database_schema.md`](docs/architecture/database_schema.md) (data model), [`docs/architecture/techstack.md`](docs/architecture/techstack.md) (stack), and [CONTRIBUTING.md](CONTRIBUTING.md) (team workflow). If code and docs disagree, report the discrepancy instead of silently picking one.

## Testing strategy
- Real tests only: Write real, working tests. Do not mock, fake, or stub implementations just to make a check pass.
- Always run the relevant test suite after changes and fix regressions before finishing. If tests cannot run (missing setup, no script), say so explicitly rather than claiming success.
- For authorization features, test the negative case (for example, a normal Member cannot edit an event, an unauthorized user cannot modify project members).
- Bug fixes should include a test that reproduces the bug where practical.
- Report honestly: Never mark work complete if acceptance criteria are not met, and never hide a known bug.

## Security and secrets
- Never commit `.env`, API keys, Supabase service-role keys, Google OAuth secrets, GitHub tokens, passwords, or Google service-account credentials.
- Use environment variables. Client-exposed variables may only hold public values (such as Supabase URL and anon key). Server-side keys must never reach the React bundle.
- Ensure `server/.env` is covered by `.gitignore`. Never print, copy, or echo its contents.
- Validate and sanitize all input on the server. Do not trust client-supplied roles or user IDs.
- Do not disable authentication, CORS restrictions, or RLS policies to make something work.

## Known technical debt (do not fix opportunistically)
Only address these when an assigned issue explicitly asks:
- `@tanstack/react-query` and `git-filter-repo` are wrongly listed in `server/package.json`.
- Three UI libraries coexist (DaisyUI, Ant Design, MDB); `moment` and `date-fns` both installed.
- Node version mismatch between local development and the Docker image (Node 18).

## Agent guardrails and constraints
- Do not touch `.env` files, production credentials, deployment configuration (`server/Dockerfile`, Cloud Run settings), CI settings, or lockfiles by hand without explicit user approval.
- Do not run destructive commands (dropping collections or tables, `git reset --hard`, `git push --force`, deleting branches) or touch the production database.
- Ask clarifying questions before editing multiple files if requirements, scope, or the target data layer (MongoDB vs Supabase) are ambiguous.
- Stay in scope: Implement only what the assigned issue asks. Mention adjacent problems in your summary instead of fixing them.
- No new dependencies or new folders without stating why and getting approval.
- AI transparency: AI-generated code must be understood and reviewed by the developer submitting it. Summarize what changed, which files were touched, and what was tested, so the PR description can be written accurately. Do not fabricate commit history or contribution records.
- When docs, schema, and code disagree, report the discrepancy and ask which is current.

## Before you finish (checklist)
1. Changes are limited to the issue scope and the right directories.
2. No secrets, `.env` contents, or credentials added.
3. Authorization enforced server-side and in the database.
4. Relevant tests written and run; results reported honestly.
5. Shared files (`App.js`, `server.js`, `package.json`) changed minimally.
6. Docs updated if behavior, schema, or commands changed.
7. Summary lists files changed, assumptions made, and open questions.
