const express = require('express');
const {check, body} = require('express-validator/check');
const User = require('../models/user');

const authController = require('../controllers/auth');

const router = express.Router();

router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.post('/login',
    check('email')
        .isEmail()
        .withMessage('Please enter a valid email'),
    check('password')
        .isLength({min:6})
        .withMessage('Please enter a password as least 6 characters long'),
    authController.postLogin);

router.post('/signup',
    check('email')
        .isEmail()
        .withMessage('Please enter a valid email')
        .custom((value, {req})=>{
           return User.findOne({email: value})
                .then(userdoc => {
                        if(userdoc){
                            throw new Error('User already exist, try a different email !');
                        }
                        return true;
                });
        }),
    body('password',
        'Please enter a password as least 6 characters long')
        .isLength({min: 6}),
    //CHECK IF CONFIRM PASSWORD IS SAME
    body('confirmPassword')
        .custom((value,{ req })=>{
            if(value !== req.body.password){
                throw new Error('password must match');
            }else if(value.length < 6){
                throw new Error('confirm password can not be empty');
            }
            return true;
        }),
    authController.postSignup
);

router.post('/logout', authController.postLogout);

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

router.get('/reset/:token', authController.getNewPassword);

router.post('/reset-password', authController.postNewPassword);

module.exports = router;