// Mock LinkedIn Service

function simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Simple mock for LinkedIn search
async function searchLinkedIn(name, prodi, tahun_lulus) {
    await simulateDelay(Math.random() * 500 + 200); // 200-700ms delay
    
    // Different logic from Google Scholar to simulate varying results
    const shouldFind = (name.length * tahun_lulus) % 3 !== 0;
    
    if (shouldFind) {
        return {
            source: 'LinkedIn',
            found: true,
            link: `https://linkedin.com/in/${name.replace(/\s+/g, '-').toLowerCase()}-mock`,
            data: {
                name_match: true,
                prodi_match: Math.random() > 0.2, // 80% chance prodi matches if found
                year_match: Math.random() > 0.3,
                univ_match: Math.random() > 0.1
            }
        };
    }
    
    return {
        source: 'LinkedIn',
        found: false
    };
}

module.exports = {
    searchLinkedIn
};
