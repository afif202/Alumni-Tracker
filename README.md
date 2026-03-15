# Sistem Pelacakan Alumni

A fullstack web application to track university alumni using Node.js, Express, SQLite, and vanilla frontend features with modern styling.

## 1. Struktur Folder Project

```
alumni-tracker/
├── backend/
│   ├── database/
│   │   ├── db.js          # SQLite connection and seeded database
│   │   └── alumni.db      # SQLite database file (auto-generated)
│   ├── routes/
│   │   └── tracking.js    # API routes for tracking
│   ├── services/
│   │   ├── linkedinService.js  # Mock LinkedIn scraping API
│   │   ├── matchingService.js  # Matching & confidence scoring logic
│   │   └── scholarService.js   # Mock Google Scholar scraping API
│   └── server.js          # Main Express server file
├── frontend/
│   ├── app.js             # Frontend API integration & logic
│   ├── index.html         # User Interface Admin Dashboard
│   └── style.css          # Modern UI styling
├── package.json
└── README.md
```

## 2. Cara Install

Pastikan kamu memiliki **Node.js** dan **npm** terinstall.

Jalankan perintah berikut di terminal:
```bash
# Masuk ke direktori project
cd alumni-tracker

# Install dependencies
npm install
```

## 3. Cara Menjalankan Server

Setelah installasi, jalankan:
```bash
npm start
```
Server akan berjalan di `http://localhost:3000`. Database SQLite otomatis akan di-seed dengan 20 alumni pertama kali jalan.

Anda bisa mengakses dashboard di browser: `http://localhost:3000`

## 4. Pengujian Logika Penemuan Alumni (Kualitas Akurasi Sistem)

Sistem menggunakan algoritma _Confidence Scoring_ (pembobotan kecocokan profil) yang terdapat pada file `matchingService.js` untuk menentukan identitas alumni. Bobot yang digunakan:
- Nama Cocok = **0.4**
- Prodi Cocok = **0.3**
- Tahun Lulus Dekat = **0.2**
- Universitas Cocok = **0.1**

Berikut adalah tabel skenario uji kualitas akurasi logika sistem dalam memberikan skor dan status ke dalam tabel database:

| No | Skenario Kondisi Profil Target (Hasil Scraping) | Variabel Bernilai *True* (Cocok) | Perhitungan Nilai (Score) | Status Akhir yang Diberikan | Hasil (Pass/Fail) |
|----|-------------------------------------------------|----------------------------------|---------------------------|----------------------------|-------------------|
| 1 | Profil ditemukan **sama persis** (Nama, Prodi, Tahun Lulus, Universitas). | Nama, Prodi, Tahun, Univ | `0.4 + 0.3 + 0.2 + 0.1` = **1.0** | `Teridentifikasi` | ✅ Pass |
| 2 | Hanya menemukan kesamaan pada **Nama** dan **Prodi**. Data tahun/univ kosong. | Nama, Prodi | `0.4 + 0.3` = **0.7** | `Perlu Verifikasi Manual` | ✅ Pass |
| 3 | Hanya menemukan kesamaan **Nama** mahasiswa secara pasaran. (Beda prodi/univ) | Nama | `0.4` | `Belum Ditemukan` | ✅ Pass |
| 4 | Ditemukan kesamaan pada **Nama**, **Universitas**, dan **Tahun Lulus**. (Prodi beda). | Nama, Tahun, Univ | `0.4 + 0.2 + 0.1` = **0.7** | `Perlu Verifikasi Manual` | ✅ Pass |
| 5 | Ditemukan kesamaan pada **Prodi**, **Tahun Lulus**, dan **Universitas**. (Ejaan/Nama beda jauh). | Prodi, Tahun, Univ | `0.3 + 0.2 + 0.1` = **0.6** | `Perlu Verifikasi Manual` | ✅ Pass |
| 6 | Ditemukan kesamaan kuat pada **Nama** target, beserta **Universitas** & **Prodi**, lulusan belum terdata. | Nama, Prodi, Univ | `0.4 + 0.3 + 0.1` = **0.80** | `Teridentifikasi` (Score > 0.8) atau `Perlu Verifikasi` (Tergantung Operator) * | ✅ Pass |
| 7 | Tidak ditemukan rekam jejak digital sama sekali di *Google Scholar* maupun *LinkedIn*. | Tidak Ada | **0.0** | `Belum Ditemukan` | ✅ Pass |

*\* Catatan Logic: Pada rules `score > 0.8`, nilai matematis persis 0.8 akan jatuh pada kondisi `>= 0.5` yaitu "Perlu Verifikasi Manual".*
