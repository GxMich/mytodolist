// ==================== POMODORO TIMER ====================
function startPomodoroObserver() {
    const main = document.querySelector("main");
    const observer = new MutationObserver(() => {
        const pomoTime = document.getElementById("pomo-time");
        if (pomoTime) {
            observer.disconnect();
            initPomodoro();
        }
    });
    observer.observe(main, { childList: true, subtree: true });
}

document.addEventListener("DOMContentLoaded", () => {
    startPomodoroObserver();
    const originalGetMainSelection = getMainSelection;
    window.getMainSelection = function (...args) {
        const result = originalGetMainSelection.apply(this, args);
        setTimeout(startPomodoroObserver, 100);
        return result;
    };
});

function initPomodoro() {
    const WORK_DURATION = 25 * 60; // 25 min
    const SHORT_BREAK = 5 * 60;   // 5 min
    const LONG_BREAK = 15 * 60;   // 15 min
    const CIRCUMFERENCE = 2 * Math.PI * 42; // ring radius = 42

    let timeLeft = WORK_DURATION;
    let totalTime = WORK_DURATION;
    let isRunning = false;
    let interval = null;
    let sessions = 0;
    let isBreak = false;

    const timeDisplay = document.getElementById('pomo-time');
    const ring = document.getElementById('pomo-ring');
    const startBtn = document.getElementById('pomo-start');
    const resetBtn = document.getElementById('pomo-reset');
    const label = document.getElementById('pomo-label');
    const sessionDots = document.getElementById('pomo-sessions');

    ring.style.strokeDasharray = CIRCUMFERENCE;
    ring.style.strokeDashoffset = '0';

    function updateDisplay() {
        const m = Math.floor(timeLeft / 60);
        const s = timeLeft % 60;
        timeDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

        // Update ring
        const progress = 1 - (timeLeft / totalTime);
        ring.style.strokeDashoffset = progress * CIRCUMFERENCE;

        // Color shift
        if (isBreak) {
            ring.style.stroke = 'var(--success)';
        } else {
            ring.style.stroke = 'var(--primary)';
        }
    }

    function updateSessionDots() {
        const dots = sessionDots.querySelectorAll('.pomodoro-dot');
        dots.forEach((dot, i) => {
            dot.classList.toggle('filled', i < sessions);
        });
    }

    function tick() {
        if (timeLeft <= 0) {
            clearInterval(interval);
            isRunning = false;

            if (!isBreak) {
                sessions++;
                updateSessionDots();

                if (sessions >= 4) {
                    // Long break
                    isBreak = true;
                    timeLeft = LONG_BREAK;
                    totalTime = LONG_BREAK;
                    label.textContent = 'Pausa lunga — rilassati!';
                    sessions = 0;
                    updateSessionDots();
                } else {
                    // Short break
                    isBreak = true;
                    timeLeft = SHORT_BREAK;
                    totalTime = SHORT_BREAK;
                    label.textContent = 'Pausa breve — respira';
                }
            } else {
                // Back to work
                isBreak = false;
                timeLeft = WORK_DURATION;
                totalTime = WORK_DURATION;
                label.textContent = 'Sessione di focus';
            }

            updateDisplay();
            startBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Avvia`;

            // Notify
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Pomodoro', {
                    body: isBreak ? '☕ Tempo di pausa!' : '🎯 Torna al lavoro!',
                    icon: '/resorces/img/logo.png'
                });
            }
            return;
        }

        timeLeft--;
        updateDisplay();
    }

    startBtn.addEventListener('click', () => {
        if (isRunning) {
            // Pause
            clearInterval(interval);
            isRunning = false;
            startBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Riprendi`;
        } else {
            // Start
            isRunning = true;
            interval = setInterval(tick, 1000);
            startBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg> Pausa`;

            // Request notification permission
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }
    });

    resetBtn.addEventListener('click', () => {
        clearInterval(interval);
        isRunning = false;
        isBreak = false;
        timeLeft = WORK_DURATION;
        totalTime = WORK_DURATION;
        sessions = 0;
        label.textContent = 'Sessione di focus';
        startBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Avvia`;
        updateDisplay();
        updateSessionDots();
    });

    updateDisplay();
    updateSessionDots();
}
