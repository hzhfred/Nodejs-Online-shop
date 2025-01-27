const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const API_KEYS = require('./API_KEYS');
const errorController = require('./controllers/error');
const User = require('./models/user');

const MONGODB_URI = API_KEYS.MONGODB_URI;

const app = express();
const store = new MongoDBStore({
    uri: MONGODB_URI,
    collection: 'sessions'
});

const csrfProtection = csrf();






const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images'); // store file in images folder
    },
    filename: (req, file, cb) => {
        cb(null, new Date().toISOString() + '-' + file.originalname);
    }
});
// this stores file in memory and upload to cloud
// const fileStorage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (
        file.mimetype === 'image/png' ||
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/jpeg'
    ) {
        cb(null, true);
    } else {
        cb(null, false);
    }
};


app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

app.use(bodyParser.urlencoded({extended: false}));
// app.use(()=> {cloudinary.config({
//     cloud_name: API_KEYS.CLOUDINARY_CLOUD_NAME,
//     api_key: API_KEYS.CLOUDINARY_API_KEY,
//     api_secret: API_KEYS.CLOUDINARY_API_SECRET
// })});
app.use(
    // get single file from input with name image<input name="image">  and store it in req.file.
    multer({storage: fileStorage, fileFilter: fileFilter}).single('image')
);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(
    session({
        secret: 'my secret',
        resave: false,
        saveUninitialized: false,
        store: store
    })
);
// pretect againest csrf attack
app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
    if (!req.session.user) {
        return next();
    }
    User.findById(req.session.user._id)
        .then(user => {
            if (!user) {
                next();
            }
            req.user = user;
            next();
        })
        .catch(err => {
            console.log(err);
        });
});

//every request rendering
// local view will now contain those data
app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn;
    res.locals.csrfToken = req.csrfToken();
    next();
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get('/500', errorController.get500);

app.use(errorController.get404);

mongoose
    .connect(
        MONGODB_URI, {
            useUnifiedTopology: true,
            useNewUrlParser: true
        })
    .then(result => {
        app.listen(process.env.PORT || 3000, ()=>{console.log('server running on port 3000!')});
    })
    .catch(err => {
        console.log(err);
    });