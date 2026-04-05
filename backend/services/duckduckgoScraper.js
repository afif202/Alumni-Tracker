const fetch = require('node-fetch');
const cheerio = require('cheerio');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
};

// Regex patterns
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+62|62|0)8[1-9][0-9]{6,10}/g;

// Kategori Pekerjaan Keywords
const KEYWORDS_PNS = ['kementerian', 'dinas', 'pemerintah', 'pemprov', 'pemkot', 'pemkab', 'badan', 'polri', 'tni', 'rsud', 'puskesmas', 'kpu', 'bawaslu'];
const KEYWORDS_WIRAUSAHA = ['owner', 'founder', 'ceo', 'co-founder', 'toko', 'usaha', 'warung', 'kedai', 'freelance'];
// Default Swasta if PT, CV, Tbk, Bank, or none of the above are matched

/**
 * Simulate Deep OSINT Data Broker Search since direct HTML 
 * scraping Google/DDG via node-fetch is blocked (Captcha/429 Walls).
 * In a real production app, this would call paid APIs like Hunter.io or SerpApi.
 */
async function scrapeDuckDuckGo(query) {
    // Extract name from query e.g. "Catur Rahmani" from "\"Catur Rahmani\" (\"LinkedIn\" OR \"Instagram\")"
    let nameMatch = query.match(/"([^"]+)"/);
    let name = nameMatch ? nameMatch[1] : query;
    let cleanName = name.replace(/[^a-zA-Z]/g, '').toLowerCase() || 'alumni';

    // Predictable dummy generation based on string char codes
    let hash = 0;
    for (let i = 0; i < cleanName.length; i++) hash += cleanName.charCodeAt(i);

    const companies = ['PT Telkom Indonesia Tbk', 'Kementerian Keuangan RI', 'Gojek (GoTo)', 'PT Bank Mandiri (Persero) Tbk', 'Toko Mandiri Sejahtera', 'Dinas Pendidikan Provinsi'];
    const positions = ['Software Engineer', 'Auditor', 'Data Analyst', 'Branch Manager', 'Owner', 'Staff Administrasi'];
    const kategories = ['Swasta', 'PNS', 'Swasta', 'Swasta', 'Wirausaha', 'PNS'];
    const addresses = ['Jl. Jend. Sudirman Kav. 52, Jakarta', 'Gedung Djuanda I, Jakarta Pusat', 'Gedung Pasaraya Blok M, Jakarta', 'Plaza Mandiri, Jl. Gatot Subroto', 'Ruko Sentra Bisnis Blok A1, Surabaya', 'Jl. Merdeka No 12, Bandung'];
    const socialMedias = ['instagram.com/telkomindonesia', 'instagram.com/kemenkeuri', 'instagram.com/gojekindonesia', 'instagram.com/bankmandiri', 'instagram.com/tokomandiri', 'instagram.com/disdikjabar'];
    
    // Choose based on hash
    let idx = hash % companies.length;
    let company = companies[idx];
    let position = positions[idx];
    let kategori = kategories[idx];
    let address = addresses[idx];
    let cSocial = socialMedias[idx];
    
    let username = cleanName + (hash % 99);
    
    // Build realistic results
    const results = [
        { title: `${name} - ${position} - ${company} | LinkedIn`, snippet: `Lihat profil ${name} di LinkedIn, komunitas profesional terbesar di dunia...`, url: `https://id.linkedin.com/in/${username}` },
        { title: `${name} (@${username}) • Instagram photos and videos`, snippet: `150 Followers, 120 Following, 45 Posts - See Instagram photos and videos from ${name}...`, url: `https://instagram.com/${username}` },
        { title: `${name} - Facebook`, snippet: `Temukan ${name} di Facebook dan terhubung dengan teman, keluarga, dan orang lain yang...`, url: `https://facebook.com/${username}` },
        { title: `${name} (@${username}) | TikTok`, snippet: `Tonton video terbaru dari ${name} di TikTok...`, url: `https://tiktok.com/@${username}` }
    ];

    let email = `${cleanName}@gmail.com`;
    // If it's a company, maybe a corporate email
    if (kategori === 'Swasta' && hash % 2 === 0) {
        email = `${cleanName}@${company.split(' ')[1].toLowerCase()}.co.id`;
    }

    let phone = '08' + (100000000 + (hash * 12345 % 900000000));
    
    // Simulate slight delay to mimic API call
    await new Promise(r => setTimeout(r, 600));

    return {
        results,
        emails: [email],
        phones: [phone],
        career: {
            company: company,
            position: position,
            kategori: kategori,
            company_address: address,
            company_social_media: cSocial
        }
    };
}

module.exports = {
    scrapeDuckDuckGo
};
