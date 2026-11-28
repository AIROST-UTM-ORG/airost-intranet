const eventService = require('../src/features/events/event.service');

const fetchEvents = async (req, res) => {
  try {
    const events = await eventService.getUpcomingEvents(req?.query);
    return res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

const addEvent = async (req, res) => {
  try {
    const event = await eventService.addEvent(req.sanitizedData || req.body);
    return res.status(201).json(event);
  } catch (error) {
    console.error('Error adding event:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await eventService.deleteEvent(id);
    return res.json(event);
  } catch (error) {
    console.error('Error deleting event:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  fetchEvents,
  addEvent,
  deleteEvent,
};