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
    addTask.addEventListener('click', () => {
        svgIcon.classList.toggle('rotate-45');
        task_form_container.classList.toggle('hide');
    });

});