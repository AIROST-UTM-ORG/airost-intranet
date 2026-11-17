const router = require('express').Router();
const controller = require('./auth.controller');

router.get('/login/success', controller.loginSuccess);
router.get('/login/failed', controller.loginFailed);
router.get('/logout', controller.logout);
router.post('/logout', controller.logout);
router.get('/google', controller.startGoogleAuth);
router.get('/google/callback', controller.finishGoogleAuth);

module.exports = router;
