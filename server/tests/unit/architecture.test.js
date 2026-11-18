/**
 * Architecture Boundaries & Modularity Guardrails
 *
 * Enforces Phase 3 modular vertical slice boundaries and file size limits:
 * 1. Vertical Slice Boundary Guardrail:
 *    - Relative imports across features within server/src/features/<feature>/ must NOT
 *      target private internal files of another feature slice.
 *    - Cross-feature dependencies must only import from the target feature's public
 *      interface (e.g. "../otherFeature" or "../otherFeature/index.js") or from "server/src/shared/".
 * 2. Modularity Threshold Guardrail (400 lines):
 *    - Controllers, services, and route files under server/src/ must remain modular
 *      and not exceed 400 lines.
 */

const fs = require('fs');
const path = require('path');

const MAX_MODULARITY_LINES = 400;

/**
 * Strips comments from JavaScript/TypeScript source code while preserving
 * newline characters so line numbers remain accurate.
 * Handles strings, single-line (//), and multi-line (/*) comments.
 */
function stripComments(code) {
  if (typeof code !== 'string') return '';
  let inString = false;
  let quoteChar = '';
  let inBlockComment = false;
  let inLineComment = false;
  let result = '';

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const nextChar = code[i + 1];

    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        i++; // skip '/'
      } else if (char === '\n') {
        result += '\n'; // preserve line numbers
      }
      continue;
    }

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
        result += '\n';
      }
      continue;
    }

    if (inString) {
      result += char;
      if (char === '\\') {
        i++;
        if (i < code.length) result += code[i];
      } else if (char === quoteChar) {
        inString = false;
      }
      continue;
    }

    if (char === '/' && nextChar === '*') {
      inBlockComment = true;
      i++;
      continue;
    }

    if (char === '/' && nextChar === '/') {
      inLineComment = true;
      i++;
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      inString = true;
      quoteChar = char;
      result += char;
      continue;
    }

    result += char;
  }

  return result;
}

/**
 * Extracts import and require specifiers with line numbers from source code.
 * Matches:
 * - require('...')
 * - import ... from '...'
 * - import('...') (dynamic import)
 * - export ... from '...' (re-export)
 */
function extractImports(sourceCode) {
  const stripped = stripComments(sourceCode);
  const importRegexes = [
    // require('specifier')
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    // dynamic import('specifier')
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    // import ... from 'specifier' or import 'specifier'
    /\bimport\s+(?:(?:[\s\S]*?\s+from\s+)?|(?:\s*))['"]([^'"]+)['"]/g,
    // export ... from 'specifier'
    /\bexport\s+(?:[\s\S]*?\s+from\s+)['"]([^'"]+)['"]/g,
  ];

  const results = [];
  for (const regex of importRegexes) {
    let match;
    while ((match = regex.exec(stripped)) !== null) {
      const line = stripped.slice(0, match.index).split('\n').length;
      results.push({
        specifier: match[1],
        line,
        raw: match[0].trim().replace(/\s+/g, ' '),
        index: match.index,
      });
    }
  }

  results.sort((a, b) => a.index - b.index);
  return results;
}

/**
 * Checks whether an import specifier in a source file violates vertical slice boundaries.
 */
