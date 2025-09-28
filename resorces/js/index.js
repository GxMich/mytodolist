document.addEventListener('DOMContentLoaded', (event) => {
    let  mainSelection = getMainSelection();
    const iconsNavBar = document.querySelectorAll('.navbar-icon');
    iconsNavBar.forEach(icon =>{
        icon.addEventListener('click', function(){
            const id = this.id;
            const icons = document.querySelectorAll('.navbar-icon');
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
});