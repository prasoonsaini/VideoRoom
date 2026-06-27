const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();
// Serialize user for the session
passport.serializeUser((user, done) => {
    done(null, user);
});

// Deserialize user from the session
passport.deserializeUser((user, done) => {
    done(null, user);
});

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: 'https://videoroom.duckdns.org/auth/google/callback',
        },
        async (accessToken, refreshToken, profile, done) => {
            // Save user info or handle login
            console.log(profile)
            return done(null, profile);
        }
    )
);

module.exports = passport;
