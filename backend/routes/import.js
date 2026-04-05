const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { parseExcelFile, importAlumniFromExcel } = require('../services/excelService');

// Configure multer for Excel uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.resolve(__dirname, '../../'));
    },
    filename: (req, file, cb) => {
        cb(null, 'upload_' + Date.now() + '_' + file.originalname);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files (.xlsx, .xls) and CSV are allowed'));
        }
    },
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

// POST /api/import/excel — Upload & import an Excel file
router.post('/excel', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const result = await importAlumniFromExcel(req.file.path);
        res.json({
            message: 'Import selesai',
            ...result
        });
    } catch (err) {
        console.error('Import error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/import/seed-excel — Import from the default Alumni 2000-2025.xlsx
router.post('/seed-excel', async (req, res) => {
    try {
        const filePath = path.resolve(__dirname, '../../Alumni 2000-2025.xlsx');
        const result = await importAlumniFromExcel(filePath);
        res.json({
            message: 'Import dari Alumni 2000-2025.xlsx selesai',
            ...result
        });
    } catch (err) {
        console.error('Seed import error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/import/preview — Preview the Excel file without importing
router.get('/preview', (req, res) => {
    try {
        const filePath = path.resolve(__dirname, '../../Alumni 2000-2025.xlsx');
        const result = parseExcelFile(filePath);
        res.json({
            headers: result.headers,
            mappedFields: result.mappedFields,
            totalRows: result.totalRows,
            importableRows: result.importableRows,
            sampleData: result.data.slice(0, 10) // First 10 rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
