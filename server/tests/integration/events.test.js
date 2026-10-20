/**
 * Integration tests for Google Calendar event endpoints.
 *
 * Routes tested:
 *   GET    /calendar/upcoming-events
 *   POST   /calendar/add
 *   DELETE /calendar/:id
 */

jest.mock('../../google_calendar', () => ({
  getEvents: jest.fn(),
  insertEvent: jest.fn(),
  removeEvent: jest.fn(),
}));

const request = require('supertest');
const { createApp } = require('../../app');
const { getEvents, insertEvent, removeEvent } = require('../../google_calendar');

let app;

beforeAll(() => {
  app = createApp();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe.skip('GET /calendar/upcoming-events', () => {
  test('returns 200 and events list on success', async () => {
    const mockEvents = [
      { id: 'event-1', summary: 'Meeting 1' },
      { id: 'event-2', summary: 'Meeting 2' },
    ];
    getEvents.mockResolvedValueOnce(mockEvents);

    const res = await request(app).get('/calendar/upcoming-events');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockEvents);
    expect(getEvents).toHaveBeenCalledTimes(1);
  });

  test('returns 500 when getEvents rejects with error', async () => {
    getEvents.mockRejectedValueOnce(new Error('Google API failure'));

    const res = await request(app).get('/calendar/upcoming-events');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Google API failure');
  });
});

describe.skip('POST /calendar/add', () => {
  test('returns 200 and result when event is inserted successfully', async () => {
    insertEvent.mockResolvedValueOnce(1);

    const eventPayload = {
      summary: 'New Event',
      start: { dateTime: '2026-10-15T10:00:00Z' },
      end: { dateTime: '2026-10-15T11:00:00Z' },
    };

    const res = await request(app).post('/calendar/add').send(eventPayload);
    expect(res.status).toBe(200);
    expect(res.body).toBe(1);
    expect(insertEvent).toHaveBeenCalledWith(eventPayload);
  });

  test('returns 500 when insertEvent rejects', async () => {
    insertEvent.mockRejectedValueOnce(new Error('Insert error'));

    const res = await request(app).post('/calendar/add').send({});
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Insert error');
  });
});

describe.skip('DELETE /calendar/:id', () => {
  test('returns 200 and result when event is deleted', async () => {
    removeEvent.mockResolvedValueOnce(1);

    const res = await request(app).delete('/calendar/evt-123');
    expect(res.status).toBe(200);
    expect(res.body).toBe(1);
    expect(removeEvent).toHaveBeenCalledWith('evt-123');
  });

  test('returns 500 when removeEvent rejects', async () => {
    removeEvent.mockRejectedValueOnce(new Error('Delete error'));

    const res = await request(app).delete('/calendar/evt-123');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Delete error');
  });
});
