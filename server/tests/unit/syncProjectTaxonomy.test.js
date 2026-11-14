const path = require('path');
const {
  getModuleFromScope,
  getModuleForPath,
  inferLabelsFromMetadata,
  selectProjectModule,
  MODULE_OPTION_MAP,
  PHASE_OPTION_MAP
} = require(path.resolve(__dirname, '../../../.github/scripts/sync-project-taxonomy'));

describe('sync-project-taxonomy', () => {
  describe('MODULE_OPTION_MAP', () => {
    test('contains all expected project module options including module:refactor', () => {
      expect(MODULE_OPTION_MAP).toHaveProperty('module:auth', { id: 'd2d86b9e', name: 'Auth & Session' });
      expect(MODULE_OPTION_MAP).toHaveProperty('module:members', { id: '7214f20f', name: 'Members' });
      expect(MODULE_OPTION_MAP).toHaveProperty('module:projects', { id: 'b9380959', name: 'Projects' });
      expect(MODULE_OPTION_MAP).toHaveProperty('module:docs', { id: 'a7b03313', name: 'Docs' });
      expect(MODULE_OPTION_MAP).toHaveProperty('module:mobile', { id: 'c546be8d', name: 'Mobile' });
      expect(MODULE_OPTION_MAP).toHaveProperty('module:infra', { id: '107ed7a6', name: 'Infra' });
      expect(MODULE_OPTION_MAP).toHaveProperty('module:refactor', { id: 'b3d5c92c', name: 'Refactor' });
    });
  });

  describe('getModuleFromScope', () => {
    test('recognizes refactor commit prefix with scope', () => {
      expect(getModuleFromScope('refactor(ui): standardize button components')).toBe('module:refactor');
      expect(getModuleFromScope('refactor(api): simplify route handlers')).toBe('module:refactor');
      expect(getModuleFromScope('refactor(core): streamline state machine')).toBe('module:refactor');
    });

    test('recognizes refactor commit prefix without scope', () => {
      expect(getModuleFromScope('refactor: decouple data layer')).toBe('module:refactor');
      expect(getModuleFromScope('REFACTOR: uppercase prefix test')).toBe('module:refactor');
      expect(getModuleFromScope('Refactor(arch): capitalize prefix test')).toBe('module:refactor');
    });

    test('recognizes refactor scope inside conventional types', () => {
      expect(getModuleFromScope('chore(refactor): cleanup old utilities')).toBe('module:refactor');
    });

    test('parses domain module scopes correctly', () => {
      expect(getModuleFromScope('feat(projects): add kanban column')).toBe('module:projects');
      expect(getModuleFromScope('fix(auth): fix session expiration')).toBe('module:auth');
      expect(getModuleFromScope('feat(members): add directory search')).toBe('module:members');
      expect(getModuleFromScope('docs(spaces): update guide')).toBe('module:docs');
      expect(getModuleFromScope('feat(mobile): improve drawer UX')).toBe('module:mobile');
      expect(getModuleFromScope('chore(infra): update docker compose')).toBe('module:infra');
    });

    test('returns null for unrecognized scopes or missing title', () => {
      expect(getModuleFromScope('chore: bump dependencies')).toBeNull();
      expect(getModuleFromScope('fix: general patch')).toBeNull();
      expect(getModuleFromScope('')).toBeNull();
      expect(getModuleFromScope(null)).toBeNull();
      expect(getModuleFromScope(undefined)).toBeNull();
    });
  });

  describe('getModuleForPath', () => {
    test('maps file paths to corresponding domain modules', () => {
      expect(getModuleForPath('server/routes/auth.js')).toBe('module:auth');
      expect(getModuleForPath('client/src/context/authContext.js')).toBe('module:auth');
      expect(getModuleForPath('client/src/pages/Members.js')).toBe('module:members');
      expect(getModuleForPath('server/controller/userController.js')).toBe('module:members');
      expect(getModuleForPath('client/src/pages/Projects.js')).toBe('module:projects');
      expect(getModuleForPath('server/models/Task.js')).toBe('module:projects');
      expect(getModuleForPath('client/src/pages/Documentation.js')).toBe('module:docs');
      expect(getModuleForPath('server/routes/doc.js')).toBe('module:docs');
      expect(getModuleForPath('.github/workflows/ci.yml')).toBe('module:infra');
      expect(getModuleForPath('Dockerfile')).toBe('module:infra');
      expect(getModuleForPath('README.md')).toBeNull();
    });
  });

  describe('inferLabelsFromMetadata', () => {
    const crossCuttingFiles = [
      'client/src/pages/Projects.js',
      'client/src/context/authContext.js',
      'server/routes/user.js',
      'client/src/pages/Documentation.js'
    ];

    test('refactor commit with scope does not smear domain module labels across touched files', () => {
      const labels = inferLabelsFromMetadata('refactor(ui): consolidate modal primitives', crossCuttingFiles);
      expect(labels).toContain('module:refactor');
      expect(labels).toContain('phase:2-delivery');
      expect(labels).not.toContain('module:projects');
      expect(labels).not.toContain('module:auth');
      expect(labels).not.toContain('module:members');
      expect(labels).not.toContain('module:docs');
    });

    test('refactor commit without scope does not smear domain module labels across touched files', () => {
      const labels = inferLabelsFromMetadata('refactor: migrate shared state logic', crossCuttingFiles);
      expect(labels).toContain('module:refactor');
      expect(labels).not.toContain('module:projects');
      expect(labels).not.toContain('module:auth');
      expect(labels).not.toContain('module:members');
      expect(labels).not.toContain('module:docs');
    });

    test('existing module:refactor label prevents path-based domain module injection', () => {
      const labels = inferLabelsFromMetadata(
        'chore: apply architectural reorganization',
        crossCuttingFiles,
        ['module:refactor', 'phase:2-delivery']
      );
      expect(labels).toContain('module:refactor');
      expect(labels).not.toContain('module:projects');
      expect(labels).not.toContain('module:auth');
      expect(labels).not.toContain('module:members');
      expect(labels).not.toContain('module:docs');
    });

    test('non-refactor feature infers both title module and touched file domain modules', () => {
      const labels = inferLabelsFromMetadata('feat(projects): add task board', [
        'client/src/pages/Projects.js',
        'client/src/context/authContext.js'
      ]);
      expect(labels).toContain('module:projects');
      expect(labels).toContain('module:auth');
      expect(labels).toContain('enhancement');
      expect(labels).toContain('phase:2-delivery');
      expect(labels).not.toContain('module:refactor');
    });

    test('infers bug type for fix commits and documentation type for docs commits', () => {
      const fixLabels = inferLabelsFromMetadata('fix(auth): fix token refresh', ['server/routes/auth.js']);
      expect(fixLabels).toContain('bug');
      expect(fixLabels).toContain('module:auth');

      const docsLabels = inferLabelsFromMetadata('docs: update contributing guide', ['README.md']);
      expect(docsLabels).toContain('documentation');
    });

    test('infers phase 3 architecture label when specified in title', () => {
      const labels = inferLabelsFromMetadata('refactor: phase 3 platform evolution', crossCuttingFiles);
      expect(labels).toContain('phase:3-architecture');
      expect(labels).not.toContain('phase:2-delivery');
      expect(labels).toContain('module:refactor');
      expect(labels).not.toContain('module:projects');
    });
  });

  describe('selectProjectModule', () => {
    test('selects Refactor when module:refactor is the only active module', () => {
      const selected = selectProjectModule(['module:refactor'], 'refactor: cleanup codebase');
      expect(selected).toEqual({ id: 'b3d5c92c', name: 'Refactor' });
    });

    test('title scope precedence chooses Refactor when multiple modules are present', () => {
      const labels = ['module:refactor', 'module:projects', 'module:auth'];
      const selected = selectProjectModule(labels, 'refactor(core): decouple state across components');
      expect(selected).toEqual({ id: 'b3d5c92c', name: 'Refactor' });
    });

    test('title scope precedence chooses domain module when title is a domain feature', () => {
      const labels = ['module:auth', 'module:projects'];
      const selected = selectProjectModule(labels, 'feat(auth): implement SSO session');
      expect(selected).toEqual({ id: 'd2d86b9e', name: 'Auth & Session' });
    });

    test('selects module with most touched files when title scope is not in active modules', () => {
      const labels = ['module:projects', 'module:auth'];
      const files = [
        'client/src/pages/Projects.js',
        'server/routes/project.js',
        'server/models/Project.js',
        'client/src/context/authContext.js'
      ];
      const selected = selectProjectModule(labels, 'chore: bulk update models', files);
      expect(selected).toEqual({ id: 'b9380959', name: 'Projects' });
    });

    test('falls back to first active module if file counts are tied or missing', () => {
      const labels = ['module:auth', 'module:projects'];
      const selected = selectProjectModule(labels, 'chore: bump dependencies', []);
      expect(selected).toEqual({ id: 'd2d86b9e', name: 'Auth & Session' });
    });

    test('returns null when no active modules match MODULE_OPTION_MAP', () => {
      const selected = selectProjectModule(['phase:2-delivery', 'enhancement'], 'feat: miscellaneous');
      expect(selected).toBeNull();
    });
  });
});
