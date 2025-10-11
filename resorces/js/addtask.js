document.addEventListener("DOMContentLoaded", () => {
    const inputTask = document.querySelectorAll('.task');
    const inputNote = document.querySelector('.input-group-note');
    const select = document.getElementById('genere');
    function aggiornaVisibilita(){
        const valore = select.value;
        if(valore === 'note'){
            inputTask.forEach(el=>{el.classList.add('hide');});
            inputNote.classList.remove('hide');            
        }else{
            inputTask.forEach(el=>{el.classList.remove('hide');});
            inputNote.classList.add('hide');
        }
    }
    aggiornaVisibilita();
    select.addEventListener('change', aggiornaVisibilita);
});