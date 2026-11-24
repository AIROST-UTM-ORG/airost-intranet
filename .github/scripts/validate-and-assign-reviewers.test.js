const { describe, it, mock } = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluateRisk,
  validatePrTemplate,
  APPROVAL_OPTIONS,
  MAINTAINER_POOL
} = require('./validate-and-assign-reviewers.js');

describe('validate-and-assign-reviewers', () => {
  describe('evaluateRisk - Phase 3 Modular Paths', () => {
    it('evaluates to 2 approvals for PR touching server/src/features/auth/**', () => {
      const files = ['server/src/features/auth/controllers/auth.controller.js'];
      assert.strictEqual(evaluateRisk(files, [], 'feat(auth): add login'), 2);

      const serviceFile = ['server/src/features/auth/services/auth.service.js'];
      assert.strictEqual(evaluateRisk(serviceFile, [], 'refactor: extract service'), 2);

      const routesFile = ['server/src/features/auth/routes/auth.routes.js'];
      assert.strictEqual(evaluateRisk(routesFile, [], 'chore: update routes'), 2);
    });

    it('evaluates to 2 approvals for PR touching server/src/features/admin/**', () => {
      const files = ['server/src/features/admin/controllers/admin.controller.js'];
      assert.strictEqual(evaluateRisk(files, [], 'feat(admin): admin dashboard'), 2);

      const routesFile = ['server/src/features/admin/routes/admin.routes.js'];
      assert.strictEqual(evaluateRisk(routesFile, [], 'chore: admin routes'), 2);
    });

    it('evaluates to 2 approvals for PR touching server/src/middleware/**', () => {
      const authMiddleware = ['server/src/middleware/auth.middleware.js'];
      assert.strictEqual(evaluateRisk(authMiddleware, [], 'fix: auth check'), 2);

      const generalMiddleware = ['server/src/middleware/rateLimiter.js'];
      assert.strictEqual(evaluateRisk(generalMiddleware, [], 'chore: rate limit'), 2);

      const nestedMiddleware = ['server/src/middleware/validators/user.js'];
      assert.strictEqual(evaluateRisk(nestedMiddleware, [], 'feat: validation'), 2);
    });

    it('evaluates to 2 approvals for PR touching database schemas in server/src/features/**/models/** and flat *.model.js', () => {
      const projectModel = ['server/src/features/projects/models/Project.js'];
      assert.strictEqual(evaluateRisk(projectModel, [], 'feat: project schema'), 2);

      const authModel = ['server/src/features/auth/models/User.model.js'];
      assert.strictEqual(evaluateRisk(authModel, [], 'feat: user schema update'), 2);

      const eventModel = ['server/src/features/events/models/Event.js'];
      assert.strictEqual(evaluateRisk(eventModel, [], 'feat: event schema'), 2);

      const flatModel = ['server/src/features/members/member.model.js'];
      assert.strictEqual(evaluateRisk(flatModel, [], 'feat: member schema update'), 2);

      const verifiedUserModel = ['server/src/features/members/verifiedUser.model.js'];
      assert.strictEqual(evaluateRisk(verifiedUserModel, [], 'feat: verified user schema update'), 2);
    });

    it('evaluates to 2 approvals for PR touching database schemas in server/src/models/**', () => {
      const modelFile = ['server/src/models/User.js'];
      assert.strictEqual(evaluateRisk(modelFile, [], 'refactor: user model'), 2);

      const commonModel = ['server/src/models/common/base.model.js'];
      assert.strictEqual(evaluateRisk(commonModel, [], 'refactor: base schema'), 2);
    });

    it('evaluates to 2 approvals for PR touching configuration files in server/src/config/** and server/config/**', () => {
      assert.strictEqual(evaluateRisk(['server/src/config/passport.js'], [], 'chore: configure passport strategy'), 2);
      assert.strictEqual(evaluateRisk(['server/src/config/cors.js'], [], 'chore: configure cors policy'), 2);
      assert.strictEqual(evaluateRisk(['server/src/config/database.js'], [], 'chore: configure database connection'), 2);
      assert.strictEqual(evaluateRisk(['server/src/config/env.js'], [], 'chore: configure env validation'), 2);
      assert.strictEqual(evaluateRisk(['server/config/database.js'], [], 'chore: legacy server config'), 2);
    });

    it('evaluates to 2 approvals for PR touching server/src/app.js or server/src/server.js', () => {
      assert.strictEqual(evaluateRisk(['server/src/app.js'], [], 'chore: configure express app'), 2);
      assert.strictEqual(evaluateRisk(['server/src/server.js'], [], 'chore: listen port'), 2);
    });
  });

  describe('evaluateRisk - Legacy Paths', () => {
    it('evaluates to 2 approvals for legacy config and entry files', () => {
      assert.strictEqual(evaluateRisk(['server/passport.js'], [], 'chore: passport setup'), 2);
      assert.strictEqual(evaluateRisk(['server/app.js'], [], 'chore: express setup'), 2);
      assert.strictEqual(evaluateRisk(['server/server.js'], [], 'chore: server startup'), 2);
    });

    it('evaluates to 2 approvals for legacy routes', () => {
      assert.strictEqual(evaluateRisk(['server/routes/auth.js'], [], 'fix: auth route'), 2);
      assert.strictEqual(evaluateRisk(['server/routes/adminRoutes.js'], [], 'fix: admin route'), 2);
    });

    it('evaluates to 2 approvals for legacy middleware', () => {
      assert.strictEqual(evaluateRisk(['server/middleware/auth.js'], [], 'fix: auth middleware'), 2);
      assert.strictEqual(evaluateRisk(['server/middleware/roleCheck.js'], [], 'fix: role check'), 2);
    });

    it('evaluates to 2 approvals for legacy database models in server/models/**', () => {
      assert.strictEqual(evaluateRisk(['server/models/User.js'], [], 'fix: user model'), 2);
      assert.strictEqual(evaluateRisk(['server/models/Project.js'], [], 'fix: project model'), 2);
    });

    it('evaluates to 2 approvals for workflow and script modifications', () => {
      assert.strictEqual(evaluateRisk(['.github/workflows/ci.yml'], [], 'ci: update test suite'), 2);
      assert.strictEqual(evaluateRisk(['.github/scripts/validate-and-assign-reviewers.js'], [], 'chore: update reviewer script'), 2);
    });

    it('evaluates to 2 approvals for docker and nginx configurations', () => {
      assert.strictEqual(evaluateRisk(['Dockerfile'], [], 'chore: docker update'), 2);
      assert.strictEqual(evaluateRisk(['server/Dockerfile.dev'], [], 'chore: dev container'), 2);
      assert.strictEqual(evaluateRisk(['docker-compose.yml'], [], 'chore: compose stack'), 2);
      assert.strictEqual(evaluateRisk(['nginx/default.conf'], [], 'chore: nginx ingress'), 2);
    });
  });

  describe('evaluateRisk - Sensitive Labels', () => {
    it('evaluates to 2 approvals when sensitive labels are present regardless of files', () => {
      assert.strictEqual(evaluateRisk(['client/src/App.jsx'], ['module:auth'], 'feat: ui update'), 2);
      assert.strictEqual(evaluateRisk(['client/src/App.jsx'], ['module:infra'], 'feat: ui update'), 2);
      assert.strictEqual(evaluateRisk(['client/src/App.jsx'], ['module:refactor'], 'refactor: ui update'), 2);
      assert.strictEqual(evaluateRisk(['client/src/App.jsx'], ['phase:3-architecture'], 'refactor: modularize components'), 2);
    });
  });

  describe('evaluateRisk - Title Keywords', () => {
    it('evaluates to 2 approvals when sensitive keywords are in title regardless of files', () => {
      assert.strictEqual(evaluateRisk(['client/src/App.jsx'], [], 'feat(login): implement auth redirect'), 2);
      assert.strictEqual(evaluateRisk(['client/src/App.jsx'], [], 'fix(tokens): validate jwt expiration'), 2);
      assert.strictEqual(evaluateRisk(['client/src/App.jsx'], [], 'chore(headers): harden security headers'), 2);
      assert.strictEqual(evaluateRisk(['client/src/App.jsx'], [], 'feat(rbac): check permission levels'), 2);
      assert.strictEqual(evaluateRisk(['client/src/App.jsx'], [], 'fix(state): clear user session cookie'), 2);
      assert.strictEqual(evaluateRisk(['client/src/App.jsx'], [], 'chore(dev): optimize docker build cache'), 2);
      assert.strictEqual(evaluateRisk(['client/src/App.jsx'], [], 'ci: deploy preview environment'), 2);
      assert.strictEqual(evaluateRisk(['client/src/App.jsx'], [], 'fix(network): configure ingress rewrite'), 2);
    });
  });

  describe('evaluateRisk - Standard / Low-risk PRs (1 approval)', () => {
    it('evaluates to 1 approval for client UI code', () => {
      const files = [
        'client/src/App.jsx',
        'client/src/pages/Projects.jsx',
        'client/src/components/Header.jsx'
      ];
      assert.strictEqual(evaluateRisk(files, ['enhancement', 'module:projects'], 'feat(projects): add card sorting'), 1);
    });

    it('evaluates to 1 approval for documentation files', () => {
      const files = ['docs/setup.md', 'README.md'];
      assert.strictEqual(evaluateRisk(files, ['documentation', 'module:docs'], 'docs: update local setup guide'), 1);
    });

    it('evaluates to 1 approval for non-sensitive feature controllers and services', () => {
      const files = ['server/src/features/projects/projects.controller.js'];
      assert.strictEqual(evaluateRisk(files, ['enhancement', 'module:projects'], 'feat(projects): implement pagination'), 1);

      const serviceFiles = ['server/src/features/events/events.service.js'];
      assert.strictEqual(evaluateRisk(serviceFiles, ['enhancement'], 'feat(events): calculate duration'), 1);
    });

    it('evaluates to 1 approval for legacy non-sensitive controller files', () => {
      const files = ['server/controller/projectsController.js'];
      assert.strictEqual(evaluateRisk(files, ['enhancement'], 'fix(projects): format response date'), 1);
    });

    it('evaluates to 1 approval when files, labels, and title are empty or omitted', () => {
      assert.strictEqual(evaluateRisk([], [], ''), 1);
      assert.strictEqual(evaluateRisk(), 1);
    });
  });

  describe('validatePrTemplate', () => {
    it('flags error when PR description is empty', async () => {
      const result = await validatePrTemplate('');
      assert.ok(result.errors.some(e => e.includes('description is empty')));
    });

    it('flags error when PR description is whitespace only', async () => {
      const result = await validatePrTemplate('   \n  \t  ');
      assert.ok(result.errors.some(e => e.includes('description is empty')));
    });

    it('flags error when required sections are missing', async () => {
      const incompleteBody = '## What changed\nSome changes\n## Why\nJust because';
      const result = await validatePrTemplate(incompleteBody);
      assert.ok(result.errors.some(e => e.includes('Missing required section: `## Testing`')));
      assert.ok(result.errors.some(e => e.includes('Missing required section: `## Related issue`')));
    });

    it('flags error when related issue section lacks closing issue reference', async () => {
      const body = `
## What changed
Added a new button.

## Why
Improves user experience.

## Testing
Tested manually in browser.

## Related issue
No related issue for this one.
      `;
      const result = await validatePrTemplate(body);
      assert.ok(result.errors.some(e => e.includes('Missing related issue reference in `## Related issue`')));
    });

    it('successfully validates template with verified open issue', async () => {
      const body = `
## What changed
Added member search feature.

## Why
To allow finding team members quickly.

## Testing
Unit and integration tests pass.

## Related issue
Closes #93
      `;

      // Mock global fetch for issue #93 verification
      const originalFetch = global.fetch;
      global.fetch = mock.fn(async () => {
        return {
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({
            number: 93,
            title: 'Phase 3 PR path pattern updates',
            state: 'open',
            pull_request: null
          })
        };
      });

      try {
        const result = await validatePrTemplate(body, { owner: 'AIROST-UTM-ORG', repo: 'airost-intranet', token: 'dummy' });
        assert.strictEqual(result.errors.length, 0);
        assert.deepStrictEqual(result.validIssues, [93]);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('flags error when linked issue is already closed', async () => {
      const body = `
## What changed
Fix login bug.

## Why
Prevent crash on submit.

## Testing
Verified in dev environment.

## Related issue
Fixes #42
      `;

      const originalFetch = global.fetch;
      global.fetch = mock.fn(async () => {
        return {
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({
            number: 42,
            title: 'Old issue',
            state: 'closed',
            pull_request: null
          })
        };
      });

      try {
        const result = await validatePrTemplate(body, { owner: 'AIROST-UTM-ORG', repo: 'airost-intranet', token: 'dummy' });
        assert.ok(result.errors.some(e => e.includes('already closed (closed)')));
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('flags error when linked issue is actually a pull request', async () => {
      const body = `
## What changed
Refactor models.

## Why
Clean architecture.

## Testing
Tests pass.

## Related issue
Resolves #55
      `;

      const originalFetch = global.fetch;
      global.fetch = mock.fn(async () => {
        return {
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({
            number: 55,
            title: 'Some PR',
            state: 'open',
            pull_request: { url: 'https://api.github.com/repos/AIROST-UTM-ORG/airost-intranet/pulls/55' }
          })
        };
      });

      try {
        const result = await validatePrTemplate(body, { owner: 'AIROST-UTM-ORG', repo: 'airost-intranet', token: 'dummy' });
        assert.ok(result.errors.some(e => e.includes('is actually a pull request, not an issue')));
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('flags error when linked issue is not found (404)', async () => {
      const body = `
## What changed
Chore update.

## Why
Maintenance.

## Testing
None required.

## Related issue
Closes #9999
      `;

      const originalFetch = global.fetch;
      global.fetch = mock.fn(async () => {
        return {
          ok: false,
          status: 404,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({ message: 'Not Found' })
        };
      });

      try {
        const result = await validatePrTemplate(body, { owner: 'AIROST-UTM-ORG', repo: 'airost-intranet', token: 'dummy' });
        assert.ok(result.errors.some(e => e.includes('was not found in AIROST-UTM-ORG/airost-intranet')));
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('Exported Constants and Configuration', () => {
    it('exports valid APPROVAL_OPTIONS for 1 and 2 approvals', () => {
      assert.ok(APPROVAL_OPTIONS);
      assert.strictEqual(APPROVAL_OPTIONS[1].name, '1 Approval');
      assert.strictEqual(APPROVAL_OPTIONS[2].name, '2 Approvals');
      assert.ok(APPROVAL_OPTIONS[1].id);
      assert.ok(APPROVAL_OPTIONS[2].id);
    });

    it('exports MAINTAINER_POOL with expected maintainers', () => {
      assert.ok(Array.isArray(MAINTAINER_POOL));
      assert.ok(MAINTAINER_POOL.length >= 4);
      assert.ok(MAINTAINER_POOL.includes('leehom22'));
      assert.ok(MAINTAINER_POOL.includes('Gan0117'));
      assert.ok(MAINTAINER_POOL.includes('HoeZhiWan'));
      assert.ok(MAINTAINER_POOL.includes('zping-926'));
    });
  });
});
