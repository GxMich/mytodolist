function startFilterObserver() {
    const main = document.querySelector("main");

    const observer = new MutationObserver(() => {
        const filters = document.querySelectorAll(".filter-card");
        if (filters.length > 0) {
            observer.disconnect();
            initFilterSystem(filters);
        }
    });

    observer.observe(main, { childList: true, subtree: true });
}

document.addEventListener("DOMContentLoaded", () => {
    startFilterObserver();
    const originalGetMainSelection = getMainSelection;
    window.getMainSelection = function (...args) {
        const result = originalGetMainSelection.apply(this, args);
        setTimeout(startFilterObserver, 100);
        return result;
    };
});

function initFilterSystem(filters) {
    let filterActive = localStorage.getItem("filterActive") || "all";
    localStorage.setItem("filterActive", filterActive);

    filters.forEach(f => f.classList.remove("active"));
    document.getElementById(filterActive)?.classList.add("active");

    filters.forEach(el => {
        el.addEventListener("click", () => {
            filters.forEach(f => f.classList.remove("active"));
            el.classList.add("active");
            localStorage.setItem("filterActive", el.id);
        });
    });
}
