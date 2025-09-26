function getMainSelection(){
    let mainSelection = localStorage.getItem("mainSelection");
    if(!mainSelection){
        localStorage.setItem("mainSelection","today.html");
    }
    mainSelection = localStorage.getItem("mainSelection");
    fetch(mainSelection).then(response => response.text()).then(date => {document.querySelector('main').innerHTML = date});
}
function setMainSelection(nameFile){
    localStorage.setItem("mainSelection",nameFile+".html");
}