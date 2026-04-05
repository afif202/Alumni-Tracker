const XLSX = require('xlsx');
const path = require('path');
const supabase = require('../config/supabaseClient');

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
        if (found) mappedFields[field] = found;
    }

    const data = rawData.map(row => {
        const item = {};
        for (const [field, colName] of Object.entries(mappedFields)) {
            let value = row[colName];
            if (typeof value === 'string') value = value.trim();
            if (field === 'tahun_lulus' && value) value = parseInt(value, 10) || null;
            item[field] = value || null;
        }

        if (!item.prodi && item.fakultas) item.prodi = item.fakultas;

        if (item.tanggal_lulus && typeof item.tanggal_lulus === 'string') {
            const yearMatch = item.tanggal_lulus.match(/(\d{4})/);
            if (yearMatch) {
                const gradYear = parseInt(yearMatch[1], 10);
                if (gradYear && (!item.tahun_lulus || gradYear > item.tahun_lulus)) item.tahun_lulus = gradYear;
            }
        } else if (item.tanggal_lulus && typeof item.tanggal_lulus === 'number') {
            const excelEpoch = new Date(1899, 11, 30);
            const date = new Date(excelEpoch.getTime() + item.tanggal_lulus * 86400000);
            const gradYear = date.getFullYear();
            if (gradYear > 1990 && gradYear < 2100) item.tahun_lulus = gradYear;
        }

        return item;
    }).filter(item => item.nama);

    return { data, headers, mappedFields, totalRows: rawData.length, importableRows: data.length };
}

/**
 * Import alumni data from Excel file using batch upsert via Supabase
 */
async function importAlumniFromExcel(filePath) {
    const defaultPath = filePath || path.resolve(__dirname, '../../Alumni 2000-2025.xlsx');
    const { data, mappedFields, totalRows, importableRows } = parseExcelFile(defaultPath);

    let imported = 0;
    let updated = 0;
    const errors = [];

    // Process in batches of 500 for performance
    const BATCH_SIZE = 500;

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);

        // Build alumni records for this batch
        const alumniRecords = batch.map(item => ({
            nama: item.nama,
            nim: item.nim || null,
            prodi: item.prodi || null,
            tahun_lulus: item.tahun_lulus || null,
            kategori_pekerjaan: item.kategori_pekerjaan || 'Belum Diketahui'
        }));

        // Upsert alumni — match by nim if available, otherwise by nama+tahun_lulus
        const { data: upserted, error } = await supabase
            .from('alumni')
            .upsert(alumniRecords, {
                onConflict: 'nim',
                ignoreDuplicates: false
            })
            .select('id, nim, nama');

        if (error) {
            // If upsert fails (e.g., NIM null collision), try insert individually
            for (const item of batch) {
                try {
                    const record = {
                        nama: item.nama,
                        nim: item.nim || null,
                        prodi: item.prodi || null,
                        tahun_lulus: item.tahun_lulus || null,
                        kategori_pekerjaan: item.kategori_pekerjaan || 'Belum Diketahui'
                    };
                    const { data: ins, error: insErr } = await supabase
                        .from('alumni')
                        .insert(record)
                        .select('id')
                        .single();

                    if (insErr) {
                        errors.push({ nama: item.nama, error: insErr.message });
                        continue;
                    }

                    if (item.email || item.phone) {
                        await supabase.from('alumni_contact').upsert({ alumni_id: ins.id, email: item.email, phone: item.phone }, { onConflict: 'alumni_id' });
                    }
                    if (item.company_name || item.position) {
                        await supabase.from('alumni_career').insert({ alumni_id: ins.id, company_name: item.company_name, company_address: item.company_address, position: item.position });
                    }
                    imported++;
                } catch (err) {
                    errors.push({ nama: item.nama, error: err.message });
                }
            }
            continue;
        }

        imported += upserted ? upserted.length : batch.length;

        // Upsert contacts and careers for successfully upserted alumni
        if (upserted) {
            for (let j = 0; j < upserted.length; j++) {
                const item = batch[j];
                const alumniRow = upserted[j];
                if (!alumniRow) continue;

                if (item.email || item.phone) {
                    await supabase.from('alumni_contact').upsert(
                        { alumni_id: alumniRow.id, email: item.email || null, phone: item.phone || null },
                        { onConflict: 'alumni_id' }
                    );
                }
                if (item.company_name || item.position) {
                    await supabase.from('alumni_career').upsert(
                        { alumni_id: alumniRow.id, company_name: item.company_name, company_address: item.company_address, position: item.position, is_current: true },
                        { onConflict: 'alumni_id,is_current' }
                    );
                }
            }
        }
    }

    return { totalRows, importableRows, imported, updated, errors: errors.slice(0, 50), mappedFields };
}

module.exports = { parseExcelFile, importAlumniFromExcel };
