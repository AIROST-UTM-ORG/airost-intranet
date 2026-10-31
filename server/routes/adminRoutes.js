const express = require('express');
const { createVerifiedUser } = require('../controller/adminController');
const router = express.Router();

// Create a new verified user
router.post('/users/verified', createVerifiedUser);


module.exports = router;