function checkImportBoundary({ sourceFilePath, importSpecifier, featuresDir, srcDir }) {
  if (!importSpecifier || !importSpecifier.startsWith('.')) {
    return { valid: true, type: 'external-or-bare' };
  }

  const normalizedFeaturesDir = path.resolve(featuresDir);
  const normalizedSrcDir = srcDir ? path.resolve(srcDir) : path.resolve(normalizedFeaturesDir, '..');
  const sourceRel = path.relative(normalizedFeaturesDir, path.resolve(sourceFilePath));

  // If source file is not under featuresDir, this rule is not applicable
  if (sourceRel.startsWith('..') || path.isAbsolute(sourceRel)) {
    return { valid: true, type: 'not-in-features' };
  }

  const sourceFeature = sourceRel.split(/[/\\]/)[0];
  const targetAbs = path.resolve(path.dirname(path.resolve(sourceFilePath)), importSpecifier);
  const targetRelToFeatures = path.relative(normalizedFeaturesDir, targetAbs);

  // If the target is inside features/
  if (!targetRelToFeatures.startsWith('..') && !path.isAbsolute(targetRelToFeatures)) {
    const parts = targetRelToFeatures.split(/[/\\]/);
    const targetFeature = parts[0];

    // Intra-feature import is allowed
    if (targetFeature === sourceFeature) {
      return { valid: true, type: 'intra-feature' };
    }

    // Cross-feature import: must only target public interface (feature root or index)
    const subPath = parts.slice(1).join('/');
    const isPublic = subPath === '' || /^index(\.[a-zA-Z]+)?$/.test(subPath);

    if (!isPublic) {
      return {
        valid: false,
        sourceFeature,
        targetFeature,
        subPath,
        message: `Cross-feature boundary violation: feature "${sourceFeature}" cannot import private internal file "${subPath}" from feature "${targetFeature}". Cross-feature dependencies must only import from the target feature's public interface (e.g. "../${targetFeature}" or "../${targetFeature}/index.js") or from "server/src/shared/".`,
      };
    }

    return { valid: true, type: 'cross-feature-public' };
  }

  // Target is outside features/ (e.g. server/src/shared/)
  const targetRelToSrc = path.relative(normalizedSrcDir, targetAbs);
  const isShared = targetRelToSrc === 'shared' || targetRelToSrc.startsWith(`shared${path.sep}`) || targetRelToSrc.startsWith('shared/');
  return { valid: true, type: isShared ? 'shared-layer' : 'outside-features' };
}

/**
 * Finds cross-feature boundary violations for a given file or content.
 */
function findCrossFeatureViolations(filePathOrOptions, maybeContent, maybeOptions) {
  let filePath;
  let content;
  let featuresDir;
  let srcDir;

  if (typeof filePathOrOptions === 'object' && filePathOrOptions !== null) {
    filePath = filePathOrOptions.filePath;
    content = filePathOrOptions.content;
    featuresDir = filePathOrOptions.featuresDir;
    srcDir = filePathOrOptions.srcDir;
  } else {
    filePath = filePathOrOptions;
    content = maybeContent;
    if (typeof maybeOptions === 'object' && maybeOptions !== null) {
      featuresDir = maybeOptions.featuresDir;
      srcDir = maybeOptions.srcDir;
    }
  }

  if (!featuresDir) {
    featuresDir = path.resolve(__dirname, '../../src/features');
  }
  if (!srcDir) {
    srcDir = path.resolve(__dirname, '../../src');
  }

  if (content === undefined && filePath && fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf8');
  }

  if (typeof content !== 'string') {
    return [];
  }

  const imports = extractImports(content);
  const violations = [];

  for (const item of imports) {
    const check = checkImportBoundary({
      sourceFilePath: filePath || path.join(featuresDir, 'unknown', 'file.js'),
      importSpecifier: item.specifier,
      featuresDir,
      srcDir,
    });

    if (!check.valid) {
      violations.push({
        filePath,
        line: item.line,
        specifier: item.specifier,
        statement: item.raw,
        sourceFeature: check.sourceFeature,
        targetFeature: check.targetFeature,
        subPath: check.subPath,
        message: `[Line ${item.line}] ${check.message}`,
      });
    }
  }

  return violations;
}

/**
 * Recursively scans features directory for cross-feature boundary violations.
 */
function checkFeatureBoundaries(featuresDirectory) {
  const dir = featuresDirectory || path.resolve(__dirname, '../../src/features');
  if (!fs.existsSync(dir)) {
    return [];
  }

  const violations = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && /\.(js|ts|mjs|cjs)$/.test(entry.name) && !/\.(test|spec)\./.test(entry.name)) {
        const fileViolations = findCrossFeatureViolations({
          filePath: fullPath,
          featuresDir: dir,
        });
        violations.push(...fileViolations);
      }
    }
  }

  walk(dir);
  return violations;
}

/**
 * Determines whether a file path represents a controller, service, or route.
 */
function isControllerServiceOrRoute(filePath) {
  if (typeof filePath !== 'string') return false;
  if (!/\.(js|ts|mjs|cjs)$/.test(filePath)) return false;
  if (/\.(test|spec)\./.test(filePath)) return false;
  if (/[/\\]__tests__[/\\]/.test(filePath)) return false;

  const normalized = filePath.replace(/\\/g, '/');

  // Naming convention: *.controller.js, *.service.js, *.routes.js
  if (/\.(controller|service|routes?)\.[a-zA-Z]+$/.test(normalized)) {
    return true;
  }

  // Path convention: within controllers/, services/, routes/
  if (/(?:^|\/)(controllers?|services?|routes?)(?:\/|$)/.test(normalized)) {
    return true;
  }

  return false;
}

