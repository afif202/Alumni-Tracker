// Alumni business logic and data access layer
const db = require('../database/db');

class AlumniService {
  
  // Get alumni with search and filters
  static async getFilteredAlumni(search, status, kategori, page, limit) {
    const offset = (page - 1) * limit;
    
    let baseQuery = ' FROM alumni';
    const conditions = [];
    const params = [];
    
    if (search) {
      conditions.push('(nama LIKE ? OR prodi LIKE ? OR nim LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status && status !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }
    if (kategori && kategori !== 'all') {
      conditions.push('kategori_pekerjaan = ?');
      params.push(kategori);
    }
    
    if (conditions.length > 0) {
      baseQuery += ' WHERE ' + conditions.join(' AND ');
    }
    
    // Get total count
    const countRow = await db.getAsync(`SELECT COUNT(*) as total ${baseQuery}`, params);
    
    // Get paginated data
    const sql = `SELECT * ${baseQuery} ORDER BY nama ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const rows = await db.allAsync(sql, params);
    
    return {
      data: rows,
      pagination: {
        total: countRow.total,
        page,
        limit,
        totalPages: Math.ceil(countRow.total / limit)
      }
    };
  }
  
  // Get alumni detail with related data
  static async getAlumniDetail(id) {
    const alumni = await db.getAsync('SELECT * FROM alumni WHERE id = ?', [id]);
    if (!alumni) throw new Error('Alumni tidak ditemukan');
    
    const socialMedia = await db.allAsync(
      'SELECT * FROM alumni_social_media WHERE alumni_id = ?', [id]
    );
    const contact = await db.getAsync(
      'SELECT * FROM alumni_contact WHERE alumni_id = ?', [id]
    );
    const careers = await db.allAsync(
      'SELECT * FROM alumni_career WHERE alumni_id = ? ORDER BY is_current DESC', [id]
    );
    const history = await db.allAsync(
      'SELECT * FROM tracking_history WHERE alumni_id = ? ORDER BY timestamp DESC LIMIT 20', [id]
    );
    
    return {
      ...alumni,
      socialMedia,
      contact: contact || {},
      careers,
      history
    };
  }
  
  // Create new alumni
  static async createAlumni(alumniData) {
    const { nama, prodi, tahun_lulus, nim, kategori_pekerjaan, email, phone, company_name, position, company_address } = alumniData;
    
    if (!nama) throw new Error('Nama wajib diisi');
    
    const result = await db.runAsync(
      `INSERT INTO alumni (nama, nim, prodi, tahun_lulus, kategori_pekerjaan) VALUES (?, ?, ?, ?, ?)`,
      [nama, nim || null, prodi || null, tahun_lulus || null, kategori_pekerjaan || 'Belum Diketahui']
    );
    
    const alumniId = result.lastID;
    
    // Insert contact if provided
    if (email || phone) {
      await db.runAsync(
        'INSERT INTO alumni_contact (alumni_id, email, phone) VALUES (?, ?, ?)',
        [alumniId, email || null, phone || null]
      );
    }
    
    // Insert career if provided
    if (company_name || position) {
      await db.runAsync(
        'INSERT INTO alumni_career (alumni_id, company_name, company_address, position) VALUES (?, ?, ?, ?)',
        [alumniId, company_name || null, company_address || null, position || null]
      );
    }
    
    return {
      id: alumniId,
      nama,
      prodi,
      tahun_lulus,
      status: 'Belum Dilacak'
    };
  }
  
  // Update alumni
  static async updateAlumni(id, updateData) {
    const { nama, nim, prodi, tahun_lulus, kategori_pekerjaan, status, email, phone, company_name, position, company_address, company_social_media, social_media } = updateData;
    
    // Update main alumni record
    await db.runAsync(
      `UPDATE alumni SET
       nama = COALESCE(?, nama),
       nim = COALESCE(?, nim),
       prodi = COALESCE(?, prodi),
       tahun_lulus = COALESCE(?, tahun_lulus),
       kategori_pekerjaan = COALESCE(?, kategori_pekerjaan),
       status = COALESCE(?, status)
       WHERE id = ?`,
      [nama, nim, prodi, tahun_lulus, kategori_pekerjaan, status, id]
    );
    
    // Upsert contact
    if (email !== undefined || phone !== undefined) {
      const existing = await db.getAsync('SELECT id FROM alumni_contact WHERE alumni_id = ?', [id]);
      if (existing) {
        await db.runAsync(
          'UPDATE alumni_contact SET email = COALESCE(?, email), phone = COALESCE(?, phone) WHERE alumni_id = ?',
          [email, phone, id]
        );
      } else {
        await db.runAsync(
          'INSERT INTO alumni_contact (alumni_id, email, phone) VALUES (?, ?, ?)',
          [id, email, phone]
        );
      }
    }
    
    // Upsert career
    if (company_name !== undefined || position !== undefined) {
      await this._upsertCareer(id, company_name, position, company_address, company_social_media);
    }
    
    // Upsert social media entries
    if (social_media && Array.isArray(social_media)) {
      await this._upsertSocialMedia(id, social_media);
    }
    
    return db.getAsync('SELECT * FROM alumni WHERE id = ?', [id]);
  }
  
  static async _upsertCareer(id, company_name, position, company_address, company_social_media) {
    const existingCareer = await db.getAsync(
      'SELECT id FROM alumni_career WHERE alumni_id = ? AND is_current = 1', [id]
    );
    
    if (existingCareer) {
      await db.runAsync(
        `UPDATE alumni_career SET 
         company_name = COALESCE(?, company_name),
         company_address = COALESCE(?, company_address),
         position = COALESCE(?, position),
         company_social_media = COALESCE(?, company_social_media)
         WHERE id = ?`,
        [company_name, company_address, position,
         company_social_media ? JSON.stringify(company_social_media) : null,
         existingCareer.id]
      );
    } else {
      await db.runAsync(
        `INSERT INTO alumni_career (alumni_id, company_name, company_address, position, company_social_media)
         VALUES (?, ?, ?, ?, ?)`,
        [id, company_name, company_address, position,
         company_social_media ? JSON.stringify(company_social_media) : null]
      );
    }
  }
  
  static async _upsertSocialMedia(id, social_media) {
    for (const sm of social_media) {
      if (!sm.platform) continue;
      
      const existingSm = await db.getAsync(
        'SELECT id FROM alumni_social_media WHERE alumni_id = ? AND platform = ?',
        [id, sm.platform]
      );
      
      if (existingSm) {
        await db.runAsync(
          `UPDATE alumni_social_media SET 
           username = COALESCE(?, username),
           profile_url = COALESCE(?, profile_url),
           verified = COALESCE(?, verified)
           WHERE id = ?`,
          [sm.username, sm.profile_url, sm.verified ? 1 : 0, existingSm.id]
        );
      } else {
        await db.runAsync(
          `INSERT INTO alumni_social_media (alumni_id, platform, username, profile_url, verified)
           VALUES (?, ?, ?, ?, ?)`,
          [id, sm.platform, sm.username, sm.profile_url, sm.verified ? 1 : 0]
        );
      }
    }
  }
  
  static async deleteAlumni(id) {
    await db.runAsync('DELETE FROM alumni WHERE id = ?', [id]);
  }
}

module.exports = { AlumniService };