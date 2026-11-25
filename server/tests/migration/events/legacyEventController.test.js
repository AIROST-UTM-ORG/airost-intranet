const eventService = require('../../../src/features/events/event.service');
const legacyEventController = require('../../../controller/eventController');
const AppError = require('../../../src/shared/errors/AppError');

describe('legacy event controller compatibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetchEvents forwards to eventService.getUpcomingEvents and returns raw unwrapped array', async () => {
    const mockEvents = [{ id: 'evt-1', summary: 'Hackathon' }];
    jest.spyOn(eventService, 'getUpcomingEvents').mockResolvedValueOnce(mockEvents);

    const req = { query: {} };
    const res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };

    await legacyEventController.fetchEvents(req, res);

    expect(eventService.getUpcomingEvents).toHaveBeenCalledWith(req.query);
    expect(res.json).toHaveBeenCalledWith(mockEvents);
  });

  test('addEvent forwards to eventService.addEvent and returns status 201 with raw result', async () => {
    jest.spyOn(eventService, 'addEvent').mockResolvedValueOnce(1);

    const req = { body: { summary: 'New Event' } };
    const res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };

    await legacyEventController.addEvent(req, res);

    expect(eventService.addEvent).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(1);
  });

  test('deleteEvent forwards to eventService.deleteEvent and returns raw result', async () => {
    jest.spyOn(eventService, 'deleteEvent').mockResolvedValueOnce(1);

    const req = { params: { id: 'evt-123' } };
    const res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };

    await legacyEventController.deleteEvent(req, res);

    expect(eventService.deleteEvent).toHaveBeenCalledWith('evt-123');
    expect(res.json).toHaveBeenCalledWith(1);
  });

  test('forwards error with 500 status on service failure', async () => {
    const error = new Error('Failure');
    jest.spyOn(eventService, 'deleteEvent').mockRejectedValueOnce(error);

    const req = { params: { id: 'evt-999' } };
    const res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };

    await legacyEventController.deleteEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failure' });
  });
});
