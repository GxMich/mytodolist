document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndLoadApp();
});
async function checkAuthAndLoadApp() {
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    if (appContainer && !appContainer.classList.contains('hide')) {
        appContainer.classList.add('hide');
    }

    try {
        const response = await fetch('/api/me'); 

        if (response.ok) { 
            console.log('✅ Autenticazione riuscita. Carico l\'applicazione.');
            if (appContainer) {
                appContainer.classList.remove('hide');
            }
            if (authContainer) {
                authContainer.classList.add('hide');
            }
            
        } else if (response.status === 401 || response.status === 403) {
            console.log('❌ Nessun token valido. Mostro la schermata di Login.');
            if (appContainer) {
                appContainer.classList.add('hide');
            }
            if (authContainer) {
                authContainer.classList.remove('hide');
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