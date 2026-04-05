const XLSX = require('xlsx');
const path = require('path');
const db = require('../database/db');

/**
 * Parse an Excel file and return structured alumni data.
 * Auto-maps columns by fuzzy-matching common header names.
 */
function parseExcelFile(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rawData.length === 0) {
        return { data: [], headers: [], mappedFields: {} };
    }

    const headers = Object.keys(rawData[0]);

    // Auto-map columns to our schema fields
    const fieldMappings = {
        nama: ['nama', 'name', 'nama lengkap', 'nama mahasiswa', 'nama alumni', 'full name', 'fullname', 'nama lulusan'],
        nim: ['nim', 'no. induk', 'no induk', 'student id', 'nrp', 'npm', 'nomor induk'],
        prodi: ['prodi', 'program studi', 'jurusan', 'department', 'program', 'major'],
        fakultas: ['fakultas', 'faculty'],
        tahun_lulus: ['tahun lulus', 'tahun_lulus', 'graduation year', 'lulus', 'tahun', 'year', 'angkatan', 'tahun masuk'],
        tanggal_lulus: ['tanggal lulus', 'tanggal_lulus', 'graduation date'],
        email: ['email', 'e-mail', 'email address', 'alamat email'],
        phone: ['no. hp', 'no hp', 'no_hp', 'phone', 'telepon', 'telp', 'nomor hp', 'handphone', 'hp', 'no. telepon', 'no telepon'],
        kategori_pekerjaan: ['kategori pekerjaan', 'kategori', 'jenis pekerjaan', 'tipe pekerjaan', 'status pekerjaan'],
        company_name: ['tempat kerja', 'perusahaan', 'company', 'instansi', 'nama perusahaan', 'nama instansi', 'tempat bekerja'],
        position: ['jabatan', 'posisi', 'position', 'job title', 'pekerjaan'],
        company_address: ['alamat kantor', 'alamat perusahaan', 'company address', 'alamat instansi', 'alamat kerja'],
    };

    const mappedFields = {};
    for (const [field, aliases] of Object.entries(fieldMappings)) {
        const found = headers.find(h =>
            aliases.some(alias => h.toLowerCase().trim() === alias.toLowerCase().trim())
        );
        if (found) {
            mappedFields[field] = found;
        }
    }

    // Transform raw data using mapped fields
    const data = rawData.map(row => {
        const item = {};
        for (const [field, colName] of Object.entries(mappedFields)) {
            let value = row[colName];
            // Clean up whitespace
            if (typeof value === 'string') value = value.trim();
            // Convert tahun_lulus to integer
            if (field === 'tahun_lulus' && value) {
                value = parseInt(value, 10) || null;
            }
            item[field] = value || null;
        }

        // Use fakultas as fallback if prodi is not available
        if (!item.prodi && item.fakultas) {
            item.prodi = item.fakultas;
        }

        // Extract year from tanggal_lulus if tahun_lulus is "Tahun Masuk" (entry year)
        // and tanggal_lulus contains the actual graduation date
        if (item.tanggal_lulus && typeof item.tanggal_lulus === 'string') {
            const yearMatch = item.tanggal_lulus.match(/(\d{4})/);
            if (yearMatch) {
                // If tahun_lulus seems to be entry year (< graduation year), keep it as is
                // but store actual graduation year
                const gradYear = parseInt(yearMatch[1], 10);
                if (gradYear && (!item.tahun_lulus || gradYear > item.tahun_lulus)) {
                    item.tahun_lulus = gradYear;
                }
            }
        } else if (item.tanggal_lulus && typeof item.tanggal_lulus === 'number') {
            // Excel serial date number — convert to year
            const excelEpoch = new Date(1899, 11, 30);
            const date = new Date(excelEpoch.getTime() + item.tanggal_lulus * 86400000);
            const gradYear = date.getFullYear();
            if (gradYear > 1990 && gradYear < 2100) {
                item.tahun_lulus = gradYear;
            }
        }

        return item;
    }).filter(item => item.nama); // Only include rows with a name

    return { data, headers, mappedFields, totalRows: rawData.length, importableRows: data.length };
}

/**
 * Import alumni data from the default Excel file
 */
