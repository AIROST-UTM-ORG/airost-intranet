# Contributing to AIROST intranet

Guidelines for Git branching, commit messages, secret safety, pull requests, and code review expectations.

## Project context

Before implementing changes, read [AGENTS.md](AGENTS.md) to understand project rules, coding standards, and architecture expectations. Follow the guidelines defined there rather than introducing conflicting patterns.

## Branching protocol

The `main` branch is protected and always deployable.

- Never push directly to `main`.
- Never force-push (`git push --force`) to `main`.
- Branch from `main` using descriptive prefix names:
  - Features: `feature/<descriptive-name>` (example: `feature/task-kanban`)
  - Bug fixes: `fix/<descriptive-name>` (example: `fix/login-redirect`)
  - Refactoring: `refactor/<descriptive-name>` (example: `refactor/session-storage`)
- Avoid vague branch names like `test`, `update`, `work`, or `final`.
- Do not commit directly onto another contributor's branch without explicit coordination.

## Commit standards and granularity

Format every commit with a conventional commit prefix:

- `feat: <action in imperative mood>`
- `fix: <issue resolved>`
- `refactor: <scope changed>`
- `docs: <documentation updated>`
- `test: <tests added or modified>`
- `chore: <maintenance tasks>`

Do not use vague single-word commit messages such as `update`, `fix`, or `changes`.

### Atomic commits

Keep commits small and focused on a single layer. When completing a feature, commit logical layers independently:

1. Database schemas and models
2. Data access, API routes, and controllers
3. Frontend UI components
4. Validation and error handling
5. Automated tests

## Secret management and security guardrails

- Never commit `.env` files or local configuration files containing credentials.
- Never hardcode API keys, OAuth secrets, session secrets, passwords, or tokens in source code.
- Client credentials: Only variables prefixed with `REACT_APP_` may exist in frontend code. Server keys must never appear in client bundles.
- If a secret is committed by mistake, notify the maintainers immediately to rotate the credential.

## Pull request format

Every pull request must follow this template:

```markdown
## What changed
- [Summary of technical changes made]

## Why
- [Reason for the change or requirement context]

## Testing
- [x] [Specific verification step 1]
- [x] [Specific verification step 2]

## Related issue
Closes #<issue_number>
```

Keep pull requests focused on a single issue. Large, sprawling pull requests take longer to review and risk merge conflicts.

## Code review approval policy

Pull requests require review approvals before merging based on the risk and scope of the change:

| Change type | Required approvals |
| :--- | :--- |
| UI styling, layout, or minor frontend changes | 1 |
| Standard feature implementation | 1 |
| Routine bug fix with limited impact | 1 |
| Login, logout, cookies, or session handling | 2 |
| Roles, permissions, and authorization | 2 |
| Sensitive backend API or database access changes | 2 |
| Docker, CI/CD, server deployment, or production configuration | 2 |
| Shared architecture or major refactoring | 2 |

Any frontend change that introduces a security or authorization risk requires two approvals regardless of UI scope.

## Definition of done

Before submitting a pull request for final review, verify:

- All acceptance criteria listed in the issue are met.
- Automated tests pass locally.
- No secrets or environment files are staged in Git.
- The PR description follows the required format and references the target issue.
