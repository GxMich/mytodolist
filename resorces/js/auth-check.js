document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndLoadApp();
});

async function checkAuthAndLoadApp() {
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const landingContainer = document.getElementById('landing-container');

    if (appContainer && !appContainer.classList.contains('hide')) {
        appContainer.classList.add('hide');
    }

    // If landing page is visible (first visit), don't do anything yet
    // landing.js will handle the transition to auth
    const hasVisited = localStorage.getItem('taskflow_visited');
    if (!hasVisited && landingContainer && !landingContainer.classList.contains('hide')) {
        return;
    }

    try {
        const response = await fetch('/api/me');

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Autenticazione riuscita. Carico l\'applicazione.');

            // Mostra il nome utente reale nell'header
            const userNameEl = document.getElementById('user-name');
            if (userNameEl && data.user) {
                userNameEl.textContent = data.user.username;
            }

            // Saluto dinamico basato sull'ora
            const greetingEl = document.getElementById('greeting');
            if (greetingEl) {
                const ora = new Date().getHours();
                if (ora < 6) greetingEl.textContent = 'Buonanotte';
                else if (ora < 12) greetingEl.textContent = 'Buongiorno';
                else if (ora < 18) greetingEl.textContent = 'Buon pomeriggio';
                else greetingEl.textContent = 'Buonasera';
            }

            if (appContainer) {
                appContainer.classList.remove('hide');
            }
            if (authContainer) {
                authContainer.classList.add('hide');
            }
            if (landingContainer) {
                landingContainer.classList.add('hide');
            }

        } else if (response.status === 401 || response.status === 403) {
            console.log('❌ Nessun token valido. Mostro la schermata di Login.');
            if (appContainer) {
                appContainer.classList.add('hide');
            }
            if (authContainer) {
                authContainer.classList.remove('hide');
            }
            if (landingContainer) {
                landingContainer.classList.add('hide');
            }

        } else {
            console.error('⚠️ Errore server nel check di autenticazione:', response.status, response.statusText);
            if (authContainer) {
                authContainer.classList.remove('hide');
            }
        }
    } catch (error) {
        console.error('❌ Errore di rete/connessione:', error);
        if (authContainer) {
            authContainer.classList.remove('hide');
        }
    }
}