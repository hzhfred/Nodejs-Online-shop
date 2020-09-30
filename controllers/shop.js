const Product = require('../models/product');
const Order = require('../models/order');
const fs = require('fs');
const path = require('path');
const pdfDocument = require('pdfkit');
const API_KEYS = require('../API_KEYS');
// stripe secret api key
const stripe = require('stripe')(API_KEYS.STRIPE_SECRET);

const ITEMS_NUM_PAGE = 3;

exports.getProducts = (req, res, next) => {
    let page = 1;

    if(req.query.page){
        page = Number(req.query.page);
    }



    let totalItemNum;
    Product
        .find()
        .countDocuments()
        .then(productNum => {
            totalItemNum = productNum;
            return Product.find()
                //mongodb built in function. ship # of items
                .skip((page - 1) * ITEMS_NUM_PAGE)
                //mongodb built in function. fetch only
                // limited # of item from DB.
                .limit(ITEMS_NUM_PAGE);

        })
        .then(products => {
            res.render('shop/product-list', {
                prods: products,
                pageTitle: 'Products',
                path: '/products',
                hasNextPage: ITEMS_NUM_PAGE * page < totalItemNum,
                hasPreviousPage: page > 1,
                currentPage: page,
                lastPage: Math.ceil(totalItemNum / ITEMS_NUM_PAGE),
                searchWord: ''
            });
        })
        .catch(err => {
            console.log(err);
        });
};

exports.getProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            res.render('shop/product-detail', {
                product: product,
                pageTitle: product.title,
                path: '/products'
            });
        })
        .catch(err => console.log(err));
};

exports.getIndex = (req, res, next) => {
    let page = 1;
    if(req.query.page){
        page = Number(req.query.page);
    }
    let totalItemNum = 6;
    Product
        .find()
        .sort({ field: 'asc', _id: -1 })
                        //mongodb built in function. ship # of items
        .skip((page - 1) * ITEMS_NUM_PAGE)
                        //mongodb built in function. fetch only
                        // limited # of item from DB.
        .limit(ITEMS_NUM_PAGE)
        .then(products => {

            res.render('shop/index', {
                prods: products,
                pageTitle: 'Shop',
                path: '/',
                hasNextPage: ITEMS_NUM_PAGE * page < totalItemNum,
                hasPreviousPage: page > 1,
                currentPage: page,
                lastPage: Math.ceil(totalItemNum / ITEMS_NUM_PAGE)
            });
        })
        .catch(err => {
            console.log(err);
        });
};

// exports.getIndex = (req, res, next) => {
//     let page = 1;
//     if(req.query.page){
//         page = Number(req.query.page);
//     }
//     let totalItemNum;
//     Product
//         .find()
//         .countDocuments()
//         .then(productNum => {
//             totalItemNum = productNum;
//             return Product.find()
//                 //mongodb built in function. ship # of items
//                 .skip((page - 1) * ITEMS_NUM_PAGE)
//                 //mongodb built in function. fetch only
//                 // limited # of item from DB.
//                 .limit(ITEMS_NUM_PAGE);
//
//         })
//         .then(products => {
//             res.render('shop/index', {
//                 prods: products,
//                 pageTitle: 'Shop',
//                 path: '/',
//                 hasNextPage: ITEMS_NUM_PAGE * page < totalItemNum,
//                 hasPreviousPage: page > 1,
//                 currentPage: page,
//                 lastPage: Math.ceil(totalItemNum / ITEMS_NUM_PAGE)
//             });
//         })
//         .catch(err => {
//             console.log(err);
//         });
// };

exports.getCart = (req, res, next) => {
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            console.log(user.cart.items[0]);
            const products = user.cart.items;
            res.render('shop/cart', {
                path: '/cart',
                pageTitle: 'Your Cart',
                products: products
            });
        })
        .catch(err => console.log(err));
};

exports.postCart = (req, res, next) => {
    const prodId = req.body.productId;
    Product.findById(prodId)
        .then(product => {
            return req.user.addToCart(product);
        })
        .then(result => {
            res.redirect('/cart');
        });
};

exports.postCartDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    req.user
        .removeFromCart(prodId)
        .then(result => {
            res.redirect('/cart');
        })
        .catch(err => console.log(err));
};

exports.postOrder = (req, res, next) => {
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            const products = user.cart.items.map(i => {
                return {quantity: i.quantity, product: {...i.productId._doc}};
            });
            const order = new Order({
                user: {
                    email: req.user.email,
                    userId: req.user
                },
                products: products
            });
            return order.save();
        })
        .then(result => {
            return req.user.clearCart();
        })
        .then(() => {
            res.redirect('/orders');
        })
        .catch(err => console.log(err));
};

