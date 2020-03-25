const {check} = require('express-validator')

exports.contactFormValidator = [
    check('name').not().isEmpty().withMessage('Name is required'),
    check('email').isEmail().withMessage('Must be valid email'),
    check('message').not().isEmpty().withMessage('Message required')
];