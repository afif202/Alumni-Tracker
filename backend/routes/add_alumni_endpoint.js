// Adding Add Alumni POST endpoint
router.post('/alumni', (req, res) => {
    const { nama, prodi, tahun_lulus } = req.body;
    
    if (!nama || !prodi || !tahun_lulus) {
        return res.status(400).json({ error: 'Nama, Prodi, and Tahun Lulus are required.' });
    }

    const stmt = db.prepare('INSERT INTO alumni (nama, prodi, tahun_lulus, status, confidence_score) VALUES (?, ?, ?, ?, ?)');
    stmt.run([nama, prodi, tahun_lulus, 'Belum Dilacak', 0.0], function(err) {
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
