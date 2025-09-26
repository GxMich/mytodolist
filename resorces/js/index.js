getMainSelection();
document.addEventListener('DOMContentLoaded', (event) => {
    const iconsNavBar = document.querySelectorAll('.navbar-icon');
    iconsNavBar.forEach(icon =>{
        icon.addEventListener('click', function(){
            const id = this.id;
            setMainSelection(id);
            getMainSelection();
        });
    });
});