/**
 * Counts total lines in file content.
 */
function countLines(content) {
  if (typeof content !== 'string' || content.length === 0) return 0;
  return content.split(/\r\n|\r|\n/).length;
}

/**
 * Checks whether a single file exceeds the modularity threshold.
 */
function checkModularityThreshold({ filePath, content, maxLines = MAX_MODULARITY_LINES }) {
  let text = content;
  if (text === undefined && filePath && fs.existsSync(filePath)) {
    text = fs.readFileSync(filePath, 'utf8');
  }

  const lineCount = countLines(text);
  const valid = lineCount <= maxLines;

  return {
    valid,
    filePath,
    lineCount,
    maxLines,
    message: valid
      ? undefined
      : `File "${filePath}" exceeds modularity threshold of ${maxLines} lines (current: ${lineCount} lines). Controllers, services, and routes must remain focused and modular (<= ${maxLines} lines).`,
  };
}

/**
 * Recursively scans src directory for controller, service, or route files exceeding maxLines.
 */
function findModularityViolations(srcDirectory, maxLines = MAX_MODULARITY_LINES) {
  const dir = srcDirectory || path.resolve(__dirname, '../../src');
  if (!fs.existsSync(dir)) {
    return [];
  }

  const violations = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && isControllerServiceOrRoute(fullPath)) {
        const result = checkModularityThreshold({ filePath: fullPath, maxLines });
        if (!result.valid) {
          violations.push(result);
        }
      }
    }
  }

  walk(dir);
  return violations;
}

