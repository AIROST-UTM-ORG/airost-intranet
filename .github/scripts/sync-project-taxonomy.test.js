const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  getModuleFromScope,
  getModuleForPath,
  inferLabelsFromMetadata,
  determineLabelsToAdd,
  selectProjectModule,
  PHASE_OPTION_MAP,
  MODULE_OPTION_MAP
} = require('./sync-project-taxonomy.js');

describe('sync-project-taxonomy', () => {
  describe('inferLabelsFromMetadata - Phase label inheritance from linked closing issues', () => {
    it('inherits phase:2-delivery from linked closing issue nodes', () => {
      const closingIssues = [
        {
          number: 101,
          title: 'Implement member search',
          labels: {
            nodes: [{ name: 'phase:2-delivery' }, { name: 'enhancement' }]
          }
        }
      ];

      const labels = inferLabelsFromMetadata('feat(members): search members', [], closingIssues);
      assert.ok(labels.includes('phase:2-delivery'), 'expected phase:2-delivery to be inherited');
    });

    it('inherits phase:3-architecture from linked closing issue nodes', () => {
      const closingIssues = [
        {
          number: 102,
          title: 'Migrate to monorepo structure',
          labels: {
            nodes: [{ name: 'phase:3-architecture' }]
          }
        }
      ];

      const labels = inferLabelsFromMetadata('refactor(infra): monorepo migration', [], closingIssues);
      assert.ok(labels.includes('phase:3-architecture'), 'expected phase:3-architecture to be inherited');
    });

    it('inherits dynamic arbitrary phase:* labels from linked closing issues', () => {
      const closingIssues = [
        {
          number: 103,
          title: 'Future phase item',
          labels: {
            nodes: [{ name: 'phase:4-rollout' }]
          }
        }
      ];

      const labels = inferLabelsFromMetadata('feat: upcoming feature', [], closingIssues);
      assert.ok(labels.includes('phase:4-rollout'), 'expected dynamic phase:4-rollout to be inherited');
    });

    it('inherits phase label when closing issues supply plain array labels', () => {
      const closingIssues = [
        {
          number: 104,
          title: 'Closing issue with plain label array',
          labels: [{ name: 'phase:2-delivery' }, { name: 'bug' }]
        }
      ];

      const labels = inferLabelsFromMetadata('fix(auth): fix session', [], closingIssues);
      assert.ok(labels.includes('phase:2-delivery'), 'expected phase:2-delivery from plain array');
    });

    it('handles multiple closing issues where only one has a phase label', () => {
      const closingIssues = [
        {
          number: 105,
          title: 'Issue without phase',
          labels: { nodes: [{ name: 'bug' }] }
        },
        {
          number: 106,
          title: 'Issue with phase',
          labels: { nodes: [{ name: 'phase:2-delivery' }] }
        }
      ];

      const labels = inferLabelsFromMetadata('fix: general fix', [], closingIssues);
      assert.ok(labels.includes('phase:2-delivery'));
    });

    it('inherits only the first phase label when multiple closing issues have different phase labels', () => {
      const closingIssues = [
        {
          number: 107,
          title: 'First closing issue with phase 2',
          labels: { nodes: [{ name: 'phase:2-delivery' }] }
        },
        {
          number: 108,
          title: 'Second closing issue with phase 3',
          labels: { nodes: [{ name: 'phase:3-architecture' }] }
        }
      ];

      const labels = inferLabelsFromMetadata('fix: general fix', [], closingIssues);
      const phaseLabels = labels.filter(l => l.startsWith('phase:'));
      assert.strictEqual(phaseLabels.length, 1, 'only one phase label must be inherited');
      assert.strictEqual(phaseLabels[0], 'phase:2-delivery');
      assert.ok(!labels.includes('phase:3-architecture'));
    });
  });

  describe('inferLabelsFromMetadata - Dynamic phase label extraction from PR title', () => {
    it('gives explicit PR title phase precedence over closing issues', () => {
      const closingIssues = [
        {
          number: 109,
          title: 'Issue with phase 2',
          labels: { nodes: [{ name: 'phase:2-delivery' }] }
        }
      ];

      const labels = inferLabelsFromMetadata('feat: [phase:3-architecture] implement redesign', [], closingIssues);
      const phaseLabels = labels.filter(l => l.startsWith('phase:'));
      assert.strictEqual(phaseLabels.length, 1, 'only one phase label must be present');
      assert.strictEqual(phaseLabels[0], 'phase:3-architecture');
      assert.ok(!labels.includes('phase:2-delivery'), 'closing issue phase:2-delivery must not override title phase');
    });
    it('extracts explicit phase:2-delivery from conventional PR title', () => {
      const labels = inferLabelsFromMetadata('feat(auth): phase:2-delivery add OAuth login');
      assert.ok(labels.includes('phase:2-delivery'), 'expected phase:2-delivery in labels');
    });

    it('extracts bracketed phase:3-architecture from title', () => {
      const labels = inferLabelsFromMetadata('fix: [phase:3-architecture] refactor session cache');
      assert.ok(labels.includes('phase:3-architecture'), 'expected phase:3-architecture in labels');
    });

    it('extracts arbitrary dynamic phase label from title', () => {
      const labels = inferLabelsFromMetadata('feat(projects): phase:beta-pilot new project analytics');
      assert.ok(labels.includes('phase:beta-pilot'), 'expected dynamic phase:beta-pilot');
    });

    it('extracts phase from hyphenated notation matching known taxonomy phase-3', () => {
      const labels = inferLabelsFromMetadata('refactor: phase-3 architecture cleanup');
      assert.ok(labels.includes('phase:3-architecture'), 'expected phase:3-architecture');
    });

    it('extracts phase from hyphenated notation matching known taxonomy phase-2-delivery', () => {
      const labels = inferLabelsFromMetadata('feat: phase-2-delivery finalize onboarding flow');
      assert.ok(labels.includes('phase:2-delivery'), 'expected phase:2-delivery');
    });

    it('maps shorthand phase:2 and phase:3 to delivery and architecture', () => {
      const labelsPhase2 = inferLabelsFromMetadata('feat: phase:2 quick win');
      assert.ok(labelsPhase2.includes('phase:2-delivery'));

      const labelsPhase3 = inferLabelsFromMetadata('feat: phase:3 future design');
      assert.ok(labelsPhase3.includes('phase:3-architecture'));
    });
  });

  describe('inferLabelsFromMetadata - Unassigned phase label when neither issue nor title specifies one (No fallback)', () => {
    it('receives NO phase label when PR has conventional title without phase tag and no closing issues', () => {
      const labels = inferLabelsFromMetadata('feat(auth): add email verification', ['server/routes/auth.js'], []);
      const phaseLabels = labels.filter(l => l.startsWith('phase:'));
      assert.strictEqual(phaseLabels.length, 0, 'must not assign default phase label');
      assert.ok(labels.includes('module:auth'));
      assert.ok(labels.includes('enhancement'));
    });

    it('receives NO phase label when closing issues have no phase labels', () => {
      const closingIssues = [
        {
          number: 200,
          title: 'Bug report without phase label',
          labels: { nodes: [{ name: 'bug' }, { name: 'module:infra' }] }
        }
      ];

      const labels = inferLabelsFromMetadata('fix(infra): update docker compose', [], closingIssues);
      const phaseLabels = labels.filter(l => l.startsWith('phase:'));
      assert.strictEqual(phaseLabels.length, 0, 'must not assign phase label');
      assert.ok(labels.includes('module:infra'));
      assert.ok(labels.includes('bug'));
    });

    it('receives NO phase label for generic titles with words like phase or architecture out of tag context', () => {
      const labels = inferLabelsFromMetadata('docs: update documentation architecture notes', [], []);
      const phaseLabels = labels.filter(l => l.startsWith('phase:'));
      assert.strictEqual(phaseLabels.length, 0, 'generic architecture text must not trigger phase label');
      assert.ok(labels.includes('documentation'));
    });
  });

  describe('determineLabelsToAdd - PR with existing phase label is not overridden', () => {
    it('does not add inferred phase label if PR already has a phase label', () => {
      const existingLabels = ['phase:2-delivery', 'module:auth'];
      const inferredLabels = ['phase:3-architecture', 'module:auth', 'enhancement'];

      const toAdd = determineLabelsToAdd(existingLabels, inferredLabels);
      assert.ok(!toAdd.some(l => l.startsWith('phase:')), 'existing phase label must not be overridden');
      assert.ok(toAdd.includes('enhancement'), 'missing enhancement label should still be added');
      assert.ok(!toAdd.includes('module:auth'), 'already existing module:auth should not be duplicated');
    });

    it('does not override existing phase:3-architecture when closing issue suggests phase:2-delivery', () => {
      const existingLabels = ['phase:3-architecture'];
      const inferredLabels = ['phase:2-delivery', 'module:projects'];

      const toAdd = determineLabelsToAdd(existingLabels, inferredLabels);
      assert.ok(!toAdd.some(l => l.startsWith('phase:')), 'phase:3-architecture must not be overridden');
      assert.ok(toAdd.includes('module:projects'));
    });

    it('adds inferred phase label if PR currently has NO phase label', () => {
      const existingLabels = ['module:auth'];
      const inferredLabels = ['phase:2-delivery', 'module:auth', 'enhancement'];

      const toAdd = determineLabelsToAdd(existingLabels, inferredLabels);
      assert.ok(toAdd.includes('phase:2-delivery'), 'inferred phase should be added when PR has no phase label');
      assert.ok(toAdd.includes('enhancement'));
    });

    it('does not override existing type label if one is already present', () => {
      const existingLabels = ['bug'];
      const inferredLabels = ['enhancement', 'module:auth'];

      const toAdd = determineLabelsToAdd(existingLabels, inferredLabels);
      assert.ok(!toAdd.includes('enhancement'), 'existing type bug must not be overridden by enhancement');
      assert.ok(toAdd.includes('module:auth'));
    });

    it('never emits more than 1 phase label even if multiple are presented', () => {
      const existingLabels = ['module:projects'];
      const inferredLabels = ['phase:3-architecture', 'phase:2-delivery', 'phase:4-rollout'];

      const toAdd = determineLabelsToAdd(existingLabels, inferredLabels);
      const phaseLabels = toAdd.filter(l => l.startsWith('phase:'));
      assert.strictEqual(phaseLabels.length, 1, 'never emit more than 1 phase label');
      assert.strictEqual(phaseLabels[0], 'phase:3-architecture');
    });

    it('performs case-insensitive deduplication and prevents duplicate phase/type addition', () => {
      const existingLabels = ['Phase:2-delivery', 'Module:Auth', 'Bug'];
      const inferredLabels = [
        'phase:2-delivery',
        'phase:3-architecture',
        'module:auth',
        'enhancement',
        'module:docs'
      ];

      const toAdd = determineLabelsToAdd(existingLabels, inferredLabels);
      assert.deepStrictEqual(toAdd, ['module:docs'], 'existing Phase:2-delivery, Module:Auth, and Bug should prevent duplicates/conflicts');
    });
  });

  describe('Module inference and type inference', () => {
    it('infers module from title conventional scope', () => {
      assert.strictEqual(getModuleFromScope('feat(auth): login'), 'module:auth');
      assert.strictEqual(getModuleFromScope('fix(session): expired cookie'), 'module:auth');
      assert.strictEqual(getModuleFromScope('feat(members): list directory'), 'module:members');
      assert.strictEqual(getModuleFromScope('feat(user): profile page'), 'module:members');
      assert.strictEqual(getModuleFromScope('feat(projects): tracking board'), 'module:projects');
      assert.strictEqual(getModuleFromScope('feat(kanban): cards'), 'module:projects');
      assert.strictEqual(getModuleFromScope('feat(docs): new handbook'), 'module:docs');
      assert.strictEqual(getModuleFromScope('feat(mobile): drawer navigation'), 'module:mobile');
      assert.strictEqual(getModuleFromScope('chore(infra): update runner'), 'module:infra');
      assert.strictEqual(getModuleFromScope('refactor(refactor): modularize structure'), 'module:refactor');
      assert.strictEqual(getModuleFromScope('chore(unknown): misc change'), null);
    });

    it('infers module from changed file paths', () => {
      assert.strictEqual(getModuleForPath('server/routes/auth.js'), 'module:auth');
      assert.strictEqual(getModuleForPath('client/src/context/authContext.js'), 'module:auth');
      assert.strictEqual(getModuleForPath('client/src/pages/Members.jsx'), 'module:members');
      assert.strictEqual(getModuleForPath('server/controller/user.js'), 'module:members');
      assert.strictEqual(getModuleForPath('client/src/pages/Projects.jsx'), 'module:projects');
      assert.strictEqual(getModuleForPath('server/models/Project.js'), 'module:projects');
      assert.strictEqual(getModuleForPath('client/src/pages/Documentation.jsx'), 'module:docs');
      assert.strictEqual(getModuleForPath('server/models/Doc.js'), 'module:docs');
      assert.strictEqual(getModuleForPath('Dockerfile'), 'module:infra');
      assert.strictEqual(getModuleForPath('.github/workflows/ci.yml'), 'module:infra');
      assert.strictEqual(getModuleForPath('README.md'), null);
    });

    it('infers type labels from conventional commit prefixes', () => {
      const featLabels = inferLabelsFromMetadata('feat: new button');
      assert.ok(featLabels.includes('enhancement'));

      const fixLabels = inferLabelsFromMetadata('fix: crash on submit');
      assert.ok(fixLabels.includes('bug'));

      const docsLabels = inferLabelsFromMetadata('docs: update readme');
      assert.ok(docsLabels.includes('documentation'));
    });

    it('combines module, type, and phase correctly when all present', () => {
      const labels = inferLabelsFromMetadata(
        'feat(projects): phase:2-delivery add kanban drag and drop',
        ['client/src/pages/Projects.jsx'],
        []
      );

      assert.ok(labels.includes('module:projects'));
      assert.ok(labels.includes('enhancement'));
      assert.ok(labels.includes('phase:2-delivery'));
    });
  });

  describe('selectProjectModule', () => {
    it('returns null when no module labels match MODULE_OPTION_MAP', () => {
      assert.strictEqual(selectProjectModule(['bug', 'phase:2-delivery'], 'fix: bug'), null);
    });

    it('returns module option when exactly one matching module label exists', () => {
      const result = selectProjectModule(['module:auth', 'bug'], 'fix: login issue');
      assert.deepStrictEqual(result, MODULE_OPTION_MAP['module:auth']);
    });

    it('resolves conflict using title scope precedence when multiple module labels exist', () => {
      const labels = ['module:auth', 'module:members'];
      const result = selectProjectModule(labels, 'feat(auth): connect member authentication', [
        'client/src/pages/Members.jsx',
        'client/src/pages/Admin.jsx'
      ]);
      assert.deepStrictEqual(result, MODULE_OPTION_MAP['module:auth']);
    });

    it('resolves conflict using highest modified file count when title scope does not match', () => {
      const labels = ['module:projects', 'module:docs'];
      const files = [
        'client/src/pages/Projects.jsx',
        'server/routes/project.js',
        'server/models/Project.js',
        'server/models/Doc.js'
      ];
      const result = selectProjectModule(labels, 'feat: combined update', files);
      assert.deepStrictEqual(result, MODULE_OPTION_MAP['module:projects']);
    });

    it('falls back to first active module in labels when no title scope or file counts differentiate', () => {
      const labels = ['module:infra', 'module:mobile'];
      const result = selectProjectModule(labels, 'feat: generic overhaul', []);
      assert.deepStrictEqual(result, MODULE_OPTION_MAP['module:infra']);
    });
  });
});
