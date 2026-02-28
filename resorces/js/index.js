document.addEventListener('DOMContentLoaded', (event) => {
    let mainSelection = getMainSelection();
    const iconsNavBar = document.querySelectorAll('.navbar-icon-main-page');
    iconsNavBar.forEach(icon => {
        icon.addEventListener('click', function () {
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
    const idMainSelection = mainSelection.replace(".html", "");
    document.getElementById(idMainSelection).classList.add('selected');
    const addTask = document.getElementById('addTask');
    const svgIcon = addTask.querySelector('svg');
    const task_form_container = document.getElementById('task-form-container');
    const header = document.querySelector('header');
    const main = document.querySelector('main');

    function openForm() {
        svgIcon.classList.add('rotate-45');
        task_form_container.classList.remove('hide');
        header.classList.add('blur-background');
        main.classList.add('blur-background');
    }

    function closeForm() {
        svgIcon.classList.remove('rotate-45');
        task_form_container.classList.add('hide');
        header.classList.remove('blur-background');
        main.classList.remove('blur-background');
    }

    // Expose closeForm globally so addtask.js can use it
    window.closeTaskForm = closeForm;

    addTask.addEventListener('click', () => {
        const isOpen = !task_form_container.classList.contains('hide');
        if (isOpen) {
            closeForm();
        } else {
            openForm();
        }
    });

});