## Run Unit Tests with Coverage

Run the following command from the `client` directory to execute the `MemberDirectory` unit tests and generate a code coverage report.

```bash
cd client

npm test -- --coverage --watchAll=false --runInBand --collectCoverageFrom="src/pages/MemberDirectory/**/*.{js,jsx}" src/tests/unit/MemberDirectory
```

### Command Options

| Option | Purpose |
|---|---|
| `--coverage` | Generate a code coverage report. |
| `--watchAll=false` | Disable Jest watch mode so tests run once and exit. |
| `--runInBand` | Run tests sequentially in a single process. |
| `--collectCoverageFrom` | Collect coverage for JavaScript and JSX files under `src/pages/MemberDirectory`, including files not imported by the executed tests. |
| `src/tests/unit/MemberDirectory` | Run the unit tests located in this directory. |

### Review the Results

After execution, review the coverage summary for:

- **Statements:** Percentage of executable statements covered by tests.
- **Branches:** Percentage of conditional branches covered.
- **Functions:** Percentage of functions called during tests.
- **Lines:** Percentage of executable lines covered.

Inspect uncovered lines and branches to identify missing test cases.

**Note:** Coverage measures how much code is exercised, not whether the tests adequately verify its behavior. Review assertions and edge cases alongside the coverage percentages.

### Recommended Coverage Benchmarks

| Metric | Minimum | Healthy Target | Excellent |
| :--- | :--- | :--- | :--- |
| **% Stmts** | 70% | 80–90% | 90–100% |
| **% Branch** | 60% | 75–85% | 90–100% |
| **% Funcs** | 70% | 80–90% | 90–100% |
| **% Lines** | 70% | 80–90% | 90–100% |
# AIROST intranet

Internal operations portal for AIROST club members, managing project boards, documentation spaces, authentication, and member profiles.

## Architecture

The system consists of three primary components:

- **Client**: React single-page application built with Create React App and Tailwind CSS. Runs on port `3000`.
- **Server**: Express REST API with session authentication and Google OAuth 2.0. Runs on port `4000`.
- **Database**: MongoDB instance for member data, projects, and documents. Runs on port `27017`.

## Local development

Follow the step-by-step instructions in the developer guide to configure environment variables, run containers, seed mock data, and inspect logs:

- [Developer setup guide](docs/developer-setup.md)

Quick start with Docker Compose:

```bash
docker compose up --build
```

## Contributing and workflow

Refer to the project guidelines before opening pull requests or proposing changes:

- [Contributing guidelines](CONTRIBUTING.md) for branch naming rules, conventional commits, PR formats, and review approval policies.
- [Project context](AGENTS.md) for coding standards, project rules, and architectural expectations.
