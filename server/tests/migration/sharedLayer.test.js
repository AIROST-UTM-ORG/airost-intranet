/**
 * Regression tests for the shared server layer introduced during migration.
 * These tests intentionally exercise boundary cases that can break migrated
 * controllers even when the happy path appears to work.
 */

const AppError = require('../../src/shared/errors/AppError');
const User = require('../../models/User');
const { sendSuccess, sendError } = require('../../src/shared/utils/apiResponse');
const { globalErrorHandler } = require('../../src/middleware/errorHandler');
const { notFoundHandler } = require('../../src/middleware/notFound');
const { authenticate } = require('../../src/middleware/authenticate');
const { requireAdmin, requireRole } = require('../../src/middleware/authorize');
const { validate } = require('../../src/middleware/validate');
const asyncHandler = require('../../src/shared/utils/asyncHandler');
const {
  isValidDate,
  toISOString,
  startOfDay,
  endOfDay,
} = require('../../src/shared/utils/dateUtils');
const {
  isValidObjectId,
  escapeRegex,
  normalizeWhitespace,
} = require('../../src/shared/utils/validators');
const { PLATFORM_ROLES, PROJECT_ROLES } = require('../../src/shared/constants/roles');
const HTTP_STATUS = require('../../src/shared/constants/httpStatus');

const response = () => {
  const res = { statusCode: null, body: null };
  res.status = jest.fn((status) => {
    res.statusCode = status;
    return res;
  });
  res.json = jest.fn((body) => {
    res.body = body;
    return res;
  });
  return res;
};

describe('AppError and API response helpers', () => {
  test('AppError preserves its HTTP and operational fields, including defaults', () => {
    const basic = new AppError(HTTP_STATUS.BAD_REQUEST, 'BAD_INPUT', 'Invalid input');
    expect(basic).toBeInstanceOf(Error);
    expect(basic.name).toBe('AppError');
    expect(basic.status).toBe(400);
    expect(basic.statusCode).toBe(400);
    expect(basic.code).toBe('BAD_INPUT');
    expect(basic.details).toBeNull();
    expect(basic.isOperational).toBe(true);

    const detailed = new AppError(409, 'CONFLICT', 'Already exists', { field: 'email' }, false);
    expect(detailed.details).toEqual({ field: 'email' });
    expect(detailed.isOperational).toBe(false);
    expect(detailed.stack).toContain('AppError: Already exists');
  });

  test('sendSuccess includes metadata only when provided and returns the response', () => {
    const res = response();
    expect(sendSuccess(res, { id: 1 })).toBe(res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, data: { id: 1 } });

    sendSuccess(res, [], HTTP_STATUS.CREATED, { count: 0 });
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ success: true, data: [], meta: { count: 0 } });

    sendSuccess(res, null, HTTP_STATUS.NO_CONTENT, null);
    expect(res.statusCode).toBe(HTTP_STATUS.NO_CONTENT);
    expect(res.body).toEqual({ success: true, data: null, meta: null });
  });

  test('sendError includes useful details but omits null and undefined details', () => {
    const res = response();
    expect(sendError(res, 400, 'INVALID', 'Bad request', { field: 'name' })).toBe(res);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'INVALID', message: 'Bad request', details: { field: 'name' } },
    });

    sendError(res, 401, 'UNAUTHENTICATED', 'Sign in required', null);
    expect(res.body.error).not.toHaveProperty('details');
    sendError(res, 400, 'INVALID', 'Bad request', undefined);
    expect(res.body.error).not.toHaveProperty('details');
  });
});

