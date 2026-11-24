const request = require('supertest');
const { connect, clearDatabase, closeDatabase } = require('../../setup/mongoSetup');
const { createApp } = require('../../../app');
const User = require('../../../models/User');

jest.mock('../../../src/config/googleCalendar', () => ({
  getEvents: jest.fn(),
  insertEvent: jest.fn(),
  removeEvent: jest.fn(),
}));

const googleCalendar = require('../../../src/config/googleCalendar');

let app;

beforeAll(async () => {
  await connect();
  app = createApp();
});

afterEach(async () => {
  jest.clearAllMocks();
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

const createUser = (overrides = {}) =>
  User.create({
    googleId: 'event-migration-google-id',
    name: 'Event Migration User',
    email: 'event-migration@example.com',
    featuredProjectIds: [],
    ...overrides,
  });

const createAuthenticatedAgent = async (user) => {
  const agent = request.agent(app);
  await agent.post('/test/auth/login').send({ userId: user.id || user._id }).expect(200);
  return agent;
};

describe('Google Calendar feature migration (/api/calendar)', () => {
  describe('GET /api/calendar/upcoming-events', () => {
    test('returns 200 with events list publicly without authentication', async () => {
      const mockEvents = [
        { id: 'evt-1', summary: 'Hackathon Kickoff' },
        { id: 'evt-2', summary: 'Workshop' },
      ];
      googleCalendar.getEvents.mockResolvedValueOnce(mockEvents);

      const res = await request(app).get('/api/calendar/upcoming-events').expect(200);

      expect(res.body).toEqual({
        success: true,
        data: mockEvents,
      });
      expect(googleCalendar.getEvents).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/calendar/add', () => {
    test('returns 401 UNAUTHENTICATED when unauthenticated', async () => {
      const res = await request(app)
        .post('/api/calendar/add')
        .send({
          summary: 'Unauthorized Event',
          start: '2026-10-15T10:00:00Z',
          end: '2026-10-15T11:00:00Z',
        })
        .expect(401);

      expect(res.body).toEqual({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication is required',
        },
      });
      expect(googleCalendar.insertEvent).not.toHaveBeenCalled();
    });

    test('returns 400 VALIDATION_ERROR when authenticated but required fields are missing', async () => {
      const user = await createUser();
      const agent = await createAuthenticatedAgent(user);

      const resEmpty = await agent.post('/api/calendar/add').send({}).expect(400);
      expect(resEmpty.body.success).toBe(false);
      expect(resEmpty.body.error.code).toBe('VALIDATION_ERROR');

      const resMissingDates = await agent
        .post('/api/calendar/add')
        .send({ summary: 'No Dates Event' })
        .expect(400);
      expect(resMissingDates.body.success).toBe(false);
      expect(resMissingDates.body.error.code).toBe('VALIDATION_ERROR');

      const resInvalidDate = await agent
        .post('/api/calendar/add')
        .send({
          summary: 'Bad Date Event',
          start: 'not-a-date',
          end: '2026-10-15T11:00:00Z',
        })
        .expect(400);
      expect(resInvalidDate.body.success).toBe(false);
      expect(resInvalidDate.body.error.code).toBe('VALIDATION_ERROR');

      expect(googleCalendar.insertEvent).not.toHaveBeenCalled();
    });

    test('returns 201 when authenticated with valid payload', async () => {
      googleCalendar.insertEvent.mockResolvedValueOnce(1);

      const user = await createUser();
      const agent = await createAuthenticatedAgent(user);

      const payload = {
        summary: 'Airost General Meeting',
        start: { dateTime: '2026-10-15T10:00:00Z' },
        end: { dateTime: '2026-10-15T11:00:00Z' },
        description: 'Monthly sync-up',
        location: 'Hall A',
      };

      const res = await agent.post('/api/calendar/add').send(payload).expect(201);

      expect(res.body).toEqual({
        success: true,
        data: 1,
      });
      expect(googleCalendar.insertEvent).toHaveBeenCalledWith({
        summary: 'Airost General Meeting',
        start: { dateTime: '2026-10-15T10:00:00Z' },
        end: { dateTime: '2026-10-15T11:00:00Z' },
        description: 'Monthly sync-up',
        location: 'Hall A',
      });
    });
  });

  describe('DELETE /api/calendar/:id', () => {
    test('returns 401 UNAUTHENTICATED when unauthenticated', async () => {
      const res = await request(app).delete('/api/calendar/evt-123').expect(401);

      expect(res.body).toEqual({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication is required',
        },
      });
      expect(googleCalendar.removeEvent).not.toHaveBeenCalled();
    });

    test('returns 404 NOT_FOUND when event is not found or removeEvent returns 0', async () => {
      googleCalendar.removeEvent.mockResolvedValueOnce(0);

      const user = await createUser();
      const agent = await createAuthenticatedAgent(user);

      const res = await agent.delete('/api/calendar/missing-event').expect(404);

      expect(res.body).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Google Calendar event not found',
        },
      });
      expect(googleCalendar.removeEvent).toHaveBeenCalledWith('missing-event');
    });

    test('returns 200 when authenticated and event is successfully deleted', async () => {
      googleCalendar.removeEvent.mockResolvedValueOnce(1);

      const user = await createUser();
      const agent = await createAuthenticatedAgent(user);

      const res = await agent.delete('/api/calendar/evt-456').expect(200);

      expect(res.body).toEqual({
        success: true,
        data: 1,
      });
      expect(googleCalendar.removeEvent).toHaveBeenCalledWith('evt-456');
    });
  });
});
