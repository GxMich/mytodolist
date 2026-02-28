document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginMessage = document.getElementById('loginMessage');
    const registerMessage = document.getElementById('registerMessage');
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const switchReg = document.getElementById('switchToRegister');
    const switchLogin = document.getElementById('switchToLogin');
    const logoutButton = document.getElementById('logoutButton');
    const registerBtn = document.getElementById('registerBtn');

    // SVG icon templates
    const svgCheck = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 10"/></svg>`;
    const svgX = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    const svgLoader = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`;
    const svgWarn = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;

    // Rule SVG templates (for password rules swap)
    const ruleCheckSVG = `<svg class="rule-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 10"/></svg>`;
    const ruleXSVG = `<svg class="rule-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;

    // ====== PASSWORD TOGGLE ======
    document.querySelectorAll('.pwd-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            const eyeOpen = btn.querySelector('.eye-open');
            const eyeClosed = btn.querySelector('.eye-closed');
            if (input.type === 'password') {
                input.type = 'text';
                eyeOpen.classList.add('hide');
                eyeClosed.classList.remove('hide');
            } else {
                input.type = 'password';
                eyeOpen.classList.remove('hide');
                eyeClosed.classList.add('hide');
            }
        });
    });

    // ====== FORM SWITCHING ======
    switchReg.addEventListener('click', () => {
        title.textContent = 'Crea Account';
        subtitle.textContent = 'Registra un nuovo account';
        loginForm.style.display = 'none';
        registerForm.style.display = 'flex';
        switchReg.style.display = 'none';
        switchLogin.style.display = 'inline';
        clearMessages();
    });

    switchLogin.addEventListener('click', () => {
        title.textContent = 'Bentornato';
        subtitle.textContent = 'Accedi al tuo account';
        loginForm.style.display = 'flex';
        registerForm.style.display = 'none';
        switchReg.style.display = 'inline';
        switchLogin.style.display = 'none';
        clearMessages();
    });

    function clearMessages() {
        loginMessage.textContent = '';
        loginMessage.className = 'auth-message';
        registerMessage.textContent = '';
        registerMessage.className = 'auth-message';
    }

    // ====== REAL-TIME REGISTRATION VALIDATION ======
    const regUsername = document.getElementById('registerUsername');
    const regEmail = document.getElementById('registerEmail');
    const regPassword = document.getElementById('registerPassword');
    const regConfirm = document.getElementById('registerConfirmPassword');
    const usernameStatus = document.getElementById('username-status');
    const usernameHint = document.getElementById('username-hint');
    const emailStatus = document.getElementById('email-status');
    const confirmStatus = document.getElementById('confirm-status');
    const ruleLength = document.getElementById('rule-length');
    const ruleUpper = document.getElementById('rule-upper');
    const ruleNumber = document.getElementById('rule-number');

    let usernameTimer = null;
    let usernameOk = false;
    let emailOk = false;
    let passwordOk = false;
    let confirmOk = false;

    function updateRegisterBtn() {
        registerBtn.disabled = !(usernameOk && emailOk && passwordOk && confirmOk);
    }

    function setRuleState(ruleEl, passed, text) {
        ruleEl.innerHTML = (passed ? ruleCheckSVG : ruleXSVG) + ' ' + text;
        ruleEl.classList.toggle('passed', passed);
    }

    // Username check
    regUsername.addEventListener('input', () => {
        const val = regUsername.value.trim();
        clearTimeout(usernameTimer);

        if (val.length < 3) {
            usernameStatus.innerHTML = '';
            usernameHint.textContent = `Minimo 3 caratteri (${val.length}/3)`;
            usernameHint.className = 'field-hint';
            regUsername.classList.remove('is-valid', 'is-invalid');
            usernameOk = false;
            updateRegisterBtn();
            return;
        }

        usernameStatus.innerHTML = svgLoader;
        usernameStatus.className = 'field-status checking';
        usernameHint.textContent = 'Controllo disponibilità...';
        usernameHint.className = 'field-hint';

        usernameTimer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/auth/check-username/${encodeURIComponent(val)}`);
                const data = await res.json();
                if (data.available) {
                    usernameStatus.innerHTML = svgCheck;
                    usernameStatus.className = 'field-status valid';
                    usernameHint.textContent = 'Username disponibile!';
                    usernameHint.className = 'field-hint hint-valid';
                    regUsername.classList.add('is-valid');
                    regUsername.classList.remove('is-invalid');
                    usernameOk = true;
                } else {
                    usernameStatus.innerHTML = svgX;
                    usernameStatus.className = 'field-status invalid';
                    usernameHint.textContent = 'Username già in uso';
                    usernameHint.className = 'field-hint hint-invalid';
                    regUsername.classList.add('is-invalid');
                    regUsername.classList.remove('is-valid');
                    usernameOk = false;
                }
            } catch (e) {
                usernameStatus.innerHTML = svgWarn;
                usernameHint.textContent = 'Errore nel controllo';
                usernameHint.className = 'field-hint hint-invalid';
                usernameOk = false;
            }
            updateRegisterBtn();
        }, 500);
    });

    // Email validation
    regEmail.addEventListener('input', () => {
        const val = regEmail.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!val) {
            emailStatus.innerHTML = '';
            regEmail.classList.remove('is-valid', 'is-invalid');
            emailOk = false;
        } else if (emailRegex.test(val)) {
            emailStatus.innerHTML = svgCheck;
            emailStatus.className = 'field-status valid';
            regEmail.classList.add('is-valid');
            regEmail.classList.remove('is-invalid');
            emailOk = true;
        } else {
            emailStatus.innerHTML = svgX;
            emailStatus.className = 'field-status invalid';
            regEmail.classList.add('is-invalid');
            regEmail.classList.remove('is-valid');
            emailOk = false;
        }
        updateRegisterBtn();
    });

    // Password rules
    regPassword.addEventListener('input', () => {
        const val = regPassword.value;
        const hasLength = val.length >= 8;
        const hasUpper = /[A-Z]/.test(val);
        const hasNumber = /[0-9]/.test(val);

        setRuleState(ruleLength, hasLength, 'Minimo 8 caratteri');
        setRuleState(ruleUpper, hasUpper, 'Almeno una maiuscola');
        setRuleState(ruleNumber, hasNumber, 'Almeno un numero');

        passwordOk = hasLength && hasUpper && hasNumber;

        if (passwordOk) {
            regPassword.classList.add('is-valid');
            regPassword.classList.remove('is-invalid');
        } else if (val.length > 0) {
            regPassword.classList.add('is-invalid');
            regPassword.classList.remove('is-valid');
        } else {
            regPassword.classList.remove('is-valid', 'is-invalid');
        }

        checkConfirmPassword();
        updateRegisterBtn();
    });

    // Confirm password
    function checkConfirmPassword() {
        const val = regConfirm.value;
        if (!val) {
            confirmStatus.innerHTML = '';
            regConfirm.classList.remove('is-valid', 'is-invalid');
            confirmOk = false;
        } else if (val === regPassword.value && regPassword.value.length > 0) {
            confirmStatus.innerHTML = svgCheck;
            confirmStatus.className = 'field-status valid';
            regConfirm.classList.add('is-valid');
            regConfirm.classList.remove('is-invalid');
            confirmOk = true;
        } else {
            confirmStatus.innerHTML = svgX;
            confirmStatus.className = 'field-status invalid';
            regConfirm.classList.add('is-invalid');
            regConfirm.classList.remove('is-valid');
            confirmOk = false;
        }
        updateRegisterBtn();
    }

    regConfirm.addEventListener('input', checkConfirmPassword);

    // ====== LOGIN SUBMIT ======
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        loginMessage.innerHTML = '';

        const credenziale = loginForm.elements['loginCredenziale'].value;
        const password = loginForm.elements['loginPassword'].value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credenziale, password })
            });

            const responseData = await response.json();

            if (response.ok) {
                displayMessage(loginMessage, svgCheck + ' ' + responseData.message + ' Accesso in corso...', false);
                window.location.reload();
            } else {
                displayMessage(loginMessage, svgX + ' ' + (responseData.error || 'Credenziali non valide.'), true);
            }
        } catch (error) {
            console.error('Errore di rete durante il login:', error);
            displayMessage(loginMessage, svgWarn + ' Impossibile connettersi al server.', true);
        }
    });

    // ====== REGISTER SUBMIT ======
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        registerMessage.innerHTML = '';

        const username = regUsername.value.trim();
        const email = regEmail.value.trim();
        const password = regPassword.value;
        const confirm = regConfirm.value;

        if (password !== confirm) {
            displayMessage(registerMessage, svgX + ' Le password non corrispondono.', true);
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const responseData = await response.json();

            if (response.ok) {
                displayMessage(registerMessage, svgCheck + ' ' + responseData.message + ' Ora puoi accedere!', false);
                setTimeout(() => {
                    switchLogin.click();
                }, 2000);
            } else {
                displayMessage(registerMessage, svgX + ' ' + (responseData.error || 'Errore durante la registrazione.'), true);
            }
        } catch (error) {
            console.error('Errore di rete durante la registrazione:', error);
            displayMessage(registerMessage, svgWarn + ' Impossibile connettersi al server.', true);
        }
    });

    // ====== LOGOUT ======
    if (logoutButton) {
        logoutButton.addEventListener('click', async (event) => {
            event.preventDefault();
            try {
                const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                if (response.ok) {
                    window.location.reload();
                } else {
                    const contentType = response.headers.get('content-type');
                    let errorMessage = 'Errore durante il logout.';
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorMessage;
                    }
                    alert(errorMessage);
                }
            } catch (error) {
                alert('Impossibile connettersi al server per il logout.');
            }
        });
    }

    function displayMessage(element, message, isError) {
        element.innerHTML = message;
        element.className = 'auth-message ' + (isError ? 'error' : 'success');
    }
});