const router = require('express').Router();
const controller = require('./event.controller');
const { authenticate } = require('../../middleware/authenticate');
const { validate } = require('../../middleware/validate');
const { validateAddEvent } = require('./event.validation');

router.get('/upcoming-events', controller.fetchEvents);
router.post('/add', authenticate, validate(validateAddEvent), controller.addEvent);
router.delete('/:id', authenticate, controller.deleteEvent);

module.exports = router;
