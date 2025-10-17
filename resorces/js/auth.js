document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginMessage = document.getElementById('loginMessage');
    const registerMessage = document.getElementById('registerMessage');
    const title = document.getElementById('auth-title');
    const switchReg = document.getElementById('switchToRegister');
    const switchLogin = document.getElementById('switchToLogin');
    const logoutButton = document.getElementById('logoutButton');
    switchReg.addEventListener('click', () => {
        title.textContent = 'Registrati';
        loginForm.style.display = 'none';
        registerForm.style.display = 'flex';
        switchReg.style.display = 'none';
        switchLogin.style.display = 'inline';
        loginMessage.style.display = 'none';
        registerMessage.style.display = 'none';
    });
    switchLogin.addEventListener('click', () => {
        title.textContent = 'Accedi';
        loginForm.style.display = 'flex';
        registerForm.style.display = 'none';
        switchReg.style.display = 'inline';
        switchLogin.style.display = 'none';
        loginMessage.style.display = 'none';
        registerMessage.style.display = 'none';
    });
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        loginMessage.style.display = 'none';

        const credenziale = loginForm.elements['loginCredenziale'].value;
        const password = loginForm.elements['loginPassword'].value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ credenziale, password })
            });

            const responseData = await response.json();

            if (response.ok) {
                displayMessage(loginMessage, responseData.message + ' Accesso in corso...', false);
                window.location.reload(); 
                
            } else {
                const errorMessage = responseData.error || 'Credenziali non valide.';
                displayMessage(loginMessage, errorMessage, true);
            }
        } catch (error) {
            console.error('Errore di rete durante il login:', error);
            displayMessage(loginMessage, 'Impossibile connettersi al server.', true);
        }
    });
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        registerMessage.style.display = 'none';

        const username = registerForm.elements['registerUsername'].value;
        const email = registerForm.elements['registerEmail'].value;
        const password = registerForm.elements['registerPassword'].value;

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });
            
            const responseData = await response.json();

            if (response.ok) {
                displayMessage(registerMessage, responseData.message + ' Ora puoi accedere!', false);
                setTimeout(() => {
                    switchLogin.click();
                }, 2000); 
                
            } else {
                const errorMessage = responseData.error || 'Errore durante la registrazione.';
                displayMessage(registerMessage, errorMessage, true);
            }
        } catch (error) {
            console.error('Errore di rete durante la registrazione:', error);
            displayMessage(registerMessage, 'Impossibile connettersi al server.', true);
        }
    });
    if (logoutButton) {
        logoutButton.addEventListener('click', async (event) => {
            event.preventDefault();

            try {
                const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    console.log('Logout riuscito. Reindirizzamento al Login.');
                    window.location.reload();

                } else {
                    let errorMessage = 'Errore sconosciuto durante il logout.';
                    
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorMessage;
                    } else {
                        errorMessage = await response.text() || `Errore ${response.status}: ${response.statusText}`;
                    }
                    
                    console.error('Errore durante il logout:', errorMessage);
                    alert('Errore durante il logout. Riprova: ' + errorMessage.substring(0, 100));
                }
            } catch (error) {
                console.error('Errore di rete durante il logout:', error);
                alert('Impossibile connettersi al server per il logout.');
            }
        });
    }    
    function displayMessage(element, message, isError) {
        element.textContent = message;
        element.style.color = isError ? 'var(--color-error)' : 'var(--color-success)'; 
        element.style.display = 'block';
    }
});