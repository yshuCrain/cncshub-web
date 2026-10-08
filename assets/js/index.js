/* 首页私有脚本 · assets/js/index.js
   ────────────────────────────────────────────────────────────────
   【职责边界】本文件只服务首页 index.html，负责首屏视频和打字效果。
          全站公共交互（主题切换、背景音乐）已经抽到 assets/js/site.js，
          首屏主题预置抽到 assets/js/theme-init.js，本文件不再重复。

  【首页 <head> / 末尾的引用顺序】
          <head>   <script src="./assets/js/theme-init.js"></script>   同步，首帧前定主题
          <head>   <link rel="stylesheet" href="./assets/css/common.css">
          <head>   <link rel="stylesheet" href="./assets/css/index.css">
          </body>  <script src="./assets/js/site.js" defer></script>
          </body>  <script src="./assets/js/index.js" defer></script>

  本文件由 index.html 以 <script defer> 引入，因此执行时 DOM 已就绪。
   ──────────────────────────────────────────────────────────────── */

(function () {
    "use strict";

    // 背景视频仅在首屏可见、页面处于前台且允许动态效果时播放。
    (function initHeroVideo() {
        const video = document.querySelector(".hero > video");
        if (!video) return;
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        let visible = !("IntersectionObserver" in window);
        let request = 0;
        async function update() {
            const current = ++request;
            if (!visible || document.hidden || reducedMotion.matches) { video.pause(); return; }
            try { await video.play(); }
            catch { /* 自动播放不可用时保留文字与页面背景。 */ }
            if (current !== request && (!visible || document.hidden || reducedMotion.matches)) video.pause();
        }
        if ("IntersectionObserver" in window) {
            new IntersectionObserver(entries => {
                visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.05);
                update();
            }, { threshold: [0, 0.05] }).observe(video.closest(".hero"));
        }
        reducedMotion.addEventListener("change", update);
        document.addEventListener("visibilitychange", update);
        update();
    })();

    /* ============================================================
       首页打字效果
       ============================================================ */
    (function initTyping() {
        const lines = document.querySelectorAll(".typing-group .typing-text"); // 四个段落
        const duration = 1000; // 统一动画时长，单位为毫秒
        const easingPower = 1; // 缓出强度，数值越大，前快后慢越明显
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)"); // 动画偏好

        if (reduceMotion.matches) return; // 减少动态效果时直接保留完整文字

        const states = []; // 保存每个段落的动画状态

        lines.forEach(function (line) { // 初始化每个段落
            const source = line.querySelector(".typing-source"); // 获取完整文字层
            if (!source || !source.textContent) return; // 跳过没有文字的段落

            const characters = Array.from(source.textContent); // 将文本拆分成字符
            const overlay = document.createElement("span"); // 创建动画层
            overlay.className = "typing-overlay"; // 应用对应样式
            overlay.setAttribute("aria-hidden", "true"); // 避免屏幕阅读器重复读取动画文字

            const textNode = document.createTextNode(""); // 创建可更新的文本节点
            overlay.append(textNode); // 将文本节点放入动画层
            line.append(overlay); // 将动画层放入当前段落
            line.classList.add("is-typing"); // 隐藏原文外观，同时保留完整占位

            states.push({ line: line, overlay: overlay, textNode: textNode, characters: characters, shown: 0 });
        }); // 初始化结束

        if (states.length === 0) return; // 没有可播放的段落时结束

        let startTime = null; // 保存所有段落共用的起始时间

        function finishTyping() { // 统一结束所有段落的动画
            states.forEach(function (state) {
                state.line.classList.remove("is-typing"); // 显示完整原文
                state.overlay.remove(); // 删除动画层和光标
            });
        } // 结束函数定义

        function updateTyping(timestamp) { // 每帧更新所有段落
            if (reduceMotion.matches) { // 用户在播放期间开启减少动态效果时
                finishTyping(); // 立即显示全部文字
                return; // 停止动画
            }

            if (startTime === null) startTime = timestamp; // 第一帧记录统一起始时间
            const progress = Math.min((timestamp - startTime) / duration, 1); // 计算 0～1 的时间进度

            if (progress >= 1) { // 达到统一结束时间时
                finishTyping(); // 四段文字同时完整显示
                return; // 不再请求下一帧
            }

            const easedProgress = 1 - (1 - progress) ** easingPower; // 缓出：从快逐渐减慢

            states.forEach(function (state) {
                const count = Math.min( // 这一帧应该显示多少字符
                    state.characters.length - 1, // 最后一个字符留到统一结束时再显示
                    Math.floor(easedProgress * state.characters.length) // 按缓动进度计算
                );

                if (count !== state.shown) { // 字符数量变化时才更新页面，减少无谓的 DOM 写入
                    state.textNode.data = state.characters.slice(0, count).join("");
                    state.shown = count;
                }
            });

            window.requestAnimationFrame(updateTyping); // 请求下一帧
        } // 动画函数定义结束

        window.requestAnimationFrame(updateTyping); // 启动统一动画
    })();
})();
