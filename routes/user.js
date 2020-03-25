const express = require('express')
const router = express.Router()
const { requireSignin, authMiddleware, adminMiddleware} = require('../controllers/auth');
const { read, userProfile, update, photo} = require('../controllers/user');


router.get('/user/profile', requireSignin, authMiddleware, read);
router.get('/user/:username', userProfile);
router.put('/user/update', requireSignin, authMiddleware, update)
router.get('/user/photo/:username', photo)


module.exports = router