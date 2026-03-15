// Matching & Scoring Service

/**
 * Calculates confidence score based on matched attributes
 * Nama cocok → +0.4
 * Bidang/prodi cocok → +0.3
 * Tahun lulus dekat → +0.2
 * Universitas cocok → +0.1
 */
function calculateScore(matchData) {
    if (!matchData) return 0;
    
    let score = 0;
    if (matchData.name_match) score += 0.4;
    if (matchData.prodi_match) score += 0.3;
    if (matchData.year_match) score += 0.2;
    if (matchData.univ_match) score += 0.1;
    
    // Fix floating point precision issues (e.g. 0.4 + 0.3 = 0.7000000000000001)
    return Math.round(score * 10) / 10;
}

/**
 * Determines status based on confidence score
 * Jika confidence > 0.8 → status = "Teridentifikasi"
 * Jika 0.5 – 0.8 → status = "Perlu Verifikasi Manual"
 * Jika < 0.5 → status = "Belum Ditemukan"
 */
function determineStatus(score) {
    if (score > 0.8) {
        return "Teridentifikasi";
    } else if (score >= 0.5) {
        return "Perlu Verifikasi Manual";
    } else {
        return "Belum Ditemukan";
    }
}

/**
 * Validates results from multiple sources and returns the best match
 * or a combined result.
 */
function crossValidate(scholarResult, linkedinResult) {
    let bestResult = null;
    let highestScore = 0;
    
    const results = [];
    
    if (scholarResult.found) {
        const score = calculateScore(scholarResult.data);
        const result = { ...scholarResult, confidence: score };
        results.push(result);
        if (score > highestScore) {
            highestScore = score;
            bestResult = result;
        }
    }
    
    if (linkedinResult.found) {
        const score = calculateScore(linkedinResult.data);
        const result = { ...linkedinResult, confidence: score };
        results.push(result);
        if (score > highestScore) {
            highestScore = score;
            bestResult = result;
        }
    }
    
    const status = determineStatus(highestScore);
    
    return {
        overall_confidence: highestScore,
        status: status,
        best_match: bestResult,
        all_results: results
    };
}

module.exports = {
    calculateScore,
    determineStatus,
    crossValidate
};
