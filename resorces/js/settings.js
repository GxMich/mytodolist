// ==================== SETTINGS PAGE ====================
function startSettingsObserver() {
    const main = document.querySelector("main");
    const observer = new MutationObserver(() => {
        const settingsForm = document.getElementById("settingsForm");
        if (settingsForm) {
            observer.disconnect();
            initSettings();
        }
    });
    observer.observe(main, { childList: true, subtree: true });
}

document.addEventListener("DOMContentLoaded", () => {
    startSettingsObserver();
    const originalGetMainSelection = getMainSelection;
    const wrapped = window.getMainSelection;
    window.getMainSelection = function (...args) {
        const result = (wrapped || originalGetMainSelection).apply(this, args);
        setTimeout(startSettingsObserver, 100);
        return result;
    };
});

async function initSettings() {
    const settingsForm = document.getElementById('settingsForm');
    const settingsMessage = document.getElementById('settingsMessage');

    // Avatar elements
    const avatarWrapper = document.getElementById('avatar-wrapper');
    const avatarInput = document.getElementById('avatar-input');
    const avatarImg = document.getElementById('avatar-img');
    const avatarInitials = document.getElementById('avatar-initials');
    const removeAvatarBtn = document.getElementById('remove-avatar-btn');

    // Helper: update avatar display
    function setAvatarDisplay(photoUrl, username) {
        if (photoUrl) {
            avatarImg.src = photoUrl + '?t=' + Date.now();
            avatarImg.classList.remove('hide');
            if (avatarInitials) avatarInitials.style.display = 'none';
            if (removeAvatarBtn) removeAvatarBtn.classList.remove('hide');
        } else {
            avatarImg.classList.add('hide');
            avatarImg.src = '';
            if (avatarInitials) {
                avatarInitials.style.display = '';
                avatarInitials.textContent = username ? username.charAt(0).toUpperCase() : '?';
            }
            if (removeAvatarBtn) removeAvatarBtn.classList.add('hide');
        }
        // Sync header image
        const headerImg = document.getElementById('intro-info-img');
        const headerAvatarIcon = document.getElementById('header-avatar-icon');
        if (headerImg) {
            if (photoUrl) {
                headerImg.src = photoUrl + '?t=' + Date.now();
                headerImg.classList.remove('hide');
                if (headerAvatarIcon) headerAvatarIcon.style.display = 'none';
            } else {
                headerImg.src = '';
                headerImg.classList.add('hide');
                if (headerAvatarIcon) headerAvatarIcon.style.display = '';
            }
        }
    }

    // Carica info utente
    try {
        const response = await fetch('/api/me');
        if (response.ok) {
            const data = await response.json();
            const profileUsername = document.getElementById('profile-username');
            const profileId = document.getElementById('profile-id');
            if (profileUsername) profileUsername.textContent = data.user.username;
            if (profileId) profileId.textContent = `ID: ${data.user.id}`;

            // Update header too
            const userNameEl = document.getElementById('user-name');
            if (userNameEl) userNameEl.textContent = data.user.username;

            // Set avatar
            setAvatarDisplay(data.user.photo_url, data.user.username);
        }
    } catch (error) {
        console.error('Errore caricamento info utente:', error);
    }

    // Avatar click → file picker
    if (avatarWrapper && avatarInput) {
        avatarWrapper.addEventListener('click', () => avatarInput.click());
        avatarInput.addEventListener('change', async () => {
            const file = avatarInput.files[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
                if (typeof showCustomAlert === 'function') showCustomAlert('Errore', 'Immagine troppo grande (max 5MB).');
                return;
            }
            const formData = new FormData();
            formData.append('avatar', file);
            try {
                const res = await fetch('/api/auth/avatar', { method: 'POST', body: formData });
                const result = await res.json();
                if (res.ok) {
                    setAvatarDisplay(result.photo_url, document.getElementById('profile-username')?.textContent);
                    if (typeof showCustomAlert === 'function') showCustomAlert('Fatto!', 'Foto profilo aggiornata.');
                } else {
                    if (typeof showCustomAlert === 'function') showCustomAlert('Errore', result.error || 'Errore upload.');
                }
            } catch (err) {
                console.error('Errore upload avatar:', err);
            }
            avatarInput.value = '';
        });
    }

    // Remove avatar
    if (removeAvatarBtn) {
        removeAvatarBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                const res = await fetch('/api/auth/avatar', { method: 'DELETE' });
                if (res.ok) {
                    setAvatarDisplay(null, document.getElementById('profile-username')?.textContent);
                    if (typeof showCustomAlert === 'function') showCustomAlert('Fatto!', 'Foto rimossa.');
                }
            } catch (err) {
                console.error('Errore rimozione avatar:', err);
            }
        });
    }

    // Load weekly stats
    await loadWeeklyStats();

    // Export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }

    // Form submit
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('settingsUsername').value.trim();
        const email = document.getElementById('settingsEmail').value.trim();
        const password = document.getElementById('settingsPassword').value;

        if (!username && !email && !password) {
            showSettingsMessage(settingsMessage, 'Compila almeno un campo.', true);
            return;
        }

        if (password && password.length < 8) {
            showSettingsMessage(settingsMessage, 'La password deve avere almeno 8 caratteri.', true);
            return;
        }

        const body = {};
        if (username) body.username = username;
        if (email) body.email = email;
        if (password) body.password = password;

        try {
            const response = await fetch('/api/auth/update', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const result = await response.json();

            if (response.ok) {
                showSettingsMessage(settingsMessage, result.message || 'Aggiornato!', false);
                settingsForm.reset();
                if (username) {
                    const userNameEl = document.getElementById('user-name');
                    if (userNameEl) userNameEl.textContent = username;
                    const profileUsername = document.getElementById('profile-username');
                    if (profileUsername) profileUsername.textContent = username;
                }
            } else {
                showSettingsMessage(settingsMessage, result.error || 'Errore.', true);
            }
        } catch (error) {
            console.error('Errore aggiornamento:', error);
            showSettingsMessage(settingsMessage, 'Impossibile connettersi al server.', true);
        }
    });
}

