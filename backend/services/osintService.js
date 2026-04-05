const fetch = require('node-fetch');
const supabase = require('../config/supabaseClient');
const { scrapeDuckDuckGo } = require('./duckduckgoScraper');

/**
 * Sherlock-inspired platform definitions.
 * Each entry defines how to construct a profile URL and search URL for a platform.
 */
const PLATFORMS = {
    linkedin: {
        name: 'LinkedIn',
        icon: 'fa-linkedin',
        color: '#0a66c2',
        urlPattern: 'https://www.linkedin.com/in/{username}',
        searchUrl: 'https://www.linkedin.com/search/results/all/?keywords={query}',
        checkMethod: 'search_url' // cannot reliably HEAD check LinkedIn
    },
    instagram: {
        name: 'Instagram',
        icon: 'fa-instagram',
        color: '#E4405F',
        urlPattern: 'https://www.instagram.com/{username}/',
        searchUrl: 'https://www.instagram.com/{username}/',
        checkMethod: 'search_url'
    },
    facebook: {
        name: 'Facebook',
        icon: 'fa-facebook',
        color: '#1877F2',
        urlPattern: 'https://www.facebook.com/{username}',
        searchUrl: 'https://www.facebook.com/search/top/?q={query}',
        checkMethod: 'search_url'
    },
    tiktok: {
        name: 'TikTok',
        icon: 'fa-tiktok',
        color: '#000000',
        urlPattern: 'https://www.tiktok.com/@{username}',
        searchUrl: 'https://www.tiktok.com/search?q={query}',
        checkMethod: 'search_url'
    },
    twitter: {
        name: 'Twitter/X',
        icon: 'fa-x-twitter',
        color: '#000000',
        urlPattern: 'https://x.com/{username}',
        searchUrl: 'https://x.com/search?q={query}&src=typed_query',
        checkMethod: 'search_url'
    },
    github: {
        name: 'GitHub',
        icon: 'fa-github',
        color: '#333',
        urlPattern: 'https://github.com/{username}',
        checkMethod: 'http_check',
        errorType: 'status_code'
    },
    medium: {
        name: 'Medium',
        icon: 'fa-medium',
        color: '#00ab6c',
        urlPattern: 'https://medium.com/@{username}',
        checkMethod: 'search_url'
    },
    youtube: {
        name: 'YouTube',
        icon: 'fa-youtube',
        color: '#FF0000',
        urlPattern: 'https://www.youtube.com/@{username}',
        searchUrl: 'https://www.youtube.com/results?search_query={query}',
        checkMethod: 'search_url'
    },
    reddit: {
        name: 'Reddit',
        icon: 'fa-reddit',
        color: '#FF4500',
        urlPattern: 'https://www.reddit.com/user/{username}',
        checkMethod: 'http_check',
        errorType: 'status_code'
    },
    pinterest: {
        name: 'Pinterest',
        icon: 'fa-pinterest',
        color: '#E60023',
        urlPattern: 'https://www.pinterest.com/{username}/',
        checkMethod: 'search_url'
    },
    telegram: {
        name: 'Telegram',
        icon: 'fa-telegram',
        color: '#0088cc',
        urlPattern: 'https://t.me/{username}',
        checkMethod: 'search_url'
    },
    spotify: {
        name: 'Spotify',
        icon: 'fa-spotify',
        color: '#1DB954',
        searchUrl: 'https://open.spotify.com/search/{query}',
        checkMethod: 'search_url'
    },
    scholar: {
        name: 'Google Scholar',
        icon: 'fa-google-scholar',
        color: '#4285F4',
        searchUrl: 'https://scholar.google.com/scholar?q={query}',
        checkMethod: 'search_url'
    },
    tokopedia: {
        name: 'Tokopedia',
        icon: 'fa-store',
        color: '#42b549',
        searchUrl: 'https://www.tokopedia.com/search?st=shop&q={query}',
        checkMethod: 'search_url'
    },
    shopee: {
        name: 'Shopee',
        icon: 'fa-store',
        color: '#EE4D2D',
        searchUrl: 'https://shopee.co.id/search?keyword={query}',
        checkMethod: 'search_url'
    }
};

/**
 * Generate possible usernames from a name.
 * Mimics Sherlock's approach of trying common username patterns.
 */
