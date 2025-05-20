// backend/routes/notes.js
const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const { ensureAuthenticated } = require('../middleware/authMiddleware'); // Uses the Passport-based middleware

// GET /api/notes/subjects - Get all unique subjects/notebooks for the logged-in user
router.get('/subjects', ensureAuthenticated, async (req, res) => {
    try {
        // Use distinct to find unique non-null/non-empty values for the 'subject' field for the current user
        const subjects = await Note.distinct('subject', {
            user: req.user.id,
            subject: { $ne: null, $ne: "" } // Ensure subject exists and is not an empty string
        });
        // distinct returns an array of subject strings. Sort them alphabetically for consistent UI.
        res.json(subjects.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })));
    } catch (error) {
        console.error('Error fetching subjects:', error);
        res.status(500).json({ message: 'Server error while fetching subjects.' });
    }
});

// POST /api/notes - Create a new note
router.post('/', ensureAuthenticated, async (req, res) => {
    try {
        const { title, content, subject, tags } = req.body;
        // Ensure subject is provided if your logic requires it for new notes via the new UI
        if (!title || !content || !subject) { // Added subject as required for notes from new UI
            return res.status(400).json({ message: 'Title, content, and subject are required.' });
        }
        const newNote = new Note({
            title,
            content,
            subject: subject.trim(), // Ensure subject is trimmed
            tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
            user: req.user.id // req.user is populated by Passport
        });
        const savedNote = await newNote.save();
        res.status(201).json(savedNote);
    } catch (error) {
        console.error('Error creating note:', error);
        // Check for duplicate key error if you have unique indexes on title+subject+user
        if (error.code === 11000) {
            return res.status(409).json({ message: 'A note with this title may already exist in this subject.' });
        }
        res.status(500).json({ message: 'Server error while creating note.' });
    }
});

// GET /api/notes - Get notes for the logged-in user, optionally filtered by subject
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const query = { user: req.user.id };
        const subjectFilter = req.query.subject;

        if (subjectFilter && typeof subjectFilter === 'string' && subjectFilter.trim() !== "") {
            query.subject = subjectFilter.trim();
        } else if (subjectFilter === null || subjectFilter === "" || subjectFilter === "null") {
            // If frontend explicitly wants notes with no subject or an empty subject
            query.subject = { $in: [null, ""] };
        }
        // If no subjectFilter is provided, it gets all notes for the user (original behavior for other uses)

        const notes = await Note.find(query).sort({ updatedAt: -1 });
        res.json(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ message: 'Server error while fetching notes.' });
    }
});

// GET /api/notes/:id - Get a specific note by ID
router.get('/:id', ensureAuthenticated, async (req, res) => {
    try {
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ message: 'Invalid note ID format.' });
        }
        const note = await Note.findOne({ _id: req.params.id, user: req.user.id });
        if (!note) return res.status(404).json({ message: 'Note not found or unauthorized.' });
        res.json(note);
    } catch (error) {
        console.error('Error fetching single note:', error);
        res.status(500).json({ message: 'Server error while fetching note.' });
    }
});

// PUT /api/notes/:id - Update a note
router.put('/:id', ensureAuthenticated, async (req, res) => {
    try {
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ message: 'Invalid note ID format.' });
        }
        const { title, content, subject, tags } = req.body;
        const updateData = {};

        // Only add fields to updateData if they are actually provided in the request body
        if (title !== undefined) updateData.title = title.trim();
        if (content !== undefined) updateData.content = content; // Content can be empty if user deletes it all
        if (subject !== undefined) updateData.subject = subject.trim(); // Subject can be changed
        if (tags !== undefined) {
            updateData.tags = Array.isArray(tags)
                ? tags.map(tag => tag.trim()).filter(tag => tag)
                : (tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []);
        }


        if (Object.keys(updateData).length === 0 && req.body.hasOwnProperty('tags') && updateData.tags.length === 0 && !tags) {
            // Special case: if only tags were sent and they are now empty, this is a valid update
        } else if (Object.keys(updateData).length === 0) {
             return res.status(400).json({ message: 'No valid update data provided.' });
        }

        // Ensure title and content are not set to empty strings if they are part of the update
        if (updateData.hasOwnProperty('title') && updateData.title === "") {
            return res.status(400).json({ message: 'Title cannot be empty.' });
        }
        if (updateData.hasOwnProperty('content') && updateData.content === "") {
             // Allowing content to be empty might be valid depending on requirements
             // If content is required, add: return res.status(400).json({ message: 'Content cannot be empty.' });
        }
        if (updateData.hasOwnProperty('subject') && updateData.subject === "") {
            return res.status(400).json({ message: 'Subject cannot be empty if provided for update.' });
        }


        updateData.updatedAt = Date.now();

        const note = await Note.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { $set: updateData },
            { new: true, runValidators: true }
        );
        if (!note) return res.status(404).json({ message: 'Note not found or unauthorized to update.' });
        res.json(note);
    } catch (error) {
        console.error('Error updating note:', error);
        if (error.code === 11000) {
            return res.status(409).json({ message: 'A note with this title may already exist in this subject (if subject changed).' });
        }
        res.status(500).json({ message: 'Server error while updating note.' });
    }
});

// DELETE /api/notes/:id - Delete a note
router.delete('/:id', ensureAuthenticated, async (req, res) => {
    try {
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ message: 'Invalid note ID format.' });
        }
        const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if (!note) return res.status(404).json({ message: 'Note not found or unauthorized to delete.' });
        res.json({ message: 'Note deleted successfully.' });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ message: 'Server error while deleting note.' });
    }
});

module.exports = router;