const path = require('path');
const {check, body} = require('express-validator/check');

const express = require('express');

const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

// /admin/add-product => GET
router.get('/add-product', isAuth, adminController.getAddProduct);

// /admin/products => GET
router.get('/products', isAuth, adminController.getProducts);

// /admin/add-product => POST
router.post('/add-product',
    body('title')
        .isLength({min: 3})
        .withMessage('title is too short')
        .trim(),
    body('price')
        .isFloat()
        .withMessage('enter a decimal value'),
    body('description')
        .isLength({min: 5, max: 200})
        .withMessage('description too long or too short')
        .trim(),
    isAuth, adminController.postAddProduct);

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

router.post('/edit-product',
    body('title')
        .isLength({min: 3})
        .withMessage('title is too short')
        .trim(),
    body('price')
        .isFloat()
        .withMessage('enter a decimal value'),
    body('description')
        .isLength({min: 5, max: 200})
        .withMessage('description too long or too short')
        .trim(),
    isAuth, adminController.postEditProduct);

router.post('/delete-product', isAuth, adminController.postDeleteProduct);

module.exports = router;
