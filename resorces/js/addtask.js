document.addEventListener("DOMContentLoaded", () => {
    const inputTask = document.querySelectorAll('.task');
    const inputNote = document.querySelector('.input-group-note');
    const select = document.getElementById('genere');

    const taskGiornaliera = document.getElementById('taskGiornaliera');
    const inputToday = document.querySelectorAll('.task-today');
    const inputPriority = document.getElementById('input-priority');

    const inGiornata = document.getElementById('inGiornata');
    const endTask = document.querySelectorAll('.end-task');

    function aggiornaVisibilita() {
        const valore = select.value;

        if(valore === 'note') {
            inputTask.forEach(el => el.classList.add('hide'));
            inputNote.classList.remove('hide');
        } else {
            inputTask.forEach(el => el.classList.remove('hide'));
            inputNote.classList.add('hide');

            if(taskGiornaliera.checked) {
                inputToday.forEach(el => el.classList.add('hide'));
                endTask.forEach(el => el.classList.add('hide'));
                inputPriority.classList.remove('hide');
            } else {
                inputToday.forEach(el => el.classList.remove('hide'));
                inputPriority.classList.add('hide');

                if(inGiornata.checked) {
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
});
