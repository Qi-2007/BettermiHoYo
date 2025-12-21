const express = require('express');
const router = express.Router();
const controller = require('../controllers/auth.controller');

// All routes in this file will be prefixed with /api/auth
router.post('/register', controller.register);
router.post('/login', controller.login);

module.exports = router;