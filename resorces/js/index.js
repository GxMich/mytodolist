document.addEventListener('DOMContentLoaded', (event) => {
    let  mainSelection = getMainSelection();
    const iconsNavBar = document.querySelectorAll('.navbar-icon-main-page');
    iconsNavBar.forEach(icon =>{
        icon.addEventListener('click', function(){
            const id = this.id;
            const icons = document.querySelectorAll('.navbar-icon-main-page');
            icons.forEach(el => {
                el.classList.remove('selected');
            });
            icon.classList.add('selected');
            setMainSelection(id);
            mainSelection = getMainSelection();
        });
    });
    const idMainSelection = mainSelection.replace(".html","");
    document.getElementById(idMainSelection).classList.add('selected');
    const addTask = document.getElementById('addTask');
    const svgIcon = addTask.querySelector('svg');
    const task_form_container = document.getElementById('task-form-container');
    
    // Seleziona gli elementi da sfocare
    const header = document.querySelector('header');
    const main = document.querySelector('main');
    
    addTask.addEventListener('click', () => {
        svgIcon.classList.toggle('rotate-45');
        task_form_container.classList.toggle('hide');
        
        // Attiva/disattiva la classe blur sullo sfondo
        header.classList.toggle('blur-background');
        main.classList.toggle('blur-background');
    });

});