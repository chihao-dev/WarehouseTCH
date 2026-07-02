const express = require('express');
const router = express.Router();
const controller = require('../controllers/index.controller');
const upload = require('../config/multer');
router.get('/', controller.get_);
router.post('/api/upload', upload.single('image'), controller.post__api_upload);
router.get('/api/kiem_ke_lich_su', controller.get__api_kiem_ke_lich_su);
router.post('/api/ai-summary', controller.post__api_ai_summary);
module.exports = router;
