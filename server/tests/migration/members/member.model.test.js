describe('member persistence models', () => {
  test('reuses the User model when the legacy model was loaded first', () => {
    const LegacyUser = require('../../../models/User');
    const User = require('../../../src/features/members/member.model');
    expect(User).toBe(LegacyUser);
    expect(User.modelName).toBe('User');
    expect(User.schema.path('name').isRequired).toBe(true);
    expect(User.schema.path('email')).toBeDefined();
    expect(User.schema.path('positions')).toBeDefined();
    expect(User.schema.path('featuredProjectIds').caster.options.ref).toBe('Project');
  });

  test('reuses the VerifiedUser model when the legacy model was loaded first', () => {
    const LegacyVerifiedUser = require('../../../models/VerifiedUser');
    const VerifiedUser = require('../../../src/features/members/verifiedUser.model');
    expect(VerifiedUser).toBe(LegacyVerifiedUser);
    expect(VerifiedUser.modelName).toBe('VerifiedUser');
    expect(VerifiedUser.schema.path('email').isRequired).toBe(true);
    expect(VerifiedUser.schema.path('name').isRequired).toBe(true);
    expect(VerifiedUser.schema.path('position').isRequired).toBe(true);
  });

  test('rejects a User document without its required name', () => {
    const User = require('../../../src/features/members/member.model');
    const validationError = new User({ email: 'missing-name@example.com' }).validateSync();

    expect(validationError).toBeDefined();
    expect(validationError.errors.name).toBeDefined();
  });
});
