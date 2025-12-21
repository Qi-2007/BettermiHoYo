const express = require('express');
const router = express.Router();
const controller = require('../controllers/gameAccount.controller');
const verifyToken = require('../middleware/authJwt');

// 所有这些接口都需要登录 (verifyToken)
router.get('/', verifyToken, controller.getMyAccounts);
router.post('/', verifyToken, controller.addAccount);
router.delete('/:id', verifyToken, controller.deleteAccount);
router.put('/:id', verifyToken, controller.updateAccount);
router.get('/:id', verifyToken, controller.getAccountById); // 新增：获取单个详情
router.put('/:id/settings', verifyToken, controller.updateAccountSettings); // 新增：更新详细配置
router.put('/:id/password', verifyToken, controller.resetPassword); // 新增：重置密码

module.exports = router;