// ==================== WEEKLY STATS ====================
async function loadWeeklyStats() {
    const chartEl = document.getElementById('weekly-stats');
    if (!chartEl) return;

    try {
        const res = await fetch('/api/tasks');
        if (!res.ok) return;
        const data = await res.json();
        const tasks = data.tasks || [];

        const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
        const today = new Date();
        const weekData = [];

        // Last 7 days
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = toLocalDateStr(d);

            const completedCount = tasks.filter(t => {
                if (t.status !== 'completed') return false;
                // Check if task was completed on this day (by updated_at or by date match)
                if (t.inizio_data) {
                    return toLocalDateStr(t.inizio_data) === dateStr;
                }
                return false;
            }).length;

            weekData.push({
                day: days[d.getDay()],
                count: completedCount,
                isToday: i === 0
            });
        }

        const maxCount = Math.max(...weekData.map(d => d.count), 1);

        // Total stats
        const total = tasks.filter(t => t.genere !== 'note' && t.status !== 'deleted').length;
        const completed = tasks.filter(t => t.status === 'completed').length;
        const pending = tasks.filter(t => t.status === 'pending').length;

        const statTotal = document.getElementById('stat-total');
        const statCompleted = document.getElementById('stat-completed');
        const statPending = document.getElementById('stat-pending');

        if (statTotal) statTotal.innerHTML = `<strong style="color: var(--text-primary); font-size: 1.2rem;">${total}</strong> totali`;
        if (statCompleted) statCompleted.innerHTML = `<strong style="color: var(--success); font-size: 1.2rem;">${completed}</strong> completate`;
        if (statPending) statPending.innerHTML = `<strong style="color: var(--primary); font-size: 1.2rem;">${pending}</strong> in corso`;

        chartEl.innerHTML = weekData.map(d => {
            const height = Math.max((d.count / maxCount) * 100, 5);
            const todayClass = d.isToday ? 'style="font-weight:700; color: var(--primary);"' : '';
            return `
                <div class="stats-bar-wrapper">
                    <span class="stats-bar-count">${d.count}</span>
                    <div class="stats-bar">
                        <div class="stats-bar-fill" style="height: ${height}%"></div>
                    </div>
                    <span class="stats-bar-day" ${todayClass}>${d.day}</span>
                </div>`;
        }).join('');

    } catch (err) {
        console.error('Errore caricamento statistiche:', err);
    }
}

// Helper: local date string (reused from today.js)
function toLocalDateStr(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// ==================== EXPORT DATA ====================
async function exportData() {
    try {
        const res = await fetch('/api/tasks');
        if (!res.ok) return;
        const data = await res.json();

        const exportObj = {
            exportDate: new Date().toISOString(),
            taskCount: data.tasks.length,
            tasks: data.tasks
        };

        const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `taskflow_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (typeof showCustomAlert === 'function') {
            showCustomAlert('Esportato!', 'I tuoi dati sono stati scaricati.');
        }
    } catch (err) {
        console.error('Errore esportazione:', err);
    }
}

function showSettingsMessage(el, msg, isError) {
    el.textContent = msg;
    el.style.color = isError ? '#E53E3E' : '#50C878';
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
}
