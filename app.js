require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
// const md5 = require('md5');
// const encrypt = require('mongoose-encryption')
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    // cookie: { secure: true }
  }));

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.set('strictQuery', false);
mongoose.connect('mongodb://localhost:27017/userDB', {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// Level - 2 : Encryption
// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] });

const User = mongoose.model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    UserProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/auth/google',
    passport.authenticate('google', {scope: ['profile']})
)

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/secrets', (req, res) => {
    if(req.isAuthenticated()){
        res.render('secrets');
    } else {
        res.redirect('/login');
    }
})


app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

app.post('/register', (req, res) => {
    User.register({username: req.body.username}, req.body.password, (err, user) => {
        if(err){
            console.log(err);
            res.redirect('/register');
        } else {
            passport.authenticate('local')(req, res, () => {
                res.redirect('/secrets');
            })
        }
    })

    
    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    //     const newUser = new User({
    //         email: req.body.username,
    //         password: hash
    
    //     })
    
    //     newUser.save((err) => {
    //         if(!err){
    //             console.log('User has been registerd');
    //             res.render('secrets')
    //         } else{
    //             console.log(err);
    //         }
    //     })
    // });
});

app.post('/login', (req, res) => {

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, (err) => {
        if(err){
            console.log(err);
        } else {
            passport.authenticate('local')(req, res, () => {
                res.redirect('/secrets');
            })
        }
    })

    // const username = req.body.username
    // const password = req.body.password

    // User.findOne({email: username}, (err, foundUser) => {
    //     if(err){
    //         console.log(err)
    //     } else {
    //         if (foundUser){
    //             // if (foundUser.password === password){
    //             bcrypt.compare(password, foundUser.password, function(err, result) {
    //                 if(result === true){
    //                     res.render('secrets');
    //                 } else {
    //                     console.log(err)
    //                 }
    //             });
    //         }
    //     }
    // });
});



app.listen(3000, ()=>{
    console.log('Server started on port 3000');
});
