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

  【模块清单】7 个模块互不依赖，可单独删除任一而不影响其余：
    01  initControlGuide    首屏交互键鼠（CS2 默认键位图 / 实体按键与鼠标联动）
    02  initChapterRail     右侧章节刻度导航（滚动联动高亮）
    03  initAimAxes         瞄准图 XY 坐标轴绘制动画
    04  initLessonVideos    教学视频与同步的操作示意（急停 / 压枪）
    05  initCrosshairCopy   准心参数复制与复制成功提示
    06  initBuyGuide        购买界面框选与标注动画
    07  initTextNotes       正文文字注释气泡


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
        chapterResetMs: 400, // 锚点跳转时，结束上一轮章节内部的按键滚动
        keyFlashMs: 160,   // 点击虚拟键帽时的亮起时长
        wheelIndicatorMs: 520, // 滚轮高亮与方向箭头的停留时长
        hintHoldMs: 900,   // 实体按键全部松开后，提示浮层的停留时长
        toastMs: 2200,     // 复制提示停留时间
        strafeCycle: 5.6,  // 急停演示周期；动作分段见 renderDemo
        recoilCycle: 5.6,  // 压枪演示周期；动作分段见 renderDemo
        recoilRight: 14,   // 鼠标向右偏移距离
        recoilDown: 32     // 鼠标向下移动距离，保持在线框示意区内
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

        if (!keyboard || !hero || !stage || !hint) return;

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

            // 鼠标：左键开火、右键次要攻击、滚轮切换武器。
            //（滚轮上=上一件、滚轮下=下一件，图中合并为一个分区演示）。
            // Mouse4 是本页建议的语音绑定，不会更改游戏或浏览器设置。
            MouseLeft: ["LMB", "开火"],
            MouseRight: ["RMB", "次要攻击"],
            Mouse4: ["Mouse4", "语音"],
            Mouse5: ["Mouse5", "侧键"],
            Wheel: ["滚轮", "切换武器"]
        };

        // 按用户提供的 675 × 244 参考图描出键帽外缘，键盘坐标范围 648 × 220。
        // 每项：[代码、左侧坐标、外缘宽度、显示文字(可选)]；行高也保持原图比例。
        // 坐标属于整个键鼠 SVG，视窗变化时只缩放共同的 viewBox。
        const rows = [
            [
                ["Backquote", 0, 40], ["Digit1", 45, 40], ["Digit2", 89, 40],
                ["Digit3", 134, 40], ["Digit4", 178, 40], ["Digit5", 223, 40],
                ["6", 268, 39], ["7", 312, 40], ["8", 357, 39], ["9", 401, 40],
                ["0", 445, 40], ["-", 490, 40], ["=", 535, 39], ["Backspace", 579, 69, "Back"]
            ],
            [
                ["Tab", 0, 62], ["KeyQ", 67, 40], ["KeyW", 112, 39], ["KeyE", 156, 40],
                ["KeyR", 200, 40], ["KeyT", 245, 40], ["KeyY", 290, 39], ["KeyU", 334, 40],
                ["I", 379, 39], ["O", 423, 40], ["P", 468, 39], ["[", 512, 40],
                ["]", 557, 39], ["Backslash", 601, 47, "\\"]
            ],
            [
                ["Caps", 0, 70], ["KeyA", 74, 39], ["KeyS", 118, 40], ["KeyD", 163, 39],
                ["KeyF", 207, 40], ["KeyG", 252, 40], ["H", 296, 40], ["J", 341, 40],
                ["KeyK", 385, 40], ["L", 430, 40], [";", 474, 40], ["'", 519, 40],
                ["Enter", 564, 83]
            ],
            [
                ["ShiftLeft", 1, 97], ["KeyZ", 103, 40], ["KeyX", 148, 40], ["KeyC", 192, 40],
                ["KeyV", 237, 40], ["KeyB", 281, 40], ["N", 326, 40], ["KeyM", 371, 39],
                [",", 415, 40], [".", 460, 39], ["/", 504, 40], ["ShiftRight", 550, 97, "Shift"]
            ],
            [
                ["ControlLeft", 0, 53], ["Win", 59, 40], ["Alt", 103, 40], ["FnLeft", 148, 40, "Fn"],
                ["Space", 193, 262], ["AltRight", 460, 39, "Alt"], ["WinRight", 504, 40, "Win"],
                ["Fn", 548, 40], ["ControlRight", 594, 53, "Ctrl"]
            ]
        ];
        const rowBounds = [[0, 40], [46, 39], [91, 39], [135, 40], [180, 40]];
        const svgNamespace = "http://www.w3.org/2000/svg";
        function svgElement(tag, attributes) {
            const element = document.createElementNS(svgNamespace, tag);
            Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
            return element;
        }

        rows.forEach((row, index) => {
            const [top, height] = rowBounds[index];
            const rowElement = svgElement("g", { class: "control-key-row" });

            row.forEach(([code, left, width, label]) => {
                const binding = controls[code];
                const key = svgElement("g", { class: "control-key", "data-key": code });
                key.append(svgElement("rect", {
                    class: "key-shape", x: left + 0.5, y: top + 0.5,
                    width: width - 1, height: height - 1
                }));
                const cap = svgElement("text", {
                    class: "key-cap", x: left + width / 2,
                    y: top + height / 2 - (binding ? 6 : 0)
                });
                cap.textContent = binding?.[0] ?? label ??
                    (code.startsWith("Key") ? code.slice(3) : code);
                key.append(cap);

                if (binding) {
                    key.dataset.control = code;
                    key.setAttribute("role", "button");
                    key.setAttribute("tabindex", "0");
                    const name = svgElement("text", {
                        class: "key-fn", x: left + width / 2, y: top + height / 2 + 8
                    });
                    name.textContent = binding[1];
                    key.append(name);
                    key.setAttribute("aria-label", `${binding[0]}：${binding[1]}`);
                } else {
                    key.classList.add("is-placeholder");
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
            // 滚轮与侧键提示放在整个鼠标上方，避开图内文字和方向箭头。
            const keyRect = (["Wheel", "Mouse4", "Mouse5"].includes(code) && mouse ? mouse : node).getBoundingClientRect();

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
            // SVG 按键聚焦时，由组件自身的键盘处理器负责激活。
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
            if (button instanceof SVGElement) {
                button.addEventListener("keydown", (event) => {
                    if (event.code === "Enter" || event.code === "Space") {
                        event.preventDefault();
                        event.stopPropagation();
                        flashControl(button.dataset.control);
                        showHint(button.dataset.control);
                    }
                });
            }
        });

        // ---- 实体鼠标联动 ----
        // 与实体按键同一套语义：首屏可见时，按下左/右键或侧键点亮对应分区，
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
            if (event.button === 3) pressPointer("Mouse4");
            if (event.button === 4) pressPointer("Mouse5");
        });

        document.addEventListener("mouseup", (event) => {
            // mouseup 不看 heroActive：按下后滚出首屏也要能正常抬起。
            if (event.button === 0) releasePointer("MouseLeft");
            if (event.button === 2) releasePointer("MouseRight");
            if (event.button === 3) releasePointer("Mouse4");
            if (event.button === 4) releasePointer("Mouse5");
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
        let resetFrame = null;
        const chapterId = () => location.hash === "#explore" ? "aiming" : location.hash.slice(1);
        let preferredId = chapterId();
        const navigationLinks = [...links, document.querySelector(".explore-button")].filter(Boolean);
        navigationLinks.forEach(link => link.addEventListener("click", event => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            preferredId = link.hash.slice(1);
            prepareNavigation(preferredId);
        }));
        let scheduled = false;

        // 点击选中的栏目保留伸长与强调色，直到选择下一项。
        // 滚动产生的当前章节标记仍由 setActive 独立更新。
        function setSelected(id) {
            links.forEach(link => link.classList.toggle("is-selected", link.hash === `#${id}`));
        }

        function prepareNavigation(id) {
            const section = sections.find(section => section.id === id);
            if (!section) return;
            stopNavigationReset();
            section.scrollTo({ top: 0, behavior: "instant" });
            // 原生 PageDown 滚动可能继续数帧。跳转期间保持正文从顶端开始；
            // 用户发起新的滚动或按键操作后立即交还控制权。
            if (section.scrollHeight > section.clientHeight + 1) {
                const resetUntil = performance.now() + CONFIG.chapterResetMs;
                const reset = () => {
                    section.scrollTo({ top: 0, behavior: "instant" });
                    resetFrame = performance.now() < resetUntil ? requestAnimationFrame(reset) : null;
                };
                resetFrame = requestAnimationFrame(reset);
            }
            setSelected(id);
            setActive(id);
            // 原生锚点负责滚动与历史；公共导航在跳转过程中收起，避免遮住章节标题。
            document.dispatchEvent(new Event("site:section-navigation"));
        }

        function stopNavigationReset() {
            if (resetFrame !== null) cancelAnimationFrame(resetFrame);
            resetFrame = null;
        }
        document.addEventListener("wheel", stopNavigationReset, { passive: true });
        document.addEventListener("touchstart", stopNavigationReset, { passive: true });
        document.addEventListener("pointerdown", stopNavigationReset, { passive: true });
        document.addEventListener("keydown", stopNavigationReset);

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

            sections.forEach(section => {
                if (section.scrollHeight > section.clientHeight + 1) section.tabIndex = 0;
                else section.removeAttribute("tabindex");
            });

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
        window.addEventListener("hashchange", () => {
            preferredId = chapterId();
            prepareNavigation(preferredId);
            setSelected(preferredId);
            scheduleUpdate();
        });

        // 字体或图片加载导致正文尺寸变化后，重新判断所在章节。
        if ("ResizeObserver" in window) {
            const observer = new ResizeObserver(scheduleUpdate);
            const main = document.querySelector("main");
            if (main) observer.observe(main);
        }

        prepareNavigation(preferredId);
        setSelected(preferredId);
        updateNavigation();
    }

    // ==================== 03 线稿 XY 轴：与视频互不依赖 ====================
    function initAimAxes() {
        const root = document.getElementById("aiming");
        if (!root) return;

        /* ---------- 线稿 XY 轴 ---------- */

        const figure = root.querySelector("#head-height-demo");
        if (!figure) return;
        const axes = figure.querySelector(".aim-axes");
        const replay = figure.querySelector(".axes-replay");

        if (!axes || !replay) return;

        // 【调参】x/y 是各人物脚下原点；width/height 控制参考轴长度。
        // 线稿和坐标轴使用同一个 SVG 坐标系，五个人物的脚下位置保持一致。
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
        observer.observe(figure.querySelector(".buy-preview"));

    }

    // ==================== 08 媒体放大查看 ====================
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
    // 7 个模块独立初始化，保持教学演示与媒体查看的调用顺序。
    for (const initialize of [
        initControlGuide,   // 01 首屏交互键鼠
        initChapterRail,    // 02 章节刻度导航
        initAimAxes,        // 03 瞄准图 XY 轴
        initLessonVideos,   // 04 视频与操作示意
        initBuyGuide,       // 06 购买界面标注
        initCrosshairCopy,  // 05 准心复制
        initTextNotes      // 07 文字注释气泡
    ]) {
        try {
            initialize();
        } catch (error) {
            console.error(initialize.name, error);
        }
    }
})();