async function importAlumniFromExcel(filePath) {
    const defaultPath = filePath || path.resolve(__dirname, '../../Alumni 2000-2025.xlsx');
    const { data, mappedFields, totalRows, importableRows } = parseExcelFile(defaultPath);

    let imported = 0;
    let skipped = 0;
    let errors = [];

    // Use transaction for massive performance boost on large datasets
    await db.runAsync('BEGIN TRANSACTION');

    try {
        for (const item of data) {
            try {
                // Check if alumni already exists (by NIM primarily)
                let existing = null;
                if (item.nim) {
                    existing = await db.getAsync('SELECT id FROM alumni WHERE nim = ?', [item.nim]);
                }
                if (!existing && item.nama && item.tahun_lulus) {
                    existing = await db.getAsync(
                        'SELECT id FROM alumni WHERE nama = ? AND tahun_lulus = ?',
                        [item.nama, item.tahun_lulus]
                    );
                }

                if (existing) {
                    await db.runAsync(
                        `UPDATE alumni SET 
                            nim = COALESCE(?, nim),
                            prodi = COALESCE(?, prodi),
                            kategori_pekerjaan = COALESCE(?, kategori_pekerjaan)
                         WHERE id = ?`,
                        [item.nim, item.prodi, item.kategori_pekerjaan, existing.id]
                    );

                    if (item.email || item.phone) {
                        const existingContact = await db.getAsync('SELECT id FROM alumni_contact WHERE alumni_id = ?', [existing.id]);
                        if (existingContact) {
                            await db.runAsync(
                                `UPDATE alumni_contact SET email = COALESCE(?, email), phone = COALESCE(?, phone) WHERE alumni_id = ?`,
                                [item.email, item.phone, existing.id]
                            );
                        } else {
                            await db.runAsync(
                                'INSERT INTO alumni_contact (alumni_id, email, phone) VALUES (?, ?, ?)',
                                [existing.id, item.email, item.phone]
                            );
                        }
                    }

                    if (item.company_name || item.position) {
                        const existingCareer = await db.getAsync(
                            'SELECT id FROM alumni_career WHERE alumni_id = ? AND is_current = 1',
                            [existing.id]
                        );
                        if (existingCareer) {
                            await db.runAsync(
                                `UPDATE alumni_career SET
                                    company_name = COALESCE(?, company_name),
                                    company_address = COALESCE(?, company_address),
                                    position = COALESCE(?, position)
                                 WHERE id = ?`,
                                [item.company_name, item.company_address, item.position, existingCareer.id]
                            );
                        } else {
                            await db.runAsync(
                                'INSERT INTO alumni_career (alumni_id, company_name, company_address, position) VALUES (?, ?, ?, ?)',
                                [existing.id, item.company_name, item.company_address, item.position]
                            );
                        }
                    }

                    skipped++;
                } else {
                    const result = await db.runAsync(
                        `INSERT INTO alumni (nama, nim, prodi, tahun_lulus, kategori_pekerjaan)
                         VALUES (?, ?, ?, ?, ?)`,
                        [item.nama, item.nim, item.prodi, item.tahun_lulus, item.kategori_pekerjaan || 'Belum Diketahui']
                    );
                    const alumniId = result.lastID;

                    if (item.email || item.phone) {
                        await db.runAsync(
                            'INSERT INTO alumni_contact (alumni_id, email, phone) VALUES (?, ?, ?)',
                            [alumniId, item.email, item.phone]
                        );
                    }

                    if (item.company_name || item.position) {
                        await db.runAsync(
                            'INSERT INTO alumni_career (alumni_id, company_name, company_address, position) VALUES (?, ?, ?, ?)',
                            [alumniId, item.company_name, item.company_address, item.position]
                        );
                    }

                    imported++;
                }
            } catch (err) {
                errors.push({ nama: item.nama, error: err.message });
            }
        }

        await db.runAsync('COMMIT');
    } catch (err) {
        await db.runAsync('ROLLBACK');
        throw err;
    }

    return {
        totalRows,
        importableRows,
        imported,
        updated: skipped,
        errors,
        mappedFields
    };
}

module.exports = { parseExcelFile, importAlumniFromExcel };
