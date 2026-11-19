describe('member persistence models', () => {
  test('defines User profile fields and project references in the feature model', () => {
    const User = require('../../../src/features/members/member.model');
    expect(User.modelName).toBe('User');
    expect(User.schema.path('name').isRequired).toBe(true);
    expect(User.schema.path('email')).toBeDefined();
    expect(User.schema.path('positions')).toBeDefined();
    expect(User.schema.path('featuredProjectIds').caster.options.ref).toBe('Project');
  });

  test('defines the legacy VerifiedUser model under the feature folder', () => {
    const VerifiedUser = require('../../../src/features/members/verifiedUser.model');
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