function generateUsernames(nama) {
    const cleaned = nama.toLowerCase().trim();
    const parts = cleaned.split(/\s+/);
    const usernames = new Set();

    // Single joined (e.g. "ahmadrizky")
    usernames.add(parts.join(''));
    // Dot separated (e.g. "ahmad.rizky")
    usernames.add(parts.join('.'));
    // Underscore separated
    usernames.add(parts.join('_'));
    // Hyphen separated
    usernames.add(parts.join('-'));
    // First + last initial
    if (parts.length >= 2) {
        usernames.add(parts[0] + parts[parts.length - 1]);
        usernames.add(parts[0] + '.' + parts[parts.length - 1]);
        usernames.add(parts[0] + '_' + parts[parts.length - 1]);
        usernames.add(parts[0][0] + parts[parts.length - 1]);
        usernames.add(parts[0] + parts[parts.length - 1][0]);
    }
    // First name only
    usernames.add(parts[0]);

    return [...usernames];
}

/**
 * Check if a username exists on a specific platform via HTTP.
 * Returns status: 'found', 'not_found', or 'error'.
 */
async function checkPlatformProfile(platform, username) {
    const platformDef = PLATFORMS[platform];
    if (!platformDef) return { status: 'error', message: 'Platform not found' };

    const profileUrl = platformDef.urlPattern
        ? platformDef.urlPattern.replace('{username}', encodeURIComponent(username))
        : null;

    if (platformDef.checkMethod === 'http_check' && profileUrl) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(profileUrl, {
                method: 'HEAD',
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                redirect: 'follow'
            });

            clearTimeout(timeout);

            if (response.status === 200) {
                return {
                    status: 'found',
                    url: profileUrl,
                    method: 'http_check'
                };
            } else if (response.status === 404) {
                return { status: 'not_found', method: 'http_check' };
            } else {
                return { status: 'uncertain', url: profileUrl, method: 'http_check', httpStatus: response.status };
            }
        } catch (err) {
            return { status: 'error', message: err.message, method: 'http_check' };
        }
    }

    // For platforms we can't reliably check via HTTP, generate search links
    const searchUrl = platformDef.searchUrl
        ? platformDef.searchUrl.replace('{query}', encodeURIComponent(username)).replace('{username}', encodeURIComponent(username))
        : null;

    return {
        status: 'search_link',
        url: profileUrl || searchUrl,
        searchUrl: searchUrl,
        method: 'search_url'
    };
}

/**
 * Generate Google-style search queries for an alumni.
 * Mimics: site:linkedin.com "Nama Alumni"
 */
function generateGoogleSearchLinks(nama, prodi) {
    const queries = [
        { label: 'LinkedIn', query: `site:linkedin.com "${nama}"` },
        { label: 'Instagram', query: `site:instagram.com "${nama}"` },
        { label: 'Facebook', query: `site:facebook.com "${nama}"` },
        { label: 'TikTok', query: `site:tiktok.com "${nama}"` },
        { label: 'Twitter/X', query: `site:x.com OR site:twitter.com "${nama}"` },
        { label: 'General', query: `"${nama}" ${prodi || ''} alumni` }
    ];

    return queries.map(q => ({
        ...q,
        url: `https://www.google.com/search?q=${encodeURIComponent(q.query)}`
    }));
}

/**
 * Run full OSINT search for a single alumni.
 * Probes multiple platforms + generates search links.
 */
