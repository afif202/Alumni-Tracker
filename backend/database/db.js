const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Vercel Serverless Functions have a read-only filesystem except for /tmp
const isVercel = process.env.VERCEL || process.env.NODE_ENV === 'production';
const dbPath = isVercel
    ? path.join('/tmp', 'alumni.db')
    : path.resolve(__dirname, 'alumni.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run('PRAGMA foreign_keys = ON');
        initDatabase();
    }
});

function initDatabase() {
    db.serialize(() => {
        // ─── Users table for authentication ───
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // ─── Alumni (main table — enhanced) ───
        db.run(`CREATE TABLE IF NOT EXISTS alumni (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nama TEXT NOT NULL,
            nim TEXT,
            prodi TEXT,
            tahun_lulus INTEGER,
            status TEXT DEFAULT 'Belum Dilacak',
            confidence_score REAL DEFAULT 0.0,
            last_checked DATETIME,
            kategori_pekerjaan TEXT DEFAULT 'Belum Diketahui',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // ─── Sosial Media Alumni ───
        db.run(`CREATE TABLE IF NOT EXISTS alumni_social_media (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alumni_id INTEGER NOT NULL,
            platform TEXT NOT NULL,
            username TEXT,
            profile_url TEXT,
            verified INTEGER DEFAULT 0,
            last_checked DATETIME,
            FOREIGN KEY (alumni_id) REFERENCES alumni(id) ON DELETE CASCADE
        )`);

        // ─── Kontak Alumni ───
        db.run(`CREATE TABLE IF NOT EXISTS alumni_contact (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alumni_id INTEGER NOT NULL UNIQUE,
            email TEXT,
            phone TEXT,
            FOREIGN KEY (alumni_id) REFERENCES alumni(id) ON DELETE CASCADE
        )`);

        // ─── Karir Alumni ───
        db.run(`CREATE TABLE IF NOT EXISTS alumni_career (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alumni_id INTEGER NOT NULL,
            company_name TEXT,
            company_address TEXT,
            position TEXT,
            company_social_media TEXT,
            is_current INTEGER DEFAULT 1,
            FOREIGN KEY (alumni_id) REFERENCES alumni(id) ON DELETE CASCADE
        )`);

        // ─── Tracking History (existing — kept) ───
        db.run(`CREATE TABLE IF NOT EXISTS tracking_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alumni_id INTEGER,
            source TEXT,
            link TEXT,
            confidence REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (alumni_id) REFERENCES alumni(id) ON DELETE CASCADE
        )`);

        // ─── Seed default admin user ───
        db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
            if (err) return;
            if (row && row.count === 0) {
                const hash = bcrypt.hashSync('admin332211', 10);
                db.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
                    ['admin', hash, 'admin']);
                console.log('Default admin user seeded (admin / admin332211)');
            }
        });
    });
}

// ─── Promisified helpers ───
db.allAsync = function (sql, params = []) {
    return new Promise((resolve, reject) => {
        this.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

db.getAsync = function (sql, params = []) {
    return new Promise((resolve, reject) => {
        this.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

db.runAsync = function (sql, params = []) {
    return new Promise((resolve, reject) => {
        this.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

module.exports = db;
