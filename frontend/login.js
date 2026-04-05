const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : '/api';

// If already logged in, redirect to dashboard
const existingToken = localStorage.getItem('alumni_token');
if (existingToken) {
    fetch(`${API_URL}/auth/verify`, {
        headers: { 'Authorization': `Bearer ${existingToken}` }
    })
    .then(r => r.json())
    .then(data => {
        if (data.valid) window.location.href = '/';
    })
    .catch(() => {});
}

// Generate floating particles
function createParticles() {
    const container = document.getElementById('particles');
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (Math.random() * 20 + 10) + 's';
        particle.style.animationDelay = (Math.random() * 10) + 's';
        particle.style.width = (Math.random() * 4 + 2) + 'px';
        particle.style.height = particle.style.width;
        particle.style.opacity = Math.random() * 0.5 + 0.1;
        container.appendChild(particle);
    }
}
createParticles();

// Toggle password visibility
document.getElementById('togglePassword').addEventListener('click', () => {
    const passInput = document.getElementById('password');
    const icon = document.querySelector('#togglePassword i');
    if (passInput.type === 'password') {
        passInput.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        passInput.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
});

// Login form submission
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const btn = document.getElementById('loginBtn');
    const errEl = document.getElementById('errorMessage');
    const errText = document.getElementById('errorText');

    errEl.classList.remove('visible');
    btn.classList.add('loading');

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (response.ok && result.token) {
            localStorage.setItem('alumni_token', result.token);
            localStorage.setItem('alumni_user', JSON.stringify(result.user));

            // Success animation before redirect
            btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            btn.innerHTML = '<i class="fa-solid fa-check" style="position:relative;z-index:1;"></i>';

            setTimeout(() => {
                window.location.href = '/';
            }, 600);
        } else {
            errText.textContent = result.error || 'Login gagal. Periksa kredensial Anda.';
            errEl.classList.add('visible');
        }
    } catch (error) {
        errText.textContent = 'Tidak dapat terhubung ke server.';
        errEl.classList.add('visible');
    } finally {
        setTimeout(() => btn.classList.remove('loading'), 400);
    }
});
