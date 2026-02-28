let allTasks = [];

function startFilterObserver() {
    const main = document.querySelector("main");

    const observer = new MutationObserver(() => {
        const filters = document.querySelectorAll(".filter-card");
        const taskList = document.getElementById("task-list");
        if (filters.length > 0 && taskList) {
            observer.disconnect();
            initFilterSystem(filters);
            initCategoryFilter();
            loadTasks();
        }
    });

    observer.observe(main, { childList: true, subtree: true });
}

document.addEventListener("DOMContentLoaded", () => {
    startFilterObserver();
    const originalGetMainSelection = getMainSelection;
    window.getMainSelection = function (...args) {
        const result = originalGetMainSelection.apply(this, args);
        setTimeout(startFilterObserver, 100);
        return result;
    };

    // Ricarica le task quando ne viene creata/modificata una
    window.addEventListener('taskUpdated', () => {
        setTimeout(() => {
            const taskList = document.getElementById("task-list");
            if (taskList) loadTasks();
        }, 200);
    });
});

function initFilterSystem(filters) {
    let filterActive = localStorage.getItem("filterActive") || "all";
    localStorage.setItem("filterActive", filterActive);

    filters.forEach(f => f.classList.remove("active"));
    document.getElementById(filterActive)?.classList.add("active");

    filters.forEach(el => {
        el.addEventListener("click", () => {
            filters.forEach(f => f.classList.remove("active"));
            el.classList.add("active");
            localStorage.setItem("filterActive", el.id);
            renderTasks();
        });
    });
}

function initCategoryFilter() {
    const catChips = document.querySelectorAll('.cat-chip');
    let catActive = localStorage.getItem("catFilterActive") || "cat-all";
    localStorage.setItem("catFilterActive", catActive);

    catChips.forEach(c => c.classList.remove('active'));
    document.getElementById(catActive)?.classList.add('active');

    catChips.forEach(chip => {
        chip.addEventListener('click', () => {
            catChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            localStorage.setItem("catFilterActive", chip.id);
            renderTasks();
        });
    });
}

