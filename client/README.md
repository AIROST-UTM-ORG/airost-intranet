## Run unit tests for member profiles

Run the following commands from the project root to execute the `MemberDirectory` profile unit tests.

```bash
cd client

npm test -- --watchAll=false --runInBand src/tests/unit/Profile/Profile.test.js
```

### Command options

- `--watchAll=false`: run tests once without entering watch mode.
- `--runInBand`: execute tests sequentially in a single process.
- `src/tests/unit/Profile/Profile.test.js`: specify the test file to execute.

### Verify results

- Confirm that all tests pass.
- Review any failed assertions or runtime errors.
- If tests fail, investigate the root cause before modifying the implementation or test expectations.
