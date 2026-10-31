## Run Unit Tests — Member Profile

Run the following commands from the project root to execute the `MemberDirectory` profile unit tests.

```bash
cd client

npm test -- --watchAll=false --runInBand src/tests/unit/Profile/Profile.test.js
```

### Command Options

- `--watchAll=false` — Run tests once without entering watch mode.
- `--runInBand` — Execute tests sequentially in a single process.
- `src/tests/unit/Profile/Profile.test.js` — Specify the test file to execute.

### Verify the Results

- Confirm that all tests pass.
- Review any failed assertions or runtime errors.
- If tests fail, investigate the root cause before modifying the implementation or test expectations.

