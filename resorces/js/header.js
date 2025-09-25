document.addEventListener('DOMContentLoaded', (event) => {
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
});