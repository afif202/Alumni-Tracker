// Statistics & analytics service
const db = require('../database/db');

class StatsService {
  
  // Get dashboard statistics
  static async getDashboardStats() {
    const [total, identified, verification, notFound, untracked] = await Promise.all([
      db.getAsync('SELECT COUNT(*) as count FROM alumni'),
      db.getAsync("SELECT COUNT(*) as count FROM alumni WHERE status = 'Teridentifikasi'"),
      db.getAsync("SELECT COUNT(*) as count FROM alumni WHERE status = 'Perlu Verifikasi Manual'"),
      db.getAsync("SELECT COUNT(*) as count FROM alumni WHERE status = 'Belum Ditemukan'"),
      db.getAsync("SELECT COUNT(*) as count FROM alumni WHERE status = 'Belum Dilacak'")
    ]);
    
    const byKategori = await db.allAsync(
      'SELECT kategori_pekerjaan, COUNT(*) as count FROM alumni GROUP BY kategori_pekerjaan'
    );
    const byProdi = await db.allAsync(
      'SELECT prodi, COUNT(*) as count FROM alumni GROUP BY prodi ORDER BY count DESC LIMIT 15'
    );
    const byYear = await db.allAsync(
      'SELECT tahun_lulus, COUNT(*) as count FROM alumni WHERE tahun_lulus IS NOT NULL GROUP BY tahun_lulus ORDER BY tahun_lulus'
    );
    
    return {
      total: total.count,
      identified: identified.count,
      verification: verification.count,
      notFound: notFound.count,
      untracked: untracked.count,
      byKategori,
      byProdi,
      byYear
    };
  }
  
  // Get alumni count (simple helper)
  static async getAlumniCount() {
    const result = await db.getAsync('SELECT COUNT(*) as count FROM alumni');
    return result.count;
  }
}

module.exports = { StatsService };