const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'alumni-tracker-secret-key-2026';

function authMiddleware(req, res, next) {
    // Skip auth for login endpoint and static files
    if (req.path === '/api/auth/login' || !req.path.startsWith('/api')) {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token tidak ditemukan. Silakan login.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token tidak valid atau sudah expired.' });
    }
}

module.exports = { authMiddleware, JWT_SECRET };
