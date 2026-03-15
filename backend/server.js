const express = require('express');
const cors = require('cors');
const path = require('path');
const trackingRoutes = require('./routes/tracking');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Main App API Routes
app.use('/api', trackingRoutes);

// Serve Static Frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Fallback to index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start the server (local development only)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

// Export for Vercel Serverless Function
module.exports = app;
