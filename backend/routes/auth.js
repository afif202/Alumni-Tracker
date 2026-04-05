const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { JWT_SECRET } = require('../middleware/authMiddleware');

// POST /api/auth/login
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error.' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Username atau password salah.' });
        }

        const isValid = bcrypt.compareSync(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Username atau password salah.' });
        }

        // Generate JWT token — 24h expiry
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login berhasil',
            token,
            user: { id: user.id, username: user.username, role: user.role }
        });
    });
});

// GET /api/auth/verify — check token validity
router.get('/verify', (req, res) => {
    // If this route is reached, the authMiddleware already validated the token
    res.json({ valid: true, user: req.user });
});

module.exports = router;
