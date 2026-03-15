const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { searchScholar } = require('../services/scholarService');
const { searchLinkedIn } = require('../services/linkedinService');
const { crossValidate } = require('../services/matchingService');

// GET /alumni - get all alumni
router.get('/alumni', (req, res) => {
    db.all('SELECT * FROM alumni ORDER BY nama ASC', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ data: rows });
    });
});

// POST /alumni - add a new alumni
router.post('/alumni', (req, res) => {
    const { nama, prodi, tahun_lulus } = req.body;
    
    if (!nama || !prodi || !tahun_lulus) {
        return res.status(400).json({ error: 'Nama, Prodi, and Tahun Lulus are required.' });
    }

    const stmt = db.prepare('INSERT INTO alumni (nama, prodi, tahun_lulus) VALUES (?, ?, ?)');
    stmt.run([nama, prodi, tahun_lulus], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ 
            message: 'Alumni successfully added', 
            data: { id: this.lastID, nama, prodi, tahun_lulus, status: 'Belum Dilacak' } 
        });
    });
    stmt.finalize();
});

// POST /run-tracking - run tracking job for alumni needing update
router.post('/run-tracking', async (req, res) => {
    try {
        // Find alumni that need tracking
        db.all("SELECT * FROM alumni WHERE status = 'Belum Dilacak' OR status = 'Update Needed' OR status = 'Belum Ditemukan'", async (err, alumniList) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (alumniList.length === 0) {
                return res.json({ message: 'No alumni currently need tracking', count: 0 });
            }

            // In a real app, this should be a background job (e.g. queue), but for simple demo we wait for it
            let processed = 0;
            
            for (const alumni of alumniList) {
                // 1. Search Sources
                const scholarResult = await searchScholar(alumni.nama, alumni.prodi, alumni.tahun_lulus);
                const linkedinResult = await searchLinkedIn(alumni.nama, alumni.prodi, alumni.tahun_lulus);
                
                // 2. Validate and Determine Status
                const validation = crossValidate(scholarResult, linkedinResult);
                
                // 3. Update DB History
                db.serialize(() => {
                    const stmtHistory = db.prepare('INSERT INTO tracking_history (alumni_id, source, link, confidence) VALUES (?, ?, ?, ?)');
                    
                    validation.all_results.forEach(result => {
                        stmtHistory.run(alumni.id, result.source, result.link, result.confidence);
                    });
                    stmtHistory.finalize();

                    // 4. Update Alumni Status
                    db.run(`UPDATE alumni 
                            SET status = ?, confidence_score = ?, last_checked = CURRENT_TIMESTAMP 
                            WHERE id = ?`, 
                        [validation.status, validation.overall_confidence, alumni.id]);
                });
                
                processed++;
            }

            res.json({ message: `Tracking job finished`, processed_count: processed });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /history/:alumni_id - get tracking history for an alumni
router.get('/history/:alumni_id', (req, res) => {
    const { alumni_id } = req.params;
    db.all('SELECT * FROM tracking_history WHERE alumni_id = ? ORDER BY timestamp DESC', [alumni_id], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ data: rows });
    });
});

module.exports = router;
