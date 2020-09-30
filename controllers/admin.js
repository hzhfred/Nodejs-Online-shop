const mongoose = require('mongoose');
const fileHelper = require('../util/file');
const Product = require('../models/product');
const {validationResult} = require('express-validator/check');
const Datauri = require( 'datauri');
const {cloudinary} = require('../util/cloudinary');


exports.getAddProduct = (req, res, next) => {

    res.render('admin/edit-product', {
        pageTitle: 'Add Product',
        path: '/admin/add-product',
        editing: false,
        hasError: false,
        errorMessage: null,
        allValidationErrors: []

    });
};

exports.postAddProduct = (req, res, next) => {
    const title = req.body.title;
    const image = req.file;
    const price = req.body.price;
    const description = req.body.description;
    const errors = validationResult(req);
    console.log(image);
    if (!image) {
        return res.render('admin/edit-product', {
            pageTitle: 'Add Product',
            path: '/admin/add-product',
            editing: false,
            hasError: true,
            product: {
                title: title,
                price: price,
                description: description
            },
            errorMessage: 'attached file is not an image',
            allValidationErrors: []


        });
    }

    if (!errors.isEmpty()) {
        return res.render('admin/edit-product', {
            pageTitle: 'Add Product',
            path: '/admin/add-product',
            editing: false,
            hasError: true,
            product: {
                title: title,
                imageUrl: '',
                price: price,
                description: description
            },
            errorMessage: errors.array()[0].msg,
            allValidationErrors: errors.array()
        });
    }

    const imageUrl = image.path;
    console.log(imageUrl);
    const webUrl = req.protocol + '://' + req.get('host');
    console.log(webUrl);
    const imageLink = webUrl + '/' + imageUrl;

    // cloudinary.uploader.upload("images/2020-09-23T04:57:21.647Z-banana.jpg").then((result) => {
    //     console.log(result);
    //     return result.url;
    // }).then(() => {
    //
    //     } );

    const product = new Product({
        title: title,
        price: price,
        description: description,
        imageUrl: imageUrl,
        userId: req.user
    });
    product
        .save()
        .then(result => {
            // console.log(result);
            console.log('Created Product');
            res.redirect('/admin/products');
        })
        .catch(err => {
            console.log(err);
        });


};

// exports.postAddProduct = (req, res, next) => {
//     const title = req.body.title;
//     const image = req.file;
//     const price = req.body.price;
//     const description = req.body.description;
//     const errors = validationResult(req);
//     console.log(image);
//     if (!image) {
//         return res.render('admin/edit-product', {
//             pageTitle: 'Add Product',
//             path: '/admin/add-product',
//             editing: false,
//             hasError: true,
//             product: {
//                 title: title,
//                 price: price,
//                 description: description
//             },
//             errorMessage: 'attached file is not an image',
//             allValidationErrors: []
//
//
//         });
//     }
//
//     if (!errors.isEmpty()) {
//         return res.render('admin/edit-product', {
//             pageTitle: 'Add Product',
//             path: '/admin/add-product',
//             editing: false,
//             hasError: true,
//             product: {
//                 title: title,
//                 imageUrl: imageUrl,
//                 price: price,
//                 description: description
//             },
//             errorMessage: errors.array()[0].msg,
//             allValidationErrors: errors.array()
//         });
//     }
//
//     const dUri = new Datauri();
//     // const dataUri = req => dUri.format(path.extname(req.file.originalname).toString(), req.file.buffer);
//
//     const imageUri = dUri.format(path.extname(req.file.originalname).toString(), req.file.buffer).content;
//     cloudinary.uploader.upload(imageUrl).then((result) => {
//              const imageUrl = result.url;
//         const product = new Product({
//             title: title,
//             price: price,
//             description: description,
//             imageUrl: imageUrl,
//             userId: req.user
//         });
//         product
//             .save()
//             .then(result => {
//                 // console.log(result);
//                 console.log('Created Product');
//                 res.redirect('/admin/products');
//             })
//             .catch(err => {
//                 console.log(err);
//             });
//         })
// };

exports.getEditProduct = (req, res, next) => {
    const editMode = req.query.edit;
    if (!editMode) {
        return res.redirect('/');
    }
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            if (!product) {
                return res.redirect('/');
            }
            res.render('admin/edit-product', {
                pageTitle: 'Edit Product',
                path: '/admin/edit-product',
                editing: editMode,
                product: product,
                hasError: false,
                errorMessage: null,
                allValidationErrors: []


            });
        })
        .catch(err => console.log(err));
};

exports.postEditProduct = (req, res, next) => {
    const prodId = req.body.productId;
    const updatedTitle = req.body.title;
    const updatedPrice = req.body.price;
    const image = req.file;
    const updatedDesc = req.body.description;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.render('admin/edit-product', {
            pageTitle: 'Edit Product',
            path: '/admin/edit-product',
            editing: true,
            hasError: true,
            product: {
                title: updatedTitle,
                price: updatedPrice,
                description: updatedDesc,
                _id: prodId
            },
            errorMessage: errors.array()[0].msg,
            allValidationErrors: errors.array()


        });
    }

    Product.findById(prodId)
        .then(product => {
            if (product.userId.toString() !== req.user._id.toString()) {
                return res.redirect('/');
            }
            product.title = updatedTitle;
            product.price = updatedPrice;
            product.description = updatedDesc;
            if (image) {
                fileHelper.deleteFile(product.imageUrl);
                product.imageUrl = image.path;
            }
            return product
                .save()
                .then(result => {
                    console.log('UPDATED PRODUCT!');
                    res.redirect('/admin/products');
                });
        })
        .catch(err => console.log(err));
};

exports.getProducts = (req, res, next) => {
    Product.find({userId: req.user._id})
        // .select('title price -_id')
        // .populate('userId', 'name')
        .then(products => {
            console.log(products);
            res.render('admin/products', {
                prods: products,
                pageTitle: 'Admin Products',
                path: '/admin/products'
            });
        })
        .catch(err => console.log(err));
};

exports.postDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    Product.findById(prodId).then(product => {
        fileHelper.deleteFile(product.imageUrl);
        return Product.deleteOne({userId: req.user._id, _id: prodId});
    }).then(() => {
        console.log('DESTROYED PRODUCT');
        res.redirect('/admin/products');
    })
        .catch(err => console.log(err));
};
