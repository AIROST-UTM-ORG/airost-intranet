const AppError = require('../../../src/shared/errors/AppError');
const { validateCreateVerifiedUser } = require('../../../src/features/members/admin.validation');

describe('admin request validation', () => {
  describe('validateCreateVerifiedUser', () => {
    test.each([
      [undefined, 'undefined'],
      [null, 'null'],
      [{}, 'empty request'],
      [{ body: null }, 'null body'],
      [{ body: 'string' }, 'string body'],
      [{ body: 123 }, 'number body'],
      [{ body: [] }, 'array body'],
    ])('rejects invalid request/body: %s (%s)', (req) => {
      expect(() => validateCreateVerifiedUser(req)).toThrow(
        expect.objectContaining({
          name: 'AppError',
          status: 400,
          code: 'VALIDATION_ERROR',
          message: 'Request body must be an object.',
        })
      );
    });

    test('rejects payload with unsupported fields', () => {
      const req = {
        body: {
          name: 'Alice',
          email: 'alice@example.com',
          position: 'member',
          extraField: 'not-allowed',
        },
      };
      expect(() => validateCreateVerifiedUser(req)).toThrow(
        expect.objectContaining({
          name: 'AppError',
          status: 400,
          code: 'VALIDATION_ERROR',
          message: 'Payload contains unsupported fields.',
          details: { unsupportedFields: ['extraField'] },
        })
      );
    });

    test.each([
      [{ body: { email: 'alice@example.com', position: 'member' } }, 'missing name'],
      [{ body: { name: 123, email: 'alice@example.com', position: 'member' } }, 'non-string name (number)'],
      [{ body: { name: true, email: 'alice@example.com', position: 'member' } }, 'non-string name (boolean)'],
      [{ body: { name: null, email: 'alice@example.com', position: 'member' } }, 'non-string name (null)'],
      [{ body: { name: ['Alice'], email: 'alice@example.com', position: 'member' } }, 'non-string name (array)'],
      [{ body: { name: { first: 'Alice' }, email: 'alice@example.com', position: 'member' } }, 'non-string name (object)'],
      [{ body: { name: '', email: 'alice@example.com', position: 'member' } }, 'empty name'],
      [{ body: { name: '   ', email: 'alice@example.com', position: 'member' } }, 'spaces-only name'],
      [{ body: { name: '\t\n\r  ', email: 'alice@example.com', position: 'member' } }, 'whitespace-only name with tabs/newlines'],
      [{ body: { name: 'a'.repeat(101), email: 'alice@example.com', position: 'member' } }, 'name > 100 chars'],
      [{ body: { name: '   ' + 'a'.repeat(101) + '   ', email: 'alice@example.com', position: 'member' } }, 'name > 100 chars trimmed'],
    ])('rejects invalid name: %s (%s)', (req) => {
      expect(() => validateCreateVerifiedUser(req)).toThrow(
        expect.objectContaining({
          name: 'AppError',
          status: 400,
          code: 'VALIDATION_ERROR',
          message: 'Name must be a non-empty string under 100 characters.',
        })
      );
    });

    test.each([
      [{ body: { name: 'Alice', position: 'member' } }, 'missing email'],
      [{ body: { name: 'Alice', email: 123, position: 'member' } }, 'non-string email (number)'],
      [{ body: { name: 'Alice', email: true, position: 'member' } }, 'non-string email (boolean)'],
      [{ body: { name: 'Alice', email: null, position: 'member' } }, 'non-string email (null)'],
      [{ body: { name: 'Alice', email: ['alice@example.com'], position: 'member' } }, 'non-string email (array)'],
      [{ body: { name: 'Alice', email: { addr: 'alice@example.com' }, position: 'member' } }, 'non-string email (object)'],
      [{ body: { name: 'Alice', email: '', position: 'member' } }, 'empty email'],
      [{ body: { name: 'Alice', email: '   ', position: 'member' } }, 'spaces-only email'],
      [{ body: { name: 'Alice', email: '\t\n\r  ', position: 'member' } }, 'whitespace-only email with tabs/newlines'],
      [{ body: { name: 'Alice', email: 'invalid-email', position: 'member' } }, 'no @ or domain'],
      [{ body: { name: 'Alice', email: 'foo@bar', position: 'member' } }, 'no dot in domain'],
      [{ body: { name: 'Alice', email: '@domain.com', position: 'member' } }, 'missing user'],
      [{ body: { name: 'Alice', email: 'user@.com', position: 'member' } }, 'missing domain name'],
      [{ body: { name: 'Alice', email: 'user@domain.', position: 'member' } }, 'missing TLD after dot'],
      [{ body: { name: 'Alice', email: 'user@domain..com', position: 'member' } }, 'consecutive dots'],
      [{ body: { name: 'Alice', email: 'user name@domain.com', position: 'member' } }, 'space inside user part'],
      [{ body: { name: 'Alice', email: 'user@domain name.com', position: 'member' } }, 'space inside domain part'],
      [{ body: { name: 'Alice', email: 'user@domain@extra.com', position: 'member' } }, 'multiple @ symbols'],
    ])('rejects invalid email: %s (%s)', (req) => {
      expect(() => validateCreateVerifiedUser(req)).toThrow(
        expect.objectContaining({
          name: 'AppError',
          status: 400,
          code: 'VALIDATION_ERROR',
          message: 'Email must be a valid email address.',
        })
      );
    });

    test.each([
      [{ body: { name: 'Alice', email: 'alice@example.com' } }, 'missing position'],
      [{ body: { name: 'Alice', email: 'alice@example.com', position: 123 } }, 'non-string position (number)'],
      [{ body: { name: 'Alice', email: 'alice@example.com', position: false } }, 'non-string position (boolean)'],
      [{ body: { name: 'Alice', email: 'alice@example.com', position: null } }, 'non-string position (null)'],
      [{ body: { name: 'Alice', email: 'alice@example.com', position: ['member'] } }, 'non-string position (array)'],
      [{ body: { name: 'Alice', email: 'alice@example.com', position: { role: 'member' } } }, 'non-string position (object)'],
      [{ body: { name: 'Alice', email: 'alice@example.com', position: '' } }, 'empty position'],
      [{ body: { name: 'Alice', email: 'alice@example.com', position: '   ' } }, 'spaces-only position'],
      [{ body: { name: 'Alice', email: 'alice@example.com', position: '\t\n\r  ' } }, 'whitespace-only position with tabs/newlines'],
      [{ body: { name: 'Alice', email: 'alice@example.com', position: 'p'.repeat(81) } }, 'position > 80 chars'],
      [{ body: { name: 'Alice', email: 'alice@example.com', position: '   ' + 'p'.repeat(81) + '   ' } }, 'position > 80 chars trimmed'],
    ])('rejects invalid position: %s (%s)', (req) => {
      expect(() => validateCreateVerifiedUser(req)).toThrow(
        expect.objectContaining({
          name: 'AppError',
          status: 400,
          code: 'VALIDATION_ERROR',
          message: 'Position must be a non-empty string under 80 characters.',
        })
      );
    });

    test('sanitizes and returns valid payload with trimming and email lowercasing', () => {
      const req = {
        body: {
          name: '  \tAlice Cooper \n ',
          email: '  Alice.Cooper@AIROST.ORG.MY  \n',
          position: '  \tProject Lead  ',
        },
      };

      const result = validateCreateVerifiedUser(req);
      expect(result).toEqual({
        sanitizedData: {
          name: 'Alice Cooper',
          email: 'alice.cooper@airost.org.my',
          position: 'Project Lead',
        },
      });
    });

    test('accepts exact boundary lengths (name: 1 char and 100 chars, position: 1 char and 80 chars)', () => {
      // Minimum boundaries (1 char each)
      const minReq = {
        body: {
          name: 'A',
          email: 'min@example.com',
          position: 'P',
        },
      };
      const minResult = validateCreateVerifiedUser(minReq);
      expect(minResult.sanitizedData.name).toBe('A');
      expect(minResult.sanitizedData.position).toBe('P');

      // Maximum boundaries (100 and 80 chars)
      const maxReq = {
        body: {
          name: 'n'.repeat(100),
          email: 'boundary@example.com',
          position: 'p'.repeat(80),
        },
      };

      const maxResult = validateCreateVerifiedUser(maxReq);
      expect(maxResult.sanitizedData.name).toHaveLength(100);
      expect(maxResult.sanitizedData.position).toHaveLength(80);

      // Boundaries with surrounding whitespace that trim to exactly 100 and 80
      const paddedReq = {
        body: {
          name: '   ' + 'n'.repeat(100) + '   ',
          email: 'padded@example.com',
          position: '   ' + 'p'.repeat(80) + '   ',
        },
      };
      const paddedResult = validateCreateVerifiedUser(paddedReq);
      expect(paddedResult.sanitizedData.name).toHaveLength(100);
      expect(paddedResult.sanitizedData.position).toHaveLength(80);
    });
  });
});
