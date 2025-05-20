// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/user'); // Corrected path to User model
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const passport = require('passport');
const { ensureAuthenticated } = require('../middleware/authMiddleware'); // For the /me route

// Helper function to send OTP email (from your original code)
async function sendOtpEmail(email, otp) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    tls: { rejectUnauthorized: false }
  });
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP for MediCore',
    text: `Your OTP is ${otp}. It expires in 10 minutes.`
  };
  await transporter.sendMail(mailOptions);
}

// Signup route (from your original code - this is fine, verification happens separately)
router.post('/signup', async (req, res) => {
  const { fullName, email, password } = req.body;
  if (!fullName || !email || !password) return res.status(400).json({ error: 'All fields required' });
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(409).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const user = new User({
      fullName, email, password: hashedPassword, otp,
      otpExpiry: Date.now() + 10 * 60 * 1000, isVerified: false
    });
    await user.save();
    await sendOtpEmail(email, otp);
    res.json({ message: 'OTP sent to email, verify to activate account' });
  } catch (error) { console.error(error); res.status(500).json({ error: 'Server error' }); }
});

// Verify OTP route (from your original code - this is fine)
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isVerified) return res.json({ message: 'User already verified' }); // No error, just info
    if (user.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    if (Date.now() > user.otpExpiry) return res.status(400).json({ error: 'OTP expired' });
    user.isVerified = true; user.otp = undefined; user.otpExpiry = undefined;
    await user.save();
    res.json({ message: 'User verified successfully' });
  } catch (error) { console.error(error); res.status(500).json({ error: 'Server error' }); }
});

// Signin route - USES PASSPORT
router.post('/signin', (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error('Passport authentication error:', err);
            return res.status(500).json({ success: false, error: 'Server error during authentication' });
        }
        if (!user) {
            // info.message comes from the LocalStrategy's done(null, false, { message: ... })
            return res.status(401).json({ success: false, error: info.message || 'Invalid credentials' });
        }

        // CRITICAL: Check if user is verified BEFORE establishing a session
        if (!user.isVerified) {
            return res.status(401).json({ success: false, error: 'Account not verified. Please verify your email.' });
        }

        // req.login() is a Passport function that establishes a session.
        // It will call passport.serializeUser()
        req.login(user, (err) => {
            if (err) {
                console.error('Session login error:', err);
                return res.status(500).json({ success: false, error: 'Server error during session creation' });
            }
            // Session established successfully
            return res.json({
                success: true,
                message: 'Sign in successful',
                user: { // Send back some user info for the frontend
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email
                }
            });
        });
    })(req, res, next); // This invokes the middleware returned by passport.authenticate
});

// Logout Route
router.post('/logout', (req, res, next) => {
    req.logout(function(err) { // req.logout() is added by Passport
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ success: false, message: 'Error during logout.' });
        }
        // Optionally destroy the session completely and clear cookie
        req.session.destroy((destroyErr) => {
            if (destroyErr) {
                 console.error('Session destruction error during logout:', destroyErr);
                 // Still attempt to clear cookie and respond positively if logout itself was ok
            }
            res.clearCookie('connect.sid'); // 'connect.sid' is the default session cookie name
            return res.json({ success: true, message: 'Logged out successfully.' });
        });
    });
});

// GET /api/auth/me - Get current logged-in user's info
router.get('/me', ensureAuthenticated, (req, res) => {
    // req.user is populated by Passport's deserializeUser via the session
    // ensureAuthenticated already checks if req.user exists and is verified
    res.json({
        success: true,
        user: {
            id: req.user.id,
            fullName: req.user.fullName,
            email: req.user.email
            // Do not send back password, otp, otpExpiry, etc.
        }
    });
});

// Request Password Reset OTP (from your original code - this is fine)
router.post('/request-reset', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // For password reset, you might want to store the OTP directly, not hashed,
    // for easier comparison, or hash it if you prefer and compare hashes.
    // Your current logic hashes it, which is fine if /reset-password compares hashes.
    // The provided /reset-password compares the plain OTP from req.body with a hashed user.otp.
    // This needs to be consistent. Let's assume for now the OTP for reset is stored plain,
    // or /reset-password also hashes the incoming OTP before comparing.
    // For simplicity, I'll keep your original hashing logic for user.otp.
    const hashedOtp = await bcrypt.hash(otp, 10);
    user.otp = hashedOtp; // Store hashed OTP for password reset
    user.otpExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();
    await sendOtpEmail(email, otp); // Send the plain OTP to the user
    res.status(200).json({ message: 'Password reset OTP sent to your email' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// Reset Password (from your original code - verify OTP comparison logic)
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return res.status(400).json({ error: 'All fields required' });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.otp || Date.now() > user.otpExpiry) return res.status(400).json({ error: 'OTP expired or invalid' });

    // IMPORTANT: You are storing hashed OTP (user.otp) but comparing with plain OTP (req.body.otp)
    // This comparison will fail. You must either:
    // 1. Store plain OTP in user.otp for password reset.
    // 2. Hash the incoming req.body.otp before comparing with user.otp.
    // Option 2 is more secure if user.otp is exposed in any way (though it shouldn't be).
    // Let's go with option 2 here:
    const isOtpValid = await bcrypt.compare(otp, user.otp); // Compare plain incoming OTP with stored hashed OTP
    if (!isOtpValid) return res.status(400).json({ error: 'Invalid OTP' });

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = undefined; user.otpExpiry = undefined;
    await user.save();
    res.json({ message: 'Password reset successful' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});


module.exports = router;