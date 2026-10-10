/* 全站导航与滚动显隐。主题、音乐、搜索和媒体查看由 React 岛屿负责。 */
(function () {
    "use strict";

    const root = document.documentElement;
    const focusableSelector = "a[href], button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex='-1'])";
    const visibleControls = container => [...container.querySelectorAll(focusableSelector)]
        .filter(element => !element.inert && element.getClientRects().length && getComputedStyle(element).visibility !== "hidden");

    function initNavigation() {
        const header = document.querySelector(".site-header");
        if (!header) return;
        const hover = window.matchMedia("(hover: hover) and (pointer: fine)");
        const items = [...header.querySelectorAll(".nav-item")];
        function setOpen(item, open) {
            item.classList.toggle("is-open", open);
            item.querySelector(".nav-trigger")?.setAttribute("aria-expanded", String(open));
            const dropdown = item.querySelector(".nav-dropdown");
            if (dropdown) dropdown.inert = !open;
        }
        function closeAll(except) { items.forEach(item => { if (item !== except) setOpen(item, false); }); }
        function open(item) { closeAll(item); setOpen(item, true); }
        items.forEach((item, index) => {
            const button = item.querySelector(".nav-trigger");
            const dropdown = item.querySelector(".nav-dropdown");
            if (!button || !dropdown) return;
            item.dataset.navReady = "";
            dropdown.id ||= "site-navigation-" + (index + 1);
            button.setAttribute("aria-controls", dropdown.id);
            setOpen(item, false);
            button.addEventListener("click", () => {
                if (item.classList.contains("is-open")) setOpen(item, false);
                else open(item);
            });
            item.addEventListener("pointerenter", event => {
                if (event.pointerType === "mouse" && hover.matches) open(item);
            });
            item.addEventListener("pointerleave", event => {
                if (event.pointerType === "mouse" && !dropdown.contains(document.activeElement)) setOpen(item, false);
            });
            item.addEventListener("focusout", event => {
                if (!item.contains(event.relatedTarget)) setOpen(item, false);
            });
            item.addEventListener("keydown", event => {
                if (event.key === "Escape" && item.classList.contains("is-open")) {
                    event.preventDefault();
                    setOpen(item, false);
                    button.focus({ preventScroll: true });
                } else if (event.target === button && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
                    event.preventDefault();
                    open(item);
                    const links = visibleControls(dropdown);
                    (event.key === "ArrowDown" ? links[0] : links.at(-1))?.focus();
                }
            });
        });
        document.addEventListener("pointerdown", event => {
            if (!event.target.closest(".nav-item")) closeAll();
        });
        document.addEventListener("click", event => {
            if (event.target.closest(".nav-dropdown a")) closeAll();
        });
    }

    function initStickyHeader() {
        const header = document.querySelector(".site-header");
        if (!header) return;
        if (!header.classList.contains("is-overlay")) document.body.classList.add("has-fixed-header");
        let headerHeight = 80;
        let lastY = Math.max(window.scrollY, 0);
        let frame = 0;
        let sectionNavigation = false;
        let navigationEndTimer;
        function finishSectionNavigation() {
            clearTimeout(navigationEndTimer);
            sectionNavigation = false;
            lastY = Math.max(window.scrollY, 0);
        }
        function waitForNavigationEnd() {
            clearTimeout(navigationEndTimer);
            navigationEndTimer = setTimeout(finishSectionNavigation, 150);
        }
        function interruptSectionNavigation() {
            clearTimeout(navigationEndTimer);
            sectionNavigation = false;
            // 保留上一帧位置，让用户此次滚动的方向仍能控制导航显隐。
        }
        document.addEventListener("site:section-navigation", () => {
            sectionNavigation = true;
            header.classList.add("is-hidden");
            header.inert = true;
            waitForNavigationEnd();
        });
        window.addEventListener("wheel", interruptSectionNavigation, { passive: true });
        window.addEventListener("touchstart", interruptSectionNavigation, { passive: true });
        document.addEventListener("keydown", event => {
            if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) interruptSectionNavigation();
        });
        function syncSizes() {
            const height = Math.round(header.getBoundingClientRect().height);
            if (!height) return;
            headerHeight = height;
            root.style.setProperty("--site-header-h", height + "px");
        }
        function update() {
            frame = 0;
            const y = Math.max(window.scrollY, 0);
            if (sectionNavigation) {
                lastY = y;
                waitForNavigationEnd();
                return;
            }
            const delta = y - lastY;
            const keepVisible = y <= headerHeight || header.querySelector(".nav-item.is-open") ||
                header.contains(document.activeElement) || document.body.classList.contains("search-open");
            // 小位移保留参照点，慢速滚动累计到阈值后也能正确判断方向。
            if (!keepVisible && Math.abs(delta) < 6) return;
            const hidden = !keepVisible && delta > 0;
            header.classList.toggle("is-hidden", hidden);
            header.inert = hidden;
            lastY = y;
        }
        syncSizes();
        if ("ResizeObserver" in window) new ResizeObserver(syncSizes).observe(header);
        else window.addEventListener("resize", syncSizes, { passive: true });
        window.addEventListener("scroll", () => { if (!frame) frame = requestAnimationFrame(update); }, { passive: true });
        update();
    }

    for (const initialize of [initNavigation, initStickyHeader]) {
        try { initialize(); } catch (error) { console.error(initialize.name, error); }
    }
})();
