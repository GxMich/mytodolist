// ==================== GLOBAL SEARCH ====================
document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('searchToggle');
    const searchOverlay = document.getElementById('search-overlay');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const searchClose = document.getElementById('search-close');

    if (!searchBtn || !searchOverlay) return;

    let searchTasks = [];

    searchBtn.addEventListener('click', async () => {
        searchOverlay.classList.remove('hide');
        searchInput.value = '';
        searchResults.innerHTML = '';
        searchInput.focus();

        // Pre-fetch tasks
        try {
            const res = await fetch('/api/tasks');
            if (res.ok) {
                const data = await res.json();
                searchTasks = data.tasks || [];
            }
        } catch (e) { console.error(e); }
    });

    searchClose.addEventListener('click', () => {
        searchOverlay.classList.add('hide');
    });

    searchOverlay.addEventListener('click', (e) => {
        if (e.target === searchOverlay) searchOverlay.classList.add('hide');
    });

    // ESC to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !searchOverlay.classList.contains('hide')) {
            searchOverlay.classList.add('hide');
        }
    });

    searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim().toLowerCase();
        if (q.length < 2) {
            searchResults.innerHTML = '<p class="search-hint">Digita almeno 2 caratteri...</p>';
            return;
        }

        const matches = searchTasks.filter(t => {
            const title = (t.titolo || '').toLowerCase();
            const details = (t.dettagli || '').toLowerCase();
            const tag = (t.tag || '').toLowerCase();
            const cat = (t.categoria || '').toLowerCase();
            return title.includes(q) || details.includes(q) || tag.includes(q) || cat.includes(q);
        });

        if (matches.length === 0) {
            searchResults.innerHTML = `
                <div class="search-empty">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                    <p>Nessun risultato per "${searchInput.value}"</p>
                </div>`;
            return;
        }

        // Group by genere
        const tasks = matches.filter(t => t.genere === 'task');
        const events = matches.filter(t => t.genere === 'event');
        const notes = matches.filter(t => t.genere === 'note');

        let html = '';

        if (tasks.length > 0) {
            html += renderGroup('Task', tasks, q);
        }
        if (events.length > 0) {
            html += renderGroup('Eventi', events, q);
        }
        if (notes.length > 0) {
            html += renderGroup('Note', notes, q);
        }

        searchResults.innerHTML = html;

        // Add click handlers to navigate and open task
        searchResults.querySelectorAll('.search-item').forEach(item => {
            item.addEventListener('click', () => {
                const genere = item.dataset.genere;
                const taskId = item.dataset.id;
                searchOverlay.classList.add('hide');

                // Find the full task object
                const task = searchTasks.find(t => t.id == taskId);

                if (genere === 'note') {
                    setMainSelection('note');
                    getMainSelection();
                } else {
                    setMainSelection('today');
                    getMainSelection();

                    // Wait for page to load, then open editor
                    if (task) {
                        setTimeout(() => {
                            if (typeof openTaskEditor === 'function') {
                                openTaskEditor(task);
                            }
                        }, 400);
                    }
                }
            });
        });
    });

    function renderGroup(title, items, query) {
        const tagColors = { 'lavoro': '#4A90D9', 'personale': '#50C878', 'studio': '#9B59B6' };
        const statusIcons = {
            'pending': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F6AD55" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>',
            'completed': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="var(--success)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
            'deleted': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
        };

        let html = `<div class="search-group"><h4 class="search-group-title">${title}</h4>`;
        items.forEach(item => {
            const highlighted = highlightMatch(item.titolo, query);
            const tagBadge = item.tag ? `<span class="search-tag" style="background:${tagColors[item.tag] || '#888'}">${item.tag}</span>` : '';
            const statusIcon = statusIcons[item.status] || '';

            html += `
                <div class="search-item" data-genere="${item.genere}" data-id="${item.id}">
                    <div class="search-item-left">
                        ${statusIcon}
                        <span class="search-item-title">${highlighted}</span>
                    </div>
                    <div class="search-item-right">
                        ${tagBadge}
                    </div>
                </div>`;
        });
        html += '</div>';
        return html;
    }

    function highlightMatch(text, query) {
        if (!text) return '';
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
    }
});
