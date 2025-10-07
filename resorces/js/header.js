document.addEventListener('DOMContentLoaded', (event) => {
    function getDay(date) {
        const inizioAnno = new Date(date.getFullYear(), 0, 1);
        const millisecondiInUnGiorno = 1000 * 60 * 60 * 24;
        const differenzaTempo = date.getTime() - inizioAnno.getTime();
        return Math.floor(differenzaTempo / millisecondiInUnGiorno) + 1;
    }

    async function motivationalPharases(){
        try{
            const response = await fetch('./resorces/json/frasi.json');
            if(!response.ok){
                throw new Error(`Errore di rete: ${response.status}`);
            }
            const pharases = await response.json();
            const day = (getDay(new Date()) - 1) % pharases.length;
            const pharaseDay = pharases[day];
            return pharaseDay;
        }catch(error){
            return "Non c'è ispirazione oggi, ma crea la tua!";
        }
    }

    async function getKeywords(){
        try{
            const response = await fetch('./resorces/json/keywords.json');
            if(!response.ok){
                throw new Error(`Errore di rete: ${response.status}`);
            }
            const keywordsObj = await response.json();
            const keywordsArray = Object.values(keywordsObj);
            const day = (getDay(new Date()) - 1) % keywordsArray.length;
            const keywordsToday = keywordsArray[day];
            return keywordsToday;
        }catch(error){
            return "non disponibile";
        }
    }

    async function viewPharase(){
        const pharase = await motivationalPharases();
        const elementPharase = document.getElementById('user-quote');
        if(elementPharase){
            elementPharase.textContent = `"${pharase}"`;
        }
    }

    async function getKeywordsToday() {
        const keywords = await getKeywords(); 
        if (!Array.isArray(keywords) || keywords.length < 3) {
            console.error("Errore: Dati keyword insufficienti o non validi.");
            return;
        }
        const keywordData = [keywords[0], keywords[1], keywords[2]];
        const keywordDivs = [
            document.getElementById('keyword-01'),
            document.getElementById('keyword-02'),
            document.getElementById('keyword-03')
        ];        
        const infoKeywordContainers = [
            document.getElementById('info-keyword-01'),
            document.getElementById('info-keyword-02'),
            document.getElementById('info-keyword-03')
        ];       
        keywordData.forEach((data, index) => {
            const divElement = keywordDivs[index]; 
            const infoContainer = infoKeywordContainers[index];             
            if (divElement) {                
                divElement.querySelector('p').textContent = data.parola;
            }            
            if (infoContainer) {                
                const titoloH3 = infoContainer.querySelector('.keyword-title');
                const sottotitoloH5 = infoContainer.querySelector('h5'); 
                const paragrafoP = infoContainer.querySelector('.keyword-info');                
                if (titoloH3) titoloH3.textContent = data.parola;
                if (sottotitoloH5) sottotitoloH5.textContent = data.traduzione;
                if (paragrafoP) paragrafoP.textContent = data.significato;
            }
        });
    }
    viewPharase();
    getKeywordsToday();

    const keywords = document.querySelectorAll('.keyword');
    const infoKeywords = document.querySelectorAll('.info-keyword');

    keywords.forEach(keyword => {
        keyword.addEventListener('click', function() {
            const currentKeyword = this;
            const wasSelected = currentKeyword.classList.contains('selected');
            const keywordId = currentKeyword.id; 
            const infoId = keywordId.replace('keyword', 'info-keyword');
            const correspondingInfo = document.getElementById(infoId);
            keywords.forEach(k => k.classList.remove('selected'));
            infoKeywords.forEach(info => info.classList.add('hide'));
            if (!wasSelected) {
                currentKeyword.classList.add('selected');
                if (correspondingInfo) {
                    correspondingInfo.classList.remove('hide');
                }
            }
        });
    });
    infoKeywords.forEach(info => {
        info.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.add('hide');
                keywords.forEach(k => k.classList.remove('selected'));
            }
        });
    });

});
