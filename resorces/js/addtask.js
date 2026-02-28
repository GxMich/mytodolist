document.addEventListener("DOMContentLoaded", () => {
    const inputTask = document.querySelectorAll('.task');
    const inputNote = document.querySelector('.input-group-note');
    const select = document.getElementById('genere');

    const taskGiornaliera = document.getElementById('taskGiornaliera');
    const inputToday = document.querySelectorAll('.task-today');
    const inputPriority = document.getElementById('input-priority');

    const inGiornata = document.getElementById('inGiornata');
    const endTask = document.querySelectorAll('.end-task');

    const taskForm = document.getElementById('taskForm');

    // Elementi con required dinamico
    const tagField = document.getElementById('tag');
    const categoriaField = document.getElementById('categoria');
    const urgenzaField = document.getElementById('urgenza');
    const prioritaField = document.getElementById('priorita');

    // ==================== SEGMENTED CONTROL ====================
    const genereControl = document.getElementById('genere-control');
    if (genereControl) {
        genereControl.addEventListener('click', (e) => {
            const segment = e.target.closest('.segment');
            if (!segment) return;
            // Update active state
            genereControl.querySelectorAll('.segment').forEach(s => s.classList.remove('active'));
            segment.classList.add('active');
            // Sync with hidden select
            select.value = segment.dataset.value;
            select.dispatchEvent(new Event('change'));
        });
    }

    // ==================== PILL SELECTORS ====================
    function setupPillSelector(selectorId, selectId) {
        const container = document.getElementById(selectorId);
        const hiddenSelect = document.getElementById(selectId);
        if (!container || !hiddenSelect) return;

        container.addEventListener('click', (e) => {
            const pill = e.target.closest('.pill');
            if (!pill) return;
            // Toggle: if already active, deselect; otherwise select
            const wasActive = pill.classList.contains('active');
            container.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            if (!wasActive) {
                pill.classList.add('active');
                hiddenSelect.value = pill.dataset.value;
            } else {
                hiddenSelect.value = '';
            }
        });
    }

    setupPillSelector('tag-selector', 'tag');
    setupPillSelector('categoria-selector', 'categoria');
    setupPillSelector('urgenza-selector', 'urgenza');
    setupPillSelector('priorita-selector', 'priorita');

    // ==================== VISIBILITY LOGIC ====================
    function aggiornaVisibilita() {
        const valore = select.value;

        if (valore === 'note') {
            inputTask.forEach(el => el.classList.add('hide'));
            inputNote.classList.remove('hide');
            if (tagField) tagField.required = false;
            if (urgenzaField) urgenzaField.required = false;
            if (prioritaField) prioritaField.required = false;
            if (categoriaField) categoriaField.required = true;
        } else {
            inputTask.forEach(el => el.classList.remove('hide'));
            inputNote.classList.add('hide');
            if (tagField) tagField.required = true;
            if (categoriaField) categoriaField.required = false;

            if (taskGiornaliera.checked) {
                inputToday.forEach(el => el.classList.add('hide'));
                endTask.forEach(el => el.classList.add('hide'));
                inputPriority.classList.remove('hide');
                if (urgenzaField) urgenzaField.required = true;
                if (prioritaField) prioritaField.required = true;
            } else {
                inputToday.forEach(el => el.classList.remove('hide'));
                inputPriority.classList.add('hide');
                if (urgenzaField) urgenzaField.required = false;
                if (prioritaField) prioritaField.required = false;

                if (inGiornata.checked) {
                    endTask.forEach(el => el.classList.add('hide'));
                } else {
                    endTask.forEach(el => el.classList.remove('hide'));
                }
            }
        }
    }

    taskGiornaliera.addEventListener('change', aggiornaVisibilita);
    inGiornata.addEventListener('change', aggiornaVisibilita);
    select.addEventListener('change', aggiornaVisibilita);

    aggiornaVisibilita();

    // ==================== RESET PILLS ON FORM RESET ====================
    function resetPills() {
        document.querySelectorAll('.pill-selector .pill').forEach(p => p.classList.remove('active'));
        // Reset segmented control to first (Task)
        if (genereControl) {
            genereControl.querySelectorAll('.segment').forEach(s => s.classList.remove('active'));
            const firstSegment = genereControl.querySelector('.segment');
            if (firstSegment) firstSegment.classList.add('active');
        }
    }

    // ==================== SUBMIT TASK ====================
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const genere = document.getElementById('genere').value;
        const titolo = document.getElementById('titolo').value.trim();

        if (!titolo || !genere) {
            showCustomAlert('Errore', 'Compila almeno il titolo e il genere.');
            return;
        }

        const taskData = {
            titolo,
            genere,
            dettagli: document.getElementById('dettagli').value.trim() || null,
        };

        if (genere === 'note') {
            taskData.categoria = document.getElementById('categoria').value || null;
        } else {
            taskData.tag = document.getElementById('tag').value || null;
            taskData.taskGiornaliera = taskGiornaliera.checked;

            if (taskGiornaliera.checked) {
                taskData.urgenza = document.getElementById('urgenza').value || null;
                taskData.priorita = document.getElementById('priorita').value || null;
            } else {
                taskData.inizioOra = document.getElementById('inizioOra').value || null;
                taskData.inizioData = document.getElementById('inizioData').value || null;
                taskData.inGiornata = inGiornata.checked;

                if (!inGiornata.checked) {
                    taskData.fineOra = document.getElementById('fineOra').value || null;
                    taskData.fineData = document.getElementById('fineData').value || null;
                }
            }
        }

        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });

            const result = await response.json();

            if (response.ok) {
                showCustomAlert('Fatto! ✅', 'Task salvata con successo!');
                taskForm.reset();
                resetPills();
                aggiornaVisibilita();

                // Chiudi il form e ricarica le task
                if (typeof window.closeTaskForm === 'function') {
                    window.closeTaskForm();
                }

                // Ricarica la pagina corrente per aggiornare la lista
                if (typeof getMainSelection === 'function') {
                    getMainSelection();
                }
                // Notifica il sistema di task rendering
                window.dispatchEvent(new CustomEvent('taskUpdated'));
            } else {
                showCustomAlert('Errore', result.error || 'Errore nel salvataggio.');
            }
        } catch (error) {
            console.error('Errore di rete:', error);
            showCustomAlert('Errore', 'Impossibile connettersi al server.');
        }
    });
});

function showCustomAlert(title, message) {
    // Rimuovi alert precedente se esiste
    const existing = document.getElementById('custom-alert-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'custom-alert-overlay';
    overlay.innerHTML = `
        <div id="custom-alert-card">
            <h3>${title}</h3>
            <p>${message}</p>
            <button id="alert-close-button">OK</button>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('alert-close-button').addEventListener('click', () => {
        overlay.remove();
    });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}
