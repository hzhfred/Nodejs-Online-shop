const User = require('../models/user');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const API_KEYS = require('../API_KEYS');

const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const {validationResult} = require('express-validator/check');

const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: API_KEYS.SENDGRID_KEY
    }
}));

exports.getLogin = (req, res, next) => {

    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        errorMessage: req.flash('error')[0],
        oldInput: {
            email: "test@test.com",
            password: "ABCDEFG1234567"
        },
        allValidationErrors: []
    });
};

exports.getSignup = (req, res, next) => {
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        errorMessage: req.flash('error')[0],
        oldInput: {
            email: "",
            password: "",
            confirmPassword: ""
        },
        allValidationErrors: []
    });
};

exports.postSignup = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).render('auth/signup', {
            path: '/signup',
            pageTitle: 'Signup',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email,
                password: password,
                confirmPassword: req.body.confirmPassword
            },
            allValidationErrors: errors.array()
        });
    }
    //alternative to client side validation
    // User.findOne({email: email})
    //     .then(userdoc => {
    //         if (userdoc) {
    //             req.flash('error', 'User already exist');
    //
    //             return res.redirect('/signup');
    //         }
    // hash the password. this is sync
    bcrypt.hash(password, 12)
        .then(hashedPassword => {
            const user = new User({
                email: email,
                password: hashedPassword,
                cart: {items: []}

            });
            return user.save();
        })
        .then(result => {
            res.redirect('/login');
            return transporter.sendMail({
                to: email,
                from: 'hzhfred2001@gmail.com',
                subject: 'Signup succeeded',
                html: '<h1>You have successfully signed up !</h1>'
            });

        }).catch(err => console.log(err));
};

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email,
                password: password
            },
            allValidationErrors: errors.array()
        });
    }
    User.findOne({email: email})
        .then(user => {
            if (!user) {
                // save a flash('error') in request
                //flash('error') => 'Invalid email or password'
                // req.flash('error', 'Invalid email or password');

                return res.status(422).render('auth/login', {
                    path: '/login',
                    pageTitle: 'Login',
                    errorMessage: 'Invalid email or password',
                    oldInput: {
                        email: email,
                        password: password
                    },
                    allValidationErrors: []
                });
            }
            bcrypt.compare(password, user.password)
                .then(doMatch => {
                    if (doMatch) {
                        req.session.isLoggedIn = true;
                        req.session.user = user;
                        req.session.save(err => {
                            console.log(err);
                            res.redirect('/');
                        });
                    } else {
                        // req.flash('error', 'Invalid email or password');
                        return res.status(422).render('auth/login', {
                            path: '/login',
                            pageTitle: 'Login',
                            errorMessage: 'Invalid email or password',
                            oldInput: {
                                email: email,
                                password: password
                            },
                            allValidationErrors: []
                        });
                    }
                })
                .catch(err => {
                    console.log(err);
                    res.redirect('/login');
                });

        })
        .catch(err => console.log(err));
};


exports.postLogout = (req, res, next) => {
    req.session.destroy(err => {
        console.log(err);
        res.redirect('/');
    });
};

exports.getReset = (req, res, next) => {
    res.render('auth/reset', {
        path: '/reset',
        pageTitle: 'Reset Password',
        errorMessage: req.flash('error')[0]
    });
}

exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            console.log(err);
            return res.redirect('/reset');
        }
        const token = buffer.toString('hex');
        User.findOne({email: req.body.email})
            .then(user => {
                if (!user) {
                    req.flash('error', 'No account is linked with this email');
                    return res.redirect('/reset');
                }
                user.resetToken = token;
                user.resetTokenExpiration = Date.now() + 3600000;
                user.save()
                    .then(result => {
                        res.redirect('/');
                        return transporter.sendMail({
                            to: req.body.email,
                            from: 'hzhfred2001@gmail.com',
                            subject: 'Password Reset',
                            html: `<p>You requested a passwordreset</p>
                           <p><a href="http://localhost:3000/reset/${token}">Reset Now!</a></p>
                            `
                        });
                    });
            })
            .catch(err => console.log(err));
    });
}

exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;
    User.findOne({resetToken: token, resetTokenExpiration: {$gt: Date.now()}})
        .then(user => {
            res.render('auth/password-reset', {
                path: '/reset-password',
                pageTitle: 'Reset Password',
                errorMessage: req.flash('error')[0],
                userId: user._id.toString(),
                passwordToken: token
            });
        })
        .catch(err => console.log(err));


}

exports.postNewPassword = (req, res, next) => {
    const newPassword = req.body.password;
    const userId = req.body.userId;
    const token = req.body.passwordToken;
    console.log(token);
    User.findOne({
        resetToken: token,
        resetTokenExpiration: {$gt: Date.now()},
        _id: userId
    })
        .then(user => {
            console.log(user);
            bcrypt
                .hash(newPassword, 12)
                .then(hashedPassword => {
                    user.password = hashedPassword;
                    user.resetToken = undefined;
                    user.resetTokenExpiration = undefined;
                    return user.save();
                }).catch(err => console.log(err));
        })
        .then(result => {
            res.redirect('/login');
        })
        .catch(err => console.log(err));
}





