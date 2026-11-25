# AIROST intranet

Internal operations portal for AIROST club members, managing project boards, documentation spaces, authentication, and member profiles.

## Architecture

The system consists of three components:
- React single-page application (client) built with Create React App and Tailwind CSS on port 3000.
- Express REST API (server) with session authentication and Google OAuth 2.0 on port 4000.
- MongoDB database for member data, projects, and documents on port 27017.

## Local development

Follow the developer guide to configure environment variables, run containers, seed mock data, and inspect logs:
- [Developer setup guide](docs/developer-setup.md)

Quick start with Docker Compose:

```bash
docker compose up --build
```

## Contributing and workflow

Refer to the project guidelines before opening pull requests or proposing changes:
- [Contributing guidelines](CONTRIBUTING.md) for branch naming rules, conventional commits, PR formats, and review approval policies.
- [Project context](AGENTS.md) for coding standards, project rules, and architectural expectations.

## Testing

Run the following command from the `client` directory to execute the `MemberDirectory` unit tests and generate a code coverage report.

```bash
cd client

npm test -- --coverage --watchAll=false --runInBand --collectCoverageFrom="src/pages/{MemberDirectory,Profile}/**/*.{js,jsx}" src/tests/unit/MemberDirectory src/tests/unit/Profile
```

### Command options

| Option | Purpose |
|---|---|
| `--coverage` | Generate a code coverage report. |
| `--watchAll=false` | Disable Jest watch mode so tests run once and exit. |
| `--runInBand` | Run tests sequentially in a single process. |
| `--collectCoverageFrom` | Collect coverage for JavaScript and JSX files under `src/pages/MemberDirectory` and `src/pages/Profile`, including files not imported by the executed tests. |
| `src/tests/unit/MemberDirectory src/tests/unit/Profile` | Run both unit test directories. |

### Review the results

After execution, review the coverage summary:
- Statement coverage: percentage of executable statements covered by tests.
- Branch coverage: percentage of conditional branches covered.
- Function coverage: percentage of functions called during tests.
- Line coverage: percentage of executable lines covered.

Inspect uncovered lines and branches to identify missing test cases.

Note: Coverage measures how much code runs during tests, not whether assertions verify required behavior. Review test assertions and edge cases alongside coverage figures.

### Recommended coverage benchmarks

| Metric | Minimum | Healthy Target | Excellent |
| :--- | :--- | :--- | :--- |
| **% Stmts** | 70% | 80% to 90% | 90% to 100% |
| **% Branch** | 60% | 75% to 85% | 90% to 100% |
| **% Funcs** | 70% | 80% to 90% | 90% to 100% |
| **% Lines** | 70% | 80% to 90% | 90% to 100% |
