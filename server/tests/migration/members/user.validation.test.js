const AppError = require('../../../src/shared/errors/AppError');
const { validateGetUsers, validateUpdateProfile } = require('../../../src/features/members/member.validation');

const query = (values = {}) => ({ query: values });
const update = (body, id = '507f1f77bcf86cd799439011') => ({ params: { id }, body });

describe('member request validation', () => {
  describe('directory query', () => {
    test('accepts omitted filters and returns the validated parameters', () => {
      expect(validateGetUsers(query())).toEqual({ search: undefined, role: undefined, year: undefined, page: undefined, limit: undefined });
    });

    test('accepts supported filters and converts pagination values to numbers', () => {
      expect(validateGetUsers(query({ search: '  Ada ', role: 'member', year: 'Year 2', page: '2', limit: '25' }))).toEqual({
        search: '  Ada ', role: 'member', year: 'Year 2', page: 2, limit: 25,
      });
    });

    test.each([
      [{ search: 'x'.repeat(101) }, 'Invalid search parameter.'],
      [{ role: '' }, 'Invalid role parameter.'],
      [{ role: 'x'.repeat(81) }, 'Invalid role parameter.'],
      [{ year: ' ' }, 'Invalid year parameter.'],
      [{ year: 'x'.repeat(41) }, 'Invalid year parameter.'],
      [{ page: '0' }, 'Invalid page parameter.'],
      [{ page: '1.5' }, 'Invalid page parameter.'],
      [{ page: 'nope' }, 'Invalid page parameter.'],
      [{ limit: '0' }, 'Invalid limit parameter.'],
      [{ limit: '101' }, 'Invalid limit parameter.'],
      [{ limit: '2.2' }, 'Invalid limit parameter.'],
    ])('rejects invalid directory query %j as a validation error', (params, message) => {
      expect(() => validateGetUsers(query(params))).toThrow(expect.objectContaining({
        name: 'AppError', status: 400, code: 'VALIDATION_ERROR', message,
      }));
    });

    test('accepts exact maximum query lengths and pagination boundaries', () => {
      expect(validateGetUsers(query({ search: 's'.repeat(100), role: 'r'.repeat(80), year: 'y'.repeat(40), page: '1', limit: '100' }))).toMatchObject({ page: 1, limit: 100 });
    });
  });

  describe('profile update body', () => {
    test('accepts allowed fields and de-duplicates valid project ids', () => {
      const projectId = '507f1f77bcf86cd799439012';
      const result = validateUpdateProfile(update({
        name: 'Ada', year: 'Year 2', course: 'Computing', description: 'About Ada',
        origin: { state: 'Johor', country: 'Malaysia' },
        featuredProjectIds: [projectId, projectId],
      }));
      expect(result.sanitizedData).toEqual(expect.objectContaining({
        name: 'Ada', featuredProjectIds: [projectId], origin: { state: 'Johor', country: 'Malaysia' },
      }));
    });

    test('normalizes valid social handles and HTTPS profile URLs', () => {
      const result = validateUpdateProfile(update({
        instagramUrl: '@ada', linkedinUrl: 'https://linkedin.com/in/ada', githubUrl: 'ada-dev',
      }));
      expect(result.sanitizedData).toEqual({
        instagramUrl: 'https://www.instagram.com/ada/',
        linkedinUrl: 'https://www.linkedin.com/in/ada',
        githubUrl: 'https://github.com/ada-dev',
      });
    });

    test.each([
      ['malformed id', { name: 'Ada' }, 'not-an-id', 404, 'NOT_FOUND'],
      ['null body', null, undefined, 400, 'VALIDATION_ERROR'],
      ['array body', [], undefined, 400, 'VALIDATION_ERROR'],
      ['protected role field', { positions: ['admin'] }, undefined, 400, 'VALIDATION_ERROR'],
      ['unknown field', { admin: true }, undefined, 400, 'VALIDATION_ERROR'],
      ['empty name', { name: ' ' }, undefined, 400, 'VALIDATION_ERROR'],
      ['too long name', { name: 'n'.repeat(101) }, undefined, 400, 'VALIDATION_ERROR'],
      ['invalid year type', { year: 2 }, undefined, 400, 'VALIDATION_ERROR'],
      ['too long year', { year: 'y'.repeat(51) }, undefined, 400, 'VALIDATION_ERROR'],
      ['invalid course type', { course: null }, undefined, 400, 'VALIDATION_ERROR'],
      ['too long course', { course: 'c'.repeat(121) }, undefined, 400, 'VALIDATION_ERROR'],
      ['invalid description type', { description: [] }, undefined, 400, 'VALIDATION_ERROR'],
      ['too long description', { description: 'd'.repeat(1001) }, undefined, 400, 'VALIDATION_ERROR'],
      ['null origin', { origin: null }, undefined, 400, 'VALIDATION_ERROR'],
      ['unknown origin key', { origin: { city: 'Johor' } }, undefined, 400, 'VALIDATION_ERROR'],
      ['invalid origin value', { origin: { country: 3 } }, undefined, 400, 'VALIDATION_ERROR'],
      ['invalid project ids', { featuredProjectIds: ['bad-id'] }, undefined, 400, 'VALIDATION_ERROR'],
      ['project ids must be array', { featuredProjectIds: '507f1f77bcf86cd799439012' }, undefined, 400, 'VALIDATION_ERROR'],
      ['invalid photo URL', { photoUrl: 'javascript:alert(1)' }, undefined, 400, 'VALIDATION_ERROR'],
      ['invalid social protocol', { instagramUrl: 'http://instagram.com/ada' }, undefined, 400, 'VALIDATION_ERROR'],
      ['wrong social network', { githubUrl: 'https://linkedin.com/in/ada' }, undefined, 400, 'VALIDATION_ERROR'],
      ['social URL with credentials', { githubUrl: 'https://ada@github.com/ada' }, undefined, 400, 'VALIDATION_ERROR'],
      ['social URL over length', { instagramUrl: 'a'.repeat(301) }, undefined, 400, 'VALIDATION_ERROR'],
    ])('rejects %s with the expected API error', (_label, body, id, status, code) => {
      let thrown;
      try { validateUpdateProfile(update(body, id)); } catch (error) { thrown = error; }
      expect(thrown).toBeInstanceOf(AppError);
      expect(thrown).toMatchObject({ status, code });
    });

    test('preserves the unsupported fields list in validation details', () => {
      let thrown;
      try { validateUpdateProfile(update({ positions: ['admin'], email: 'x@example.com' })); } catch (error) { thrown = error; }
      expect(thrown.details).toEqual({ unsupportedFields: ['positions', 'email'] });
    });

    test('accepts exact length limits, blank optional URLs, HTTP photo URLs, and supported image data URLs', () => {
      const result = validateUpdateProfile(update({
        name: 'n'.repeat(100), year: 'y'.repeat(50), course: 'c'.repeat(120), description: 'd'.repeat(1000),
        photoUrl: 'https://example.com/avatar.png', instagramUrl: '',
      }));
      expect(result.sanitizedData.instagramUrl).toBe('');
      expect(result.sanitizedData.photoUrl).toBe('https://example.com/avatar.png');
      expect(validateUpdateProfile(update({ photoUrl: 'data:image/png;base64,Zm9v' })).sanitizedData.photoUrl).toContain('data:image/png');
    });
  });
});
