'use strict';
(() => {
    const catalog = document.getElementById('map-catalog');
    if (!catalog) return;

    const links = [...catalog.querySelectorAll('.map-entry')];
    const pointerHover = window.matchMedia('(hover: hover) and (pointer: fine)');
    let hovered = null;
    let focused = null;
    let emphasized = null;

    // 三列、三行的权重总和保持 3，网格总尺寸不会变化。
    function updateEmphasis() {
        const link = hovered || focused;
        if (link === emphasized) return;
        emphasized = link;
        const index = links.indexOf(link);
        catalog.classList.toggle('is-engaged', index !== -1);
        links.forEach(entry => entry.classList.toggle('is-emphasized', entry === link));

        for (let track = 0; track < 3; track++) {
            if (index === -1) {
                catalog.style.removeProperty(`--map-col-${track + 1}`);
                catalog.style.removeProperty(`--map-row-${track + 1}`);
            } else {
                catalog.style.setProperty(`--map-col-${track + 1}`, `${index % 3 === track ? 1.24 : 0.88}fr`);
                catalog.style.setProperty(`--map-row-${track + 1}`, `${Math.floor(index / 3) === track ? 1.24 : 0.88}fr`);
            }
        }
    }

    links.forEach(link => link.addEventListener('pointerenter', () => {
        if (!pointerHover.matches) return;
        hovered = link;
        updateEmphasis();
    }));

    function clearHover() {
        hovered = null;
        updateEmphasis();
    }

    catalog.addEventListener('pointerleave', clearHover);
    catalog.addEventListener('pointercancel', clearHover);
    pointerHover.addEventListener('change', clearHover);

    catalog.addEventListener('focusin', event => {
        focused = event.target.closest('.map-entry');
        hovered = null;
        updateEmphasis();
    });
    catalog.addEventListener('focusout', event => {
        focused = links.includes(event.relatedTarget) ? event.relatedTarget : null;
        updateEmphasis();
    });
    window.addEventListener('blur', clearHover);
    window.addEventListener('pageshow', () => {
        hovered = null;
        focused = links.includes(document.activeElement) ? document.activeElement : null;
        updateEmphasis();
    });
})();
