/*
  新手教学 · 交互代码
  ────────────────────────────────────────────────────────────────
  【职责边界】本文件只服务于「新手教学页 guides/rookie-guides.html」的交互增强。
              它不修改任何游戏设置，只做网页层面的演示。
              其他页面的脚本各自独立放在 assets/js/ 下，本文件不跨页面复用。

  【引入方式】由 rookie-guides.html 以 <script src=".../rookie-guides.js" defer> 引入。
              刻意保持为「普通脚本」而非 ES Module：本项目需要支持 file:// 直接打开，
              而 <script type="module"> 在 file:// 协议下会被 CORS 策略拦截。
              因此这里没有 import/export，改用下面「模块清单 + 统一初始化循环」的约定。

  【模块清单】8 个模块互不依赖，可单独删除任一而不影响其余：
    01  initControlGuide    首屏交互键鼠（CS2 默认键位图 / 实体按键与鼠标联动）
    02  initChapterRail     右侧章节刻度导航（滚动联动高亮）
    03  initAimAxes         瞄准图 XY 坐标轴绘制动画
    04  initLessonVideos    教学视频与同步的操作示意（急停 / 压枪）
    05  initCrosshairCopy   准心参数复制与复制成功提示
    06  initBuyGuide        购买界面框选与标注动画
    07  initTextNotes       正文文字注释气泡
    08  initMediaLightbox   媒体放大查看（图片 / 视频）

  【编写约定】
    1. 命名：对外可见的入口统一用 initXxx 前缀，内部辅助函数用动词短语，不使用缩写。
    2. 取值：一律用 document.getElementById 拿节点，拿不到就立刻 return，不抛错。
    3. 常量：跨模块共享的时长/距离放进顶部 CONFIG，禁止在模块内硬编码魔法数字。
    4. 隔离：模块之间不共享可变状态；确实需要共享时才提升到 CONFIG 之上并注明。
    5. 容错：由文件末尾的统一循环逐个 try/catch 调用，
       任一模块抛错只在控制台留痕，不阻断其余模块初始化。
  ────────────────────────────────────────────────────────────────
*/
'use strict';
(() => {
    // 【调参区】时间单位：毫秒；视频示意周期单位：秒；鼠标位移单位：CSS 像素。
    const CONFIG = {
        railThreshold: 0.3, // 刻度在视口上方 30% 位置切换当前章节
        keyFlashMs: 160,   // 点击虚拟键帽时的亮起时长
        wheelIndicatorMs: 520, // 滚轮高亮与方向箭头的停留时长
        hintHoldMs: 900,   // 实体按键全部松开后，提示浮层的停留时长
        toastMs: 2200,     // 复制提示停留时间
        strafeCycle: 5.6,  // 急停演示周期；动作分段见 renderDemo
        recoilCycle: 5.6,  // 压枪演示周期；动作分段见 renderDemo
        recoilRight: 14,   // 鼠标向右偏移距离
        recoilDown: 70     // 鼠标向下移动距离
    };

    // ==================== 01 首屏交互键鼠 ====================
    function initControlGuide() {
        const panel = document.getElementById("control-guide");
        if (!panel) return;

        const keyboard = document.getElementById("control-keyboard");
        const hero = document.querySelector(".rookie-hero");
        const stage = panel.querySelector(".control-stage");
        const hint = document.getElementById("control-hint");
        const mouse = panel.querySelector(".control-mouse");

        if (!hero || !stage || !hint) return;

        // 【调参】键位 = CS2 当前版本的默认初始绑定（对照游戏内 设置 → 键盘）：
        //   移动 W/A/S/D · 跳跃 Space · 蹲下 左Ctrl · 静步 左Shift；
        //   武器 1 主武器 · 2 手枪 · 3 刀 · 4 投掷物 · 5 C4 · Q 上一件武器 ·
        //   E 使用 · R 换弹 · F 检视 · G 丢弃 · B 购买菜单 · T 涂鸦 · M 选择队伍；
        //   沟通 Tab 计分板 · Y 聊天 · U 队内聊天 · Z 无线电 · ` 控制台。
        //   （CS2 默认只绑左 Shift / 左 Ctrl，右侧两个不做绑定演示。）
        // 格式：[键帽文字，功能名]；功能名会直接印在键帽上，不写说明长句。
        // 【功能数据】展示用键位，不会更改用户游戏内设置。
        const controls = {
            Backquote: ["~", "控制台"],
            Tab: ["Tab", "计分板"],

            KeyW: ["W", "前进"],
            KeyA: ["A", "左移"],
            KeyS: ["S", "后退"],
            KeyD: ["D", "右移"],
            ShiftLeft: ["Shift", "静步"],
            ControlLeft: ["Ctrl", "蹲下"],
            Space: ["Space", "跳跃"],

            Digit1: ["1", "主武器"],
            Digit2: ["2", "手枪"],
            Digit3: ["3", "刀"],
            Digit4: ["4", "投掷物"],
            Digit5: ["5", "C4"],
            KeyQ: ["Q", "切换"],
            KeyE: ["E", "使用"],
            KeyR: ["R", "换弹"],
            KeyF: ["F", "检视"],
            KeyG: ["G", "丢弃"],
            KeyB: ["B", "购买"],
            KeyM: ["M", "选队"],
            KeyT: ["T", "涂鸦"],

            KeyY: ["Y", "聊天"],
            KeyU: ["U", "队聊"],
            KeyZ: ["Z", "无线电"],

            // 鼠标（CS2 默认）：左键开火、右键次要攻击、滚轮切换武器
            //（滚轮上=上一件、滚轮下=下一件，图中合并为一个分区演示）。
            MouseLeft: ["LMB", "开火"],
            MouseRight: ["RMB", "次要攻击"],
            Wheel: ["滚轮", "切换武器"]
        };

        // 每项为：[按键代码或装饰文字，宽度单位 u，键帽显示文字(可选)]。
        // 1u = 标准键帽宽度；布局对齐标准 60% 键盘，每行合计 15u，
        // 保证各行左右边缘与纵向列线严格对齐（参考标准 ANSI 键盘轮廓）。
        // 【功能数据】展示用键位，不会更改用户游戏内设置。
        const rows = [
            // ` 1 2 3 4 5 6 7 8 9 0 - = 退格(2u)
            [
                ["Backquote"], ["Digit1"], ["Digit2"], ["Digit3"],
                ["Digit4"], ["Digit5"], ["6"], ["7"], ["8"], ["9"], ["0"],
                ["-"], ["="], ["Backspace", 2, "Back"]
            ],
            // Tab(1.5u) Q W E R T Y U I O P [ ] \(1.5u)
            [
                ["Tab", 1.5], ["KeyQ"], ["KeyW"], ["KeyE"], ["KeyR"],
                ["KeyT"], ["KeyY"], ["KeyU"], ["I"], ["O"], ["P"],
                ["["], ["]"], ["Backslash", 1.5, "\\"]
            ],
            // Caps(1.75u) A S D F G H J K L ; ' Enter(2.25u)
            [
                ["Caps", 1.75], ["KeyA"], ["KeyS"], ["KeyD"], ["KeyF"],
                ["KeyG"], ["H"], ["J"], ["KeyK"], ["L"], [";"], ["'"],
                ["Enter", 2.25]
            ],
            // Shift(2.25u) Z X C V B N M , . / Shift(2.75u)
            [
                ["ShiftLeft", 2.25], ["KeyZ"], ["KeyX"], ["KeyC"], ["KeyV"],
                ["KeyB"], ["N"], ["KeyM"], [","], ["."], ["/"],
                ["ShiftRight", 2.75, "Shift"]
            ],
            // Ctrl(1.25u) Win(1.25u) Alt(1.25u) Space(7.5u) Alt(1.25u) Fn(1.25u) Ctrl(1.25u)
            [
                ["ControlLeft", 1.25], ["Win", 1.25], ["Alt", 1.25],
                ["Space", 7.5], ["Alt", 1.25], ["Fn", 1.25],
                ["ControlRight", 1.25, "Ctrl"]
            ]
        ];

        rows.forEach((row) => {
            const rowElement = document.createElement("div");
            rowElement.className = "control-key-row";

            row.forEach(([code, width = 1, label]) => {
                const binding = controls[code];
                const key = document.createElement(binding ? "button" : "span");

                key.className = "control-key";
                // 宽度换算为 0.25u 网格格数：1u = 4 格，由键盘网格统一对齐。
                key.style.gridColumn = `span ${Math.round(width * 4)}`;

                if (binding) {
                    key.type = "button";
                    key.dataset.control = code;

                    const cap = document.createElement("span");
                    cap.className = "key-cap";
                    cap.textContent = binding[0];
                    key.append(cap);

                    // 功能名直接印在键帽上：说明带删除后，键位说明只出现在这里。
                    if (binding[1]) {
                        const name = document.createElement("span");
                        name.className = "key-fn";
                        name.textContent = binding[1];
                        key.append(name);
                    }

                    key.setAttribute("aria-label", `${binding[0]}：${binding[1]}`);
                } else {
                    key.classList.add("is-placeholder");
                    // 未绑定的装饰键显示键帽字符本身；
                    // 「KeyX」这类事件代码剥掉前缀，避免长文本撑破键帽。
                    key.textContent = label ??
                        (code.startsWith("Key") ? code.slice(3) : code);
                    key.setAttribute("aria-hidden", "true");
                }

                rowElement.append(key);
            });

            keyboard.append(rowElement);
        });

        // 键帽按钮 + 鼠标 SVG 分区都在 panel 内，统一收集。
        const buttons = [...panel.querySelectorAll("[data-control]")];
        const keyNodes = new Map();

        buttons.forEach((button) => {
            const code = button.dataset.control;
            const nodes = keyNodes.get(code) || [];
            nodes.push(button);
            keyNodes.set(code, nodes);
        });

        // ---- 实体按键联动 ----
        // 不再有「实体按键体验」开关：只要 hero 首屏在视窗内，
        // 按下按键就点亮对应键帽，并在键帽上方浮出功能提示；
        // 滚出首屏后完全恢复普通网页浏览，不拦截任何按键。
        const physicalKeys = new Set();
        const flashTimers = new Map();
        let heroActive = false;
        let hintHideTimer = 0;
        let wheelDirectionTimer = 0;

        function setDown(code, pressed) {
            (keyNodes.get(code) || []).forEach((node) => {
                node.classList.toggle("is-down", pressed);
            });
        }

        function flashControl(code, duration = CONFIG.keyFlashMs) {
            clearTimeout(flashTimers.get(code));
            setDown(code, true);

            flashTimers.set(code, setTimeout(() => {
                if (!physicalKeys.has(code)) setDown(code, false);
                flashTimers.delete(code);
            }, duration));
        }

        function showHint(code) {
            const binding = controls[code];
            const node = keyNodes.get(code)?.[0];
            if (!binding || !node) return;

            clearTimeout(hintHideTimer);
            hint.hidden = false;
            hint.textContent = `${binding[0]} · ${binding[1]}`;

            // 提示浮层贴在键帽正上方；第一行放不下时落到键帽下方。
            const stageRect = stage.getBoundingClientRect();
            // 滚轮提示放在整个鼠标上方，避开顶部的向上箭头。
            const keyRect = (code === "Wheel" && mouse ? mouse : node).getBoundingClientRect();

            const left = Math.max(8, Math.min(
                keyRect.left - stageRect.left + keyRect.width / 2 - hint.offsetWidth / 2,
                stage.clientWidth - hint.offsetWidth - 8
            ));
            let top = keyRect.top - stageRect.top - hint.offsetHeight - 10;
            if (top < 0) top = keyRect.bottom - stageRect.top + 10;

            hint.style.left = `${Math.round(left)}px`;
            hint.style.top = `${Math.round(top)}px`;

            // 强制回流，保证「隐藏 → 显示」的过渡每次都能重新开始。
            void hint.offsetWidth;
            hint.classList.add("is-visible");
        }

        function hideHint(immediate = false) {
            clearTimeout(hintHideTimer);
            hint.classList.remove("is-visible");

            if (immediate) {
                hint.hidden = true;
                return;
            }

            // 等淡出过渡播完再整体隐藏，避免截断动画。
            hintHideTimer = setTimeout(() => { hint.hidden = true; }, 220);
        }

        function resetPressed() {
            clearTimeout(wheelDirectionTimer);
            if (mouse) delete mouse.dataset.wheelDirection;
            physicalKeys.clear();
            flashTimers.forEach(clearTimeout);
            flashTimers.clear();
            buttons.forEach((button) => button.classList.remove("is-down"));
            hideHint(true);
        }

        // hero 在视窗内的占比达到 30% 才响应实体按键。
        if ("IntersectionObserver" in window) {
            const heroObserver = new IntersectionObserver((entries) => {
                heroActive = entries.some((entry) =>
                    entry.isIntersecting && entry.intersectionRatio >= 0.3);

                if (!heroActive) resetPressed();
            }, { threshold: [0, 0.3] });

            heroObserver.observe(hero);
        } else {
            heroActive = true;
        }

        function isTypingTarget(target) {
            return target instanceof HTMLElement &&
                (target.isContentEditable ||
                    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
        }

        document.addEventListener("keydown", (event) => {
            if (!heroActive || event.code === "Tab" || event.isComposing) return;
            if (isTypingTarget(event.target)) return;
            if (document.body.classList.contains("search-open") ||
                document.body.classList.contains("lightbox-open")) return;

            // 保留浏览器与系统组合快捷键：Ctrl+C、Alt+Tab 等一律不拦截；
            // 单独按下 Ctrl/Shift 这类修饰键本身也参与演示。
            if (event.metaKey || event.altKey ||
                (event.ctrlKey && !event.code.startsWith("Control"))) return;

            if (!controls[event.code] || !keyNodes.has(event.code)) return;

            // Space 默认会滚动页面、把演示打断，这里拦下；
            // 但焦点在键帽按钮上时保留其激活按钮的默认行为。
            const onKeycap = event.target instanceof Element &&
                event.target.closest(".control-key");

            if (event.code === "Space" && !onKeycap) event.preventDefault();

            if (event.repeat) return;

            physicalKeys.add(event.code);
            setDown(event.code, true);
            showHint(event.code);
        });

        document.addEventListener("keyup", (event) => {
            if (!physicalKeys.has(event.code)) return;

            physicalKeys.delete(event.code);
            setDown(event.code, false);

            // 全部松开后延迟收起提示；还按着别的键则提示保持。
            if (physicalKeys.size === 0) {
                clearTimeout(hintHideTimer);
                hintHideTimer = setTimeout(() => hideHint(), CONFIG.hintHoldMs);
            }
        });

        // 点击键帽 / 鼠标分区同样给一次点亮反馈，照顾触屏与鼠标用户。
        buttons.forEach((button) => {
            button.addEventListener("click", () => {
                flashControl(button.dataset.control);
                showHint(button.dataset.control);
            });

            // SVG 分区可聚焦：Enter/Space 触发与点击一致的反馈。
            if (button.classList.contains("control-mouse-part")) {
                button.addEventListener("keydown", (event) => {
                    if (event.code === "Enter" || event.code === "Space") {
                        event.preventDefault();
                        flashControl(button.dataset.control);
                        showHint(button.dataset.control);
                    }
                });
            }
        });

        // ---- 实体鼠标联动 ----
        // 与实体按键同一套语义：首屏可见时，按下左/右键点亮对应分区，
        // 滚动滚轮闪亮滚轮分区；不拦截任何浏览器默认行为（右键菜单照常）。
        function pressPointer(code) {
            if (!controls[code] || !keyNodes.has(code)) return;

            physicalKeys.add(code);
            setDown(code, true);
            showHint(code);
        }

        function releasePointer(code) {
            if (!physicalKeys.has(code)) return;

            physicalKeys.delete(code);
            setDown(code, false);

            if (physicalKeys.size === 0) {
                clearTimeout(hintHideTimer);
                hintHideTimer = setTimeout(() => hideHint(), CONFIG.hintHoldMs);
            }
        }

        document.addEventListener("mousedown", (event) => {
            if (!heroActive || isTypingTarget(event.target)) return;
            if (document.body.classList.contains("search-open") ||
                document.body.classList.contains("lightbox-open")) return;

            if (event.button === 0) pressPointer("MouseLeft");
            if (event.button === 2) pressPointer("MouseRight");
        });

        document.addEventListener("mouseup", (event) => {
            // mouseup 不看 heroActive：按下后滚出首屏也要能正常抬起。
            if (event.button === 0) releasePointer("MouseLeft");
            if (event.button === 2) releasePointer("MouseRight");
        });

        document.addEventListener("wheel", (event) => {
            if (!heroActive || isTypingTarget(event.target) ||
                event.deltaY === 0 || event.ctrlKey) return;
            if (document.body.classList.contains("search-open") ||
                document.body.classList.contains("lightbox-open")) return;

            flashControl("Wheel", CONFIG.wheelIndicatorMs);
            if (mouse) {
                clearTimeout(wheelDirectionTimer);
                mouse.dataset.wheelDirection = event.deltaY < 0 ? "up" : "down";
                wheelDirectionTimer = setTimeout(() => {
                    delete mouse.dataset.wheelDirection;
                }, CONFIG.wheelIndicatorMs);
            }

            // 没有实体按键按住时才接管提示，避免覆盖键盘演示。
            if (physicalKeys.size === 0) {
                showHint("Wheel");
                clearTimeout(hintHideTimer);
                hintHideTimer = setTimeout(() => hideHint(), CONFIG.hintHoldMs);
            }
        }, { passive: true });

        // 浏览器失焦或切走后清掉点亮状态，避免按键一直亮着。
        window.addEventListener("blur", resetPressed);
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) resetPressed();
        });
    }

    // ==================== 02 章节刻度导航 ====================
    function initChapterRail() {
        const sections = [...document.querySelectorAll(".guide-section")];
        const links = [...document.querySelectorAll(".chapter-rail a")];

        if (!sections.length || !links.length) return;

        let currentId = null;
        let preferredId = location.hash.slice(1);
        const navigationLinks = [...links, ...document.querySelectorAll(".guide-index a")];
        navigationLinks.forEach(link => link.addEventListener("click", () => {
            preferredId = link.hash.slice(1);
            setActive(preferredId);
        }));
        let scheduled = false;

        function setActive(id) {
            if (id === currentId) return;
            currentId = id;

            links.forEach((link) => {
                const active = link.hash === `#${id}`;

                link.classList.toggle("is-active", active);

                if (active) {
                    link.setAttribute("aria-current", "location");
                } else {
                    link.removeAttribute("aria-current");
                }
            });
        }

        function updateNavigation() {
            scheduled = false;

            // 章节顶部经过视口上方约 30% 的位置时，切换当前章节。
            const referenceLine = window.innerHeight * CONFIG.railThreshold;
            let activeSection = null;
            let activeTop = -Infinity;

            for (const section of sections) {
                const top = section.getBoundingClientRect().top;
                if (top > referenceLine) continue;
                if (top > activeTop + 4) {
                    activeSection = section;
                    activeTop = top;
                } else if (Math.abs(top - activeTop) <= 4 &&
                    (section.id === preferredId || section.id === currentId)) {
                    activeSection = section;
                }
            }

            // 页面到底时，保证较短的最后一章也能被激活。
            const atBottom = window.scrollY + window.innerHeight >=
                document.documentElement.scrollHeight - 4;

            if (atBottom) {
                activeSection = sections[sections.length - 1];
            }

            setActive(activeSection?.id ?? null);
        }

        function scheduleUpdate() {
            if (scheduled) return;
            scheduled = true;
            window.requestAnimationFrame(updateNavigation);
        }

        window.addEventListener("scroll", scheduleUpdate, { passive: true });
        window.addEventListener("resize", scheduleUpdate);
        window.addEventListener("load", scheduleUpdate);

        // 字体或图片加载导致正文尺寸变化后，重新判断所在章节。
        if ("ResizeObserver" in window) {
            const observer = new ResizeObserver(scheduleUpdate);
            const main = document.querySelector("main");
            if (main) observer.observe(main);
        }

        updateNavigation();
    }

    // ==================== 03 图片 XY 轴：与视频互不依赖 ====================
    function initAimAxes() {
        const root = document.getElementById("aiming");
        if (!root) return;

        /* ---------- 图片 XY 轴 ---------- */

        const figure = root.querySelector("#head-height-demo");
        if (!figure) return;
        const axes = figure.querySelector(".aim-axes");
        const replay = figure.querySelector(".axes-replay");

        if (!axes || !replay) return;

        // 【调参】x/y 是各人物脚下原点；width/height 控制参考轴长度。
        // 使用与图片相同比例的坐标系，位置对应五个人物。
        const axisGroups = [
            { x: 435, y: 787, width: 85, height: 158 },
            { x: 701, y: 748, width: 58, height: 107 },
            { x: 910, y: 854, width: 78, height: 148 },
            { x: 1155, y: 749, width: 59, height: 110 },
            { x: 662, y: 1030, width: 115, height: 216 }
        ];

        axes.innerHTML = axisGroups.map((axis, index) => `
            <g
                transform="translate(${axis.x} ${axis.y})"
                style="--delay: ${index * 0.18}s"
            >
                <path
                    class="axis-line axis-x"
                    pathLength="100"
                    d="M-20 0 H${axis.width}"
                />
                <path
                    class="axis-line axis-y"
                    pathLength="100"
                    d="M0 18 V-${axis.height}"
                />
                <text class="axis-label" x="${axis.width + 8}" y="8">X</text>
                <text class="axis-label" x="-9" y="${-axis.height - 10}">Y</text>
            </g>
        `).join("");

        replay.hidden = false;

        function revealAxes() {
            figure.classList.add("axes-visible");
        }

        replay.addEventListener("click", () => {
            figure.classList.remove("axes-visible");

            // 重新计算布局，使绘制动画能够重新开始。
            void figure.offsetWidth;
            revealAxes();
        });

        if ("IntersectionObserver" in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.2)) {
                    revealAxes();
                    imageObserver.disconnect();
                }
            }, { threshold: 0.2 });

            imageObserver.observe(figure);
        } else {
            revealAxes();
        }
    }

    // ==================== 04 视频与同步的操作示意 ====================
    function initLessonVideos() {
        const root = document.getElementById("aiming");
        if (!root) return;
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        const hoverAvailable = window.matchMedia("(hover: hover) and (pointer: fine)");
        const controllers = new Map();

        root.querySelectorAll(".lesson-media").forEach(card => {
            const video = card.querySelector("video");
            const stateText = card.querySelector(".video-state");
            if (!video || !stateText) return;
            const cue = card.querySelector(".demo-cue");
            const mouse = card.querySelector(".lesson-device-mouse");
            const keyElements = card.querySelectorAll("[data-key]");
            const stepElements = card.querySelectorAll("[data-step]");
            const type = card.dataset.demo;
            let frame = null;
            let playRequest = 0;
            let buffering = false;
            let mediaError = false;
            video.muted = true;

            function setCue(text) {
                if (cue && cue.textContent !== text) cue.textContent = text;
            }

            function renderDemo() {
                if (type === "aim" || !mouse) return;

                // 减少动态效果时保留静态操作说明。
                if (reducedMotion.matches) {
                    card.querySelectorAll(".is-pressed, .is-current")
                        .forEach((node) => {
                            node.classList.remove("is-pressed", "is-current");
                        });

                    stepElements.forEach(step => step.removeAttribute("aria-current"));
                    if (mouse) mouse.style.transform = "";

                    setCue(type === "strafe"
                        ? "长按 A → 松 A 点 D → 松 D 开火"
                        : "按住左键，缓慢向下并轻微向右移动");

                    return;
                }

                if (type === "strafe") {
                    // 【调参】周期按 CONFIG 等比例缩放；下方 0.5 / 2.5 / 2.9 等为基准时间轴分段。
                    const time = (video.currentTime % CONFIG.strafeCycle) / CONFIG.strafeCycle * 5.6;
                    let active = "";
                    let text = "准备：观察按键亮起的顺序";

                    if (time >= 0.5 && time < 2.5) {
                        active = "a";
                        text = "长按 A · 向左横移";
                    } else if (time >= 2.5 && time < 2.9) {
                        active = "d";
                        text = "松开 A，轻点 D · 反向急停";
                    } else if (time >= 2.9 && time < 3.15) {
                        active = "fire";
                        text = "松开 D，点按鼠标左键 · 开火";
                    } else if (time >= 3.15) {
                        text = "横移 → 急停 → 开枪";
                    }

                    keyElements.forEach((key) => {
                        key.classList.toggle(
                            "is-pressed",
                            key.dataset.key === active
                        );
                    });

                    mouse.classList.toggle("is-pressed", active === "fire");

                    stepElements.forEach((step) => {
                        const current = step.dataset.step === active;
                        step.classList.toggle("is-current", current);

                        if (current) {
                            step.setAttribute("aria-current", "step");
                        } else {
                            step.removeAttribute("aria-current");
                        }
                    });

                    setCue(text);
                }

                if (type === "recoil") {
                    const time = (video.currentTime % CONFIG.recoilCycle) / CONFIG.recoilCycle * 5.6;
                    let progress = 0;
                    let pressed = false;
                    let text = "准备按住鼠标左键";

                    if (time >= 0.5 && time < 4.5) {
                        // 默认周期下移动四秒；修改 recoilCycle 会等比例改变时长。
                        progress = (time - 0.5) / 4;
                        pressed = true;
                        text = "按住左键 · 缓慢向下，轻微向右";
                    } else if (time >= 4.5 && time < 4.9) {
                        progress = 1;
                        text = "松开左键";
                    } else if (time >= 4.9) {
                        progress = Math.max(0, 1 - (time - 4.9) / 0.7);
                        text = "鼠标回位 · 准备下一次演示";
                    }

                    mouse.style.transform =
                        `translate(${progress * CONFIG.recoilRight}px, ${progress * CONFIG.recoilDown}px)`;

                    mouse.classList.toggle("is-pressed", pressed);
                    setCue(text);
                }
            }

            function idleHint() {
                return hoverAvailable.matches && !reducedMotion.matches
                    ? "已暂停 · 移入继续" : "已暂停 · 点击放大播放";
            }
            function stopFrames() {
                if (frame !== null) cancelAnimationFrame(frame);
                frame = null;
            }
            function canAnimate() {
                return type !== "aim" && !video.paused && !video.ended &&
                    !document.hidden && !buffering && !mediaError && !reducedMotion.matches;
            }
            function tick() {
                frame = null;
                renderDemo();
                if (canAnimate()) frame = requestAnimationFrame(tick);
            }
            function startFrames() {
                stopFrames();
                renderDemo();
                if (canAnimate()) frame = requestAnimationFrame(tick);
            }
            function pauseVideo() {
                // 【关键】失效所有悬浮播放请求，避免滚出视口后缓冲完成又开始播放。
                playRequest += 1;
                video.pause();
                stopFrames();
            }
            controllers.set(video, { pause: pauseVideo });

            card.addEventListener("pointerenter", async event => {
                if (event.pointerType !== "mouse" || !hoverAvailable.matches ||
                    reducedMotion.matches || document.hidden || mediaError) return;
                const request = ++playRequest;
                try {
                    await video.play();
                    // 【修补】旧 Promise 只退出，不能暂停后续新发起的有效播放。
                    if (request !== playRequest) return;
                } catch (error) {
                    if (request !== playRequest || error.name === "AbortError" || mediaError) return;
                    stateText.textContent = "点击放大播放";
                }
            });
            card.addEventListener("pointerleave", event => {
                if (event.pointerType === "mouse") pauseVideo();
            });
            video.addEventListener("play", () => {
                controllers.forEach((controller, other) => {
                    if (other !== video) controller.pause();
                });
            });
            video.addEventListener("playing", () => {
                if (document.hidden) { pauseVideo(); return; }
                buffering = false;
                card.classList.add("is-playing");
                stateText.textContent = hoverAvailable.matches
                    ? "正在播放 · 移出暂停" : "正在播放 · 可用播放器暂停";
                startFrames();
            });
            video.addEventListener("pause", () => {
                ++playRequest;
                card.classList.remove("is-playing");
                stopFrames();
                renderDemo();
                if (!mediaError) stateText.textContent = idleHint();
            });
            video.addEventListener("waiting", () => {
                buffering = true;
                card.classList.remove("is-playing");
                if (!mediaError) stateText.textContent = "视频缓冲中";
                stopFrames();
            });
            video.addEventListener("timeupdate", renderDemo);
            video.addEventListener("seeking", () => { buffering = true; stopFrames(); });
            video.addEventListener("seeked", () => { buffering = false; startFrames(); });
            video.addEventListener("loadedmetadata", renderDemo);
            function showMediaError() {
                mediaError = true;
                pauseVideo();
                card.classList.remove("is-playing");
                stateText.textContent = "视频加载失败，请检查路径或格式";
            }
            video.addEventListener("error", showMediaError);
            video.querySelector("source")?.addEventListener("error", showMediaError);
            reducedMotion.addEventListener("change", () => {
                if (reducedMotion.matches) pauseVideo();
                renderDemo();
                if (!mediaError && video.paused) stateText.textContent = idleHint();
            });
            hoverAvailable.addEventListener("change", () => {
                if (!mediaError && video.paused) stateText.textContent = idleHint();
            });
            stateText.textContent = hoverAvailable.matches && !reducedMotion.matches
                ? "移入视频区域播放" : "点击放大播放";
            renderDemo();
        });

        if ("IntersectionObserver" in window) {
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.intersectionRatio < 0.05) controllers.get(entry.target)?.pause();
                });
            }, { threshold: [0, 0.05] });
            controllers.forEach((controller, video) => observer.observe(video));
        }
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) controllers.forEach(controller => controller.pause());
        });
    }

    // ==================== 05 准心复制与提示 ====================
    function initCrosshairCopy() {
        const previews = document.querySelectorAll(".crosshair-preview");
        const toast = document.getElementById("crosshair-toast");

        if (!previews.length || !toast) return;

        let hideTimer;
        let messageTimer;
        let copying = false;

        function showToast(message) {
            clearTimeout(hideTimer);
            clearTimeout(messageTimer);

            // 清空后更新，使重复复制也能被辅助技术播报。
            toast.textContent = "";

            messageTimer = setTimeout(() => {
                toast.textContent = message;
                toast.classList.add("is-visible");

                hideTimer = setTimeout(() => {
                    toast.classList.remove("is-visible");
                }, CONFIG.toastMs);
            }, 30);
        }

        // 兼容部分本地 file 页面；仅在现代剪贴板接口不可用时尝试。
        function fallbackCopy(text) {
            const previousFocus = document.activeElement;
            const textarea = document.createElement("textarea");

            textarea.value = text;
            textarea.readOnly = true;
            textarea.tabIndex = -1;
            textarea.style.cssText =
                "position:fixed;top:0;left:-9999px;opacity:0;font-size:16px;";

            document.body.append(textarea);

            try {
                textarea.focus({ preventScroll: true });
                textarea.select();
                textarea.setSelectionRange(0, text.length);

                if (!document.execCommand("copy")) {
                    throw new Error("Copy failed");
                }
            } finally {
                textarea.remove();

                if (previousFocus instanceof HTMLElement) {
                    previousFocus.focus({ preventScroll: true });
                }
            }
        }

        async function copyText(text) {
            if (window.isSecureContext && navigator.clipboard?.writeText) {
                try {
                    await navigator.clipboard.writeText(text);
                    return;
                } catch {
                    // 接口被限制时继续尝试兼容方式。
                }
            }

            fallbackCopy(text);
        }

        previews.forEach((preview) => {
            preview.addEventListener("click", async () => {
                if (copying) return;

                const code = preview.dataset.code;
                if (!code) return;

                copying = true;

                try {
                    await copyText(code);
                    showToast("复制成功");
                } catch {
                    showToast("复制失败，请检查浏览器剪贴板权限");
                } finally {
                    copying = false;
                }
            });
        });
    }

    // ==================== 06 购买界面框选与标注 ====================
    function initBuyGuide() {
        const figure = document.getElementById("buy-guide");
        const diagram = figure?.querySelector(".buy-diagram");

        if (!figure || !diagram) return;

        const reducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );

        // 无观察器或用户减少动态效果时，保留默认的完整标注。
        if (
            !("IntersectionObserver" in window) ||
            reducedMotion.matches
        ) {
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            const visible = entries.some(entry =>
                entry.isIntersecting &&
                entry.intersectionRatio >= 0.12
            );

            if (!visible) return;

            figure.classList.add("is-visible");

            // 首次进入播放一次，之后保持完整标注。
            observer.disconnect();
        }, {
            threshold: 0.12,

            // 【调参】略晚于进入窗口底部时触发。
            rootMargin: "0px 0px -8% 0px"
        });

        figure.classList.add("is-ready");

        // 观察图片区域，避免章节很长时难以达到触发比例。
        observer.observe(figure.querySelector(".buy-scroll"));

    }

    // ==================== 08 媒体放大查看 ====================
    function initMediaLightbox() {
        const lightbox = document.getElementById("media-lightbox");
        if (!lightbox) return;

        const stage = lightbox.querySelector(".lightbox-stage");
        const caption = lightbox.querySelector(".lightbox-caption");
        const closeButton = lightbox.querySelector(".lightbox-close");
        const fitButton = lightbox.querySelector(".lightbox-fit");
        const backgrounds = [...document.body.children]
            .filter(node => node !== lightbox && !node.matches("script, style, link"));
        const previousInert = new Map();
        let lastFocused = null;

        function closeLightbox() {
            if (lightbox.hidden) return;
            stage.querySelectorAll("video").forEach(video => video.pause());
            stage.replaceChildren();
            caption.textContent = "";
            lightbox.hidden = true;
            document.body.classList.remove("lightbox-open");
            backgrounds.forEach(node => { node.inert = previousInert.get(node) ?? false; });
            previousInert.clear();
            if (lastFocused instanceof HTMLElement && lastFocused.isConnected) {
                lastFocused.focus({ preventScroll: true });
            }
            lastFocused = null;
        }

        function openLightbox(type, src, label) {
            let media;
            if (type === "diagram") {
                const source = document.querySelector(src);
                if (!source) return;
                media = source.cloneNode(true);
                media.removeAttribute("id");
                media.removeAttribute("aria-labelledby");
                media.setAttribute("aria-label", label);
                media.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
                media.style.setProperty("--buy-accent", getComputedStyle(source).getPropertyValue("--buy-accent"));
            } else {
                media = document.createElement(type === "video" ? "video" : "img");
            }

            stage.replaceChildren(media);
            stage.classList.remove("is-fitted");
            stage.style.removeProperty("--image-width");
            stage.scrollTop = 0;
            stage.scrollLeft = 0;
            fitButton.hidden = type === "video";
            fitButton.textContent = "适应宽度";
            fitButton.setAttribute("aria-pressed", "false");

            if (type === "video") {
                media.controls = true;
                media.autoplay = true;
                media.loop = true;
                media.muted = true;
                media.playsInline = true;
                media.preload = "auto";
                media.setAttribute("aria-label", label);
                media.src = src;
            } else if (type === "image") {
                media.alt = label;
                media.decoding = "async";
                media.addEventListener("load", () => {
                    if (stage.contains(media)) {
                        stage.style.setProperty("--image-width", `${media.naturalWidth}px`);
                        if (media.naturalWidth > 1440) setFitted(true);
                    }
                }, { once: true });
                media.src = src;
            } else {
                stage.style.setProperty("--image-width", `${media.viewBox.baseVal.width}px`);
                setFitted(true);
            }

            // 关闭缩略视频，避免放大播放与页面预览同时发声或播放。
            document.querySelectorAll(".lesson-media video").forEach(video => video.pause());
            caption.textContent = label;
            lastFocused = document.activeElement;
            backgrounds.forEach(node => {
                previousInert.set(node, node.inert);
                node.inert = true;
            });
            lightbox.hidden = false;
            document.body.classList.add("lightbox-open");
            closeButton.focus({ preventScroll: true });
        }

        document.addEventListener("click", event => {
            const trigger = event.target.closest(".zoom-trigger");
            if (!trigger) return;
            event.preventDefault();
            openLightbox(trigger.dataset.type, trigger.dataset.src, trigger.dataset.caption || trigger.getAttribute("aria-label"));
        });
        function setFitted(fitted) {
            stage.classList.toggle("is-fitted", fitted);
            fitButton.textContent = fitted ? "原尺寸" : "适应宽度";
            fitButton.setAttribute("aria-pressed", String(fitted));
            stage.scrollLeft = 0;
        }
        fitButton.addEventListener("click", () => setFitted(!stage.classList.contains("is-fitted")));
        lightbox.addEventListener("click", event => {
            if (event.target === lightbox) closeLightbox();
        });
        closeButton.addEventListener("click", closeLightbox);
        document.addEventListener("keydown", event => {
            if (lightbox.hidden) return;
            if (event.key === "Escape") {
                event.preventDefault();
                closeLightbox();
            } else if (event.key === "Tab") {
                const focusable = [...lightbox.querySelectorAll("button:not([hidden]), video, [tabindex='0']")]
                    .filter(node => node.getClientRects().length > 0);
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        });
    }


    // ==================== 07 正文文字注释气泡 ====================
    function initTextNotes() {
        const triggers = document.querySelectorAll(".note-trigger");

        let activeTrigger = null;
        let activeBubble = null;

        function closeNote() {
            if (!activeBubble) return;

            activeBubble.hidden = true;
            activeTrigger.setAttribute("aria-expanded", "false");

            activeTrigger = null;
            activeBubble = null;
        }

        function positionNote() {
            if (!activeBubble) return;

            const target = activeTrigger.getBoundingClientRect();
            const bubble = activeBubble.getBoundingClientRect();

            // 【调参】气泡与文字的距离、窗口边缘安全距离
            const gap = 12;
            const edge = 12;

            const viewportWidth = document.documentElement.clientWidth;
            const center = target.left + target.width / 2;

            // 默认居中；靠近左右边缘时，把气泡移回窗口内。
            const left = Math.max(
                edge,
                Math.min(
                    center - bubble.width / 2,
                    viewportWidth - bubble.width - edge
                )
            );

            const above = target.top - bubble.height - gap;
            const showAbove = above >= edge;

            activeBubble.style.left = `${left}px`;
            activeBubble.style.top = `${
                showAbove ? above : target.bottom + gap
            }px`;

            activeBubble.dataset.side = showAbove ? "above" : "below";

            // 气泡被边缘限制后，小三角仍对准文字。
            const arrowX = Math.max(
                18,
                Math.min(center - left, bubble.width - 18)
            );

            activeBubble.style.setProperty("--arrow-x", `${arrowX}px`);
        }

        triggers.forEach(trigger => {
            const bubble = document.getElementById(
                trigger.getAttribute("aria-controls")
            );

            if (!bubble) return;

            trigger.addEventListener("click", () => {
                const wasOpen = activeTrigger === trigger;

                closeNote();

                if (wasOpen) return;

                activeTrigger = trigger;
                activeBubble = bubble;

                bubble.hidden = false;
                trigger.setAttribute("aria-expanded", "true");

                positionNote();
            });
        });

        // 点击气泡或触发文字以外的位置，关闭注释。
        document.addEventListener("click", event => {
            if (!activeBubble) return;

            if (
                activeTrigger.contains(event.target) ||
                activeBubble.contains(event.target)
            ) {
                return;
            }

            closeNote();
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") closeNote();
        });

        // 滚动或调整窗口时关闭，避免气泡停留在错误位置。
        window.addEventListener("scroll", closeNote, {
            capture: true,
            passive: true
        });

        window.addEventListener("resize", closeNote);
    }

    // 【关键】各板块独立初始化，控制台保留错误，防止一个板块阻断其余功能。
    // 这里的调用顺序与上方「定义顺序」不完全一致（06 排在 05 之前）是历史形成的。
    // 8 个模块独立初始化，保持教学演示与媒体查看的调用顺序。
    for (const initialize of [
        initControlGuide,   // 01 首屏交互键鼠
        initChapterRail,    // 02 章节刻度导航
        initAimAxes,        // 03 瞄准图 XY 轴
        initLessonVideos,   // 04 视频与操作示意
        initBuyGuide,       // 06 购买界面标注
        initCrosshairCopy,  // 05 准心复制
        initTextNotes,      // 07 文字注释气泡
        initMediaLightbox   // 08 媒体放大查看
    ]) {
        try {
            initialize();
        } catch (error) {
            console.error(initialize.name, error);
        }
    }
})();
