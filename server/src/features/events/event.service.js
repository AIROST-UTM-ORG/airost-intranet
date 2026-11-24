const AppError = require('../../shared/errors/AppError');
const { NOT_FOUND } = require('../../shared/constants/httpStatus');
const eventRepository = require('./event.repository');

const getUpcomingEvents = async (options) => {
  return eventRepository.getEvents(options);
};

const addEvent = async (eventData) => {
  return eventRepository.insertEvent(eventData);
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
