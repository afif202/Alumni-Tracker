/* ══════════════════════════════════════════════════════
   ALUMNI TRACKER — Frontend Application Logic
   ══════════════════════════════════════════════════════ */

const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : '/api';

let globalAlumniData = [];
let authToken = localStorage.getItem('alumni_token');
let currentPage = 1;
const ITEMS_PER_PAGE = 50;
let currentSearch = '';
let currentStatus = 'all';
let currentKategori = 'all';
let fetchTimeout = null;

// ─── Auth Helper ───
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
    };
}

async function authFetch(url, options = {}) {
    const headers = { ...getAuthHeaders(), ...options.headers };
    // Don't override Content-Type for FormData
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
        localStorage.removeItem('alumni_token');
        localStorage.removeItem('alumni_user');
        window.location.href = '/login';
        throw new Error('Session expired');
    }
    return res;
}

// ─── Auth Check on Load ───
(async function checkAuth() {
    if (!authToken) {
        window.location.href = '/login';
        return;
    }
    try {
        const res = await fetch(`${API_URL}/auth/verify`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!res.ok) throw new Error('Invalid token');
        const data = await res.json();
        if (!data.valid) throw new Error('Invalid');
        // Set user display
        const user = JSON.parse(localStorage.getItem('alumni_user') || '{}');
        const nameEl = document.getElementById('userDisplayName');
        if (nameEl && user.username) nameEl.textContent = user.username;
    } catch {
        localStorage.removeItem('alumni_token');
        localStorage.removeItem('alumni_user');
        window.location.href = '/login';
    }
})();

// ─── DOM Ready ───
document.addEventListener('DOMContentLoaded', () => {
    fetchAlumni();
    fetchStats();

    // ─── Pagination Controls ───
    document.getElementById('prevPageBtn').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchAlumni();
        }
    });

    document.getElementById('nextPageBtn').addEventListener('click', () => {
        currentPage++;
        fetchAlumni();
    });

    // ─── Sidebar Toggle ───
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    function toggleSidebar() {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }

    menuBtn.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);

    // ─── View Switching ───
    const navItems = document.querySelectorAll('.sidebar nav li');
    navItems.forEach(li => {
        li.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(n => n.classList.remove('active'));
            li.classList.add('active');

            const viewId = li.dataset.view;
            document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active-view'));
            const target = document.getElementById(viewId);
            if (target) target.classList.add('active-view');

            // Trigger view-specific logic
            if (viewId === 'alumniView') renderAlumniCards();
            if (viewId === 'analyticsView') renderAnalyticsCharts();

            if (window.innerWidth <= 1024) toggleSidebar();
        });
    });

    // ─── Logout ───
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('alumni_token');
        localStorage.removeItem('alumni_user');
        window.location.href = '/login';
    });

    // ─── Modal Handlers ───
    setupModalHandlers();

    // ─── Tracking & Add Alumni ───
    document.getElementById('runTrackingBtn').addEventListener('click', runTracking);
    document.getElementById('addAlumniBtn').addEventListener('click', () => openAddModal());
    document.getElementById('addAlumniForm').addEventListener('submit', handleAlumniFormSubmit);

    // ─── Table Search & Filter ───
    document.getElementById('tableSearch').addEventListener('input', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('kategoriFilter').addEventListener('change', applyFilters);

 // ─── Global Search ───
 document.getElementById('globalSearch').addEventListener('input', (e) => {
 document.getElementById('tableSearch').value = e.target.value;
 applyFilters();
 // Switch to dashboard view
 navItems.forEach(n => n.classList.remove('active'));
 document.querySelector('[data-view="dashboardView"]').classList.add('active');
 document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active-view'));
 document.getElementById('dashboardView').classList.add('active-view');
 });

 // ─── OSINT Handlers ───
 setupOsintHandlers();
});

