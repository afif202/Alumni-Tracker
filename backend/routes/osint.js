const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { searchAlumni, PLATFORMS, generateGoogleSearchLinks } = require('../services/osintService');

// POST /api/osint/search/:alumni_id — Run OSINT search for one alumni
router.post('/search/:alumni_id', async (req, res) => {
    try {
        const { alumni_id } = req.params;
        const result = await searchAlumni(parseInt(alumni_id));
        res.json({
            message: 'OSINT search selesai',
            data: result
        });
    } catch (err) {
        console.error('OSINT search error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/osint/batch-search — Run OSINT search on untracked alumni
router.post('/batch-search', async (req, res) => {
    try {
        const alumni = await db.allAsync(
            "SELECT * FROM alumni WHERE status = 'Belum Dilacak' OR status = 'Belum Ditemukan' LIMIT 20"
        );

        if (alumni.length === 0) {
            return res.json({ message: 'Tidak ada alumni yang perlu di-scan', processed: 0 });
        }

        const results = [];
        for (const alum of alumni) {
            try {
                const result = await searchAlumni(alum.id);
                results.push({
                    id: alum.id,
                    nama: alum.nama,
                    status: result.status,
                    foundPlatforms: result.foundPlatforms
                });
            } catch (err) {
                results.push({ id: alum.id, nama: alum.nama, error: err.message });
            }
        }

        res.json({
            message: `Batch OSINT search selesai`,
            processed: results.length,
            results
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/osint/results/:alumni_id — Get OSINT search results for an alumni
router.get('/results/:alumni_id', async (req, res) => {
    try {
        const { alumni_id } = req.params;

        const socialMedia = await db.allAsync(
            'SELECT * FROM alumni_social_media WHERE alumni_id = ? ORDER BY platform',
            [alumni_id]
        );

        const alumni = await db.getAsync('SELECT * FROM alumni WHERE id = ?', [alumni_id]);
        const googleLinks = alumni ? generateGoogleSearchLinks(alumni.nama, alumni.prodi) : [];

        res.json({
            socialMedia,
            googleSearchLinks: googleLinks,
            platforms: Object.entries(PLATFORMS).map(([key, p]) => ({
                key,
                name: p.name,
                icon: p.icon,
                color: p.color
            }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