exports.getOrders = (req, res, next) => {
    Order.find({'user.userId': req.user._id})
        .then(orders => {
            res.render('shop/orders', {
                path: '/orders',
                pageTitle: 'Your Orders',
                orders: orders
            });
        })
        .catch(err => console.log(err));
};

exports.getReceipt = (req, res, next) => {
    const orderId = req.params.orderId;
    Order.findById(orderId).then(order => {
        if (!order) {
            return console.log("can't access");
        }
        if (order.user.userId.toString() !== req.user._id.toString()) {
            return console.log("can't access");
        }
        const invoiceName = 'invoice-' + orderId + '.pdf';
        const invoicePath = path.join('data', 'invoices', invoiceName);

        const pdfDoc = new pdfDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            'inline;' + ' invoiceName="' + invoiceName + '"'
        );
        pdfDoc.pipe(fs.createWriteStream(invoicePath));
        pdfDoc.pipe(res);
        pdfDoc.fontSize(26).text('Receipt', {
            underline: true
        });
        pdfDoc.text('--------------------------');
        let totalPrice = 0;
        order.products.forEach(prod => {
            totalPrice = totalPrice + prod.product.price * prod.quantity;
            pdfDoc
                .fontSize(14)
                .text(prod.product.title +
                    ' - ' +
                    prod.quantity +
                    'x' +
                    prod.product.price);
        });
        pdfDoc.fontSize(20).text('--------------------------');

        pdfDoc.text('Total Price: $' + totalPrice);

        pdfDoc.end();
        // fs.readFile(invoicePath, (err, data)=>{
        //     if(err){
        //         return console.log(err);
        //     }
        //     res.setHeader('Content-Type','application/pdf');
        //     res.setHeader('Content-Disposition', 'inline; invoiceName="'+filename+'"');
        //     res.send(data);
        // });
        // const file = fs.createReadStream(invoicePath);
        //
        // file.pipe(res);
    }).catch();

}

exports.getCheckout = (req,res,next) =>{
    let products;
    let total = 0;
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            products = user.cart.items;
            products.forEach(prod => {
                total += prod.quantity * prod.productId.price;
            });
            // create stripe session key
            return stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: products.map(p=>{
                    return {
                        name: p.productId.title,
                        description: p.productId.description,
                        amount: p.productId.price * 100, // must be in cents
                        currency: 'usd',
                        quantity: p.quantity
                    };
                }),
                success_url: req.protocol + "://" + req.get('host') + "/checkout/success",
                cancel_url:req.protocol + "://" + req.get('host') + "/checkout/cancel"
            });
        })
        .then(session => {
            res.render('shop/checkout', {
                path: '/checkout',
                pageTitle: 'Checkout',
                products: products,
                totalSum: total,
                sessionId: session.id
            });
        }).catch();
}

exports.getCheckoutSuccess = (req, res, next) => {
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            const products = user.cart.items.map(i => {
                return {quantity: i.quantity, product: {...i.productId._doc}};
            });
            const order = new Order({
                user: {
                    email: req.user.email,
                    userId: req.user
                },
                products: products
            });
            return order.save();
        })
        .then(result => {
            return req.user.clearCart();
        })
        .then(() => {
            res.redirect('/orders');
        })
        .catch(err => console.log(err));
};

exports.postProductSearch = (req,res,next)=>{
    const searchWord = req.body.search;
    const searchURL = '/productSearch/'+searchWord;
    res.redirect(searchURL);
};

exports.getProductSearch = (req,res,next) => {

        let page = 1;
        let searchWord = null;
        let totalItemNum;


    if(req.query.page){
            page = Number(req.query.page);
        }
        if(req.params.searchWord){
            searchWord = req.params.searchWord;
        }

        Product
            .find(req.params.searchWord ? {title:{ $regex: req.params.searchWord, $options: 'i' }}: {})
            .countDocuments()
            .then(productNum => {
                totalItemNum = productNum;
                return Product.find(req.params.searchWord ? {title:{ $regex: req.params.searchWord, $options: 'i' }}: {})
                    //mongodb built in function. ship # of items
                    .skip((page - 1) * ITEMS_NUM_PAGE)
                    //mongodb built in function. fetch only
                    // limited # of item from DB.
                    .limit(ITEMS_NUM_PAGE);
            })
            .then(products => {
                res.render('shop/product-list', {
                    prods: products,
                    pageTitle: 'Products',
                    path: '/productSearch/'+searchWord,
                    hasNextPage: ITEMS_NUM_PAGE * page < totalItemNum,
                    hasPreviousPage: page > 1,
                    currentPage: page,
                    lastPage: Math.ceil(totalItemNum / ITEMS_NUM_PAGE),
                    searchWord: searchWord
                });
            })
            .catch(err => {
                console.log(err);
            });

};


