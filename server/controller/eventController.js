const { getEvents, insertEvent, removeEvent } = require('../google_calendar')

const fetchEvents = async (req, res) => {
    try {
        
        const events = await getEvents();
        res.json(events);
      } catch (error) {
        console.error('Error fetching events:', error.message);
        res.status(500).json({ error: error.message });
      }
}

const addEvent = async (req, res) => {
    try {
        const event = await insertEvent(req.body);
        res.status(201).json(event);
      } catch (error) {
        console.error('Error adding event:', error.message);
        res.status(500).json({ error: error.message });
      }
}

const deleteEvent = async (req, res) => {
  try {
      const { id } = req.params;
      const event = await removeEvent(id);
      res.json(event);
    } catch (error) {
      console.error('Error deleting event:', error.message);
      res.status(500).json({ error: error.message });
    }
}

module.exports = {
    fetchEvents,
    addEvent,
    deleteEvent
}