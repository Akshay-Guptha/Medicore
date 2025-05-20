const express = require('express');
const router = express.Router();
const User = require('../models/user');

// Middleware to protect the route (replace with proper auth check in production)
function adminAuth(req, res, next) {
  // You can add a token-based auth system later
  const isAdmin = true; // Mock condition
  if (!isAdmin) return res.status(403).json({ error: 'Unauthorized' });
  next();
}

// Route to get all registered emails
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find({}, 'fullName email isVerified'); // only select needed fields
    res.status(200).json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
