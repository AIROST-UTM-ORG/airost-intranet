const googleCalendar = require('../../config/googleCalendar');

const getEvents = async (options) => {
  return googleCalendar.getEvents(options);
};

const insertEvent = async (eventData) => {
  return googleCalendar.insertEvent(eventData);
};

const removeEvent = async (eventId) => {
  return googleCalendar.removeEvent(eventId);
};

module.exports = {
  getEvents,
  insertEvent,
  removeEvent,
};
