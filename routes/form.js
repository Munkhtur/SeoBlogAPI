const express = require('express')
const router = express.Router()
const {contactForm, contactAuthForm} = require('../controllers/form');

//validators
const {runValidation} = require('../validators')
const {contactFormValidator} = require('../validators/form');



router.post('/contact',contactFormValidator, runValidation, contactForm);
router.post('/contact-blog-author',contactFormValidator, runValidation, contactAuthForm);



module.exports = router