async function fetchAlumni() {
    showLoading(true, 'Memuat Data...');
    try {
        const queryParams = new URLSearchParams({
            page: currentPage,
            limit: ITEMS_PER_PAGE,
            search: currentSearch,
            status: currentStatus,
            kategori: currentKategori
        });
        const res = await authFetch(`${API_URL}/alumni?${queryParams}`);
        const result = await res.json();
        
        if (result.data) {
            globalAlumniData = result.data;
            renderAlumniTable(result.data);
            
            if (result.pagination) {
                const p = result.pagination;
                const container = document.getElementById('paginationContainer');
                if (container) {
                    container.style.display = 'flex';
                    document.getElementById('paginationInfo').textContent = `Menampilkan ${result.data.length} dari total ${p.total} alumni`;
                    document.getElementById('currentPageDisplay').textContent = `Page ${p.page} of ${p.totalPages || 1}`;
                    document.getElementById('prevPageBtn').disabled = p.page <= 1;
                    document.getElementById('nextPageBtn').disabled = p.page >= p.totalPages || p.totalPages === 0;
                }
            }
        }
    } catch (err) {
        console.error('Error fetching alumni:', err);
    } finally {
        showLoading(false);
    }
}

async function fetchStats() {
    try {
        const res = await authFetch(`${API_URL}/stats`);
        const result = await res.json();
        const stats = result.data;
        if (!stats) return;

        document.getElementById('totalAlumni').textContent = stats.total || 0;
        document.getElementById('totalIdentified').textContent = stats.identified || 0;
        document.getElementById('totalVerification').textContent = stats.verification || 0;

        // Count those with known job categories
        const workingCount = (stats.byKategori || [])
            .filter(k => k.kategori_pekerjaan && k.kategori_pekerjaan !== 'Belum Diketahui')
            .reduce((sum, k) => sum + k.count, 0);
        document.getElementById('totalKategori').textContent = workingCount;

        // Update notification badge
        document.getElementById('notifBadge').textContent = stats.untracked || 0;
    } catch (err) {
        console.error('Error fetching stats:', err);
    }
}

async function runTracking() {
    const btn = document.getElementById('runTrackingBtn');
    btn.classList.add('loading');
    showLoading(true, 'Menjalankan AI Tracking...');

    try {
        const res = await authFetch(`${API_URL}/run-tracking`, { method: 'POST' });
        const result = await res.json();
        await fetchAlumni();
        await fetchStats();
        setTimeout(() => {
            alert(`${result.message} (${result.processed_count} alumni diproses)`);
        }, 300);
    } catch (err) {
        console.error('Tracking error:', err);
        alert('Terjadi kesalahan saat menjalankan tracking.');
    } finally {
        btn.classList.remove('loading');
        showLoading(false);
    }
}

