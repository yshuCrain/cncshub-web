/* 全站交互：导航、搜索、主题和音乐。由各页以 defer 引入。 */
(function () {
    "use strict";

    const root = document.documentElement;
    const scriptUrl = document.currentScript?.src || new URL("assets/js/site.js", document.baseURI).href;
    const siteBase = new URL("../../", scriptUrl);
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
        function syncSizes() {
            const height = Math.round(header.getBoundingClientRect().height);
            if (!height) return;
            headerHeight = height;
            root.style.setProperty("--site-header-h", height + "px");
        }
        function update() {
            frame = 0;
            const y = Math.max(window.scrollY, 0);
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

    function initSearchOverlay() {
        const trigger = document.querySelector(".search-trigger");
        const overlay = document.getElementById("site-search-overlay");
        const form = overlay?.querySelector(".search-overlay-form");
        const input = overlay?.querySelector(".search-overlay-input");
        const closeButton = overlay?.querySelector(".search-overlay-close");
        if (!trigger || !overlay || !form || !input || !closeButton) return;
        const header = document.querySelector(".site-header");
        const status = document.createElement("p");
        status.className = "search-status";
        status.setAttribute("role", "status");
        status.setAttribute("aria-live", "polite");
        const results = document.createElement("ol");
        results.className = "search-results";
        results.hidden = true;
        form.after(status, results);
        const normalize = text => text.normalize("NFKC").toLocaleLowerCase().trim();
        const entries = (window.CNCS_SEARCH_INDEX || []).map(entry => ({
            ...entry, normalizedTitle: normalize(entry.title), normalizedText: normalize(entry.page + " " + entry.text)
        }));
        const previousInert = new Map();
        let closeTimer = 0;
        let lastFocused = null;
        let composing = false;
        function isOpen() { return overlay.classList.contains("is-open"); }
        function renderResults() {
            results.replaceChildren();
            const query = normalize(input.value);
            results.hidden = !query;
            if (!query) { status.textContent = "搜索教学、地图或设置关键词"; return; }
            const terms = query.split(/\s+/);
            const matches = entries.map(entry => {
                const text = entry.normalizedTitle + " " + entry.normalizedText;
                if (!terms.every(term => text.includes(term))) return null;
                const score = terms.reduce((total, term) => total + (entry.normalizedTitle.includes(term) ? 8 : 1), 0) +
                    (entry.normalizedTitle === query ? 20 : 0) + (entry.url.includes("#") ? 1 : 0);
                return { entry, score };
            }).filter(Boolean).sort((a, b) => b.score - a.score);
            status.textContent = matches.length ? "找到 " + matches.length + " 条结果" + (matches.length > 8 ? "，显示前 8 条" : "") : "没有找到相关内容，请换一个关键词";
            results.hidden = !matches.length;
            for (const { entry } of matches.slice(0, 8)) {
                const item = document.createElement("li");
                const link = document.createElement("a");
                const title = document.createElement("strong");
                const detail = document.createElement("span");
                const matchAt = normalize(entry.text).indexOf(terms[0]);
                const start = Math.max(0, matchAt - 20);
                title.textContent = entry.title;
                detail.textContent = entry.page + " / " + (start ? "…" : "") + entry.text.slice(start, start + 110) + (entry.text.length > start + 110 ? "…" : "");
                link.href = new URL(entry.url, siteBase).href;
                link.append(title, detail);
                item.append(link);
                results.append(item);
            }
        }
        function open() {
            if (isOpen()) return;
            clearTimeout(closeTimer);
            closeTimer = 0;
            lastFocused = document.activeElement;
            if (header) { header.classList.remove("is-hidden"); header.inert = false; }
            overlay.hidden = false;
            overlay.inert = false;
            void overlay.offsetWidth;
            overlay.classList.add("is-open");
            document.body.classList.add("search-open");
            trigger.setAttribute("aria-expanded", "true");
            for (const child of document.body.children) {
                if (child === overlay || child.matches("script, style, link")) continue;
                previousInert.set(child, child.inert);
                child.inert = true;
            }
            renderResults();
            input.focus({ preventScroll: true });
            input.select();
        }
        function close() {
            if (!isOpen()) return;
            overlay.classList.remove("is-open");
            overlay.inert = true;
            document.body.classList.remove("search-open");
            trigger.setAttribute("aria-expanded", "false");
            previousInert.forEach((inert, element) => { element.inert = inert; });
            previousInert.clear();
            if (lastFocused?.isConnected) lastFocused.focus({ preventScroll: true });
            else trigger.focus({ preventScroll: true });
            lastFocused = null;
            const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 240;
            closeTimer = setTimeout(() => { overlay.hidden = true; closeTimer = 0; }, delay);
        }
        trigger.addEventListener("click", () => { if (isOpen()) close(); else open(); });
        closeButton.addEventListener("click", close);
        overlay.addEventListener("pointerdown", event => { if (event.target === overlay) close(); });
        results.addEventListener("click", event => { if (event.target.closest("a")) close(); });
        input.addEventListener("compositionstart", () => { composing = true; });
        input.addEventListener("compositionend", () => { composing = false; renderResults(); });
        input.addEventListener("input", () => { if (!composing) renderResults(); });
        form.addEventListener("submit", event => { event.preventDefault(); if (!composing) renderResults(); });
        document.addEventListener("keydown", event => {
            if (!isOpen() || event.isComposing) return;
            if (event.key === "Escape") { event.preventDefault(); close(); return; }
            if (event.key === "ArrowDown" && event.target === input) {
                const first = results.querySelector("a");
                if (first) { event.preventDefault(); first.focus(); }
            }
            if (event.key !== "Tab") return;
            const controls = visibleControls(overlay);
            const first = controls[0];
            const last = controls.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        });
    }

    function initTheme() {
        const storageKey = "cncs-theme";
        const button = document.getElementById("theme-button");
        if (!button) return;
        const system = window.matchMedia("(prefers-color-scheme: dark)");
        const valid = value => value === "dark" || value === "light";
        function readSaved() { try { return localStorage.getItem(storageKey); } catch { return null; } }
        let manual = valid(readSaved());
        function apply(theme) {
            const isDark = theme === "dark";
            root.dataset.theme = theme;
            button.setAttribute("aria-pressed", String(isDark));
            button.title = isDark ? "切换为浅色主题" : "切换为深色主题";
            document.querySelectorAll('meta[name="theme-color"]').forEach(meta => { meta.content = isDark ? "#111315" : "#F3F4F4"; });
        }
        apply(root.dataset.theme === "dark" ? "dark" : "light");
        button.addEventListener("click", () => {
            const theme = root.dataset.theme === "dark" ? "light" : "dark";
            manual = true;
            apply(theme);
            try { localStorage.setItem(storageKey, theme); } catch { /* 本次切换仍然有效。 */ }
        });
        system.addEventListener("change", () => { if (!manual) apply(system.matches ? "dark" : "light"); });
        window.addEventListener("storage", event => {
            if (event.key !== storageKey && event.key !== null) return;
            const saved = readSaved();
            manual = valid(saved);
            apply(manual ? saved : system.matches ? "dark" : "light");
        });
    }

    function initAudio() {
        const audio = document.getElementById("theme-audio");
        const button = document.getElementById("audio-button");
        const icon = document.getElementById("audio-icon");
        if (!audio || !button || !icon) return;
        const iconBase = new URL("../images/icons/", scriptUrl);
        let requested = false;
        let request = 0;
        icon.alt = "";
        function sync() {
            const playing = !audio.paused && !audio.error;
            icon.src = new URL(playing ? "music-on.svg" : "music-off.svg", iconBase).href;
            button.setAttribute("aria-pressed", String(playing));
            button.setAttribute("aria-label", playing ? "暂停背景音乐" : "播放背景音乐");
        }
        for (const event of ["play", "pause", "ended", "error"]) {
            audio.addEventListener(event, () => {
                // 连续点击时，较早排队的 pause 事件不能覆盖新的播放意图。
                requested = !audio.paused && !audio.ended && !audio.error;
                sync();
            });
        }
        button.addEventListener("click", async () => {
            const current = ++request;
            requested = !requested;
            if (!requested) { audio.pause(); sync(); return; }
            try {
                await audio.play();
                if (current === request) button.removeAttribute("title");
            }
            catch (error) {
                if (current !== request) return;
                requested = false;
                if (error.name !== "AbortError") button.title = "音乐暂时无法播放，请重试";
            }
            if (current === request) sync();
        });
        sync();
    }

    for (const initialize of [initNavigation, initStickyHeader, initSearchOverlay, initTheme, initAudio]) {
        try { initialize(); } catch (error) { console.error(initialize.name, error); }
    }
})();
