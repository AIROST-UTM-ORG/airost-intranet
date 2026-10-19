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