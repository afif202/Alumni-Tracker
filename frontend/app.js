const API_URL = 'http://localhost:3000/api';
let globalAlumniData = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchAlumni();

    // Event Listeners
    document.getElementById('runTrackingBtn').addEventListener('click', runTracking);
    
    // Sidebar toggle for mobile & Desktop View Switching
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    function toggleSidebar() {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }

    menuBtn.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);

    // View Switching Logic
    const navLinks = document.querySelectorAll('.sidebar nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Re-assign active styling
            document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
            link.parentElement.classList.add('active');
            
            const sectionName = link.querySelector('span').textContent.toLowerCase().trim();
            
            if (sectionName === 'dashboard') {
                document.getElementById('dashboardView').classList.add('active-view');
                document.getElementById('alumniView').classList.remove('active-view');
                document.getElementById('analyticsView').classList.remove('active-view');
            } else if (sectionName === 'alumni') {
                document.getElementById('dashboardView').classList.remove('active-view');
                document.getElementById('alumniView').classList.add('active-view');
                document.getElementById('analyticsView').classList.remove('active-view');
                renderAlumniCards();
            } else if (sectionName === 'analytics' || link.href.includes('#analytics')) {
                document.getElementById('dashboardView').classList.remove('active-view');
                document.getElementById('alumniView').classList.remove('active-view');
                document.getElementById('analyticsView').classList.add('active-view');
                renderAnalyticsCharts();
            }
            // close mobile sidebar if open
            if(window.innerWidth <= 1024) toggleSidebar();
        });
    });

    // Modal close handlers
    document.querySelector('#historyModal .close-btn').addEventListener('click', () => {
        document.getElementById('historyModal').classList.remove('active');
    });

    document.getElementById('closeAddModalBtn').addEventListener('click', () => {
        document.getElementById('addAlumniModal').classList.remove('active');
    });

    window.addEventListener('click', (e) => {
        const hModal = document.getElementById('historyModal');
        const aModal = document.getElementById('addAlumniModal');
        if (e.target === hModal) hModal.classList.remove('active');
        if (e.target === aModal) aModal.classList.remove('active');
    });

    // Add Alumni btn
    document.getElementById('addAlumniBtn').addEventListener('click', () => {
        document.getElementById('addAlumniModal').classList.add('active');
    });

    // Add Alumni Form Submit
    document.getElementById('addAlumniForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nama = document.getElementById('inputNama').value;
        const prodi = document.getElementById('inputProdi').value;
        const tahun_lulus = document.getElementById('inputTahun').value;
        const submitBtn = e.target.querySelector('button[type="submit"]');

        try {
            submitBtn.classList.add('loading');
            const response = await fetch(`${API_URL}/alumni`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nama, prodi, tahun_lulus })
            });

            const result = await response.json();
            
            if (response.ok) {
                document.getElementById('addAlumniModal').classList.remove('active');
                e.target.reset(); // clear form
                await fetchAlumni(); // refresh table
                alert('Alumni berhasil ditambahkan!');
            } else {
                alert('Gagal menambahkan alumni: ' + result.error);
            }
        } catch (error) {
            console.error(error);
            alert('Terjadi kesalahan koneksi.');
        } finally {
            submitBtn.classList.remove('loading');
        }
    });

    // Table Search & Status Filter
    const searchInput = document.getElementById('tableSearch');
    const statusFilter = document.getElementById('statusFilter');

    function filterTable() {
        const searchTerm = searchInput.value.toLowerCase();
        const statusTerm = statusFilter.value;
        const rows = document.querySelectorAll('#alumniTableBody tr');
        
        rows.forEach(row => {
            const nameCell = row.querySelector('.alumni-details strong').textContent.toLowerCase();
            const prodiCell = row.querySelector('td:nth-child(2) strong').textContent.toLowerCase();
            
            // The status badge text content might contain icons inside it, so we extract text cleanly
            const statusCell = row.querySelector('.status-badge').textContent.trim();
            
            const matchesSearch = nameCell.includes(searchTerm) || prodiCell.includes(searchTerm);
            const matchesStatus = statusTerm === 'all' || statusCell === statusTerm;
            
            if (matchesSearch && matchesStatus) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    searchInput.addEventListener('input', filterTable);
    statusFilter.addEventListener('change', filterTable);
});

async function fetchAlumni() {
    showLoading(true, "Memuat Data...");
    try {
        const response = await fetch(`${API_URL}/alumni`);
        const result = await response.json();
        
        if (result.data) {
            globalAlumniData = result.data;
            renderAlumniTable(result.data);
            updateStats(result.data);
            renderAlumniCards();
        }
    } catch (error) {
        console.error("Error fetching alumni:", error);
        alert("Gagal memuat data alumni. Pastikan backend server berjalan.");
    } finally {
        showLoading(false);
    }
}

async function runTracking() {
    const btn = document.getElementById('runTrackingBtn');
    btn.classList.add('loading');
    showLoading(true, "Menjalankan AI Tracking Job...");

    try {
        const response = await fetch(`${API_URL}/run-tracking`, {
            method: 'POST'
        });
        const result = await response.json();
        
        // Tracking successful, reload data
        await fetchAlumni();
        
        // Show success alert
        setTimeout(() => {
            alert(result.message + ` (${result.processed_count} alumni diproses)\nData berhasil diperbarui.`);
        }, 300);

    } catch (error) {
        console.error("Error running tracking:", error);
        alert("Terjadi kesalahan saat menjalankan tracking job");
    } finally {
        btn.classList.remove('loading');
        showLoading(false);
    }
}

async function viewHistory(id, name) {
    try {
        const response = await fetch(`${API_URL}/history/${id}`);
        const result = await response.json();
        
        document.getElementById('modalAlumniName').textContent = `- ${name}`;
        
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = '';

        if (!result.data || result.data.length === 0) {
            historyList.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 40px 0;">
                    <i class="fa-solid fa-clock-rotate-left" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p>Belum ada history pencarian untuk alumni ini.</p>
                </div>
            `;
        } else {
            result.data.forEach(item => {
                let iconClass = 'fa-globe';
                if (item.source.toLowerCase().includes('linkedin')) iconClass = 'fa-linkedin';
                if (item.source.toLowerCase().includes('google')) iconClass = 'fa-google';

                // Format friendly date
                const dateObj = new Date(item.timestamp);
                const dateStr = dateObj.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
                const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' });

                historyList.innerHTML += `
                    <div class="history-item">
                        <div class="history-item-header">
                            <div class="history-source"><i class="fa-brands ${iconClass}"></i> ${item.source}</div>
                            <div class="history-time">${dateStr} &bull; ${timeStr}</div>
                        </div>
                        <div class="history-link-wrapper">
                            <div>
                                <span class="status-badge" style="background-color: var(--primary-light); color: var(--primary); border:none;">
                                    <i class="fa-solid fa-chart-line"></i> Score: ${item.confidence.toFixed(2)}
                                </span>
                            </div>
                            <a href="${item.link}" target="_blank" class="history-link">
                                <i class="fa-solid fa-arrow-up-right-from-square" style="margin-right:8px;"></i>${item.link}
                            </a>
                        </div>
                    </div>
                `;
            });
        }
        
        document.getElementById('historyModal').classList.add('active');

    } catch (error) {
        console.error("Error fetching history:", error);
        alert("Gagal memuat histori tracking");
    }
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function renderAlumniTable(data) {
    const tbody = document.getElementById('alumniTableBody');
    tbody.innerHTML = '';

    data.forEach(item => {
        // Status Badge Mapping with Icons
        let statusClass = 'status-belum-dilacak';
        let statusIcon = 'fa-circle-minus';
        
        if (item.status === 'Teridentifikasi') {
            statusClass = 'status-teridentifikasi';
            statusIcon = 'fa-circle-check';
        } else if (item.status === 'Perlu Verifikasi Manual') {
            statusClass = 'status-perlu-verifikasi';
            statusIcon = 'fa-circle-exclamation';
        } else if (item.status === 'Belum Ditemukan') {
            statusClass = 'status-belum-ditemukan';
            statusIcon = 'fa-circle-xmark';
        }

        // Confidence Class Mapping
        let confClass = 'low';
        if (item.confidence_score > 0.8) confClass = 'high';
        else if (item.confidence_score >= 0.5) confClass = 'med';

        const lastCheckedStr = item.last_checked ? new Date(item.last_checked).toLocaleDateString('id-ID') : 'Belum pernah';
        const percentScore = Math.floor(item.confidence_score * 100);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="td-alumni-info">
                    <div class="alumni-avatar">${getInitials(item.nama)}</div>
                    <div class="alumni-details">
                        <strong>${item.nama}</strong>
                        <span>ID: ALM-${item.id.toString().padStart(4, '0')}</span>
                    </div>
                </div>
            </td>
            <td>
                <strong>${item.prodi}</strong>
                <div style="font-size: 0.85rem; color: var(--text-muted); margin-top:2px;">Angkatan ${item.tahun_lulus}</div>
            </td>
            <td>
                <span class="status-badge ${statusClass}">
                    <i class="fa-solid ${statusIcon}"></i> ${item.status}
                </span>
            </td>
            <td>
                <div class="confidence-wrapper">
                    <div class="confidence-header">
                        <span class="confidence-score">${item.confidence_score.toFixed(1)} / 1.0</span>
                        <span class="confidence-percent">${percentScore}%</span>
                    </div>
                    <div class="confidence-bar">
                        <div class="confidence-fill ${confClass}" style="width: ${percentScore}%"></div>
                    </div>
                </div>
            </td>
            <td>${lastCheckedStr}</td>
            <td>
                <button class="action-btn" onclick="viewHistory(${item.id}, '${item.nama}')" title="View History">
                    <i class="fa-solid fa-clock-rotate-left"></i> <span>History</span>
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

function updateStats(data) {
    const total = data.length;
    const identified = data.filter(d => d.status === 'Teridentifikasi').length;
    const verification = data.filter(d => d.status === 'Perlu Verifikasi Manual').length;

    // Optional: Animate the numbers counting up
    document.getElementById('totalAlumni').textContent = total;
    document.getElementById('totalIdentified').textContent = identified;
    document.getElementById('totalVerification').textContent = verification;
}

function showLoading(show, text = "Memuat Data...") {
    const overlay = document.getElementById('loadingOverlay');
    const textEl = document.getElementById('loadingText');
    textEl.textContent = text;
    
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

function renderAlumniCards() {
    const container = document.getElementById('alumniCardContainer');
    if(!container) return;
    
    // Filter only Teridentifikasi
    const identified = globalAlumniData.filter(item => item.status === 'Teridentifikasi');
    container.innerHTML = '';
    
    if (identified.length === 0) {
        container.innerHTML = '<div style="padding: 32px; text-align:center; color: var(--text-muted); grid-column: 1 / -1; background: var(--bg-card); border-radius: 12px; border: 1px dashed var(--border);">Belum ada alumni yang teridentifikasi secara valid. Jalankan Tracking Job di Dashboard.</div>';
        return;
    }
    
    // Creative gradients for covers
    const gradients = [
        'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', // Indigo to Purple
        'linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%)', // Blue to Teal
        'linear-gradient(135deg, #f43f5e 0%, #f97316 100%)', // Rose to Orange
        'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)', // Emerald to Blue
        'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'  // Violet to Pink
    ];

    identified.forEach((item, index) => {
        const cover = gradients[index % gradients.length];
        
        const card = document.createElement('div');
        card.className = 'profile-card';
        card.innerHTML = `
            <div class="profile-cover" style="background: ${cover}">
                <div class="profile-avatar">${getInitials(item.nama)}</div>
                <div style="position: absolute; top: 12px; right: 12px; background: rgba(255,255,255,0.25); backdrop-filter: blur(4px); padding: 4px 12px; border-radius: 999px; color: white; font-size: 0.75rem; font-weight: 700; display:flex; gap:6px; align-items:center; border: 1px solid rgba(255,255,255,0.4);">
                    <i class="fa-solid fa-shield-check"></i> Verified MATCH
                </div>
            </div>
            <div class="profile-content">
                <div class="profile-name">${item.nama}</div>
                <div class="profile-prodi">${item.prodi}</div>
                <div class="profile-meta">
                    <div><i class="fa-solid fa-graduation-cap"></i> Angkatan ${item.tahun_lulus}</div>
                    <div title="Confidence Score dari sistem OCR/Scraping"><i class="fa-solid fa-chart-line"></i> Score: ${item.confidence_score.toFixed(2)}</div>
                </div>
                <div class="profile-actions">
                    <button class="profile-btn primary" onclick="viewHistory(${item.id}, '${item.nama}')">
                        <i class="fa-solid fa-clock-rotate-left"></i> History Log
                    </button>
                    <!-- Tambahan Fitur Creative: Mengarahkan langsung pencarian di LI -->
                    <a class="profile-btn" href="https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(item.nama + ' ' + item.prodi)}" target="_blank" style="text-decoration:none;">
                        <i class="fa-brands fa-linkedin" style="color:#0a66c2;"></i> LinkedIn
                    </a>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Chart.js instances
let statusChartInstance = null;
let prodiChartInstance = null;

function renderAnalyticsCharts() {
    const statusCtx = document.getElementById('statusChart');
    const prodiCtx = document.getElementById('prodiChart');
    if(!statusCtx || !prodiCtx) return;

    // Destroy existing charts if re-rendering
    if(statusChartInstance) statusChartInstance.destroy();
    if(prodiChartInstance) prodiChartInstance.destroy();

    // 1. Prepare Status Data
    const statusCounts = {
        'Teridentifikasi': 0,
        'Perlu Verifikasi Manual': 0,
        'Belum Ditemukan': 0,
        'Belum Dilacak': 0
    };
    
    // 2. Prepare Prodi Data
    const prodiCounts = {};

    globalAlumniData.forEach(item => {
        if(statusCounts[item.status] !== undefined) {
            statusCounts[item.status]++;
        }
        
        const pd = item.prodi || 'Lainnya';
        prodiCounts[pd] = (prodiCounts[pd] || 0) + 1;
    });

    // Chart Options
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { font: { family: "'Inter', sans-serif" } } }
        }
    };

    // Render Status Doughnut Chart
    statusChartInstance = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#cbd5e1'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            ...commonOptions,
            cutout: '70%',
            plugins: {
                ...commonOptions.plugins,
                tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: 12, cornerRadius: 8 }
            }
        }
    });

    // Render Prodi Bar Chart
    const prodiLabels = Object.keys(prodiCounts);
    const prodiData = Object.values(prodiCounts);
    
    prodiChartInstance = new Chart(prodiCtx, {
        type: 'bar',
        data: {
            labels: prodiLabels,
            datasets: [{
                label: 'Jumlah Alumni',
                data: prodiData,
                backgroundColor: '#6366f1',
                borderRadius: 8,
                barPercentage: 0.6
            }]
        },
        options: {
            ...commonOptions,
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { stepSize: 1, font: { family: "'Inter', sans-serif" } } },
                x: { grid: { display: false }, ticks: { font: { family: "'Inter', sans-serif" } } }
            }
        }
    });
}
