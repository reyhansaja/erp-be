const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');

// Protect all user routes
router.use(verifyToken);
router.use(checkRole(['Superadmin']));

// In the controller we will double check that ONLY 'Superadmin' can do these
router.get('/', userController.getUsers);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
