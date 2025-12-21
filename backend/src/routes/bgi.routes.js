const express = require('express');
const router = express.Router();
const controller = require('../controllers/bgi.controller');
const verifyApiKey = require('../middleware/authApiKey');

// 所有 BGI 接口都需要通过 API Key 验证
router.use(verifyApiKey);

router.get('/next-task', controller.getNextTask);
router.post('/report', controller.reportTask);
router.post('/update-data', controller.updateGameData); // 新增路由

module.exports = router;