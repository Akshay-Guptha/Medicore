// backend/middleware/authMiddleware.js
module.exports.ensureAuthenticated = function(req, res, next) {
    // Check if the user is authenticated
    if (req.isAuthenticated && req.isAuthenticated()) {
        // Additional check: Ensure the authenticated user is also verified
        // This is a good secondary check, although the login process should prevent unverified users from logging in.
        if (req.user && !req.user.isVerified) {
            // req.logout(); // Optionally log them out if they somehow got a session while unverified
            return res.status(403).json({ message: 'Forbidden: Your account is not verified. Please verify your email.' });
        }
        return next(); // User is authenticated and verified, proceed
    }
    // If not authenticated, send a 401 Unauthorized JSON response
    res.status(401).json({ message: 'Unauthorized: Please log in to access this resource.' });
};