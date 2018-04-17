const path = require('path')
const dotenv = require('dotenv')
dotenv.config() // Access to .env

const express = require('express')
const app = express()
app.set('view engine', 'pug')

// All the things needed for Redis Session Storage ------------------
const session = require('express-session')
const redis = require('redis')
const client = redis.createClient({
  url: process.env.REDIS
})
const RedisStore = require('connect-redis')(session)
const store = new RedisStore({client: client})
app.use(
  session({
    secret: process.env.SECRET,
    cookie: {maxAge: 1000 * 60 * 60 * 24},
    store: store,
    resave: false,
    saveUninitialized: false
  })
)
// End RedisStore Config ------------- End RedisStore Config -------

// Main App Config ------------------- Main App Config --------------
app.use(
  express.urlencoded({extended: false})
).listen(3000, () => { console.log('Server Running @ http://localhost:3000') })
// End Main App Config --------------- End Main App Config ------------

// Passport Config ------------------- Passport Config ----------------
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy

passport.use(
  new GoogleStrategy({
    clientID: process.env.OAUTH2_CLIENT_ID,
    clientSecret: process.env.OAUTH2_CLIENT_SECRET,
    callbackURL: process.env.OAUTH2_CALLBACK,
    accessType: 'offline'
  }, (accessToken, refreshToken, profile, done) => {
    // Extract Profile
    done(null, extractProfile (profile))
  })
)
// Extract Profile
function extractProfile (profile) {
  var imageUrl = ''
  if (profile.photos && profile.photos.length) {
    imageUrl = profile.photos[0].value
  }
  return {
    id: profile.id,
    displayName: profile.displayName,
    image: imageUrl,
    name: {
      first: profile.name.givenName,
      last: profile.name.familyName,
      user: profile._json.tagline
    },
    email: profile.emails
  }
}
app.use(
  passport.initialize(),
  passport.session()
)
// Serialize User ---------------------- Serialize User ------------
passport.serializeUser(function (user, done) {
  done(null, user)
})
passport.deserializeUser(function (obj, done) {
  done(null, obj)
})

// End Passport Config ---------------- End Passport Config ---------

// Get Routes -------------------------- Get Routes -----------------
// Google Auth Route
app.get(
  '/auth/login',
  (req, res, next) => {
    if (req.query.return) {
      res.session.oauth2return = req.query.return
    }
    next()
  },
  passport.authenticate('google', {scope: ['email', 'profile']})
)
app.get(
  '/auth/google/callback',
  passport.authenticate('google'),
  (req, res) => {
    const redirect = req.session.oauth2return || '/'
    delete req.session.oauth2return
    res.redirect('/')
})
// Google Auth Route
app.get('/', (req, res) => {
  if (!req.user) {
    res.redirect('/login')
  } else {
    res.render('home', {
      image: req.user.image,
      displayName: req.user.displayName,
      user: JSON.stringify(req.user)
    })
  }

})
app.get('/login', (req, res) => {
  res.render('form', {
    title: 'login'
  })
})
app.get('/logout', (req, res) => {
  req.logout()
  res.redirect('/')
})
// End Get Routes -------------------- End Get Routes -----------------