// Helper: get YYYY-MM-DD in local timezone
function toLocalDateStr(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// Helper: check if a task falls on today
function isTaskForToday(task) {
    const todayStr = toLocalDateStr(new Date());

    // Task giornaliera → always today
    if (task.task_giornaliera) return true;

    // Check if today is between inizio_data and fine_data
    if (task.inizio_data && task.fine_data) {
        const start = toLocalDateStr(task.inizio_data);
        const end = toLocalDateStr(task.fine_data);
        return todayStr >= start && todayStr <= end;
    }

    // Check only inizio_data
    if (task.inizio_data) {
        const start = toLocalDateStr(task.inizio_data);
        return todayStr === start;
    }

    // Check only fine_data (deadline today)
    if (task.fine_data) {
        const end = toLocalDateStr(task.fine_data);
        return todayStr === end;
    }

    // No date set → show in "all" but not in today by default
    return false;
}

async function loadTasks() {
    try {
        const response = await fetch('/api/tasks');
        if (!response.ok) {
            console.error('Errore nel caricamento task:', response.status);
            return;
        }
        const data = await response.json();
        allTasks = data.tasks || [];
        renderTasks();
    } catch (error) {
        console.error('Errore di rete nel caricamento task:', error);
    }
}

function renderTasks() {
    const taskList = document.getElementById("task-list");
    if (!taskList) return;

    const filter = localStorage.getItem("filterActive") || "all";
    const catFilter = localStorage.getItem("catFilterActive") || "cat-all";
    const now = new Date();

    // Step 1: Only tasks (not notes)
    let tasksToShow = allTasks.filter(t => t.genere !== 'note');

    // Step 2: Only TODAY's tasks (except for deleted filter which shows all deleted)
    if (filter !== 'deleted') {
        tasksToShow = tasksToShow.filter(t => isTaskForToday(t));
    }

    // Step 3: Status filter
    switch (filter) {
        case 'pending':
            tasksToShow = tasksToShow.filter(t => t.status === 'pending');
            break;
        case 'completed':
            tasksToShow = tasksToShow.filter(t => t.status === 'completed');
            break;
        case 'expired':
            tasksToShow = tasksToShow.filter(t => {
                if (t.status !== 'pending') return false;
                if (!t.fine_data) return false;
                const fineDate = new Date(t.fine_data);
                return fineDate < now;
            });
            break;
        case 'deleted':
            tasksToShow = allTasks.filter(t => t.genere !== 'note' && t.status === 'deleted');
            break;
        default: // 'all'
            tasksToShow = tasksToShow.filter(t => t.status !== 'deleted');
            break;
    }

    // Step 4: Category / tag / urgency filter
    if (catFilter !== 'cat-all') {
        const chipEl = document.getElementById(catFilter);
        if (chipEl) {
            const tag = chipEl.dataset.tag;
            const urgency = chipEl.dataset.urgency;

            if (tag) {
                tasksToShow = tasksToShow.filter(t => t.tag === tag);
            } else if (urgency) {
                tasksToShow = tasksToShow.filter(t => t.urgenza === urgency || t.priorita === urgency);
            }
        }
    }

    // Update summary
    updateTodaySummary(filter);

    // Render upcoming events widget (only on 'all' filter)
    renderUpcomingWidget();

    if (tasksToShow.length === 0) {
        taskList.innerHTML = `
            <div class="empty-state">
                <p class="empty-icon">${getEmptyIcon(filter)}</p>
                <p class="empty-text">${getEmptyMessage(filter)}</p>
            </div>`;
        return;
    }

    taskList.innerHTML = tasksToShow.map(task => createTaskCard(task, filter)).join('');

    // Aggiungi event listeners a tutti i pulsanti
    taskList.querySelectorAll('.task-action-btn').forEach(btn => {
        btn.addEventListener('click', handleTaskAction);
    });

    // Init swipe gestures on mobile
    initSwipeActions();
}

function updateTodaySummary(filter) {
    const summaryEl = document.getElementById('today-summary');
    if (!summaryEl) return;

    if (filter === 'deleted') {
        summaryEl.innerHTML = '';
        return;
    }

    const todayTasks = allTasks.filter(t => t.genere !== 'note' && t.status !== 'deleted' && isTaskForToday(t));
    const pendingCount = todayTasks.filter(t => t.status === 'pending').length;
    const completedCount = todayTasks.filter(t => t.status === 'completed').length;
    const total = todayTasks.length;

    if (total === 0) {
        summaryEl.innerHTML = '';
        return;
    }

    const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    summaryEl.innerHTML = `
        <div class="summary-bar">
            <div class="summary-text">
                <span class="summary-label">Oggi: <strong>${pendingCount}</strong> da fare, <strong>${completedCount}</strong> completate</span>
                <span class="summary-pct">${pct}%</span>
            </div>
            <div class="summary-progress">
                <div class="summary-progress-fill" style="width: ${pct}%"></div>
            </div>
        </div>
    `;
}

function createTaskCard(task, currentFilter) {
    const isCompleted = task.status === 'completed';
    const isDeleted = task.status === 'deleted';

    // Tag colore
    const tagColors = {
        'lavoro': '#4A90D9',
        'personale': '#50C878',
        'studio': '#9B59B6'
    };
    const tagColor = tagColors[task.tag] || '#888';

    // Priorità badge
    const priorityColors = {
        'alta': '#E53E3E',
        'media': '#F6AD55',
        'bassa': '#68D391'
    };

    // Date formatting
    let timeInfo = '';
    const calendarIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: text-bottom; margin-right: 4px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;

    if (task.task_giornaliera) {
        timeInfo = `<span class="task-badge daily">${calendarIcon} Giornaliera</span>`;
    } else if (task.inizio_data) {
        const d = new Date(task.inizio_data);
        timeInfo = `<span class="task-time">${calendarIcon} ${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`;
        if (task.inizio_ora) timeInfo += ` · ${task.inizio_ora.substring(0, 5)}`;
        timeInfo += '</span>';
    }

    // Verifica scadenza
    let expiredClass = '';
    if (task.status === 'pending' && task.fine_data) {
        const fineDate = new Date(task.fine_data);
        if (fineDate < new Date()) expiredClass = 'task-expired';
    }

    // Icone SVG
    const editIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
    const trashIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
    const restoreIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>`;
    const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="var(--success)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`;
    const circleIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>`;

    // Azioni
    let actions = '';
    if (isDeleted) {
        actions = `
            <button class="task-action-btn restore-btn" data-id="${task.id}" data-action="restore" title="Ripristina">${restoreIcon}</button>
            <button class="task-action-btn perm-delete-btn" data-id="${task.id}" data-action="permanentDelete" title="Elimina definitivamente">${trashIcon}</button>
        `;
    } else {
        actions = `
            <button class="task-action-btn complete-btn ${isCompleted ? 'completed' : ''}" data-id="${task.id}" data-action="${isCompleted ? 'uncomplete' : 'complete'}" title="${isCompleted ? 'Segna come non completata' : 'Completa'}">
                ${isCompleted ? checkIcon : circleIcon}
            </button>
            <button class="task-action-btn edit-btn" data-id="${task.id}" data-action="edit" title="Modifica">${editIcon}</button>
            <button class="task-action-btn delete-btn" data-id="${task.id}" data-action="delete" title="Elimina">${trashIcon}</button>
        `;
    }

    return `
        <div class="task-card shadow-4 ${expiredClass} ${isCompleted ? 'task-completed' : ''}" data-task-id="${task.id}">
            <div class="task-card-header">
                <div class="task-card-left">
                    ${task.tag ? `<span class="task-tag" style="background-color: ${tagColor}">${task.tag}</span>` : ''}
                    ${task.urgenza ? `<span class="task-priority" style="border: 1px solid ${priorityColors[task.urgenza]}; color: ${priorityColors[task.urgenza]}; background: transparent;">${task.urgenza}</span>` : ''}
                    ${task.priorita ? `<span class="task-priority" style="border: 1px solid ${priorityColors[task.priorita]}; color: ${priorityColors[task.priorita]}; background: transparent;">${task.priorita}</span>` : ''}
                </div>
                <div class="task-card-actions">${actions}</div>
            </div>
            <h3 class="task-title ${isCompleted ? 'line-through' : ''}">${escapeHtml(task.titolo)}</h3>
            ${task.dettagli ? `<p class="task-details">${escapeHtml(task.dettagli)}</p>` : ''}
            <div class="task-card-footer">
                ${timeInfo}
                <span class="task-genre">${task.genere === 'event' ? '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 2px;"><circle cx="12" cy="12" r="10"></circle><path d="M12 8l4 4-4 4M8 12h8"></path></svg> Evento' : '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 2px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Task'}</span>
            </div>
        </div>
    `;
}

async function handleTaskAction(e) {
    const btn = e.currentTarget;
    const taskId = btn.dataset.id;
    const action = btn.dataset.action;

    try {
        let response;
        switch (action) {
            case 'complete': {
                // Play completion animation
                const card = document.querySelector(`.task-card[data-task-id="${taskId}"]`);
                if (card) {
                    card.classList.add('completing');
                    spawnConfetti(card);
                }
                response = await fetch(`/api/tasks/${taskId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'completed' })
                });
                break;
            }
            case 'uncomplete':
                response = await fetch(`/api/tasks/${taskId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'pending' })
                });
                break;
            case 'delete':
                response = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
                break;
            case 'restore':
                response = await fetch(`/api/tasks/${taskId}/restore`, { method: 'PATCH' });
                break;
            case 'permanentDelete':
                response = await fetch(`/api/tasks/${taskId}/permanent`, { method: 'DELETE' });
                break;
            case 'edit':
                const task = allTasks.find(t => t.id == taskId) || calendarTasks?.find(t => t.id == taskId);
                if (task) openTaskEditor(task);
                return;
        }

        if (response && response.ok) {
            await loadTasks();
            window.dispatchEvent(new Event('taskUpdated'));
        } else {
            console.error('Errore nell\'azione task:', response?.status);
        }
    } catch (error) {
        console.error('Errore di rete:', error);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getEmptyIcon(filter) {
    const icons = {
        'all': '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        'pending': '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
        'completed': '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
        'expired': '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
        'deleted': '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>'
    };
    return icons[filter] || icons['all'];
}

function getEmptyMessage(filter) {
    const messages = {
        'all': 'Nessuna task per oggi. Rilassati!',
        'pending': 'Nessuna task in sospeso per oggi.',
        'completed': 'Nessuna task completata oggi.',
        'expired': 'Nessuna task scaduta oggi. Ottimo!',
        'deleted': 'Il cestino è vuoto.'
    };
    return messages[filter] || 'Nessuna task.';
}

// ==================== TASK EDITOR MODAL ====================
function openTaskEditor(task) {
    const existing = document.getElementById('task-editor-overlay');
    if (existing) existing.remove();

    const escAttr = (t) => t ? t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

    // SVG icons for editor
    const editSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
    const saveSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`;

    const overlay = document.createElement('div');
    overlay.id = 'task-editor-overlay';
    overlay.innerHTML = `
        <div class="note-editor-card" style="max-width:480px;">
            <h2 class="note-editor-title">${editSvg} Modifica Task</h2>
            <div class="form-section">
                <input type="text" id="edit-task-title" class="form-input" placeholder="Titolo" value="${escAttr(task.titolo)}">
            </div>
            <div class="form-section" style="display:flex;gap:8px;flex-wrap:wrap;">
                <select id="edit-task-tag" class="form-input" style="flex:1;min-width:120px;">
                    <option value="">Tag</option>
                    <option value="lavoro" ${task.tag === 'lavoro' ? 'selected' : ''}>Lavoro</option>
                    <option value="personale" ${task.tag === 'personale' ? 'selected' : ''}>Personale</option>
                    <option value="studio" ${task.tag === 'studio' ? 'selected' : ''}>Studio</option>
                </select>
                <select id="edit-task-urgenza" class="form-input" style="flex:1;min-width:120px;">
                    <option value="">Urgenza</option>
                    <option value="alta" ${task.urgenza === 'alta' ? 'selected' : ''}>Alta</option>
                    <option value="media" ${task.urgenza === 'media' ? 'selected' : ''}>Media</option>
                    <option value="bassa" ${task.urgenza === 'bassa' ? 'selected' : ''}>Bassa</option>
                </select>
                <select id="edit-task-priorita" class="form-input" style="flex:1;min-width:120px;">
                    <option value="">Priorità</option>
                    <option value="alta" ${task.priorita === 'alta' ? 'selected' : ''}>Alta</option>
                    <option value="media" ${task.priorita === 'media' ? 'selected' : ''}>Media</option>
                    <option value="bassa" ${task.priorita === 'bassa' ? 'selected' : ''}>Bassa</option>
                </select>
            </div>
            <div class="form-section" style="display:flex;gap:8px;">
                <input type="date" id="edit-task-inizio-data" class="form-input" value="${task.inizio_data ? task.inizio_data.split('T')[0] : ''}" style="flex:1;">
                <input type="time" id="edit-task-inizio-ora" class="form-input" value="${task.inizio_ora || ''}" style="flex:1;">
            </div>
            <div class="form-section" style="display:flex;gap:8px;">
                <input type="date" id="edit-task-fine-data" class="form-input" value="${task.fine_data ? task.fine_data.split('T')[0] : ''}" style="flex:1;">
                <input type="time" id="edit-task-fine-ora" class="form-input" value="${task.fine_ora || ''}" style="flex:1;">
            </div>
            <div class="form-section">
                <textarea id="edit-task-details" class="form-textarea" placeholder="Dettagli (opzionale)..." rows="3">${escapeHtml(task.dettagli || '')}</textarea>
            </div>
            <div class="note-editor-actions">
                <button type="button" id="task-editor-cancel" class="note-editor-btn note-editor-btn-cancel">Annulla</button>
                <button type="button" id="task-editor-save" class="note-editor-btn note-editor-btn-save">${saveSvg} Salva</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.getElementById('task-editor-cancel').addEventListener('click', () => overlay.remove());

    document.getElementById('task-editor-save').addEventListener('click', async () => {
        const newTitle = document.getElementById('edit-task-title').value.trim();
        if (!newTitle) {
            document.getElementById('edit-task-title').style.borderColor = 'var(--danger)';
            return;
        }

        const body = {
            titolo: newTitle,
            tag: document.getElementById('edit-task-tag').value || null,
            urgenza: document.getElementById('edit-task-urgenza').value || null,
            priorita: document.getElementById('edit-task-priorita').value || null,
            inizio_data: document.getElementById('edit-task-inizio-data').value || null,
            inizio_ora: document.getElementById('edit-task-inizio-ora').value || null,
            fine_data: document.getElementById('edit-task-fine-data').value || null,
            fine_ora: document.getElementById('edit-task-fine-ora').value || null,
            dettagli: document.getElementById('edit-task-details').value.trim() || null
        };

        try {
            const response = await fetch(`/api/tasks/${task.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (response.ok) {
                overlay.remove();
                await loadTasks();
                window.dispatchEvent(new Event('taskUpdated'));
                if (typeof showCustomAlert === 'function') showCustomAlert('Fatto!', 'Task aggiornata!');
            }
        } catch (err) {
            console.error('Errore aggiornamento task:', err);
        }
    });
}