describe('Phase 3 Architecture Guardrails - Vertical Slice Boundaries', () => {
  const featuresRoot = path.resolve(__dirname, '../../src/features');

  test('server/src/features directory has zero cross-feature boundary violations', () => {
    const violations = checkFeatureBoundaries(featuresRoot);
    expect(violations).toEqual([]);
  });

  describe('Synthetic boundary helper verification (checkFeatureBoundaries & findCrossFeatureViolations)', () => {
    const virtualFeaturesDir = '/project/server/src/features';
    const authServicePath = '/project/server/src/features/auth/auth.service.js';

    test('allows intra-feature relative imports within the same feature slice', () => {
      const code = `
        const { authValidation } = require('./auth.validation');
        const authController = require('./auth.controller');
        const helper = require('./helpers/subHelper');
      `;
      const violations = findCrossFeatureViolations({
        filePath: authServicePath,
        content: code,
        featuresDir: virtualFeaturesDir,
      });
      expect(violations).toHaveLength(0);
    });

    test('allows cross-feature import from target feature public interface root (../targetFeature)', () => {
      const code = `
        const users = require('../users');
        const projects = require('../projects');
      `;
      const violations = findCrossFeatureViolations({
        filePath: authServicePath,
        content: code,
        featuresDir: virtualFeaturesDir,
      });
      expect(violations).toHaveLength(0);
    });

    test('allows cross-feature import from target feature public interface index (../targetFeature/index.js)', () => {
      const code = `
        const { getUserById } = require('../users/index');
        const { getProjectDetails } = require('../projects/index.js');
        import { listDocs } from '../documents/index';
      `;
      const violations = findCrossFeatureViolations({
        filePath: authServicePath,
        content: code,
        featuresDir: virtualFeaturesDir,
      });
      expect(violations).toHaveLength(0);
    });

    test('allows imports from server/src/shared/ layer', () => {
      const code = `
        const AppError = require('../../shared/errors/AppError');
        const { sendSuccess } = require('../../shared/utils/apiResponse');
        const { OK } = require('../../shared/constants/httpStatus');
      `;
      const violations = findCrossFeatureViolations({
        filePath: authServicePath,
        content: code,
        featuresDir: virtualFeaturesDir,
      });
      expect(violations).toHaveLength(0);
    });

    test('allows external npm packages and Node.js built-ins', () => {
      const code = `
        const express = require('express');
        const passport = require('passport');
        const path = require('path');
        const fs = require('fs');
      `;
      const violations = findCrossFeatureViolations({
        filePath: authServicePath,
        content: code,
        featuresDir: virtualFeaturesDir,
      });
      expect(violations).toHaveLength(0);
    });

    test('rejects cross-feature import targeting private internal service file with clear error message', () => {
      const code = `
        const { findUserInternal } = require('../users/users.service.js');
      `;
      const violations = findCrossFeatureViolations({
        filePath: authServicePath,
        content: code,
        featuresDir: virtualFeaturesDir,
      });
      expect(violations).toHaveLength(1);
      expect(violations[0]).toMatchObject({
        filePath: authServicePath,
        line: 2,
        specifier: '../users/users.service.js',
        sourceFeature: 'auth',
        targetFeature: 'users',
        subPath: 'users.service.js',
      });
      expect(violations[0].message).toContain('Cross-feature boundary violation');
      expect(violations[0].message).toContain('feature "auth" cannot import private internal file "users.service.js" from feature "users"');
      expect(violations[0].message).toContain('public interface (e.g. "../users" or "../users/index.js")');
    });

    test('rejects cross-feature import targeting internal models or subfolders', () => {
      const code = `
        const ProjectModel = require('../projects/models/Project');
        const DocController = require('../documents/doc.controller.js');
      `;
      const violations = findCrossFeatureViolations({
        filePath: authServicePath,
        content: code,
        featuresDir: virtualFeaturesDir,
      });
      expect(violations).toHaveLength(2);
      expect(violations[0].targetFeature).toBe('projects');
      expect(violations[0].subPath).toBe('models/Project');
      expect(violations[1].targetFeature).toBe('documents');
      expect(violations[1].subPath).toBe('doc.controller.js');
    });

    test('rejects cross-feature dynamic import and re-export targeting private internal file', () => {
      const code = `
        async function loadCalendar() {
          const mod = await import('../calendar/calendar.service.js');
          return mod;
        }
        export * from '../notifications/notifications.internal';
      `;
      const violations = findCrossFeatureViolations({
        filePath: authServicePath,
        content: code,
        featuresDir: virtualFeaturesDir,
      });
      expect(violations).toHaveLength(2);
      expect(violations[0].specifier).toBe('../calendar/calendar.service.js');
      expect(violations[0].targetFeature).toBe('calendar');
      expect(violations[1].specifier).toBe('../notifications/notifications.internal');
      expect(violations[1].targetFeature).toBe('notifications');
    });

    test('accurately identifies line numbers and ignores commented-out imports', () => {
      const code = `
        // require('../users/private.service.js');
        /*
          const doc = require('../documents/doc.service.js');
        */
        const good = require('../users/index');
        const bad = require('../users/users.controller.js');
      `;
      const violations = findCrossFeatureViolations({
        filePath: authServicePath,
        content: code,
        featuresDir: virtualFeaturesDir,
      });
      expect(violations).toHaveLength(1);
      expect(violations[0].line).toBe(7);
      expect(violations[0].specifier).toBe('../users/users.controller.js');
    });

    test('returns empty array when source file is not in features directory', () => {
      const outsidePath = '/project/server/src/shared/utils/dateUtils.js';
      const code = `const helper = require('../other');`;
      const violations = findCrossFeatureViolations({
        filePath: outsidePath,
        content: code,
        featuresDir: virtualFeaturesDir,
      });
      expect(violations).toHaveLength(0);
    });
  });
});

