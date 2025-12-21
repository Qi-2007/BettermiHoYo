const express = require('express');
const router = express.Router();
const controller = require('../controllers/task.controller');
const verifyToken = require('../middleware/authJwt');

// 获取日历数据的接口，需要登录
router.get('/calendar', verifyToken, controller.getCalendarData);
router.get('/by-date', verifyToken, controller.getTasksByDate); // <-- 新增路由
router.get('/account/:accountId', verifyToken, controller.getTasksByAccountId); // 新增

module.exports = router;