// ==================== CONFETTI ANIMATION ====================
function spawnConfetti(card) {
    const colors = ['#E8A849', '#50C878', '#4A90D9', '#9B59B6', '#E53E3E', '#F6AD55'];
    const rect = card.getBoundingClientRect();
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = (rect.left + rect.width / 2) + 'px';
    container.style.top = (rect.top + rect.height / 2) + 'px';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '9999';
    document.body.appendChild(container);

    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.className = 'confetti';
        const angle = (i / 8) * Math.PI * 2;
        const dist = 30 + Math.random() * 20;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        particle.style.backgroundColor = colors[i % colors.length];
        particle.style.left = '0px';
        particle.style.top = '0px';
        particle.style.width = (6 + Math.random() * 4) + 'px';
        particle.style.height = (6 + Math.random() * 4) + 'px';
        particle.style.animation = `confettiPop 0.6s ease-out forwards`;
        particle.style.transform = `translate(${x}px, ${y}px)`;
        container.appendChild(particle);
    }

    setTimeout(() => container.remove(), 800);
}

// ==================== UPCOMING EVENTS WIDGET ====================
function renderUpcomingWidget() {
    const widgetEl = document.getElementById('upcoming-widget');
    if (!widgetEl) return;

    const filter = localStorage.getItem("filterActive") || "all";
    if (filter !== 'all') {
        widgetEl.innerHTML = '';
        return;
    }

    const now = new Date();
    const tagColors = { 'lavoro': '#4A90D9', 'personale': '#50C878', 'studio': '#9B59B6' };
    const calSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;

    // Get next 3 future tasks/events (non-deleted, with a date)
    const upcoming = allTasks
        .filter(t => t.genere !== 'note' && t.status === 'pending' && !isTaskForToday(t))
        .filter(t => {
            if (t.inizio_data) return new Date(t.inizio_data) > now;
            if (t.fine_data) return new Date(t.fine_data) > now;
            return false;
        })
        .sort((a, b) => {
            const da = new Date(a.inizio_data || a.fine_data);
            const db = new Date(b.inizio_data || b.fine_data);
            return da - db;
        })
        .slice(0, 3);

    if (upcoming.length === 0) {
        widgetEl.innerHTML = '';
        return;
    }

    const arrowSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 8 16 12 12 16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`;

    let cards = upcoming.map(t => {
        const date = new Date(t.inizio_data || t.fine_data);
        const dateStr = date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
        const timeStr = t.inizio_ora ? ` · ${t.inizio_ora.substring(0, 5)}` : '';
        const tagHtml = t.tag ? `<span class="upcoming-card-tag" style="background:${tagColors[t.tag] || '#888'}">${t.tag}</span>` : '';

        return `
            <div class="upcoming-card">
                <div class="upcoming-card-title">${escapeHtml(t.titolo)}</div>
                <div class="upcoming-card-time">${calSvg} ${dateStr}${timeStr}</div>
                ${tagHtml}
            </div>`;
    }).join('');

    widgetEl.innerHTML = `
        <div class="upcoming-title">${arrowSvg} Prossimi</div>
        <div class="upcoming-list">${cards}</div>
    `;
}

// ==================== SWIPE ACTIONS (Mobile) ====================
function initSwipeActions() {
    if (!('ontouchstart' in window)) return; // Only on touch devices

    const cards = document.querySelectorAll('.task-card');
    cards.forEach(card => {
        let startX = 0, currentX = 0, isSwiping = false;
        const taskId = card.dataset.taskId;
        const threshold = 80;

        card.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            currentX = startX;
            isSwiping = true;
            card.style.transition = 'none';
        }, { passive: true });

        card.addEventListener('touchmove', (e) => {
            if (!isSwiping) return;
            currentX = e.touches[0].clientX;
            const diff = currentX - startX;

            // Limit max movement
            if (Math.abs(diff) > 120) return;

            card.style.transform = `translateX(${diff}px)`;

            // Visual feedback
            if (diff > threshold) {
                card.style.borderLeftColor = 'var(--success)';
            } else if (diff < -threshold) {
                card.style.borderLeftColor = 'var(--danger)';
            } else {
                card.style.borderLeftColor = '';
            }
        }, { passive: true });

        card.addEventListener('touchend', async () => {
            if (!isSwiping) return;
            isSwiping = false;
            const diff = currentX - startX;
            card.style.transition = 'transform 0.3s ease, border-left-color 0.3s';
            card.style.transform = '';
            card.style.borderLeftColor = '';

            if (diff > threshold && taskId) {
                // Swipe right → Complete
                const task = allTasks.find(t => t.id == taskId);
                if (task && task.status === 'pending') {
                    spawnConfetti(card);
                    card.classList.add('completing');
                    await fetch(`/api/tasks/${taskId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'completed' })
                    });
                    setTimeout(() => loadTasks(), 500);
                    window.dispatchEvent(new Event('taskUpdated'));
                }
            } else if (diff < -threshold && taskId) {
                // Swipe left → Delete
                await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
                setTimeout(() => loadTasks(), 300);
                window.dispatchEvent(new Event('taskUpdated'));
            }
        });
    });
}
