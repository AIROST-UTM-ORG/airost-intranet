const asyncHandler = require('../../shared/utils/asyncHandler');
const { sendSuccess } = require('../../shared/utils/apiResponse');
const { OK, CREATED } = require('../../shared/constants/httpStatus');
const eventService = require('./event.service');

const fetchEvents = asyncHandler(async (req, res) => {
  const events = await eventService.getUpcomingEvents(req?.query);
  return sendSuccess(res, events, OK);
});

const addEvent = asyncHandler(async (req, res) => {
  const event = await eventService.addEvent(req.sanitizedData || req.body);
  return sendSuccess(res, event, CREATED);
});

const deleteEvent = asyncHandler(async (req, res) => {
  const result = await eventService.deleteEvent(req.params.id);
  return sendSuccess(res, result, OK);
});

module.exports = {
  fetchEvents,
  addEvent,
  deleteEvent,
};
