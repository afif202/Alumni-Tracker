// Mock Google Scholar Service

function simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Simple mock for scholar search
async function searchScholar(name, prodi, tahun_lulus) {
    await simulateDelay(Math.random() * 500 + 100); // 100-600ms delay
    
    // Randomize whether we find something or not based on name length to simulate varying results
    const shouldFind = (name.length + tahun_lulus) % 2 === 0;
    
    if (shouldFind) {
        return {
            source: 'Google Scholar',
            found: true,
            link: `https://scholar.google.com/citations?user=mock_${name.replace(/\s+/g, '').toLowerCase()}`,
            data: {
                name_match: true,
                prodi_match: Math.random() > 0.3, // 70% chance prodi matches if found
                year_match: Math.random() > 0.5,
                univ_match: true
            }
        };
    }
    
    return {
        source: 'Google Scholar',
        found: false
    };
}

module.exports = {
    searchScholar
};
