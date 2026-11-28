const AppError = require('../../shared/errors/AppError');
const { NOT_FOUND } = require('../../shared/constants/httpStatus');
const eventRepository = require('./event.repository');

const getUpcomingEvents = async (options) => {
  try {
    const events = await eventRepository.getEvents(options);
    if (!events || !Array.isArray(events)) {
      throw new AppError(502, 'UPSTREAM_ERROR', 'Failed to fetch Google Calendar events');
    }
    return events;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(502, 'UPSTREAM_ERROR', error.message || 'Failed to fetch Google Calendar events');
  }
};

const addEvent = async (eventData) => {
  const result = await eventRepository.insertEvent(eventData);
  if (!result) {
    throw new AppError(502, 'UPSTREAM_ERROR', 'Failed to create Google Calendar event');
  }
  return result;
};

const deleteEvent = async (eventId) => {
  const result = await eventRepository.removeEvent(eventId);
  if (!result) {
    throw new AppError(NOT_FOUND, 'NOT_FOUND', 'Google Calendar event not found');
  }
  return result;
};

module.exports = {
  getUpcomingEvents,
  addEvent,
  deleteEvent,
};
