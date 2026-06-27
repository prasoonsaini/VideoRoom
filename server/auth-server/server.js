
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const session = require('express-session');
require('./googleStrategy');
const passport = require('passport');

require('dotenv').config();

const app = express();
app.set('strict routing', true);
// Database Configuration
app.use(
    session({
        secret: process.env.SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false,
            httpOnly: true, // Ensures cookie is not accessible via JavaScript (helps prevent XSS attacks)
            maxAge: 24 * 60 * 60 * 1000, // 1 day
           sameSite :  'lax'
        }
    })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser.json());
app.use(cors({ 
    origin: 'https://videoroom.duckdns.org',
    credentials: true 
}));

app.use('/auth', authRoutes);


// Add this after all your routes in server.js
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

const PORT = 9090;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
