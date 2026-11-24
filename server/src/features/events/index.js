const eventRoutes = require('./event.routes');
const eventController = require('./event.controller');
const eventService = require('./event.service');
const eventRepository = require('./event.repository');

module.exports = {
  eventRoutes,
  eventController,
  eventService,
  eventRepository,
};
