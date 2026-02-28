// Theme Toggle: Dark / Light Mode
(function () {
    // Apply saved theme immediately (before DOM renders)
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    document.addEventListener('DOMContentLoaded', () => {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;

        themeToggle.addEventListener('click', () => {
            const html = document.documentElement;
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            if (newTheme === 'light') {
                html.removeAttribute('data-theme');
            } else {
                html.setAttribute('data-theme', 'dark');
            }

            localStorage.setItem('theme', newTheme);
        });
    });
})();
