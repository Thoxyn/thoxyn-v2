const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy
const host = process.env.HOST || "thoxyn.com"
const heroku = process.env.heroku || "thoxynv2.herokuapp.com"

module.exports = (passport) => {
  passport.serializeUser((user, done) => {
    done(null, user)
  })

  passport.deserializeUser((user, done) => {
    done(null, user)
  })

  passport.use(new GoogleStrategy({
    clientID: process.env.clientID,
    clientSecret: process.env.clientSecret,
    callbackURL: 'http://'+ host + '/auth/google/callback' // should auto redirect to HTTPS
  },
  (token, refreshToken, profile, done) => {
    return done(null, {
      profile: profile,
      token: token
    })
  }))
}
