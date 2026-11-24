const AppError = require('../../../src/shared/errors/AppError');
const { validateAddEvent } = require('../../../src/features/events/event.validation');
const eventRepository = require('../../../src/features/events/event.repository');
const eventService = require('../../../src/features/events/event.service');
const eventController = require('../../../src/features/events/event.controller');
const googleCalendar = require('../../../src/config/googleCalendar');
const eventsFeature = require('../../../src/features/events');

jest.mock('../../../src/config/googleCalendar', () => ({
  getEvents: jest.fn(),
  insertEvent: jest.fn(),
  removeEvent: jest.fn(),
}));

const makeResponse = () => ({
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const invoke = async (handler, req) => {
  const res = makeResponse();
  let nextError;
  await handler(req, res, (error) => {
    nextError = error;
  });
  return { req, res, nextError };
};

describe('events feature exports', () => {
  test('exports eventRoutes, eventController, eventService, eventRepository from index', () => {
    expect(eventsFeature).toHaveProperty('eventRoutes');
    expect(eventsFeature).toHaveProperty('eventController');
    expect(eventsFeature).toHaveProperty('eventService');
    expect(eventsFeature).toHaveProperty('eventRepository');
  });
});

describe('events validation - validateAddEvent', () => {
  test('throws AppError 400 when request or body is missing or invalid', () => {
    expect(() => validateAddEvent(null)).toThrow(AppError);
    expect(() => validateAddEvent(undefined)).toThrow(AppError);
    expect(() => validateAddEvent('string')).toThrow(AppError);
    expect(() => validateAddEvent({ body: null })).toThrow(AppError);
    expect(() => validateAddEvent({ body: [] })).toThrow(AppError);
    expect(() => validateAddEvent({ body: 'invalid' })).toThrow(AppError);
  });

  test('throws AppError 400 when summary is missing or empty', () => {
    expect(() => validateAddEvent({ body: { start: '2026-10-15', end: '2026-10-16' } })).toThrow(
      /Summary is required/
    );
    expect(() => validateAddEvent({ body: { summary: '', start: '2026-10-15', end: '2026-10-16' } })).toThrow(
      /Summary is required/
    );
    expect(() => validateAddEvent({ body: { summary: '   ', start: '2026-10-15', end: '2026-10-16' } })).toThrow(
      /Summary is required/
    );
    expect(() => validateAddEvent({ body: { summary: 123, start: '2026-10-15', end: '2026-10-16' } })).toThrow(
      /Summary is required/
    );
  });

  test('throws AppError 400 when start date is missing or invalid', () => {
    expect(() => validateAddEvent({ body: { summary: 'Event', end: '2026-10-16' } })).toThrow(
      /Start date is required/
    );
    expect(() => validateAddEvent({ body: { summary: 'Event', start: 'invalid-date', end: '2026-10-16' } })).toThrow(
      /Start date is required/
    );
    expect(() => validateAddEvent({ body: { summary: 'Event', start: { dateTime: 'invalid' }, end: '2026-10-16' } })).toThrow(
      /Start date is required/
    );
    expect(() => validateAddEvent({ body: { summary: 'Event', start: {}, end: '2026-10-16' } })).toThrow(
      /Start date is required/
    );
  });

  test('throws AppError 400 when end date is missing or invalid', () => {
    expect(() => validateAddEvent({ body: { summary: 'Event', start: '2026-10-15' } })).toThrow(
      /End date is required/
    );
    expect(() => validateAddEvent({ body: { summary: 'Event', start: '2026-10-15', end: 'invalid-date' } })).toThrow(
      /End date is required/
    );
    expect(() => validateAddEvent({ body: { summary: 'Event', start: '2026-10-15', end: { date: 'invalid' } } })).toThrow(
      /End date is required/
    );
  });

  test('returns sanitizedData with valid string dates', () => {
    const req = {
      body: {
        summary: '  Team Meeting  ',
        start: '2026-10-15T10:00:00Z',
        end: '2026-10-15T11:00:00Z',
        description: '  Weekly sync  ',
        location: '  Room 404  ',
      },
    };
    const result = validateAddEvent(req);
    expect(result).toEqual({
      sanitizedData: {
        summary: 'Team Meeting',
        start: '2026-10-15T10:00:00Z',
        end: '2026-10-15T11:00:00Z',
        description: 'Weekly sync',
        location: 'Room 404',
      },
    });
  });

  test('returns sanitizedData with object dates (dateTime / date)', () => {
    const req = {
      body: {
        summary: 'All Hands',
        start: { dateTime: '2026-10-15T10:00:00.000Z' },
        end: { date: '2026-10-15' },
      },
    };
    const result = validateAddEvent(req);
    expect(result.sanitizedData).toEqual({
      summary: 'All Hands',
      start: { dateTime: '2026-10-15T10:00:00.000Z' },
      end: { date: '2026-10-15' },
      description: undefined,
      location: undefined,
    });
  });

  test('supports passing body payload directly without req wrapper', () => {
    const payload = {
      summary: 'Direct Payload',
      start: '2026-10-15',
      end: '2026-10-16',
    };
    const result = validateAddEvent(payload);
    expect(result.sanitizedData.summary).toBe('Direct Payload');
  });
});

describe('event.repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getEvents delegates options to googleCalendar.getEvents', async () => {
    const mockEvents = [{ id: '1', summary: 'E1' }];
    googleCalendar.getEvents.mockResolvedValueOnce(mockEvents);

    const options = { maxResults: 10 };
    const result = await eventRepository.getEvents(options);

    expect(googleCalendar.getEvents).toHaveBeenCalledWith(options);
    expect(result).toBe(mockEvents);
  });

  test('insertEvent delegates eventData to googleCalendar.insertEvent', async () => {
    googleCalendar.insertEvent.mockResolvedValueOnce(1);

    const eventData = { summary: 'E1' };
    const result = await eventRepository.insertEvent(eventData);

    expect(googleCalendar.insertEvent).toHaveBeenCalledWith(eventData);
    expect(result).toBe(1);
  });

  test('removeEvent delegates eventId to googleCalendar.removeEvent', async () => {
    googleCalendar.removeEvent.mockResolvedValueOnce(1);

    const result = await eventRepository.removeEvent('evt-1');

    expect(googleCalendar.removeEvent).toHaveBeenCalledWith('evt-1');
    expect(result).toBe(1);
  });
});

