const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'alumni.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDatabase();
    }
});

function initDatabase() {
    db.serialize(() => {
        // Create alumni table
        db.run(`CREATE TABLE IF NOT EXISTS alumni (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nama TEXT NOT NULL,
            prodi TEXT NOT NULL,
            tahun_lulus INTEGER NOT NULL,
            status TEXT DEFAULT 'Belum Dilacak',
            confidence_score REAL DEFAULT 0.0,
            last_checked DATETIME
        )`);

        // Create tracking_history table
        db.run(`CREATE TABLE IF NOT EXISTS tracking_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alumni_id INTEGER,
            source TEXT,
            link TEXT,
            confidence REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (alumni_id) REFERENCES alumni(id)
        )`);

        // Check if database is already seeded
        db.get('SELECT COUNT(*) as count FROM alumni', (err, row) => {
            if (row && row.count === 0) {
                seedData();
            }
        });
    });
}

function seedData() {
    const seedAlumni = [
        { nama: 'Ahmad Fauzi', prodi: 'Teknik Informatika', tahun_lulus: 2020 },
        { nama: 'Rina Pratama', prodi: 'Ilmu Komputer', tahun_lulus: 2021 },
        { nama: 'Dewi Lestari', prodi: 'Sistem Informasi', tahun_lulus: 2018 },
        { nama: 'Budi Santoso', prodi: 'Teknik Elektro', tahun_lulus: 2019 },
        { nama: 'Rizky Hidayat', prodi: 'Teknik Informatika', tahun_lulus: 2022 },
        { nama: 'Nadia Putri', prodi: 'Ilmu Komunikasi', tahun_lulus: 2020 },
        { nama: 'Fajar Nugroho', prodi: 'Manajemen', tahun_lulus: 2017 },
        { nama: 'Siti Rahma', prodi: 'Akuntansi', tahun_lulus: 2021 },
        { nama: 'Andi Saputra', prodi: 'Teknik Sipil', tahun_lulus: 2019 },
        { nama: 'Lukman Hakim', prodi: 'Teknik Mesin', tahun_lulus: 2018 },
        { nama: 'Tono Wijaya', prodi: 'Hukum', tahun_lulus: 2020 },
        { nama: 'Sari Kurnia', prodi: 'Ilmu Ekonomi', tahun_lulus: 2016 },
        { nama: 'Dimas Saputra', prodi: 'Teknik Industri', tahun_lulus: 2022 },
        { nama: 'Fauzan Akbar', prodi: 'Teknik Informatika', tahun_lulus: 2023 },
        { nama: 'Putri Ayunda', prodi: 'Sastra Inggris', tahun_lulus: 2019 },
        { nama: 'Agus Salim', prodi: 'Sistem Informasi', tahun_lulus: 2017 },
        { nama: 'Rahmat Hidayat', prodi: 'Teknik Komputer', tahun_lulus: 2021 },
        { nama: 'Indah Permata', prodi: 'Pendidikan Dokter', tahun_lulus: 2020 },
        { nama: 'Yoga Pratama', prodi: 'Farmasi', tahun_lulus: 2018 },
        { nama: 'Alif Ramadhan', prodi: 'Teknik Lingkungan', tahun_lulus: 2022 }
    ];

    const stmt = db.prepare('INSERT INTO alumni (nama, prodi, tahun_lulus) VALUES (?, ?, ?)');
    for (const alumni of seedAlumni) {
        stmt.run(alumni.nama, alumni.prodi, alumni.tahun_lulus);
    }
    stmt.finalize();
    console.log('Database seeded with 20 alumni.');
}

module.exports = db;
