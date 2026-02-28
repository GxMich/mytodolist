// Landing page logic
// If user has visited before → skip landing, go to auth check
// If first visit → show landing page

document.addEventListener('DOMContentLoaded', () => {
    const landingContainer = document.getElementById('landing-container');
    const authContainer = document.getElementById('auth-container');
    const startBtn = document.getElementById('landing-start-btn');

    const hasVisited = localStorage.getItem('taskflow_visited');

    if (hasVisited) {
        // Returning user → hide landing, let auth-check.js handle the rest
        if (landingContainer) landingContainer.classList.add('hide');
        // auth-check.js will show auth or app
    } else {
        // First visit → show landing page, hide auth
        if (landingContainer) landingContainer.classList.remove('hide');
        if (authContainer) authContainer.classList.add('hide');
    }

    // CTA button click
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            // Mark as visited
            localStorage.setItem('taskflow_visited', 'true');

            // Animate out landing page
            landingContainer.style.animation = 'landingOut 0.4s ease forwards';
            setTimeout(() => {
                landingContainer.classList.add('hide');
                landingContainer.style.animation = '';

                // Trigger auth check flow
                if (typeof checkAuthAndLoadApp === 'function') {
                    checkAuthAndLoadApp();
                } else {
                    // Fallback: show auth
                    if (authContainer) {
                        authContainer.classList.remove('hide');
                        authContainer.style.animation = 'authSlideIn 0.5s ease';
                    }
                }
            }, 350);
        });
    }
});