describe('Phase 3 Architecture Guardrails - Modularity Threshold (400 lines)', () => {
  const srcRoot = path.resolve(__dirname, '../../src');

  test('asserts all controllers, services, and routes under server/src/ do not exceed 400 lines', () => {
    const violations = findModularityViolations(srcRoot, MAX_MODULARITY_LINES);
    expect(violations).toEqual([]);
  });

  describe('Path and naming convention detection (isControllerServiceOrRoute)', () => {
    test('detects files matching *.controller.js, *.service.js, *.routes.js', () => {
      expect(isControllerServiceOrRoute('server/src/features/auth/auth.controller.js')).toBe(true);
      expect(isControllerServiceOrRoute('server/src/features/auth/auth.service.js')).toBe(true);
      expect(isControllerServiceOrRoute('server/src/features/auth/auth.routes.js')).toBe(true);
      expect(isControllerServiceOrRoute('server/src/features/user/user.route.js')).toBe(true);
    });

    test('detects files within controllers/, services/, routes/ directories', () => {
      expect(isControllerServiceOrRoute('server/src/routes/index.js')).toBe(true);
      expect(isControllerServiceOrRoute('server/src/controllers/auth.js')).toBe(true);
      expect(isControllerServiceOrRoute('server/src/services/notification.js')).toBe(true);
    });

    test('ignores non-controller/service/route files and test files', () => {
      expect(isControllerServiceOrRoute('server/src/shared/utils/dateUtils.js')).toBe(false);
      expect(isControllerServiceOrRoute('server/src/shared/errors/AppError.js')).toBe(false);
      expect(isControllerServiceOrRoute('server/src/config/database.js')).toBe(false);
      expect(isControllerServiceOrRoute('server/src/config/cors.js')).toBe(false);
      expect(isControllerServiceOrRoute('server/src/routes/index.test.js')).toBe(false);
      expect(isControllerServiceOrRoute('server/src/controllers/auth.spec.js')).toBe(false);
      expect(isControllerServiceOrRoute('server/src/controllers/__tests__/auth.js')).toBe(false);
      expect(isControllerServiceOrRoute('server/src/features/auth/auth.validation.js')).toBe(false);
      expect(isControllerServiceOrRoute(null)).toBe(false);
      expect(isControllerServiceOrRoute(undefined)).toBe(false);
    });
  });

  describe('Synthetic modularity threshold checks (checkModularityThreshold & countLines)', () => {
    test('accurately counts lines across various newline formats', () => {
      expect(countLines('')).toBe(0);
      expect(countLines('one')).toBe(1);
      expect(countLines('one\ntwo')).toBe(2);
      expect(countLines('one\r\ntwo\r\nthree')).toBe(3);
    });

    test('passes files with line count below or equal to 400 lines', () => {
      const content100 = Array.from({ length: 100 }, (_, i) => `// Line ${i + 1}`).join('\n');
      const content400 = Array.from({ length: 400 }, (_, i) => `// Line ${i + 1}`).join('\n');

      const result100 = checkModularityThreshold({
        filePath: 'synthetic.controller.js',
        content: content100,
        maxLines: MAX_MODULARITY_LINES,
      });
      expect(result100.valid).toBe(true);
      expect(result100.lineCount).toBe(100);
      expect(result100.message).toBeUndefined();

      const result400 = checkModularityThreshold({
        filePath: 'synthetic.service.js',
        content: content400,
        maxLines: MAX_MODULARITY_LINES,
      });
      expect(result400.valid).toBe(true);
      expect(result400.lineCount).toBe(400);
      expect(result400.message).toBeUndefined();
    });

    test('fails files with line count exceeding 400 lines with clear violation message', () => {
      const content401 = Array.from({ length: 401 }, (_, i) => `// Line ${i + 1}`).join('\n');
      const content600 = Array.from({ length: 600 }, (_, i) => `// Line ${i + 1}`).join('\n');

      const result401 = checkModularityThreshold({
        filePath: 'bloated.controller.js',
        content: content401,
        maxLines: 400,
      });
      expect(result401.valid).toBe(false);
      expect(result401.lineCount).toBe(401);
      expect(result401.maxLines).toBe(400);
      expect(result401.message).toContain('File "bloated.controller.js" exceeds modularity threshold of 400 lines (current: 401 lines)');
      expect(result401.message).toContain('must remain focused and modular');

      const result600 = checkModularityThreshold({
        filePath: 'huge.service.js',
        content: content600,
        maxLines: 400,
      });
      expect(result600.valid).toBe(false);
      expect(result600.lineCount).toBe(600);
    });

    test('supports custom line threshold in checkModularityThreshold', () => {
      const content50 = Array.from({ length: 50 }, (_, i) => `// Line ${i + 1}`).join('\n');

      const pass = checkModularityThreshold({
        filePath: 'test.routes.js',
        content: content50,
        maxLines: 50,
      });
      expect(pass.valid).toBe(true);

      const fail = checkModularityThreshold({
        filePath: 'test.routes.js',
        content: content50,
        maxLines: 49,
      });
      expect(fail.valid).toBe(false);
      expect(fail.lineCount).toBe(50);
      expect(fail.maxLines).toBe(49);
    });
  });
});

module.exports = {
  stripComments,
  extractImports,
  checkImportBoundary,
  findCrossFeatureViolations,
  checkFeatureBoundaries,
  isControllerServiceOrRoute,
  countLines,
  checkModularityThreshold,
  findModularityViolations,
  MAX_MODULARITY_LINES,
};