// ═══════════════════════════════════════
//  TABLE RENDERING
// ═══════════════════════════════════════

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function renderAlumniTable(data) {
    const tbody = document.getElementById('alumniTableBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted);">
            <i class="fa-solid fa-inbox" style="font-size:2rem;display:block;margin-bottom:12px;opacity:0.5;"></i>
            Belum ada data alumni. Import dari Excel atau tambah manual.
        </td></tr>`;
        return;
    }

    data.forEach(item => {
        let statusClass = 'status-belum-dilacak';
        let statusIcon = 'fa-circle-minus';
        if (item.status === 'Teridentifikasi') { statusClass = 'status-teridentifikasi'; statusIcon = 'fa-circle-check'; }
        else if (item.status === 'Perlu Verifikasi Manual') { statusClass = 'status-perlu-verifikasi'; statusIcon = 'fa-circle-exclamation'; }
        else if (item.status === 'Belum Ditemukan') { statusClass = 'status-belum-ditemukan'; statusIcon = 'fa-circle-xmark'; }

        let konfClass = 'low';
        if (item.confidence_score > 0.8) konfClass = 'high';
        else if (item.confidence_score >= 0.5) konfClass = 'med';

        const lastCheckedStr = item.last_checked ? new Date(item.last_checked).toLocaleDateString('id-ID') : 'Belum pernah';
        const percentScore = Math.floor((item.confidence_score || 0) * 100);

        let katClass = 'kategori-belum';
        const kat = item.kategori_pekerjaan || 'Belum Diketahui';
        if (kat === 'PNS') katClass = 'kategori-pns';
        else if (kat === 'Swasta') katClass = 'kategori-swasta';
        else if (kat === 'Wirausaha') katClass = 'kategori-wirausaha';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="td-alumni-info">
                    <div class="alumni-avatar">${getInitials(item.nama)}</div>
                    <div class="alumni-details">
                        <strong>${item.nama}</strong>
                        <span>${item.nim ? 'NIM: ' + item.nim : 'ID: ALM-' + String(item.id).padStart(4, '0')}</span>
                    </div>
                </div>
            </td>
            <td>
                <strong>${item.prodi || '-'}</strong>
                <div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px;">${item.tahun_lulus ? 'Angkatan ' + item.tahun_lulus : ''}</div>
            </td>
            <td><span class="kategori-badge ${katClass}"><i class="fa-solid fa-briefcase"></i> ${kat}</span></td>
            <td><span class="status-badge ${statusClass}"><i class="fa-solid ${statusIcon}"></i> ${item.status || 'Belum Dilacak'}</span></td>
            <td>
                <div class="confidence-wrapper">
                    <div class="confidence-header">
                        <span class="confidence-score">${(item.confidence_score || 0).toFixed(1)}</span>
                        <span class="confidence-percent">${percentScore}%</span>
                    </div>
                    <div class="confidence-bar"><div class="confidence-fill ${konfClass}" style="width:${percentScore}%"></div></div>
                </div>
            </td>
            <td style="font-size:0.8rem;color:var(--text-muted);">${lastCheckedStr}</td>
            <td>
                <div class="action-btn-group">
                    <button class="action-btn" onclick="viewDetail(${item.id})" title="Detail"><i class="fa-solid fa-eye"></i></button>
                    <button class="action-btn" onclick="openEditModal(${item.id})" title="Edit"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-btn danger" onclick="deleteAlumni(${item.id})" title="Hapus"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function applyFilters() {
    currentSearch = document.getElementById('tableSearch').value;
    currentStatus = document.getElementById('statusFilter').value;
    currentKategori = document.getElementById('kategoriFilter').value;
    currentPage = 1;
    
    if (fetchTimeout) clearTimeout(fetchTimeout);
    fetchTimeout = setTimeout(() => {
        fetchAlumni();
    }, 300);
}

// ═══════════════════════════════════════
//  ALUMNI CARDS
// ═══════════════════════════════════════

function renderAlumniCards() {
    const container = document.getElementById('alumniCardContainer');
    if (!container) return;

    const identified = globalAlumniData.filter(i => i.status === 'Teridentifikasi');
    container.innerHTML = '';

    if (identified.length === 0) {
        container.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted);grid-column:1/-1;background:var(--bg-card);border-radius:12px;border:1px dashed var(--border);">
            <i class="fa-solid fa-users" style="font-size:2.5rem;margin-bottom:12px;opacity:0.3;display:block;"></i>
            Belum ada alumni teridentifikasi. Jalankan Tracking Job atau OSINT Scan.</div>`;
        return;
    }

    const gradients = [
        'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
        'linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%)',
        'linear-gradient(135deg, #f43f5e 0%, #f97316 100%)',
        'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
        'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
    ];

    identified.forEach((item, i) => {
        const card = document.createElement('div');
        card.className = 'profile-card';
        card.innerHTML = `
            <div class="profile-cover" style="background:${gradients[i % gradients.length]}">
                <div class="profile-avatar">${getInitials(item.nama)}</div>
                <div style="position:absolute;top:12px;right:12px;background:rgba(255,255,255,0.25);backdrop-filter:blur(4px);padding:4px 12px;border-radius:999px;color:white;font-size:0.72rem;font-weight:700;display:flex;gap:6px;align-items:center;border:1px solid rgba(255,255,255,0.4);">
                    <i class="fa-solid fa-shield-halved"></i> Verified
                </div>
            </div>
            <div class="profile-content">
                <div class="profile-name">${item.nama}</div>
                <div class="profile-prodi">${item.prodi || '-'}</div>
                <div class="profile-meta">
                    <div><i class="fa-solid fa-graduation-cap"></i> ${item.tahun_lulus || '-'}</div>
                    <div><i class="fa-solid fa-chart-line"></i> Score: ${(item.confidence_score || 0).toFixed(2)}</div>
                </div>
                <div class="profile-actions">
                    <button class="profile-btn primary" onclick="viewDetail(${item.id})"><i class="fa-solid fa-eye"></i> Detail</button>
                    <a class="profile-btn" href="https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(item.nama)}" target="_blank" style="text-decoration:none;">
                        <i class="fa-brands fa-linkedin" style="color:#0a66c2;"></i> LinkedIn
                    </a>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// ═══════════════════════════════════════
//  MODALS
// ═══════════════════════════════════════

function setupModalHandlers() {
    // Close buttons
    document.getElementById('closeAddModalBtn').addEventListener('click', () => {
        document.getElementById('addAlumniModal').classList.remove('active');
    });
    document.getElementById('closeDetailBtn').addEventListener('click', () => {
        document.getElementById('detailModal').classList.remove('active');
    });
    document.querySelector('#historyModal .close-btn').addEventListener('click', () => {
        document.getElementById('historyModal').classList.remove('active');
    });

    // Click outside modal to close
    window.addEventListener('click', (e) => {
        ['addAlumniModal', 'detailModal', 'historyModal'].forEach(id => {
            const modal = document.getElementById(id);
            if (e.target === modal) modal.classList.remove('active');
        });
    });

    // Detail tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });
}

function openAddModal() {
    document.getElementById('editAlumniId').value = '';
    document.getElementById('modalTitle').textContent = 'Tambah Alumni Baru';
    document.getElementById('formSubmitText').textContent = 'Simpan Data';
    document.getElementById('addAlumniForm').reset();
    document.getElementById('addAlumniModal').classList.add('active');
}

async function openEditModal(id) {
    try {
        const res = await authFetch(`${API_URL}/alumni/${id}/detail`);
        const { data } = await res.json();

        document.getElementById('editAlumniId').value = data.id;
        document.getElementById('modalTitle').textContent = 'Edit Alumni';
        document.getElementById('formSubmitText').textContent = 'Update Data';

        document.getElementById('inputNama').value = data.nama || '';
        document.getElementById('inputNim').value = data.nim || '';
        document.getElementById('inputProdi').value = data.prodi || '';
        document.getElementById('inputTahun').value = data.tahun_lulus || '';
        document.getElementById('inputKategori').value = data.kategori_pekerjaan || 'Belum Diketahui';
        document.getElementById('inputEmail').value = data.contact?.email || '';
        document.getElementById('inputPhone').value = data.contact?.phone || '';

        const career = data.careers?.[0] || {};
        document.getElementById('inputCompany').value = career.company_name || '';
        document.getElementById('inputPosition').value = career.position || '';
        document.getElementById('inputCompanyAddr').value = career.company_address || '';

        document.getElementById('addAlumniModal').classList.add('active');
    } catch (err) {
        console.error('Error loading alumni detail:', err);
        alert('Gagal memuat data alumni.');
    }
}

async function handleAlumniFormSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('editAlumniId').value;
    const isEdit = !!editId;

    const payload = {
        nama: document.getElementById('inputNama').value,
        nim: document.getElementById('inputNim').value || null,
        prodi: document.getElementById('inputProdi').value || null,
        tahun_lulus: document.getElementById('inputTahun').value ? parseInt(document.getElementById('inputTahun').value) : null,
        kategori_pekerjaan: document.getElementById('inputKategori').value,
        email: document.getElementById('inputEmail').value || null,
        phone: document.getElementById('inputPhone').value || null,
        company_name: document.getElementById('inputCompany').value || null,
        position: document.getElementById('inputPosition').value || null,
        company_address: document.getElementById('inputCompanyAddr').value || null
    };

    try {
        const url = isEdit ? `${API_URL}/alumni/${editId}` : `${API_URL}/alumni`;
        const method = isEdit ? 'PUT' : 'POST';

        const res = await authFetch(url, {
            method,
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (res.ok) {
            document.getElementById('addAlumniModal').classList.remove('active');
            e.target.reset();
            await fetchAlumni();
            await fetchStats();
            alert(isEdit ? 'Alumni berhasil diperbarui!' : 'Alumni berhasil ditambahkan!');
        } else {
            alert('Error: ' + (result.error || 'Unknown error'));
        }
    } catch (err) {
        console.error('Form submit error:', err);
        alert('Terjadi kesalahan.');
    }
}

async function deleteAlumni(id) {
    if (!confirm('Yakin ingin menghapus alumni ini? Data tidak bisa dikembalikan.')) return;

    try {
        const res = await authFetch(`${API_URL}/alumni/${id}`, { method: 'DELETE' });
        if (res.ok) {
            await fetchAlumni();
            await fetchStats();
            alert('Alumni berhasil dihapus.');
        }
    } catch (err) {
        alert('Gagal menghapus alumni.');
    }
}

// ═══════════════════════════════════════
//  ALUMNI DETAIL VIEW
// ═══════════════════════════════════════

async function viewDetail(id) {
    try {
        const res = await authFetch(`${API_URL}/alumni/${id}/detail`);
        const { data } = await res.json();

        // Reset tabs
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector('[data-tab="tabInfo"]').classList.add('active');
        document.getElementById('tabInfo').classList.add('active');

        // Info tab
        const kat = data.kategori_pekerjaan || 'Belum Diketahui';
        document.getElementById('detailInfoContent').innerHTML = `
            <div class="detail-grid">
                <div class="detail-item"><label>Nama</label><span>${data.nama}</span></div>
                <div class="detail-item"><label>NIM</label><span>${data.nim || '-'}</span></div>
                <div class="detail-item"><label>Program Studi</label><span>${data.prodi || '-'}</span></div>
                <div class="detail-item"><label>Tahun Lulus</label><span>${data.tahun_lulus || '-'}</span></div>
                <div class="detail-item"><label>Kategori Pekerjaan</label><span>${kat}</span></div>
                <div class="detail-item"><label>Status</label><span>${data.status || 'Belum Dilacak'}</span></div>
                <div class="detail-item"><label>Email</label><span>${data.contact?.email || '-'}</span></div>
                <div class="detail-item"><label>No. HP</label><span>${data.contact?.phone || '-'}</span></div>
                <div class="detail-item"><label>Confidence Score</label><span>${(data.confidence_score || 0).toFixed(2)}</span></div>
                <div class="detail-item"><label>Terakhir Dicek</label><span>${data.last_checked ? new Date(data.last_checked).toLocaleString('id-ID') : '-'}</span></div>
            </div>
        `;

        // Social Media tab
        const socialHtml = (data.socialMedia || []).length === 0
            ? '<p style="text-align:center;color:var(--text-muted);padding:20px;">Belum ada data sosial media. Jalankan OSINT Scan.</p>'
            : data.socialMedia.map(sm => `
                <div class="social-card">
                    <div class="social-icon" style="background:${getPlatformColor(sm.platform)};">
                        <i class="fa-brands ${getPlatformIcon(sm.platform)}"></i>
                    </div>
                    <div class="social-info">
                        <h4>${sm.platform}</h4>
                        ${sm.profile_url ? `<a href="${sm.profile_url}" target="_blank">${sm.profile_url}</a>` : `<span style="color:var(--text-muted);font-size:0.8rem;">@${sm.username || '-'}</span>`}
                    </div>
                    ${sm.verified ? '<i class="fa-solid fa-circle-check social-verified" title="Verified"></i>' : ''}
                </div>
            `).join('');
        document.getElementById('detailSocialContent').innerHTML = socialHtml;

        // Career tab
        const careerHtml = (data.careers || []).length === 0
            ? '<p style="text-align:center;color:var(--text-muted);padding:20px;">Belum ada data karir.</p>'
            : data.careers.map(c => `
                <div class="social-card">
                    <div class="social-icon" style="background:var(--primary);"><i class="fa-solid fa-building"></i></div>
                    <div class="social-info">
                        <h4>${c.company_name || '-'} ${c.is_current ? '<span style="color:var(--success);font-size:0.7rem;font-weight:700;">(Saat Ini)</span>' : ''}</h4>
                        <span style="font-size:0.82rem;color:var(--text-secondary);">${c.position || '-'}</span><br>
                        <span style="font-size:0.78rem;color:var(--text-muted);">${c.company_address || ''}</span>
                    </div>
                </div>
            `).join('');
        document.getElementById('detailCareerContent').innerHTML = careerHtml;

        // History tab
        const histHtml = (data.history || []).length === 0
            ? '<p style="text-align:center;color:var(--text-muted);padding:20px;">Belum ada tracking history.</p>'
            : data.history.map(h => `
                <div class="history-item">
                    <div class="history-item-header">
                        <div class="history-source"><i class="fa-solid fa-clock-rotate-left"></i> ${h.source}</div>
                        <div class="history-time">${new Date(h.timestamp).toLocaleString('id-ID')}</div>
                    </div>
                    <div class="history-link-wrapper">
                        <span class="status-badge" style="background:var(--primary-light);color:var(--primary);border:none;font-size:0.75rem;">
                            <i class="fa-solid fa-chart-line"></i> Score: ${(h.confidence || 0).toFixed(2)}
                        </span>
                        ${h.link ? `<a href="${h.link}" target="_blank" class="history-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> ${h.link}</a>` : ''}
                    </div>
                </div>
            `).join('');
        document.getElementById('detailHistoryContent').innerHTML = histHtml;

        document.getElementById('detailModal').classList.add('active');
    } catch (err) {
        console.error('Error viewing detail:', err);
        alert('Gagal memuat detail alumni.');
    }
}

function getPlatformIcon(platform) {
    const map = {
        'LinkedIn': 'fa-linkedin', 'Instagram': 'fa-instagram', 'Facebook': 'fa-facebook',
        'TikTok': 'fa-tiktok', 'Twitter/X': 'fa-x-twitter', 'GitHub': 'fa-github',
        'Medium': 'fa-medium', 'YouTube': 'fa-youtube', 'Reddit': 'fa-reddit',
        'Pinterest': 'fa-pinterest', 'Telegram': 'fa-telegram', 'Spotify': 'fa-spotify'
    };
    return map[platform] || 'fa-globe';
}

function getPlatformColor(platform) {
    const map = {
        'LinkedIn': '#0a66c2', 'Instagram': '#E4405F', 'Facebook': '#1877F2',
        'TikTok': '#000', 'Twitter/X': '#000', 'GitHub': '#333',
        'Medium': '#00ab6c', 'YouTube': '#FF0000', 'Reddit': '#FF4500',
        'Pinterest': '#E60023', 'Telegram': '#0088cc', 'Spotify': '#1DB954'
    };
    return map[platform] || '#6366f1';
}

// ═══════════════════════════════════════

// ═══════════════════════════════════════
// OSINT SEARCH
// ═══════════════════════════════════════

let osintSearchTimeout = null;

function setupOsintAutocomplete() {
    const input = document.getElementById('osintAlumniInput');
    const hiddenId = document.getElementById('osintAlumniSelectedId');
    const list = document.getElementById('osintAutocompleteList');

    if (!input) return;

    input.addEventListener('input', () => {
        const val = input.value;
        if (osintSearchTimeout) clearTimeout(osintSearchTimeout);
        if (!val || val.length < 2) {
            list.style.display = 'none';
            hiddenId.value = '';
            return;
        }

        osintSearchTimeout = setTimeout(async () => {
            try {
                const res = await authFetch(`${API_URL}/alumni?search=${encodeURIComponent(val)}&limit=10`);
                const result = await res.json();
                if (result.data && result.data.length > 0) {
                    list.innerHTML = '';
                    result.data.forEach(a => {
                        const item = document.createElement('div');
                        item.className = 'autocomplete-item';
                        item.innerHTML = `${a.nama} <span>${a.prodi || '-'} • ${a.tahun_lulus || '?'}</span>`;
                        item.addEventListener('click', () => {
                            input.value = a.nama;
                            hiddenId.value = a.id;
                            list.style.display = 'none';
                        });
                        list.appendChild(item);
                    });
                    list.style.display = 'block';
                } else {
                    list.style.display = 'none';
                    hiddenId.value = '';
                }
            } catch (e) {
                console.error(e);
            }
        }, 300);
    });

    // Close list when clicking outside
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !list.contains(e.target)) {
            list.style.display = 'none';
        }
    });
}

function setupOsintHandlers() {
    setupOsintAutocomplete();

    // Individual search
    document.getElementById('osintSearchBtn').addEventListener('click', async () => {
        const alumniId = document.getElementById('osintAlumniSelectedId').value;
        if (!alumniId) { alert('Pilih alumni terlebih dahulu dari daftar hasil pencarian.'); return; }

        const progress = document.getElementById('osintProgress');
        const results = document.getElementById('osintResults');
        progress.style.display = 'block';
        results.style.display = 'none';
        document.getElementById('batchResults').style.display = 'none';

        document.getElementById('scanTitle').textContent = 'Scanning...';
        document.getElementById('scanSubtitle').textContent = 'Memeriksa jejak digital di berbagai platform';

        try {
            const res = await authFetch(`${API_URL}/osint/search/${alumniId}`, { method: 'POST' });
            const { data } = await res.json();

            progress.style.display = 'none';
            results.style.display = 'block';

            renderOsintResults(data);
            await fetchAlumni();
            await fetchStats();
        } catch (err) {
            progress.style.display = 'none';
            alert('OSINT search gagal: ' + err.message);
        }
    });

    // Batch search
    document.getElementById('batchOsintBtn').addEventListener('click', async () => {
        const btn = document.getElementById('batchOsintBtn');
        btn.classList.add('loading');
        const progress = document.getElementById('osintProgress');
        progress.style.display = 'block';
        document.getElementById('osintResults').style.display = 'none';
        document.getElementById('batchResults').style.display = 'none';

        document.getElementById('scanTitle').textContent = 'Batch Scanning...';
        document.getElementById('scanSubtitle').textContent = 'Memproses alumni yang belum dilacak (maks 20)';

        try {
            const res = await authFetch(`${API_URL}/osint/batch-search`, { method: 'POST' });
            const result = await res.json();

            progress.style.display = 'none';
            document.getElementById('batchResults').style.display = 'block';

            const content = document.getElementById('batchResultsContent');
            content.innerHTML = `<p style="margin-bottom:16px;color:var(--text-muted);">Processed: ${result.processed} alumni</p>`;
            (result.results || []).forEach(r => {
                let statusBg = 'var(--bg-body)';
                let statusColor = 'var(--text-muted)';
                if (r.status === 'Teridentifikasi') { statusBg = 'var(--success-light)'; statusColor = '#059669'; }
                else if (r.status === 'Perlu Verifikasi Manual') { statusBg = 'var(--warning-light)'; statusColor = '#d97706'; }

                content.innerHTML += `
                    <div class="batch-item">
                        <span class="batch-item-name">${r.nama}</span>
                        <span class="status-badge" style="background:${statusBg};color:${statusColor};border:none;">${r.status || r.error || '-'}</span>
                    </div>
                `;
            });

            await fetchAlumni();
            await fetchStats();
        } catch (err) {
            progress.style.display = 'none';
            alert('Batch scan gagal: ' + err.message);
        } finally {
            btn.classList.remove('loading');
        }
    });
}

function renderOsintResults(data) {
    if (!data) return;

    // Summary
    const summary = document.getElementById('osintSummary');
    summary.innerHTML = `
        <span class="osint-stat found"><i class="fa-solid fa-check"></i> ${data.foundPlatforms || 0} Platform Ditemukan</span>
        <span class="osint-stat link"><i class="fa-solid fa-link"></i> ${Object.keys(data.platformChecks || {}).length} Platform Dicek</span>
    `;

    // Platform grid
    const grid = document.getElementById('platformGrid');
    grid.innerHTML = '';

    for (const [key, platform] of Object.entries(data.platformChecks || {})) {
        const best = platform.bestResult;
        const isFound = best && best.status === 'found';
        const isSearch = best && best.status === 'search_link';

        const card = document.createElement('div');
        card.className = 'platform-card';
        card.innerHTML = `
            <div class="platform-icon" style="background:${platform.color || '#6366f1'};">
                <i class="fa-brands ${platform.icon || 'fa-globe'}"></i>
            </div>
            <div class="platform-info">
                <h4>${platform.platform}</h4>
                <div class="platform-status ${isFound ? 'found' : (isSearch ? 'search' : 'not-found')}">
                    <i class="fa-solid ${isFound ? 'fa-check-circle' : (isSearch ? 'fa-link' : 'fa-times-circle')}"></i>
                    ${isFound ? 'Profil Ditemukan' : (isSearch ? 'Search Link' : 'Tidak Ditemukan')}
                </div>
                ${best?.url ? `<div class="platform-link"><a href="${best.url}" target="_blank"><i class="fa-solid fa-arrow-up-right-from-square"></i> Buka</a></div>` : ''}
            </div>
        `;
        grid.appendChild(card);
    }

    // Google search links
    const googleGrid = document.getElementById('googleLinksGrid');
    googleGrid.innerHTML = '';
    (data.googleSearchLinks || []).forEach(link => {
        googleGrid.innerHTML += `
            <div class="google-link-item">
                <i class="fa-solid fa-magnifying-glass"></i>
                <a href="${link.url}" target="_blank">${link.label}: ${link.query}</a>
            </div>
        `;
    });
}

// ═══════════════════════════════════════
//  ANALYTICS CHARTS
// ═══════════════════════════════════════

let chartInstances = {};

async function renderAnalyticsCharts() {
    try {
        const res = await authFetch(`${API_URL}/stats`);
        const result = await res.json();
        const stats = result.data;

        if (!stats) return;

        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { font: { family: "'Inter', sans-serif", size: 12 }, padding: 16 } }
            }
        };

        // Destroy existing charts
        Object.values(chartInstances).forEach(c => c.destroy());
        chartInstances = {};

        // Status Doughnut
        const statusCtx = document.getElementById('statusChart');
        if (statusCtx) {
            chartInstances.status = new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Teridentifikasi', 'Perlu Verifikasi', 'Belum Ditemukan', 'Belum Dilacak'],
                    datasets: [{
                        data: [stats.identified, stats.verification, stats.notFound, stats.untracked],
                        backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#cbd5e1'],
                        borderWidth: 0, hoverOffset: 6
                    }]
                },
                options: { ...commonOptions, cutout: '70%' }
            });
        }

        // Kategori Doughnut
        const katCtx = document.getElementById('kategoriChart');
        if (katCtx) {
            const katLabels = (stats.byKategori || []).map(k => k.kategori_pekerjaan || 'N/A');
            const katData = (stats.byKategori || []).map(k => k.count);
            chartInstances.kategori = new Chart(katCtx, {
                type: 'doughnut',
                data: {
                    labels: katLabels,
                    datasets: [{
                        data: katData,
                        backgroundColor: ['#6366f1', '#3b82f6', '#ec4899', '#cbd5e1', '#10b981'],
                        borderWidth: 0, hoverOffset: 6
                    }]
                },
                options: { ...commonOptions, cutout: '70%' }
            });
        }

        // Prodi Bar Chart
        const prodiCtx = document.getElementById('prodiChart');
        if (prodiCtx) {
            const prodiLabels = (stats.byProdi || []).map(p => p.prodi || 'N/A');
            const prodiData = (stats.byProdi || []).map(p => p.count);
            chartInstances.prodi = new Chart(prodiCtx, {
                type: 'bar',
                data: {
                    labels: prodiLabels,
                    datasets: [{
                        label: 'Jumlah Alumni',
                        data: prodiData,
                        backgroundColor: '#6366f1',
                        borderRadius: 8, barPercentage: 0.6
                    }]
                },
                options: {
                    ...commonOptions,
                    scales: {
                        y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { stepSize: 1 } },
                        x: { grid: { display: false }, ticks: { maxRotation: 45 } }
                    }
                }
            });
        }

        // Year Line Chart
        const yearCtx = document.getElementById('yearChart');
        if (yearCtx) {
            const yearLabels = (stats.byYear || []).map(y => y.tahun_lulus);
            const yearData = (stats.byYear || []).map(y => y.count);
            chartInstances.year = new Chart(yearCtx, {
                type: 'line',
                data: {
                    labels: yearLabels,
                    datasets: [{
                        label: 'Alumni per Tahun',
                        data: yearData,
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99,102,241,0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#6366f1',
                        pointRadius: 4
                    }]
                },
                options: {
                    ...commonOptions,
                    scales: {
                        y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { stepSize: 1 } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    } catch (err) {
        console.error('Error rendering charts:', err);
    }
}

// ═══════════════════════════════════════
//  UTILITY
// ═══════════════════════════════════════

function showLoading(show, text = 'Memuat Data...') {
    const overlay = document.getElementById('loadingOverlay');
    const textEl = document.getElementById('loadingText');
    if (textEl) textEl.textContent = text;
    if (show) overlay.classList.add('active');
    else overlay.classList.remove('active');
}

// Legacy viewHistory for backward compat
async function viewHistory(id, name) {
    viewDetail(id);
}
