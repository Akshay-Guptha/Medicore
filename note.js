// backend/models/Note.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const noteSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    subject: { // Optional: e.g., "Anatomy", "Pharmacology"
        type: String,
        trim: true
    },
    tags: [{ // Optional: for better organization
        type: String,
        trim: true
    }],
    user: { // Link to the user who created the note
        type: Schema.Types.ObjectId,
        ref: 'User', // This 'User' should match the name you gave your User model in User.js
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware to update `updatedAt` on save
noteSchema.pre('save', function(next) {
    if (this.isModified('content') || this.isModified('title') || this.isNew) { // Only update if content/title changed or new
        this.updatedAt = Date.now();
    }
    next();
});

module.exports = mongoose.model('Note', noteSchema);