function getMainSelection(){
    const container = document.querySelector('main');
    let mainSelection = localStorage.getItem("mainSelection");
    if(!mainSelection){
        localStorage.setItem("mainSelection","today.html");
    }
    mainSelection = localStorage.getItem("mainSelection");
    fetch(mainSelection).then(response => response.text()).then(date => {container.innerHTML = date});
    return mainSelection;
}
function setMainSelection(nameFile){
    localStorage.setItem("mainSelection",nameFile+".html");
}