describe('error middleware contracts', () => {
  test('globalErrorHandler preserves AppError status, code, message, and details', () => {
    const res = response();
    globalErrorHandler(new AppError(403, 'FORBIDDEN', 'No access', { scope: 'project' }), {}, res, jest.fn());
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toEqual({
      code: 'FORBIDDEN', message: 'No access', details: { scope: 'project' },
    });
  });

  test('globalErrorHandler preserves explicit status and string code on non-500 errors', () => {
    const res = response();
    globalErrorHandler({ status: 422, statusCode: 400, code: 'UNPROCESSABLE', message: 'Invalid data' }, {}, res, jest.fn());
    expect(res.statusCode).toBe(422);
    expect(res.body.error).toEqual({ code: 'UNPROCESSABLE', message: 'Invalid data' });
  });

  test('globalErrorHandler masks unknown errors and does not expose internal details', () => {
    const res = response();
    const next = jest.fn();
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      globalErrorHandler(Object.assign(new Error('database secret'), { details: 'private' }), {}, res, next);
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
      });
      expect(log).toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  test('defaults invalid status values to a masked 500 response', () => {
    const res = response();
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      globalErrorHandler({ status: '400', statusCode: NaN, code: 9, message: 'private message' }, {}, res, jest.fn());
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
      });
      expect(log).toHaveBeenCalledTimes(1);
    } finally {
      log.mockRestore();
    }
  });

  test.each([
    [{ name: 'ValidationError', message: 'Invalid field', errors: { name: {} } }, 400, 'VALIDATION_ERROR', 'Invalid field'],
    [{ name: 'CastError', path: '_id', value: 'bad-id', message: 'Cast failed' }, 400, 'INVALID_ID', 'Invalid _id: bad-id'],
    [{ code: 11000, message: 'E11000 duplicate key' }, 409, 'DUPLICATE_KEY', 'Resource already exists'],
  ])('maps database error %# to an expected client response', (error, status, code, message) => {
    const res = response();
    globalErrorHandler(error, {}, res, jest.fn());
    expect(res.statusCode).toBe(status);
    expect(res.body).toEqual({ success: false, error: { code, message } });
    expect(typeof res.body.error.code).toBe('string');
  });

  test('uses statusCode when status is absent and fallback codes for non-string codes', () => {
    const res = response();
    globalErrorHandler({ statusCode: 418, code: 17, message: 'Teapot' }, {}, res, jest.fn());
    expect(res.statusCode).toBe(418);
    expect(res.body.error).toEqual({ code: 'REQUEST_ERROR', message: 'Teapot' });
  });

  test('passes errors onward after headers have been sent', () => {
    const error = new Error('late failure');
    const next = jest.fn();
    globalErrorHandler(error, {}, { headersSent: true }, next);
    expect(next).toHaveBeenCalledWith(error);
  });

  test('notFoundHandler reports the requested method and path as a 404 AppError', () => {
    const next = jest.fn();
    notFoundHandler({ method: 'GET', originalUrl: '/missing' }, {}, next);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.status).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Route not found: GET /missing');
  });
});

