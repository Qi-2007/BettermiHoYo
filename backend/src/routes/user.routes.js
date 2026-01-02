const express = require('express');
const router = express.Router();
const controller = require('../controllers/user.controller');
const verifyToken = require('../middleware/authJwt');
const isAdmin = require('../middleware/isAdmin');

// 所有接口都需要管理员权限
router.use([verifyToken, isAdmin]);

router.get('/', controller.getAllUsers);
router.post('/', controller.createUser);
router.delete('/:id', controller.deleteUser);
router.put('/:id/password', controller.resetUserPassword);

module.exports = router;