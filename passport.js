// backend/config/passport.js
const LocalStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose'); // Not strictly needed here unless using mongoose.Types.ObjectId directly
const bcrypt = require('bcryptjs');

// Load User model
const User = require('../models/user'); // Path to your User model

module.exports = function(passport) {
    passport.use(
        new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
            try {
                // Match user
                const user = await User.findOne({ email: email.toLowerCase().trim() });
                if (!user) {
                    return done(null, false, { message: 'That email is not registered.' });
                }

                // Match password
                const isMatch = await bcrypt.compare(password, user.password);
                if (isMatch) {
                    // User matched. We will check for isVerified in the /signin route itself before calling req.login()
                    return done(null, user);
                } else {
                    return done(null, false, { message: 'Password incorrect.' });
                }
            } catch (err) {
                console.error('Error in Passport LocalStrategy:', err);
                return done(err);
            }
        })
    );

    passport.serializeUser((user, done) => {
        done(null, user.id); // Store user ID in session
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user); // User object attached to req.user
        } catch (err) {
            console.error('Error in Passport deserializeUser:', err);
            // If user not found (e.g., deleted), it's important to handle this
            // done(err, null) could lead to issues. Often, just done(err) or done(null, false) if not found.
            // For simplicity, if error, pass error. If user found, pass user.
            if (!user) {
                return done(new Error('User not found during deserialization.'), null);
            }
            done(null, user);
        }
    });
};