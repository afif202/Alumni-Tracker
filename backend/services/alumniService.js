// Alumni business logic and data access layer — Supabase version
const supabase = require('../config/supabaseClient');

class AlumniService {

  // Get alumni with search and filters
  static async getFilteredAlumni(search, status, kategori, page, limit) {
    const offset = (page - 1) * limit;

    let query = supabase.from('alumni').select('*', { count: 'exact' });

    if (search) {
      query = query.or(`nama.ilike.%${search}%,prodi.ilike.%${search}%,nim.ilike.%${search}%`);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (kategori && kategori !== 'all') {
      query = query.eq('kategori_pekerjaan', kategori);
    }

    const { data: rows, count, error } = await query
      .order('nama', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);

    return {
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  // Get alumni detail with related data
  static async getAlumniDetail(id) {
    const { data: alumni, error } = await supabase
      .from('alumni')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !alumni) throw new Error('Alumni tidak ditemukan');

    const [
      { data: socialMedia },
      { data: contact },
      { data: careers },
      { data: history }
    ] = await Promise.all([
      supabase.from('alumni_social_media').select('*').eq('alumni_id', id),
      supabase.from('alumni_contact').select('*').eq('alumni_id', id).single(),
      supabase.from('alumni_career').select('*').eq('alumni_id', id).order('is_current', { ascending: false }),
      supabase.from('tracking_history').select('*').eq('alumni_id', id).order('timestamp', { ascending: false }).limit(20)
    ]);

    return {
      ...alumni,
      socialMedia: socialMedia || [],
      contact: contact || {},
      careers: careers || [],
      history: history || []
    };
  }

  // Create new alumni
  static async createAlumni(alumniData) {
    const { nama, prodi, tahun_lulus, nim, kategori_pekerjaan, email, phone, company_name, position, company_address } = alumniData;

    if (!nama) throw new Error('Nama wajib diisi');

    const { data: newAlumni, error } = await supabase
      .from('alumni')
      .insert({ nama, nim: nim || null, prodi: prodi || null, tahun_lulus: tahun_lulus || null, kategori_pekerjaan: kategori_pekerjaan || 'Belum Diketahui' })
      .select()
      .single();

    if (error) throw new Error(error.message);
    const alumniId = newAlumni.id;

    if (email || phone) {
      await supabase.from('alumni_contact').insert({ alumni_id: alumniId, email: email || null, phone: phone || null });
    }

    if (company_name || position) {
      await supabase.from('alumni_career').insert({ alumni_id: alumniId, company_name: company_name || null, company_address: company_address || null, position: position || null });
    }

    return newAlumni;
  }

  // Update alumni
  static async updateAlumni(id, updateData) {
    const { nama, nim, prodi, tahun_lulus, kategori_pekerjaan, status, email, phone, company_name, position, company_address, company_social_media, social_media } = updateData;

    const updateFields = {};
    if (nama !== undefined) updateFields.nama = nama;
    if (nim !== undefined) updateFields.nim = nim;
    if (prodi !== undefined) updateFields.prodi = prodi;
    if (tahun_lulus !== undefined) updateFields.tahun_lulus = tahun_lulus;
    if (kategori_pekerjaan !== undefined) updateFields.kategori_pekerjaan = kategori_pekerjaan;
    if (status !== undefined) updateFields.status = status;

    if (Object.keys(updateFields).length > 0) {
      const { error } = await supabase.from('alumni').update(updateFields).eq('id', id);
      if (error) throw new Error(error.message);
    }

    // Upsert contact
    if (email !== undefined || phone !== undefined) {
      const { data: existing } = await supabase.from('alumni_contact').select('id').eq('alumni_id', id).single();
      if (existing) {
        const contactUpdate = {};
        if (email !== undefined && email) contactUpdate.email = email;
        if (phone !== undefined && phone) contactUpdate.phone = phone;
        await supabase.from('alumni_contact').update(contactUpdate).eq('alumni_id', id);
      } else {
        await supabase.from('alumni_contact').insert({ alumni_id: id, email: email || null, phone: phone || null });
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

    const { data: updated } = await supabase.from('alumni').select('*').eq('id', id).single();
    return updated;
  }

  static async _upsertCareer(id, company_name, position, company_address, company_social_media) {
    const { data: existing } = await supabase
      .from('alumni_career')
      .select('id')
      .eq('alumni_id', id)
      .eq('is_current', true)
      .single();

    const payload = {};
    if (company_name !== undefined && company_name) payload.company_name = company_name;
    if (position !== undefined && position) payload.position = position;
    if (company_address !== undefined && company_address) payload.company_address = company_address;
    if (company_social_media) payload.company_social_media = JSON.stringify(company_social_media);

    if (existing) {
      await supabase.from('alumni_career').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('alumni_career').insert({ alumni_id: id, ...payload, is_current: true });
    }
  }

  static async _upsertSocialMedia(id, social_media) {
    for (const sm of social_media) {
      if (!sm.platform) continue;
      const { data: existing } = await supabase
        .from('alumni_social_media')
        .select('id')
        .eq('alumni_id', id)
        .eq('platform', sm.platform)
        .single();

      if (existing) {
        const smUpdate = {};
        if (sm.username) smUpdate.username = sm.username;
        if (sm.profile_url) smUpdate.profile_url = sm.profile_url;
        if (sm.verified !== undefined) smUpdate.verified = sm.verified;
        await supabase.from('alumni_social_media').update(smUpdate).eq('id', existing.id);
      } else {
        await supabase.from('alumni_social_media').insert({
          alumni_id: id, platform: sm.platform, username: sm.username, profile_url: sm.profile_url, verified: sm.verified ? true : false
        });
      }
    }
  }

  static async deleteAlumni(id) {
    const { error } = await supabase.from('alumni').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}

module.exports = { AlumniService };