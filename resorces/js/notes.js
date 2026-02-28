// ==================== NOTES PAGE ====================
function startNotesObserver() {
    const main = document.querySelector("main");
    const observer = new MutationObserver(() => {
        const notesList = document.getElementById("notes-list");
        if (notesList) {
            observer.disconnect();
            loadNotes();
        }
    });
    observer.observe(main, { childList: true, subtree: true });
}

document.addEventListener("DOMContentLoaded", () => {
    startNotesObserver();
    const originalGetMainSelection = getMainSelection;
    const wrapped = window.getMainSelection;
    window.getMainSelection = function (...args) {
        const result = (wrapped || originalGetMainSelection).apply(this, args);
        setTimeout(startNotesObserver, 100);
        return result;
    };

    window.addEventListener('taskUpdated', () => {
        setTimeout(() => {
            const notesList = document.getElementById("notes-list");
            if (notesList) loadNotes();
        }, 200);
    });
});

async function loadNotes() {
    const notesList = document.getElementById("notes-list");
    if (!notesList) return;

    try {
        const response = await fetch('/api/tasks');
        if (!response.ok) return;
        const data = await response.json();
        const notes = (data.tasks || []).filter(t => t.genere === 'note' && t.status !== 'deleted');

        if (notes.length === 0) {
            notesList.innerHTML = `
                <div class="empty-state">
                    <p class="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></p>
                    <p class="empty-text">Nessuna nota. Creane una dal bottone +!</p>
                </div>`;
            return;
        }

        notesList.innerHTML = notes.map(note => {
            const catColors = {
                'progetti': '#4A90D9',
                'idee': '#F6AD55',
                'bussines': '#50C878',
                'obbietivi': '#E53E3E'
            };
            const catColor = catColors[note.categoria] || '#9B59B6';
            const data = new Date(note.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });

            return `
                <div class="note-card" data-note-id="${note.id}">
                    <div class="note-card-header">
                        ${note.categoria ? `<span class="note-categoria" style="background-color: ${catColor}">${note.categoria}</span>` : ''}
                        <div class="task-card-actions">
                            <button class="task-action-btn edit-note-btn" data-id="${note.id}" data-title="${escapeAttr(note.titolo)}" data-details="${escapeAttr(note.dettagli || '')}" title="Modifica"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                            <button class="task-action-btn delete-btn" data-id="${note.id}" data-action="deleteNote" title="Elimina"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                        </div>
                    </div>
                    <h3 class="note-title">${escapeHtmlNote(note.titolo)}</h3>
                    ${note.dettagli ? `<p class="note-content">${escapeHtmlNote(note.dettagli)}</p>` : ''}
                    <div class="note-footer">${data}</div>
                </div>
            `;
        }).join('');

        // Event listeners per eliminare note
        notesList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const noteId = e.currentTarget.dataset.id;
                try {
                    const response = await fetch(`/api/tasks/${noteId}`, { method: 'DELETE' });
                    if (response.ok) loadNotes();
                } catch (err) {
                    console.error('Errore eliminazione nota:', err);
                }
            });
        });

        // Event listeners per modificare note
        notesList.querySelectorAll('.edit-note-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noteId = e.currentTarget.dataset.id;
                const title = e.currentTarget.dataset.title;
                const details = e.currentTarget.dataset.details;
                openNoteEditor(noteId, title, details);
            });
        });

    } catch (error) {
        console.error('Errore caricamento note:', error);
    }
}

// ==================== NOTE EDITOR MODAL ====================
function openNoteEditor(noteId, currentTitle, currentDetails) {
    // Remove existing editor if present
    const existing = document.getElementById('note-editor-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'note-editor-overlay';
    overlay.innerHTML = `
        <div class="note-editor-card">
            <h2 class="note-editor-title">Modifica Nota</h2>
            <div class="form-section">
                <input type="text" id="edit-note-title" class="form-input" placeholder="Titolo" value="${escapeAttr(currentTitle)}">
            </div>
            <div class="form-section">
                <textarea id="edit-note-details" class="form-textarea" placeholder="Dettagli (opzionale)..." rows="5">${escapeHtmlNote(currentDetails)}</textarea>
            </div>
            <div class="note-editor-actions">
                <button type="button" id="note-editor-cancel" class="note-editor-btn note-editor-btn-cancel">Annulla</button>
                <button type="button" id="note-editor-save" class="note-editor-btn note-editor-btn-save">Salva</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    // Cancel button
    document.getElementById('note-editor-cancel').addEventListener('click', () => {
        overlay.remove();
    });

    // Save button
    document.getElementById('note-editor-save').addEventListener('click', async () => {
        const newTitle = document.getElementById('edit-note-title').value.trim();
        const newDetails = document.getElementById('edit-note-details').value.trim();

        if (!newTitle) {
            document.getElementById('edit-note-title').style.borderColor = 'var(--danger)';
            return;
        }

        try {
            const response = await fetch(`/api/tasks/${noteId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ titolo: newTitle, dettagli: newDetails || null })
            });

            if (response.ok) {
                overlay.remove();
                loadNotes();
                if (typeof showCustomAlert === 'function') {
                    showCustomAlert('Fatto! ✅', 'Nota aggiornata con successo!');
                }
            } else {
                if (typeof showCustomAlert === 'function') {
                    showCustomAlert('Errore', 'Errore durante il salvataggio.');
                }
            }
        } catch (err) {
            console.error('Errore aggiornamento nota:', err);
            if (typeof showCustomAlert === 'function') {
                showCustomAlert('Errore', 'Impossibile connettersi al server.');
            }
        }
    });
}

function escapeHtmlNote(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeAttr(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
