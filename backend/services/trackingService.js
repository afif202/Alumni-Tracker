// Tracking & OSINT business logic
const db = require('../database/db');
const { searchScholar } = require('./scholarService');
const { searchLinkedIn } = require('./linkedinService');
const { crossValidate } = require('./matchingService');

class TrackingService {
  
  // Get untracked alumni
  static async getUntrackedAlumni(limit = Infinity) {
    return db.allAsync(
      "SELECT * FROM alumni WHERE status IN ('Belum Dilacak', 'Update Needed', 'Belum Ditemukan') LIMIT ?",
      [limit]
    );
  }
  
  // Run tracking for single alumni
  static async runTrackingForAlumni(alumni) {
    const scholarResult = await searchScholar(alumni.nama, alumni.prodi, alumni.tahun_lulus);
    const linkedinResult = await searchLinkedIn(alumni.nama, alumni.prodi, alumni.tahun_lulus);
    
    const validation = crossValidate(scholarResult, linkedinResult);
    
    // Save to history
    for (const result of validation.all_results) {
      await db.runAsync(
        'INSERT INTO tracking_history (alumni_id, source, link, confidence) VALUES (?, ?, ?, ?)',
        [alumni.id, result.source, result.link, result.confidence]
      );
    }
    
    // Update alumni status
    await db.runAsync(
      `UPDATE alumni SET status = ?, confidence_score = ?, last_checked = CURRENT_TIMESTAMP WHERE id = ?`,
      [validation.status, validation.overall_confidence, alumni.id]
    );
    
    return validation;
  }
  
  // Run batch tracking
  static async runBatchTracking() {
    const untracked = await this.getUntrackedAlumni();
    
    if (untracked.length === 0) {
      return { message: 'No alumni currently need tracking', count: 0 };
    }
    
    let processed = 0;
    
    for (const alumni of untracked) {
      await this.runTrackingForAlumni(alumni);
      processed++;
    }
    
    return {
      message: 'Tracking job finished',
      processed_count: processed
    };
  }
  
  // Get tracking history
  static async getTrackingHistory(alumni_id) {
    return db.allAsync(
      'SELECT * FROM tracking_history WHERE alumni_id = ? ORDER BY timestamp DESC',
      [alumni_id]
    );
  }
}

module.exports = { TrackingService };