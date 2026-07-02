const express = require('express');
const router = express.Router();
const controller = require('../controllers/auth.controller');
router.post('/api/register', controller.post__api_register);
router.post('/api/login', controller.post__api_login);
module.exports = router;
