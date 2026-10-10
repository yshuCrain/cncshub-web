(function () {
    'use strict';
    const scene = document.querySelector('.dust-scene');
    if (!scene) return;
    const cards = [...scene.querySelectorAll('.dust-folder')];
    const readers = cards.map(card => card.querySelector('.folder-reader'));
    const openers = cards.map(card => card.querySelector('.folder-open'));
    const previous = scene.querySelector('[data-dust-prev]');
    const next = scene.querySelector('[data-dust-next]');
    const progress = scene.querySelector('.dust-progress');
    const instruction = scene.querySelector('.dust-instruction');
    const status = scene.querySelector('[data-dust-status]');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    let active = -1, cursor = 0, targetCursor = 0, busy = false, pendingClose = false;
    let width = 0, height = 0, frame = 0;
    let wheelTime = 0, wheelAmount = 0, wheelConsumed = false;
    const last = cards.length - 1;
    const readerPose = () => `translate3d(${width < 600 ? 18 : 56}px, ${width < 600 ? 44 : 62}px, 0px)`;
    const belowPose = () => `translate3d(${width < 600 ? 18 : 56}px, ${height + 80}px, 0px) scale(.98)`;
    function overviewPose(index, lift = 0) {
        const relative = index - cursor;
        const mobile = width < 600;
        const scale = (mobile ? .66 : Math.min(.46, 460 / Math.max(1, width - 112))) * clamp(1 + relative * .048, .72, 1.3);
        const x = (mobile ? 16 : 36) + relative * (mobile ? 23 : Math.min(72, width * .055));
        const y = (mobile ? 166 : 98) + relative * (mobile ? 62 : 67) - lift;
        const z = relative * 17 + (lift ? 45 : 0);
        return `translate3d(${x}px, ${y}px, ${z}px) rotateY(-3deg) scale(${scale})`;
    }
    function updateControls() {
        const index = active >= 0 ? active : Math.round(targetCursor);
        progress.textContent = String(index + 1).padStart(2, '0') + ' / 06';
        previous.disabled = active < 0 && targetCursor <= 0;
        next.disabled = active >= 0 ? active === last : targetCursor >= last;
        previous.setAttribute('aria-label', active === 0 ? '返回文件夹总览' : active > 0 ? '上一章节' : '浏览前一个文件夹');
        next.setAttribute('aria-label', active >= 0 ? '下一章节' : '浏览后一个文件夹');
        instruction.textContent = active >= 0 ? '窗口内阅读 · 窗口外滚动翻章 · 点击空白返回' : '靠近文件夹滚动浏览 · 点击标签展开';
    }
    function overviewLayout() {
        cards.forEach((card, index) => {
            card.style.transform = overviewPose(index);
            card.style.zIndex = String(index + 1);
            card.style.opacity = String(clamp(1 + Math.min(0, index - cursor) * .2, .05, 1));
            card.inert = index - cursor < -1.6;
            card.classList.remove('is-current');
            openers[index].tabIndex = 0;
            openers[index].setAttribute('aria-expanded', 'false');
        });
        updateControls();
    }
    function readingLayout() {
        cards.forEach((card, index) => {
            card.style.transform = index <= active ? readerPose() : belowPose();
            card.style.zIndex = String(index + 1);
            card.style.opacity = '1';
            card.inert = index !== active;
            card.classList.toggle('is-current', index === active);
            openers[index].tabIndex = -1;
            openers[index].setAttribute('aria-expanded', String(index === active));
        });
        updateControls();
    }
    function resize() {
        width = scene.clientWidth; height = scene.clientHeight;
        scene.style.setProperty('--folder-width', Math.max(240, width - (width < 600 ? 36 : 112)) + 'px');
        scene.style.setProperty('--folder-height', Math.max(160, height - (width < 600 ? 114 : 138)) + 'px');
        if (!busy) active < 0 ? overviewLayout() : readingLayout();
    }
    function easeOverview() {
        frame = 0;
        cursor = reduced.matches ? targetCursor : cursor + (targetCursor - cursor) * .14;
        if (Math.abs(cursor - targetCursor) < .002) cursor = targetCursor;
        overviewLayout();
        if (cursor !== targetCursor && active < 0) frame = requestAnimationFrame(easeOverview);
    }
    function moveOverview(value) {
        if (busy || active >= 0) return;
        targetCursor = clamp(value, 0, last);
        if (!frame) frame = requestAnimationFrame(easeOverview);
    }
    async function animate(card, frames, duration) {
        if (reduced.matches) return;
        const animation = card.animate(frames, { duration, easing: 'cubic-bezier(.22,.75,.18,1)', fill: 'none' });
        await animation.finished.catch(() => {});
    }
    function setHash(id) {
        const url = new URL(location.href);
        url.hash = id || '';
        history.replaceState(null, '', url);
    }
    function finishMotion() {
        busy = false;
        resize();
        if (pendingClose) { pendingClose = false; closeChapter(); }
    }
    async function openChapter(index, hash = true) {
        if (busy || index < 0 || index > last || active === index) return;
        if (active >= 0) { await changeChapter(index, hash); return; }
        cancelAnimationFrame(frame); frame = 0;
        busy = true;
        const start = overviewPose(index), lifted = overviewPose(index, 55);
        active = index;
        scene.dataset.mode = 'reading';
        readingLayout();
        cards.forEach((card,i) => { if (i !== index) card.style.opacity = '0'; });
        cards[index].style.zIndex = '20';
        if (hash) setHash(cards[index].id);
        await animate(cards[index], [{transform: start, offset: 0}, {transform: lifted, offset: .3}, {transform: readerPose(), offset: 1}], 760);
        readingLayout();
        cards[index].querySelector('.folder-close').focus({preventScroll:true});
        status.textContent = '已打开：' + openers[index].textContent.trim();
        finishMotion();
    }
    async function changeChapter(index, hash = true) {
        if (busy || index === active || index > last) return;
        if (index < 0) { closeChapter(); return; }
        busy = true;
        const from = active;
        const forward = index > from;
        active = index;
        readingLayout();
        const moving = cards[forward ? index : from];
        // 上一页始终原位保留；翻回时只把覆盖它的当前页下移。
        if (!forward) {
            for (let i = index + 1; i < from; i++) cards[i].style.transform = belowPose();
        }
        if (hash) setHash(cards[index].id);
        await animate(moving, [{transform: forward ? belowPose() : readerPose()}, {transform: forward ? readerPose() : belowPose()}], 580);
        readingLayout();
        cards[index].querySelector('.folder-close').focus({preventScroll:true});
        status.textContent = '当前章节：' + openers[index].textContent.trim();
        finishMotion();
    }
    async function closeChapter() {
        if (active < 0) return;
        if (busy) { pendingClose = true; return; }
        busy = true;
        const index = active;
        // 保留总览浏览位置，让文件夹回到用户刚才抽出的位置。
        if (index - cursor < -1 || index - cursor > 4) cursor = targetCursor = clamp(index - 1, 0, last);
        cards.forEach((card,i) => { if (i !== index) card.style.opacity = '0'; });
        cards[index].style.zIndex = '20';
        await animate(cards[index], [{transform:readerPose()}, {transform:overviewPose(index,35),offset:.75}, {transform:overviewPose(index)}], 640);
        active = -1;
        scene.dataset.mode = 'overview';
        setHash('');
        overviewLayout();
        openers[index].focus({preventScroll:true});
        status.textContent = '已返回文件夹总览';
        finishMotion();
    }
    function nearFolders(x,y) {
        return cards.some(card => {
            if (card.inert) return false;
            const box = card.getBoundingClientRect();
            return x >= box.left - 36 && x <= box.right + 36 && y >= box.top - 36 && y <= box.bottom + 36;
        });
    }
    scene.addEventListener('wheel', event => {
        if (event.ctrlKey || event.metaKey) return;
        // 区域判断发生在手势累计之前；正文滚到底也不向外传递翻章。
        if (active >= 0 && event.target.closest('.dust-folder')) return;
        if (active < 0 && !nearFolders(event.clientX,event.clientY)) return;
        event.preventDefault();
        const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
        if (!delta) return;
        if (active < 0) { moveOverview(targetCursor + delta / 360); return; }
        const now = performance.now();
        if (now - wheelTime > 200) { wheelAmount = 0; wheelConsumed = false; }
        wheelTime = now;
        if (busy || wheelConsumed) return;
        if (Math.sign(delta) !== Math.sign(wheelAmount)) wheelAmount = 0;
        wheelAmount += delta;
        if (Math.abs(wheelAmount) >= 60) {
            wheelConsumed = true;
            changeChapter(active + Math.sign(wheelAmount));
        }
    }, {passive:false});
    scene.addEventListener('click', event => {
        if (event.target.closest('.folder-close')) { closeChapter(); return; }
        if (event.target.closest('.dust-step-controls, .dust-masthead')) return;
        const card = event.target.closest('.dust-folder');
        if (active < 0 && card) { openChapter(cards.indexOf(card)); return; }
        if (active >= 0 && !card) closeChapter();
    });
    previous.addEventListener('click', () => active < 0 ? moveOverview(Math.ceil(targetCursor) - 1) : changeChapter(active - 1));
    next.addEventListener('click', () => active < 0 ? moveOverview(Math.floor(targetCursor) + 1) : changeChapter(active + 1));
    openers.forEach((opener,index) => opener.addEventListener('focus', () => {
        if (active < 0 && !busy && (index < cursor || index > cursor + 3)) moveOverview(clamp(index - 1,0,last));
    }));
    scene.addEventListener('keydown', event => {
        if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.key === 'Escape' && active >= 0) { event.preventDefault(); closeChapter(); return; }
        if (event.target.closest('.folder-reader')) return;
        if (['ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(event.key)) {
            event.preventDefault();
            const direction = ['ArrowDown','ArrowRight'].includes(event.key) ? 1 : -1;
            active < 0 ? moveOverview(Math.round(targetCursor) + direction) : changeChapter(active + direction);
        }
    });
    let touchStart = null, suppressClickUntil = 0;
    scene.addEventListener('click', event => {
        if (performance.now() < suppressClickUntil) {event.preventDefault();event.stopImmediatePropagation();}
    }, {capture:true});
    scene.addEventListener('pointerdown', event => {
        if (event.pointerType !== 'touch' || (active >= 0 && event.target.closest('.dust-folder'))) return;
        if (event.target.closest('button, a') && !event.target.closest('.folder-open')) return;
        if (active < 0 && !nearFolders(event.clientX,event.clientY)) return;
        touchStart = {x:event.clientX,y:event.clientY,cursor:targetCursor};
    });
    scene.addEventListener('pointermove', event => {
        if (!touchStart || event.pointerType !== 'touch') return;
        if (active < 0) moveOverview(touchStart.cursor + (touchStart.y - event.clientY + (touchStart.x-event.clientX)*.4)/150);
    });
    scene.addEventListener('pointerup', event => {
        if (!touchStart) return;
        const dy = touchStart.y - event.clientY;
        touchStart = null;
        if (Math.abs(dy) > 35) {
            // 阻止拖动结束后的合成 click 意外打开或关闭章节。
            suppressClickUntil = performance.now() + 400;
            if (active >= 0) changeChapter(active + Math.sign(dy));
        }
    });
    scene.addEventListener('pointercancel', () => {touchStart=null;});
    scene.querySelectorAll('.reader-toc a').forEach(link => link.addEventListener('click', event => {
        const target = document.getElementById(link.hash.slice(1));
        if (!target || active < 0) return;
        event.preventDefault();
        const reader = readers[active];
        reader.scrollTo({top:reader.scrollTop + target.getBoundingClientRect().top - reader.getBoundingClientRect().top - 24, behavior:reduced.matches?'instant':'smooth'});
        setHash(target.id);
    }));
    async function followHash() {
        const id = decodeURIComponent(location.hash.slice(1));
        const target = document.getElementById(id);
        const card = target?.closest('.dust-folder');
        if (!card) return;
        await openChapter(cards.indexOf(card),false);
        if (target !== card && active >= 0) {
            const reader = readers[active];
            reader.scrollTop += target.getBoundingClientRect().top - reader.getBoundingClientRect().top - 24;
        }
    }
    window.addEventListener('hashchange', followHash);
    document.body.classList.add('dust-ready');
    resize();
    new ResizeObserver(resize).observe(scene);
    followHash();

    // 悬停、键盘聚焦和触屏点击使用同一份已确认的点位映射。
    const explorer = scene.querySelector('.b1-explorer');
    if (explorer) {
        const spots = [...explorer.querySelectorAll('.b1-spot')];
        const previews = [...explorer.querySelectorAll('.b1-preview')];
        const showSpot = index => {
            if (index >= 0) {
                const readerBox = explorer.closest('.folder-reader').getBoundingClientRect();
                const hostBox = explorer.getBoundingClientRect();
                const spotBox = spots[index].getBoundingClientRect();
                const previewWidth = Math.min(420, readerBox.width - 32, (readerBox.height - 70) * 16 / 9);
                const previewHeight = previewWidth * 9 / 16 + 46;
                const left = clamp(spotBox.right + 18, readerBox.left + 12, readerBox.right - previewWidth - 12);
                const top = clamp(spotBox.top - previewHeight - 14, readerBox.top + 12, readerBox.bottom - previewHeight - 12);
                explorer.style.setProperty('--preview-left', (left - hostBox.left) + 'px');
                explorer.style.setProperty('--preview-top', (top - hostBox.top) + 'px');
                explorer.style.setProperty('--preview-width', previewWidth + 'px');
            }
            spots.forEach((spot,i) => spot.setAttribute('aria-expanded',String(i===index)));
            previews.forEach((preview,i) => {preview.hidden=i!==index;});
        };
        spots.forEach((spot,index) => {
            spot.addEventListener('pointerenter', event => {if(event.pointerType==='mouse') showSpot(index);});
            spot.addEventListener('focus', () => showSpot(index));
            spot.addEventListener('click', () => showSpot(index));
        });
        explorer.querySelectorAll('.b1-dismiss').forEach(button => button.addEventListener('click', () => {
            const index = spots.findIndex(spot=>spot.getAttribute('aria-expanded')==='true');
            spots[Math.max(0,index)].focus({preventScroll:true});
            showSpot(-1);
        }));
    }
    scene.querySelectorAll('.dust-routes').forEach(route => {
        route.querySelectorAll('[data-route-choice]').forEach(button=>button.addEventListener('click',()=>{
            route.dataset.route=button.dataset.routeChoice;
            route.querySelectorAll('[data-route-choice]').forEach(option=>option.setAttribute('aria-pressed',String(option===button)));
        }));
        const pause=route.querySelector('[data-route-pause]');
        if (reduced.matches) {route.classList.add('is-paused');pause.setAttribute('aria-pressed','true');pause.textContent='播放动画';}
        pause.addEventListener('click',()=>{
            const paused=route.classList.toggle('is-paused');
            pause.setAttribute('aria-pressed',String(paused));
            pause.textContent=paused?'播放动画':'暂停动画';
        });
    });
})();
