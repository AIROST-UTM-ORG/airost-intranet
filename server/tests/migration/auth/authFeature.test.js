const passport = require('passport');
const authRoutes = require('../../../src/features/auth/auth.routes');
const controller = require('../../../src/features/auth/auth.controller');
const AppError = require('../../../src/shared/errors/AppError');
const service = require('../../../src/features/auth/auth.service');
const { validateTestLoginPayload } = require('../../../src/features/auth/auth.validation');

const makeResponse = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
  clearCookie: jest.fn(),
  redirect(url) { this.redirectUrl = url; this.statusCode = 302; return this; },
});

const invoke = async (handler, req) => {
  const res = makeResponse();
  let nextError;
  await handler(req, res, (error) => { nextError = error; });
  return { req, res, nextError };
};

describe('auth feature service', () => {
  const originalClientUrl = process.env.REACT_APP_URL;
  const originalNodeEnv = process.env.NODE_ENV;
  afterEach(() => {
    if (originalClientUrl === undefined) delete process.env.REACT_APP_URL;
    else process.env.REACT_APP_URL = originalClientUrl;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  test.each([
    [undefined, undefined, '/'],
    ['', '/login', '/login'],
    ['   ', 'login', '/login'],
    ['https://app.example///', '/login', 'https://app.example/login'],
    ['https://app.example/', '', 'https://app.example'],
  ])('resolves client redirect %s + %s', (base, path, expected) => {
    if (base === undefined) delete process.env.REACT_APP_URL;
    else process.env.REACT_APP_URL = base;
    expect(service.getClientUrl(path)).toBe(expected);
  });

  test('populates featured projects and removes provider/internal identifiers', async () => {
    const object = {
      _id: 'u1', googleId: 'secret', googleID: 'secret-alias', __v: 4,
      featuredProjectIds: ['p1'], email: 'member@example.com',
    };
    const user = { populate: jest.fn().mockResolvedValue(undefined), toObject: () => ({ ...object }) };

    await expect(service.getSessionUser(user)).resolves.toEqual({
      _id: 'u1', featuredProjectIds: ['p1'], email: 'member@example.com',
    });
    expect(user.populate).toHaveBeenCalledWith({
      path: 'featuredProjectIds', select: '_id projectId title description lead',
    });
  });

  test('propagates population failures', async () => {
    const error = new Error('populate failed');
    await expect(service.getSessionUser({ populate: () => Promise.reject(error) })).rejects.toBe(error);
  });

  test('detects only the legacy auth mount', () => {
    expect(service.isLegacyAuthRequest({ baseUrl: '/auth' })).toBe(true);
    expect(service.isLegacyAuthRequest({ baseUrl: '/api/auth' })).toBe(false);
    expect(service.isLegacyAuthRequest({ baseUrl: '' })).toBe(false);
  });

  test.each([
    ['development', undefined, { path: '/', httpOnly: true, secure: false, sameSite: 'lax' }],
    ['production', undefined, { path: '/', httpOnly: true, secure: true, sameSite: 'none' }],
    ['production', 'false', { path: '/', httpOnly: true, secure: false, sameSite: 'none' }],
  ])('clears connect.sid with correct cookie attributes in %s', (env, secureSetting, expected) => {
    process.env.NODE_ENV = env;
    if (secureSetting === undefined) delete process.env.COOKIE_SECURE;
    else process.env.COOKIE_SECURE = secureSetting;
    const res = { clearCookie: jest.fn() };
    service.clearSessionCookie(res);
    expect(res.clearCookie).toHaveBeenCalledWith('connect.sid', expected);
  });
});

describe('auth HTTP routes', () => {
  afterEach(() => jest.restoreAllMocks());

  test('router mounts every required auth endpoint and method', () => {
    const registered = authRoutes.stack
      .filter((layer) => layer.route)
      .map((layer) => ({ path: layer.route.path, methods: Object.keys(layer.route.methods) }));
    expect(registered).toEqual([
      { path: '/login/success', methods: ['get'] },
      { path: '/login/failed', methods: ['get'] },
      { path: '/logout', methods: ['get'] },
      { path: '/logout', methods: ['post'] },
      { path: '/google', methods: ['get'] },
      { path: '/google/callback', methods: ['get'] },
    ]);
  });

  test('canonical login success returns the required envelope and strips sensitive fields', async () => {
    const user = {
      populate: jest.fn().mockResolvedValue(undefined),
      toObject: () => ({ _id: 'u1', googleId: 'private', __v: 2, email: 'member@example.com' }),
    };
    const { res } = await invoke(controller.loginSuccess, { baseUrl: '/api/auth', user });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true, data: { user: { _id: 'u1', email: 'member@example.com' } },
    });
  });

  test('canonical unauthenticated login success has the specified AppError response', async () => {
    const { nextError } = await invoke(controller.loginSuccess, { baseUrl: '/api/auth' });
    expect(nextError).toBeInstanceOf(AppError);
    expect(nextError.status).toBe(401);
    expect(nextError.code).toBe('UNAUTHENTICATED');
    expect(nextError.message).toBe('User not authenticated');
  });

  test('legacy login success retains the prior response contract', async () => {
    const user = {
      populate: jest.fn().mockResolvedValue(undefined),
      toObject: () => ({ _id: 'u1', googleId: 'private', __v: 2, email: 'member@example.com' }),
    };
    const { res } = await invoke(controller.loginSuccess, { baseUrl: '/auth', user });
    expect(res.body).toEqual({
      success: true, message: 'Successfully authenticated', user: { _id: 'u1', email: 'member@example.com' },
    });
  });

  test('login failed returns standardized canonical error and legacy message shape', async () => {
    const canonical = await invoke(controller.loginFailed, { baseUrl: '/api/auth' });
    expect(canonical.res.statusCode).toBe(401);
    expect(canonical.res.body).toEqual({ success: false, error: { code: 'AUTH_FAILED', message: 'Authentication failed' } });
    const legacy = await invoke(controller.loginFailed, { baseUrl: '/auth' });
    expect(legacy.res.body).toEqual({ success: false, message: 'Authentication failed' });
  });

  test('logout clears cookie and returns JSON when requested', async () => {
    const req = {
      baseUrl: '/api/auth',
      logout: (callback) => callback(),
      session: { destroy: (callback) => callback() },
      accepts: (type) => type === 'json',
    };
    const { res } = await invoke(controller.logout, req);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, data: { message: 'Successfully logged out' } });
    expect(res.clearCookie).toHaveBeenCalledWith('connect.sid', expect.objectContaining({ path: '/', httpOnly: true }));
  });

  test('legacy logout retains its prior JSON response contract', async () => {
    const { res } = await invoke(controller.logout, {
      baseUrl: '/auth', logout: (callback) => callback(),
      session: { destroy: (callback) => callback() }, accepts: (type) => type === 'json',
    });
    expect(res.body).toEqual({ success: true, message: 'Successfully logged out' });
  });

  test('logout redirects and clears cookie for browser requests', async () => {
    const previous = process.env.REACT_APP_URL;
    process.env.REACT_APP_URL = '';
    try {
      const req = {
        baseUrl: '/api/auth', logout: (callback) => callback(),
        session: { destroy: (callback) => callback() },
        accepts: (type) => type === 'html',
      };
      const { res } = await invoke(controller.logout, req);
      expect(res.statusCode).toBe(302);
      expect(res.redirectUrl).toBe('/login');
      expect(res.clearCookie).toHaveBeenCalled();
    } finally {
      if (previous === undefined) delete process.env.REACT_APP_URL;
      else process.env.REACT_APP_URL = previous;
    }
  });

  test('logout supports requests without Passport logout or a session', async () => {
    const { res } = await invoke(controller.logout, {
      baseUrl: '/api/auth', accepts: (type) => type === 'json',
    });
    expect(res.statusCode).toBe(200);
    expect(res.clearCookie).toHaveBeenCalled();
  });

  test('logout failures are forwarded to centralized error handling', async () => {
    const { nextError } = await invoke(controller.logout, {
      baseUrl: '/api/auth', logout: (callback) => callback(new Error('logout failed')),
      accepts: (type) => type === 'json',
    });
    expect(nextError).toEqual(new Error('logout failed'));
  });

  test('Google entry and callback invoke Passport with the required options', async () => {
    const previous = process.env.REACT_APP_URL;
    delete process.env.REACT_APP_URL;
    const authenticate = jest.spyOn(passport, 'authenticate').mockImplementation((strategy, options) =>
      jest.fn());
    try {
      const entry = await invoke(controller.startGoogleAuth, { baseUrl: '/api/auth' });
      const callback = await invoke(controller.finishGoogleAuth, { baseUrl: '/api/auth' });
      expect(authenticate).toHaveBeenNthCalledWith(1, 'google', { scope: ['profile', 'email'], prompt: 'select_account' });
      expect(authenticate).toHaveBeenNthCalledWith(2, 'google', {
        successRedirect: '/', failureRedirect: '/login', failureFlash: true,
      });
      expect(entry.nextError).toBeUndefined();
      expect(callback.nextError).toBeUndefined();
      expect(authenticate).toHaveBeenCalledTimes(2);
    } finally {
      if (previous === undefined) delete process.env.REACT_APP_URL;
      else process.env.REACT_APP_URL = previous;
    }
  });

  test('Google callback uses configured client redirects and forwards Passport errors', async () => {
    const previous = process.env.REACT_APP_URL;
    process.env.REACT_APP_URL = 'https://app.example/';
    const authenticate = jest.spyOn(passport, 'authenticate').mockImplementation((strategy, options) =>
      (req, res, next) => next(new Error(options.successRedirect ? 'passport callback failed' : 'google entry failed')));
    try {
      const entry = await invoke(controller.finishGoogleAuth, { baseUrl: '/api/auth' });
      expect(authenticate).toHaveBeenCalledWith('google', {
        successRedirect: 'https://app.example', failureRedirect: 'https://app.example/login', failureFlash: true,
      });
      expect(entry.nextError.message).toBe('passport callback failed');
    } finally {
      if (previous === undefined) delete process.env.REACT_APP_URL;
      else process.env.REACT_APP_URL = previous;
    }
  });
});

describe('test login validation', () => {
  test.each([undefined, null, {}, { userId: '' }, { userId: 1 }, { userId: null }])(
    'rejects invalid test login body %p', (body) => {
      expect(validateTestLoginPayload(body)).toEqual({ valid: false, message: 'userId is required' });
    }
  );

  test('preserves a non-empty string user id', () => {
    expect(validateTestLoginPayload({ userId: 'user-123', extra: true })).toEqual({
      valid: true, sanitizedData: { userId: 'user-123' },
    });
  });
});
