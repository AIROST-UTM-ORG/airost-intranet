# Airost Intranet — AI Context

## 1. Coding Standards
- Follow the existing project architecture and conventions. Inspect relevant files before making changes.
- Organize code into reusable, single-purpose components. Avoid duplication and unnecessary complexity.
- Keep changes focused; do not refactor unrelated code or add dependencies without justification.
- If requirements or architectural decisions are unclear, ask before proceeding.

## 2. UI/UX Design
- Create polished, modern, distinctive UI—not generic AI-generated dashboards.
- Use purposeful colors, typography, spacing, visual hierarchy, subtle depth, and consistent design patterns.
- Avoid plain layouts, excessive cards, and overused gradients.
- Maintain Airost's visual identity, accessibility, responsiveness, and existing functionality.
- UI tasks must not modify backend code unless explicitly requested.

## 3. Project Rules
- Stack: React, Node.js, and MongoDB. Follow the existing implementation; do not introduce alternative technologies without approval.
- Respect existing API contracts, database schemas, authentication, and authorization.
- Never expose, hardcode, or commit secrets or credentials.
- AI-generated code must be understood, tested, and reviewed before merging.

## 4. Team Collaboration
- Use feature branches and descriptive Conventional Commit messages (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`).
- Do not commit directly to `main` or force-push shared branches.
- Submit pull requests for review. Run relevant tests and checks before merging.
- Keep changes small and focused. Communicate breaking changes, API/schema changes, and shared-file conflicts.
- Never overwrite teammates' work without coordination.