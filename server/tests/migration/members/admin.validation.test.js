const { validateCreateVerifiedUser } = require('../../../src/features/members/admin/admin.validation');

const req = (body) => ({ body });

describe('verified member creation validation', () => {
  test('trims names and positions and normalizes email addresses', () => {
    expect(validateCreateVerifiedUser(req({
      name: '  Ada Lovelace  ',
      email: '  ADA@EXAMPLE.COM ',
      position: ' member ',
    }))).toEqual({
      sanitizedData: { name: 'Ada Lovelace', email: 'ada@example.com', position: 'member' },
    });
  });

  test.each([
    [null, 'Request body must be an object.'],
    [{ email: 'member@example.com', position: 'member' }, 'Name, email, and position are required.'],
    [{ name: 'Member', position: 'member' }, 'Name, email, and position are required.'],
    [{ name: 'Member', email: 'member@example.com' }, 'Name, email, and position are required.'],
    [{ name: 'Member', email: 'not-an-email', position: 'member' }, 'Email must be a valid email address.'],
  ])('rejects invalid creation payload %j', (body, message) => {
    expect(() => validateCreateVerifiedUser(req(body))).toThrow(expect.objectContaining({
      status: 400,
      code: 'VALIDATION_ERROR',
      message,
    }));
  });

  test('rejects fields outside the verified-member creation contract', () => {
    expect(() => validateCreateVerifiedUser(req({
      name: 'Member', email: 'member@example.com', position: 'member', positions: ['admin'],
    }))).toThrow(expect.objectContaining({
      code: 'VALIDATION_ERROR',
      details: { unsupportedFields: ['positions'] },
    }));
  });
});
