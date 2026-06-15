const express = require('express');
const authenticate = require('../middleware/auth');
const { getProfile, updateProfile, deleteAccount } = require('../controllers/userController');

const router = express.Router();

router.use(authenticate);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.delete('/account', deleteAccount);

module.exports = router;
