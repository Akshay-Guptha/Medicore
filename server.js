// backend/server.js

const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const passport = require('passport'); // For authentication
const session = require('express-session'); // For session management
const MongoStore = require('connect-mongo'); // To store sessions in MongoDB

dotenv.config(); // Loads .env file from the current directory (backend/)

// Passport Config (this line calls the function exported from backend/config/passport.js)
// Make sure backend/config/passport.js exists and is set up correctly.
require('./config/passport')(passport);

const app = express();

// CORS Middleware
app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500'], // IMPORTANT: Update with your frontend's actual origin(s)
    credentials: true // Allows cookies (sessions) to be sent/received
}));

// Body Parsers
app.use(express.json()); // Parses incoming JSON requests
app.use(express.urlencoded({ extended: true })); // Parses incoming URL-encoded form data

// Express Session Middleware
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'a default very secret key for medicore', // Use a strong secret from .env
        resave: false, // Don't save session if unmodified
        saveUninitialized: false, // Don't create session until something stored
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI,
            collectionName: 'sessions' // Optional: specify sessions collection name
        }),
        cookie: {
            // secure: process.env.NODE_ENV === 'production', // Set to true if using HTTPS in production
            httpOnly: true, // Prevents client-side JS from reading the cookie
            maxAge: 1000 * 60 * 60 * 24, // Optional: e.g., 1 day session lifetime
            // sameSite: 'lax' // Helps prevent CSRF. Use 'none' if frontend and backend are on completely different domains (requires secure:true)
        }
    })
);

// Passport Middleware (Initialize Passport and restore authentication state, if any, from the session)
app.use(passport.initialize());
app.use(passport.session());

// --- Static File Serving for Frontend ---
const frontendPath = path.join(__dirname, '../frontend'); // Path to your frontend folder
console.log('Serving static files from:', frontendPath);
app.use(express.static(frontendPath));

// Optional: Fallback to serve index.html for client-side routing (if your frontend is an SPA)
// If not an SPA, and you have specific HTML files, ensure they are served correctly by express.static
// or have specific routes. The current setup will serve index.html from the root of frontendPath
// when '/' is requested.
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});
// --- End Static File Serving ---


// API Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes); // Auth routes (e.g., /api/auth/login, /api/auth/register)

const adminRoutes = require('./routes/admin'); // Assuming you have this
app.use('/api/admin', adminRoutes);

const searchRoutes = require('./routes/search'); // Assuming you have this
app.use('/api/search', searchRoutes);

const noteRoutes = require('./routes/notes'); // Our new notes routes
app.use('/api/notes', noteRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("✅ Connected to MongoDB"))
.catch(err => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1); // Exit process with failure
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
});