-- ═══════════════════════════════════════════════════════════
--  ALUMNI TRACKER — Supabase PostgreSQL Schema
--  Run this SQL in the Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ─── 1. Users table (for JWT-based admin auth) ───
CREATE TABLE IF NOT EXISTS users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. Main Alumni table ───
CREATE TABLE IF NOT EXISTS alumni (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nama TEXT NOT NULL,
    nim TEXT UNIQUE,
    prodi TEXT,
    tahun_lulus INTEGER,
    status TEXT DEFAULT 'Belum Dilacak',
    confidence_score REAL DEFAULT 0.0,
    last_checked TIMESTAMPTZ,
    kategori_pekerjaan TEXT DEFAULT 'Belum Diketahui',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. Social Media table ───
CREATE TABLE IF NOT EXISTS alumni_social_media (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    alumni_id BIGINT NOT NULL REFERENCES alumni(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    username TEXT,
    profile_url TEXT,
    verified BOOLEAN DEFAULT FALSE,
    last_checked TIMESTAMPTZ,
    UNIQUE(alumni_id, platform)
);

-- ─── 4. Contact table ───
CREATE TABLE IF NOT EXISTS alumni_contact (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    alumni_id BIGINT NOT NULL UNIQUE REFERENCES alumni(id) ON DELETE CASCADE,
    email TEXT,
    phone TEXT
);

-- ─── 5. Career table ───
CREATE TABLE IF NOT EXISTS alumni_career (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    alumni_id BIGINT NOT NULL REFERENCES alumni(id) ON DELETE CASCADE,
    company_name TEXT,
    company_address TEXT,
    position TEXT,
    company_social_media TEXT,
    is_current BOOLEAN DEFAULT TRUE
);

-- ─── 6. Tracking History table ───
CREATE TABLE IF NOT EXISTS tracking_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    alumni_id BIGINT REFERENCES alumni(id) ON DELETE CASCADE,
    source TEXT,
    link TEXT,
    confidence REAL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 7. Seed default admin user (password: admin332211) ───
-- The password hash below is bcrypt for 'admin332211'
INSERT INTO users (username, password_hash, role)
VALUES ('admin', '$2a$10$roMboJIlzeHir4B1gjh6eurN.nqt8clqtkKO.g4WcNeQzy6MoW7YO', 'admin')
ON CONFLICT (username) DO NOTHING;

-- NOTE: If the above hash doesn't work, generate a new one by running:
-- node -e "const b=require('bcryptjs');console.log(b.hashSync('admin332211',10))"
-- and replace the hash above.

-- ─── 8. Disable Row Level Security for all tables (simpler setup) ───
-- (Your API is secured via JWT, so RLS is optional here)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE alumni DISABLE ROW LEVEL SECURITY;
ALTER TABLE alumni_social_media DISABLE ROW LEVEL SECURITY;
ALTER TABLE alumni_contact DISABLE ROW LEVEL SECURITY;
ALTER TABLE alumni_career DISABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_history DISABLE ROW LEVEL SECURITY;