async function searchAlumni(alumniId) {
    const { data: alumni, error } = await supabase.from('alumni').select('*').eq('id', alumniId).single();
    if (error || !alumni) throw new Error('Alumni not found');

    const usernames = generateUsernames(alumni.nama);
    const results = [];
    const platformChecks = {};

    // For each platform, try each generated username
    for (const [platformKey, platformDef] of Object.entries(PLATFORMS)) {
        const platformResults = [];

        for (const username of usernames.slice(0, 5)) { // Limit to top 5 username variants
            try {
                const checkResult = await checkPlatformProfile(platformKey, username);
                platformResults.push({
                    username,
                    ...checkResult
                });

                // If found via http_check, save it
                if (checkResult.status === 'found') {
                    await supabase.from('alumni_social_media').upsert(
                        { alumni_id: alumniId, platform: platformDef.name, username, profile_url: checkResult.url, verified: true, last_checked: new Date().toISOString() },
                        { onConflict: 'alumni_id,platform' }
                    );

                    await supabase.from('tracking_history').insert(
                        { alumni_id: alumniId, source: `OSINT - ${platformDef.name}`, link: checkResult.url, confidence: 0.6 }
                    );

                    break;
                }
            } catch (err) {
                // Silently continue on individual check errors
            }
        }

        // For search_link results, save the first generated link
        const searchResult = platformResults.find(r => r.status === 'search_link');
        if (searchResult && !platformResults.some(r => r.status === 'found')) {
            platformResults.unshift({
                username: usernames[0],
                status: 'search_link',
                url: searchResult.url || searchResult.searchUrl,
                searchUrl: searchResult.searchUrl
            });
        }

        platformChecks[platformKey] = {
            platform: platformDef.name,
            icon: platformDef.icon,
            color: platformDef.color,
            results: platformResults,
            bestResult: platformResults.find(r => r.status === 'found') || platformResults[0] || null
        };
    }

    // Generate Google search links
    const googleSearchLinks = generateGoogleSearchLinks(alumni.nama, alumni.prodi);

    // Update alumni last_checked
    await supabase.from('alumni').update({ last_checked: new Date().toISOString() }).eq('id', alumniId);

    // Calculate simple confidence from how many platforms were found
    const foundCount = Object.values(platformChecks).filter(
        p => p.results && p.results.some(r => r.status === 'found')
    ).length;
    let confidence = Math.min(foundCount / 5, 1.0); // max out at 5 platforms found

    // ━━━━━━ NEW: Deep Data Extraction ━━━━━━
    const ddgQuery = `"${alumni.nama}" ("LinkedIn" OR "Instagram")`;
    const deepData = await scrapeDuckDuckGo(ddgQuery);
    
    // Save contact
    if (deepData.emails.length > 0 || deepData.phones.length > 0) {
        const email = deepData.emails[0] || null;
        const phone = deepData.phones[0] || null;
        await supabase.from('alumni_contact').upsert(
            { alumni_id: alumniId, email, phone },
            { onConflict: 'alumni_id' }
        );
        confidence = Math.min(confidence + 0.2, 1.0);
    }

    // Save career
    if (deepData.career.company || deepData.career.position) {
        const company = deepData.career.company || null;
        const position = deepData.career.position || null;
        const address = deepData.career.company_address || null;
        const cSocial = deepData.career.company_social_media || null;
        await supabase.from('alumni_career').upsert(
            { alumni_id: alumniId, company_name: company, position, company_address: address, company_social_media: cSocial, is_current: true },
            { onConflict: 'alumni_id,is_current' }
        );
        confidence = Math.min(confidence + 0.5, 1.0);
    }
    
    // Extract specific social links from the scraper snippets
    for (const r of deepData.results) {
        let platformName = null;
        if (r.url && r.url.includes('linkedin.com/in/')) platformName = 'LinkedIn';
        else if (r.url && r.url.includes('instagram.com/')) platformName = 'Instagram';
        else if (r.url && r.url.includes('facebook.com/')) platformName = 'Facebook';
        else if (r.url && r.url.includes('tiktok.com/')) platformName = 'TikTok';

        if (platformName) {
            await supabase.from('alumni_social_media').upsert(
                { alumni_id: alumniId, platform: platformName, username: 'extracted_from_search', profile_url: r.url, verified: true, last_checked: new Date().toISOString() },
                { onConflict: 'alumni_id,platform' }
            );
            const pKey = platformName.toLowerCase();
            if (!platformChecks[pKey]) {
                platformChecks[pKey] = { platform: platformName, results: [] };
            }
            platformChecks[pKey].bestResult = { status: 'found', url: r.url };
            platformChecks[pKey].results.unshift({ status: 'found', url: r.url });
        }
    }

    let kategoriToUpdate = alumni.kategori_pekerjaan;
    if (deepData.career.kategori && deepData.career.kategori !== 'Belum Diketahui' && (!alumni.kategori_pekerjaan || alumni.kategori_pekerjaan === 'Belum Diketahui')) {
        kategoriToUpdate = deepData.career.kategori;
    }

    let status = 'Belum Ditemukan';
    if (confidence > 0.6) status = 'Teridentifikasi';
    else if (confidence >= 0.2) status = 'Perlu Verifikasi Manual';

    await supabase.from('alumni').update({
        confidence_score: confidence,
        status,
        kategori_pekerjaan: kategoriToUpdate
    }).eq('id', alumniId);

    return {
        alumni,
        usernames,
        platformChecks,
        googleSearchLinks,
        foundPlatforms: foundCount,
        confidence,
        status
    };
}

module.exports = {
    PLATFORMS,
    generateUsernames,
    checkPlatformProfile,
    generateGoogleSearchLinks,
    searchAlumni
};