describe('authentication and authorization middleware', () => {
  test('authenticate accepts Passport authentication and the user fallback', () => {
    const next = jest.fn();
    authenticate({ isAuthenticated: () => true }, {}, next);
    expect(next).toHaveBeenCalledWith();

    const fallbackNext = jest.fn();
    authenticate({ user: { id: 'member' } }, {}, fallbackNext);
    expect(fallbackNext).toHaveBeenCalledWith();
  });

  test('authenticate rejects unauthenticated requests with 401', () => {
    const next = jest.fn();
    authenticate({ isAuthenticated: () => false, user: { id: 'ignored' } }, {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({
      status: 401, code: 'UNAUTHENTICATED', message: 'Authentication is required',
    });

    const noPassportNext = jest.fn();
    authenticate({}, {}, noPassportNext);
    expect(noPassportNext.mock.calls[0][0]).toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });

    const falsePassportNext = jest.fn();
    authenticate({ isAuthenticated: () => false, user: { id: 'ignored' } }, {}, falsePassportNext);
    expect(falsePassportNext.mock.calls[0][0].status).toBe(401);
  });

  test('requireAdmin accepts the canonical User positions shape and case variants', () => {
    const next = jest.fn();
    const admin = new User({ name: 'Admin User', positions: ['Admin'] });
    requireAdmin({ user: admin }, {}, next);
    expect(next).toHaveBeenCalledWith();

    const singularNext = jest.fn();
    const aliasedAdmin = new User({ name: 'Aliased Admin', position: ['ADMIN'] });
    requireAdmin({ user: aliasedAdmin }, {}, singularNext);
    expect(singularNext).toHaveBeenCalledWith();

    const legacyAliasNext = jest.fn();
    requireAdmin({ user: { position: 'ADMIN' } }, {}, legacyAliasNext);
    expect(legacyAliasNext).toHaveBeenCalledWith();
  });

  test('requireRole distinguishes missing identity from insufficient role', () => {
    const unauthenticatedNext = jest.fn();
    requireRole('admin')({}, {}, unauthenticatedNext);
    expect(unauthenticatedNext.mock.calls[0][0].status).toBe(401);

    const forbiddenNext = jest.fn();
    const member = new User({ name: 'Member User', positions: ['member'] });
    requireAdmin({ user: member }, {}, forbiddenNext);
    expect(forbiddenNext.mock.calls[0][0].status).toBe(403);
  });

  test('requireRole handles multiple requested roles from canonical positions', () => {
    const next = jest.fn();
    const member = new User({ name: 'Member User', positions: ['MEMBER'] });
    requireRole('advisor', 'member')({ user: member }, {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  test('requireAdmin does not treat a role containing admin as the admin role', () => {
    const next = jest.fn();
    const user = new User({ name: 'Super Admin User', positions: ['superadmin'] });
    requireAdmin({ user }, {}, next);
    expect(next.mock.calls[0][0].status).toBe(403);
  });

  test('requireRole rejects empty role lists and ignores non-string positions', () => {
    const next = jest.fn();
    requireRole()({ user: new User({ name: 'No Roles', positions: [null, 42] }) }, {}, next);
    expect(next.mock.calls[0][0].status).toBe(403);
  });
});

describe('request validation middleware', () => {
  test('awaits async validators and exposes sanitized data', async () => {
    const req = {};
    const next = jest.fn();
    const validator = jest.fn(async () => ({ sanitizedData: { name: 'Ada' } }));
    await validate(validator)(req, {}, next);
    expect(validator).toHaveBeenCalledWith(req);
    expect(req.sanitizedData).toEqual({ name: 'Ada' });
    expect(next).toHaveBeenCalledWith();
  });

  test.each([
    [false, 'Request validation failed'],
    [{ valid: false }, 'Request validation failed'],
    [{ valid: false, message: 'Invalid email', details: { field: 'email' } }, 'Invalid email'],
  ])('forwards validation failures as 400 AppErrors', async (result, message) => {
    const next = jest.fn();
    await validate(() => result)({}, {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', message });
  });

  test('wraps unexpected validator errors as validation errors', async () => {
    const next = jest.fn();
    await validate(async () => { throw new Error('bad input'); })({}, {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', message: 'bad input' });
  });

  test('handles synchronous validator throws and promise rejections', async () => {
    for (const validator of [
      () => { throw new Error('sync invalid'); },
      () => Promise.reject(new Error('async invalid')),
      () => { throw new Error(); },
    ]) {
      const next = jest.fn();
      await validate(validator)({}, {}, next);
      expect(next.mock.calls[0][0]).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    }
    const fallbackNext = jest.fn();
    await validate(() => { throw new Error(); })({}, {}, fallbackNext);
    expect(fallbackNext.mock.calls[0][0].message).toBe('Request validation failed');
  });

  test('preserves AppErrors and supports validators that return data directly', async () => {
    const expected = new AppError(422, 'CUSTOM', 'Custom validation');
    const appErrorNext = jest.fn();
    await validate(() => { throw expected; })({}, {}, appErrorNext);
    expect(appErrorNext).toHaveBeenCalledWith(expected);

    const req = {};
    const next = jest.fn();
    await validate(() => ({ field: 'value' }))(req, {}, next);
    expect(req.sanitizedData).toEqual({ field: 'value' });
    expect(next).toHaveBeenCalledWith();

    const noResultReq = {};
    const noResultNext = jest.fn();
    await validate(() => undefined)(noResultReq, {}, noResultNext);
    expect(noResultReq).not.toHaveProperty('sanitizedData');
    expect(noResultNext).toHaveBeenCalledWith();
  });
});

describe('shared utility and constants behavior', () => {
  test('date helpers reject optional empty values and invalid dates', () => {
    for (const value of [null, undefined, '', 'not-a-date', new Date(Number.NaN)]) {
      expect(isValidDate(value)).toBe(false);
      expect(toISOString(value)).toBeNull();
    }
    expect(isValidDate('2024-01-02')).toBe(true);
    expect(toISOString(new Date('2024-01-02T00:00:00.000Z'))).toBe('2024-01-02T00:00:00.000Z');
    expect(toISOString(0)).toBe('1970-01-01T00:00:00.000Z');
  });

  test('date boundary helpers preserve the day while setting local boundaries', () => {
    const date = new Date(2024, 3, 5, 12, 34, 56, 789);
    expect(startOfDay(date).getTime()).toBe(new Date(2024, 3, 5, 0, 0, 0, 0).getTime());
    expect(endOfDay(date).getTime()).toBe(new Date(2024, 3, 5, 23, 59, 59, 999).getTime());
  });

  test('date boundary helpers default to the current day', () => {
    jest.useFakeTimers().setSystemTime(new Date(2024, 3, 5, 12, 34, 56, 789));
    try {
      expect(startOfDay().getTime()).toBe(new Date(2024, 3, 5, 0, 0, 0, 0).getTime());
      expect(endOfDay().getTime()).toBe(new Date(2024, 3, 5, 23, 59, 59, 999).getTime());
    } finally {
      jest.useRealTimers();
    }
  });

  test('object ID validation accepts canonical IDs and rejects malformed values', () => {
    expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
    expect(isValidObjectId('507F1F77BCF86CD799439011')).toBe(true);
    expect(isValidObjectId('not-an-id')).toBe(false);
    expect(isValidObjectId(507)).toBe(false);
    expect(isValidObjectId(null)).toBe(false);
    expect(isValidObjectId('507f1f77bcf86cd79943901Z')).toBe(false);
  });

  test('string normalizers escape regex syntax and reject non-string inputs safely', () => {
    const regexCharacters = '.*+?^${}()|[]\\';
    expect(new RegExp(escapeRegex(regexCharacters)).test(regexCharacters)).toBe(true);
    expect(escapeRegex()).toBe('');
    expect(escapeRegex(null)).toBe('');
    expect(normalizeWhitespace('  one\n  two  ')).toBe('one two');
    expect(normalizeWhitespace({ value: 1 })).toBe('');
    expect(normalizeWhitespace()).toBe('');
  });

  test('role and status constants are stable and immutable', () => {
    expect(PLATFORM_ROLES).toEqual({ ADMIN: 'admin', MEMBER: 'member' });
    expect(PROJECT_ROLES).toEqual({ LEAD: 'lead', ADVISOR: 'advisor', MEMBER: 'member' });
    expect(Object.isFrozen(PLATFORM_ROLES)).toBe(true);
    expect(Object.isFrozen(PROJECT_ROLES)).toBe(true);
    expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
    expect(HTTP_STATUS.CONFLICT).toBe(409);
    expect(Object.isFrozen(HTTP_STATUS)).toBe(true);
  });
});

describe('asyncHandler', () => {
  test('returns the successful handler result without calling next', async () => {
    const next = jest.fn();
    const result = await asyncHandler(async () => 'handled')({}, {}, next);
    expect(result).toBe('handled');
    expect(next).not.toHaveBeenCalled();
  });

  test('forwards asynchronous failures to Express error middleware', async () => {
    const error = new Error('async failure');
    const next = jest.fn();
    await asyncHandler(async () => { throw error; })({}, {}, next);
    expect(next).toHaveBeenCalledWith(error);
  });

  test('forwards synchronous throws raised by a handler', async () => {
    const error = new Error('sync failure');
    const next = jest.fn();
    await asyncHandler(() => { throw error; })({}, {}, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});
