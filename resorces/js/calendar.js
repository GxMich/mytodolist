// ==================== CALENDAR PAGE ====================
let calendarTasks = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;

function startCalendarObserver() {
    const main = document.querySelector("main");
    const observer = new MutationObserver(() => {
        const calGrid = document.getElementById("calendarGrid");
        if (calGrid) {
            observer.disconnect();
            initCalendar();
        }
    });
    observer.observe(main, { childList: true, subtree: true });
}

document.addEventListener("DOMContentLoaded", () => {
    startCalendarObserver();
    const originalGetMainSelection = getMainSelection;
    const wrapped = window.getMainSelection;
    window.getMainSelection = function (...args) {
        const result = (wrapped || originalGetMainSelection).apply(this, args);
        setTimeout(startCalendarObserver, 100);
        return result;
    };

    window.addEventListener('taskUpdated', () => {
        setTimeout(() => {
            if (document.getElementById("calendarGrid")) {
                loadCalendarTasks();
            }
        }, 200);
    });
});

let calendarInitialized = false;

async function initCalendar() {
    if (!calendarInitialized) {
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                currentMonth--;
                if (currentMonth < 0) { currentMonth = 11; currentYear--; }
                renderCalendar();
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                currentMonth++;
                if (currentMonth > 11) { currentMonth = 0; currentYear++; }
                renderCalendar();
            });
        }
        calendarInitialized = true;
    }

    await loadCalendarTasks();
}

async function loadCalendarTasks() {
    try {
        const response = await fetch('/api/tasks');
        if (!response.ok) return;
        const data = await response.json();
        calendarTasks = (data.tasks || []).filter(t => t.status !== 'deleted' && t.genere !== 'note');
        renderCalendar();
    } catch (error) {
        console.error('Errore caricamento task calendario:', error);
    }
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const title = document.getElementById('calendarTitle');
    if (!grid || !title) return;

    const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    const giorniNomi = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

    title.textContent = `${mesi[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDay = (firstDay.getDay() + 6) % 7; // Lunedì = 0
    const daysInMonth = lastDay.getDate();
    const today = new Date();

    let html = giorniNomi.map(g => `<div class="calendar-day-name">${g}</div>`).join('');

    // Giorni del mese precedente
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
        html += `<div class="calendar-day other-month">${prevMonthLastDay - i}</div>`;
    }

    // Giorni del mese corrente
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isToday = today.getDate() === d && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
        const hasTasks = calendarTasks.some(t => {
            if (t.inizio_data) {
                const td = new Date(t.inizio_data);
                return td.getDate() === d && td.getMonth() === currentMonth && td.getFullYear() === currentYear;
            }
            return false;
        });
        const isSelected = selectedDate === dateStr;

        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        if (hasTasks) classes += ' has-tasks';
        if (isSelected) classes += ' selected';

        html += `<div class="${classes}" data-date="${dateStr}">${d}</div>`;
    }

    // Giorni del mese successivo
    const totalCells = startDay + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remaining; i++) {
        html += `<div class="calendar-day other-month">${i}</div>`;
    }

    grid.innerHTML = html;

    // Click sui giorni
    grid.querySelectorAll('.calendar-day:not(.other-month)').forEach(day => {
        day.addEventListener('click', () => {
            selectedDate = day.dataset.date;
            renderCalendar();
            showDayTasks(selectedDate);
        });
    });

    // Se c'è una data selezionata, mostra le task
    if (selectedDate) {
        showDayTasks(selectedDate);
    }
}

function showDayTasks(dateStr) {
    const container = document.getElementById('calendarTasks');
    if (!container) return;

    const dayTasks = calendarTasks.filter(t => {
        if (t.inizio_data) {
            const td = new Date(t.inizio_data);
            const taskDateStr = `${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, '0')}-${String(td.getDate()).padStart(2, '0')}`;
            return taskDateStr === dateStr;
        }
        return false;
    });

    const d = new Date(dateStr);
    const dateFormatted = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

    if (dayTasks.length === 0) {
        container.innerHTML = `<h3 style="margin-bottom:15px; font-size:1.1rem; color:var(--text-primary);">📅 ${dateFormatted}</h3>
            <div class="empty-state">
                <p class="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></p>
                <p class="empty-text" style="color:var(--text-secondary);">Nessuna task in questo giorno.</p>
            </div>`;
        return;
    }

    container.innerHTML = `<h3 style="margin-bottom:15px; font-size:1.1rem; color:var(--text-primary);">📅 ${dateFormatted}</h3>` + dayTasks.map(task => createTaskCard(task, 'all')).join('');

    container.querySelectorAll('.task-action-btn').forEach(btn => {
        btn.addEventListener('click', handleTaskAction);
    });
}

function escapeHtmlCal(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
