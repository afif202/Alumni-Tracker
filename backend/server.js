require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { authMiddleware } = require('./middleware/authMiddleware');
const trackingRoutes = require('./routes/tracking');
const authRoutes = require('./routes/auth');
const importRoutes = require('./routes/import');
const osintRoutes = require('./routes/osint');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Public auth routes (no auth required)
app.use('/api/auth', authRoutes);

// Auth middleware for all other /api routes
app.use('/api', authMiddleware);

// Protected API Routes
app.use('/api', trackingRoutes);
app.use('/api/import', importRoutes);
app.use('/api/osint', osintRoutes);

// Serve Static Frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Fallback to index.html for root, redirect to login if not authenticated
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Start the server (local development only)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

// Export for Vercel Serverless Function
module.exports = app;
