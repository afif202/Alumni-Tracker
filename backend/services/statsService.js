// Statistics & analytics service — Supabase version
const supabase = require('../config/supabaseClient');

class StatsService {

  static async getDashboardStats() {
    const [
      { count: total },
      { count: identified },
      { count: verification },
      { count: notFound },
      { count: untracked }
    ] = await Promise.all([
      supabase.from('alumni').select('*', { count: 'exact', head: true }),
      supabase.from('alumni').select('*', { count: 'exact', head: true }).eq('status', 'Teridentifikasi'),
      supabase.from('alumni').select('*', { count: 'exact', head: true }).eq('status', 'Perlu Verifikasi Manual'),
      supabase.from('alumni').select('*', { count: 'exact', head: true }).eq('status', 'Belum Ditemukan'),
      supabase.from('alumni').select('*', { count: 'exact', head: true }).eq('status', 'Belum Dilacak')
    ]);

    // Group by kategori_pekerjaan
    const { data: rawKategori } = await supabase
      .from('alumni')
      .select('kategori_pekerjaan');

    // Group by prodi
    const { data: rawProdi } = await supabase
      .from('alumni')
      .select('prodi');

    // Group by tahun_lulus
    const { data: rawYear } = await supabase
      .from('alumni')
      .select('tahun_lulus')
      .not('tahun_lulus', 'is', null);

    const aggregateCount = (arr, field) => {
      const map = {};
      for (const item of arr || []) {
        const val = item[field] || 'N/A';
        map[val] = (map[val] || 0) + 1;
      }
      return Object.entries(map).map(([key, count]) => ({ [field]: key, count }));
    };

    const byKategori = aggregateCount(rawKategori, 'kategori_pekerjaan');
    const byProdiRaw = aggregateCount(rawProdi, 'prodi').sort((a, b) => b.count - a.count).slice(0, 15);
    const byYearRaw = aggregateCount(rawYear, 'tahun_lulus').sort((a, b) => Number(a.tahun_lulus) - Number(b.tahun_lulus));

    return {
      total: total || 0,
      identified: identified || 0,
      verification: verification || 0,
      notFound: notFound || 0,
      untracked: untracked || 0,
      byKategori,
      byProdi: byProdiRaw,
      byYear: byYearRaw
    };
  }

  static async getAlumniCount() {
    const { count } = await supabase.from('alumni').select('*', { count: 'exact', head: true });
    return count || 0;
  }
}

module.exports = { StatsService };