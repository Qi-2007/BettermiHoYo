const express = require('express');
const router = express.Router();
const controller = require('../controllers/admin.controller');

// 引入所有需要的中间件
const verifyToken = require('../middleware/authJwt');
const isAdmin = require('../middleware/isAdmin');
const verifyApiKey = require('../middleware/authApiKey');

// --- BGI-Agent 使用的接口 ---
// 这个接口使用 API Key 进行验证
router.post('/heartbeat', verifyApiKey, controller.receiveHeartbeat);


// --- 前端管理员面板使用的接口 ---
// 这些接口需要用户登录(verifyToken)并且是管理员(isAdmin)
router.post('/wakeup', [verifyToken, isAdmin], controller.wakeup);
router.post('/force-restart', [verifyToken, isAdmin], controller.forceRestart);
router.get('/status', [verifyToken, isAdmin], controller.getSystemStatus);
router.post('/plug/toggle', [verifyToken, isAdmin], controller.togglePlug); // <-- 新增路由
router.post('/shutdown', [verifyToken, isAdmin], controller.shutdown); // <-- 新增路由
// 字段选项 (下拉菜单)
router.get('/metadata', [verifyToken], controller.getFieldOptions);
router.post('/metadata', [verifyToken, isAdmin], controller.addFieldOption);
router.delete('/metadata/:id', [verifyToken, isAdmin], controller.deleteFieldOption);
// 新增：字段本身配置 (名称、类型)
router.get('/field-config', [verifyToken, isAdmin], controller.getFieldConfigs);
router.post('/field-config', [verifyToken, isAdmin], controller.saveFieldConfig);
router.delete('/field-config/:id', [verifyToken, isAdmin], controller.deleteFieldConfig);
// 数据库结构管理
router.post('/schema/add-column', [verifyToken, isAdmin], controller.addDatabaseColumn);

module.exports = router;