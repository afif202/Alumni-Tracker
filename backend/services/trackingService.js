// Tracking & OSINT business logic — Supabase version
const supabase = require('../config/supabaseClient');
const { searchScholar } = require('./scholarService');
const { searchLinkedIn } = require('./linkedinService');
const { crossValidate } = require('./matchingService');

class TrackingService {

  // Get untracked alumni
  static async getUntrackedAlumni(limit = 1000) {
    const { data, error } = await supabase
      .from('alumni')
      .select('*')
      .in('status', ['Belum Dilacak', 'Update Needed', 'Belum Ditemukan'])
      .limit(limit);

    if (error) throw new Error(error.message);
    return data || [];
  }

  // Run tracking for single alumni
  static async runTrackingForAlumni(alumni) {
    const scholarResult = await searchScholar(alumni.nama, alumni.prodi, alumni.tahun_lulus);
    const linkedinResult = await searchLinkedIn(alumni.nama, alumni.prodi, alumni.tahun_lulus);
    const validation = crossValidate(scholarResult, linkedinResult);

    // Save to history
    for (const result of validation.all_results) {
      await supabase.from('tracking_history').insert({
        alumni_id: alumni.id,
        source: result.source,
        link: result.link,
        confidence: result.confidence
      });
    }

    // Update alumni status
    await supabase.from('alumni').update({
      status: validation.status,
      confidence_score: validation.overall_confidence,
      last_checked: new Date().toISOString()
    }).eq('id', alumni.id);

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

    return { message: 'Tracking job finished', processed_count: processed };
  }

  // Get tracking history
  static async getTrackingHistory(alumni_id) {
    const { data, error } = await supabase
      .from('tracking_history')
      .select('*')
      .eq('alumni_id', alumni_id)
      .order('timestamp', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }
}

module.exports = { TrackingService };