describe('event.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getUpcomingEvents calls eventRepository.getEvents', async () => {
    const mockEvents = [{ id: '1' }];
    jest.spyOn(eventRepository, 'getEvents').mockResolvedValueOnce(mockEvents);

    const result = await eventService.getUpcomingEvents({ limit: 5 });

    expect(eventRepository.getEvents).toHaveBeenCalledWith({ limit: 5 });
    expect(result).toBe(mockEvents);
  });

  test('addEvent calls eventRepository.insertEvent', async () => {
    const eventData = { summary: 'New Event' };
    jest.spyOn(eventRepository, 'insertEvent').mockResolvedValueOnce(1);

    const result = await eventService.addEvent(eventData);

    expect(eventRepository.insertEvent).toHaveBeenCalledWith(eventData);
    expect(result).toBe(1);
  });

  test('deleteEvent calls eventRepository.removeEvent and returns result when truthy', async () => {
    jest.spyOn(eventRepository, 'removeEvent').mockResolvedValueOnce(1);

    const result = await eventService.deleteEvent('evt-123');

    expect(eventRepository.removeEvent).toHaveBeenCalledWith('evt-123');
    expect(result).toBe(1);
  });

  test('deleteEvent throws AppError 404 when removeEvent returns 0 or falsy', async () => {
    jest.spyOn(eventRepository, 'removeEvent').mockResolvedValueOnce(0);

    await expect(eventService.deleteEvent('missing-evt')).rejects.toThrow(AppError);
    await expect(eventService.deleteEvent('missing-evt')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Google Calendar event not found',
    });
  });

  test('deleteEvent throws AppError 404 when removeEvent returns null or undefined', async () => {
    jest.spyOn(eventRepository, 'removeEvent').mockResolvedValueOnce(null);

    await expect(eventService.deleteEvent('null-evt')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });
});

describe('event.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetchEvents returns 200 with data from eventService.getUpcomingEvents', async () => {
    const mockEvents = [{ id: 'evt-1' }, { id: 'evt-2' }];
    jest.spyOn(eventService, 'getUpcomingEvents').mockResolvedValueOnce(mockEvents);

    const { res, nextError } = await invoke(eventController.fetchEvents, { query: {} });

    expect(nextError).toBeUndefined();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: mockEvents,
    });
  });

  test('addEvent returns 201 with data from eventService.addEvent using sanitizedData', async () => {
    jest.spyOn(eventService, 'addEvent').mockResolvedValueOnce(1);

    const req = {
      sanitizedData: { summary: 'Sanitized Event', start: '2026-10-15', end: '2026-10-16' },
      body: { summary: 'Raw Event' },
    };
    const { res, nextError } = await invoke(eventController.addEvent, req);

    expect(nextError).toBeUndefined();
    expect(eventService.addEvent).toHaveBeenCalledWith(req.sanitizedData);
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      success: true,
      data: 1,
    });
  });

  test('addEvent falls back to req.body if sanitizedData is absent', async () => {
    jest.spyOn(eventService, 'addEvent').mockResolvedValueOnce(1);

    const req = { body: { summary: 'Body Event' } };
    const { res, nextError } = await invoke(eventController.addEvent, req);

    expect(nextError).toBeUndefined();
    expect(eventService.addEvent).toHaveBeenCalledWith(req.body);
    expect(res.statusCode).toBe(201);
  });

  test('deleteEvent returns 200 with result from eventService.deleteEvent', async () => {
    jest.spyOn(eventService, 'deleteEvent').mockResolvedValueOnce(1);

    const req = { params: { id: 'evt-456' } };
    const { res, nextError } = await invoke(eventController.deleteEvent, req);

    expect(nextError).toBeUndefined();
    expect(eventService.deleteEvent).toHaveBeenCalledWith('evt-456');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: 1,
    });
  });

  test('deleteEvent forwards service rejection to next', async () => {
    const notFoundError = new AppError(404, 'NOT_FOUND', 'Google Calendar event not found');
    jest.spyOn(eventService, 'deleteEvent').mockRejectedValueOnce(notFoundError);

    const req = { params: { id: 'missing-evt' } };
    const { nextError } = await invoke(eventController.deleteEvent, req);

    expect(nextError).toBe(notFoundError);
  });
});
