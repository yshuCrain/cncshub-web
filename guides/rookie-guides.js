/*
  新手教学 · 交互代码
  与 HTML 通过 defer 引入；每个板块独立初始化，删掉某个板块不影响其他板块。
  不包含游戏设置修改，只演示网页操作。
*/
'use strict';
(() => {
    // 【调参区】时间单位：毫秒；视频示意周期单位：秒；鼠标位移单位：CSS 像素。
    const CONFIG = {
        railThreshold: 0.3, // 刻度在视口上方 30% 位置切换当前章节
        keyFlashMs: 160,   // 点击虚拟键帽时的亮起时长
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
        const trialButton = document.getElementById("control-trial");
        const trialStatus = document.getElementById("control-trial-status");

        const detailKey = document.getElementById("control-detail-key");
        const detailTitle = document.getElementById("control-detail-title");
        const detailDescription = document.getElementById(
            "control-detail-description"
        );

        // 【调参】修改 controls 的说明/分类；rows 修改键盘排布与键帽比例。
        // 格式：[键帽文字，操作名称，说明，颜色分类]
        // 【功能数据】展示用键位，不会更改用户游戏内设置。
        const controls = {
            Backquote: ["~", "控制台", "启用开发者控制台后，可使用绑定的按键打开控制台。", "equipment"],
            Tab: ["Tab", "计分板", "查看双方战绩、队伍及对局信息。实体体验中保留 Tab 的网页焦点导航功能。", "equipment"],

            KeyW: ["W", "前进", "按住 W，角色向前移动。", "movement"],
            KeyA: ["A", "向左移动", "按住 A，角色向左横移。", "movement"],
            KeyS: ["S", "后退", "按住 S，角色向后移动。", "movement"],
            KeyD: ["D", "向右移动", "按住 D，角色向右横移。", "movement"],
            ShiftLeft: ["Shift", "静步", "按住静步键行走，注意移动速度的变化。", "movement"],
            ShiftRight: ["Shift", "静步", "此处作为 Shift 的镜像演示；游戏内左右 Shift 可分别绑定。", "movement"],
            ControlLeft: ["Ctrl", "下蹲", "按住下蹲键，降低角色姿态。", "movement"],
            ControlRight: ["Ctrl", "下蹲", "此处作为 Ctrl 的镜像演示；实际功能以绑定为准。", "movement"],
            Space: ["Space", "跳跃", "按下跳跃键。也可以在游戏中设置其他跳跃绑定。", "movement"],

            Digit1: ["1", "主武器", "切换到已携带的主武器。", "equipment"],
            Digit2: ["2", "副武器", "切换到已携带的手枪。", "equipment"],
            Digit3: ["3", "近战武器", "切换到近战武器。", "equipment"],
            Digit4: ["4", "投掷物", "切换已携带的投掷物。", "equipment"],
            Digit5: ["5", "C4", "携带 C4 时切换到 C4。", "equipment"],
            KeyQ: ["Q", "切换武器", "切换到上一次使用的武器或装备。", "equipment"],
            KeyE: ["E", "使用 / 交互", "与可交互对象互动；满足条件时用于拆除 C4。", "equipment"],
            KeyR: ["R", "换弹", "为当前武器更换弹匣。", "equipment"],
            KeyF: ["F", "检视", "检视当前持有的武器。", "equipment"],
            KeyG: ["G", "丢弃", "丢弃当前可丢弃的武器或装备。", "equipment"],
            KeyB: ["B", "购买装备", "在允许购买时打开购买菜单。", "equipment"],
            KeyM: ["M", "选择队伍", "打开队伍选择界面。", "equipment"],
            KeyT: ["T", "涂鸦", "使用已装备的涂鸦功能。", "equipment"],

            KeyY: ["Y", "全局消息", "向当前对局发送全局文字消息。", "communication"],
            KeyU: ["U", "团队消息", "向己方队伍发送文字消息。", "communication"],
            KeyK: ["K", "语音交流", "参考图中的语音键。可在游戏设置中改成自己习惯的按键。", "communication"],
            KeyV: ["V", "自定义语音键", "前文推荐的语音绑定示例，需要先在游戏设置中完成绑定。", "communication"],
            KeyZ: ["Z", "无线电消息", "参考图中的无线电消息键位之一。", "communication"],
            KeyX: ["X", "无线电消息", "参考图中的无线电消息键位之一。", "communication"],
            KeyC: ["C", "无线电消息", "参考图中的无线电消息键位之一。", "communication"],

            MouseLeft: ["LMB", "开火", "鼠标左键：主要攻击；根据武器与操作方式进行点射或连续射击。", "equipment"],
            MouseRight: ["RMB", "次要攻击", "鼠标右键：开镜或次要攻击，具体行为取决于当前装备。", "equipment"],
            WheelUp: ["↑", "滚轮向上", "常用于切换武器；也可以自定义为跳跃等操作。", "equipment"],
            WheelDown: ["↓", "滚轮向下", "常用于切换武器；实际功能以游戏内绑定为准。", "equipment"]
        };

        // 每项为：[按键代码或装饰文字，宽度比例]。
        const rows = [
            [
                ["Backquote"], ["Digit1"], ["Digit2"], ["Digit3"],
                ["Digit4"], ["Digit5"], ["6"], ["7"], ["8"], ["9"], ["0"]
            ],
            [
                ["Tab"], ["KeyQ"], ["KeyW"], ["KeyE"], ["KeyR"],
                ["KeyT"], ["KeyY"], ["KeyU"], ["I"], ["O"], ["P"]
            ],
            [
                ["Caps"], ["KeyA"], ["KeyS"], ["KeyD"], ["KeyF"],
                ["KeyG"], ["H"], ["J"], ["KeyK"], ["L"], ["Enter"]
            ],
            [
                ["ShiftLeft"], ["KeyZ"], ["KeyX"], ["KeyC"], ["KeyV"],
                ["KeyB"], ["N"], ["KeyM"], [","], ["."], ["ShiftRight"]
            ],
            [
                ["ControlLeft", 1.5], ["Alt", 1.5], ["Space", 5],
                ["Alt", 1.5], ["ControlRight", 1.5]
            ]
        ];

        rows.forEach((row) => {
            const rowElement = document.createElement("div");
            rowElement.className = "control-key-row";

            row.forEach(([code, width = 1]) => {
                const binding = controls[code];
                const key = document.createElement(binding ? "button" : "span");

                key.className = "control-key";
                key.style.setProperty("--key-width", width);

                if (binding) {
                    key.type = "button";
                    key.dataset.control = code;
                    key.dataset.group = binding[3];
                    key.textContent = binding[0];
                    key.setAttribute("aria-label", `${binding[0]}：${binding[1]}`);
                    key.setAttribute("aria-pressed", "false");
                } else {
                    key.classList.add("is-placeholder");
                    key.textContent = code;
                    key.setAttribute("aria-hidden", "true");
                }

                rowElement.append(key);
            });

            keyboard.append(rowElement);
        });

        trialButton.hidden = false;
        const buttons = [...panel.querySelectorAll("[data-control]")];
        const keyNodes = new Map();

        buttons.forEach((button) => {
            const code = button.dataset.control;
            const nodes = keyNodes.get(code) || [];
            nodes.push(button);
            keyNodes.set(code, nodes);
            button.setAttribute("aria-pressed", "false");
        });

        let selectedCode = "";
        let trialEnabled = false;
        const physicalKeys = new Set();
        const flashTimers = new Map();

        function selectControl(code) {
            const binding = controls[code];
            if (!binding || selectedCode === code) return;

            selectedCode = code;

            buttons.forEach((button) => {
                const selected = button.dataset.control === code;
                button.classList.toggle("is-selected", selected);
                button.setAttribute("aria-pressed", String(selected));
            });

            detailKey.textContent = binding[0];
            detailTitle.textContent = binding[1];
            detailDescription.textContent = binding[2];
        }

        function setDown(code, pressed) {
            (keyNodes.get(code) || []).forEach((node) => {
                node.classList.toggle("is-down", pressed);
            });
        }

        function flashControl(code) {
            clearTimeout(flashTimers.get(code));
            setDown(code, true);

            flashTimers.set(code, setTimeout(() => {
                if (!physicalKeys.has(code)) setDown(code, false);
                flashTimers.delete(code);
            }, CONFIG.keyFlashMs));
        }

        function clearPressedKeys() {
            physicalKeys.clear();
            flashTimers.forEach(clearTimeout);
            flashTimers.clear();
            buttons.forEach((button) => button.classList.remove("is-down"));
        }

        function setTrial(enabled) {
            trialEnabled = enabled;
            clearPressedKeys();

            trialButton.setAttribute("aria-pressed", String(enabled));
            trialButton.textContent = enabled ? "退出按键体验" : "实体按键体验";
            trialStatus.textContent = enabled
                ? "现在可按键体验；Esc 退出，Tab 切换焦点。"
                : "悬浮或点击按键，查看操作说明。";
        }

        buttons.forEach((button) => {
            const code = button.dataset.control;

            button.addEventListener("pointerenter", (event) => {
                if (event.pointerType === "mouse") selectControl(code);
            });

            button.addEventListener("focus", () => selectControl(code));

            button.addEventListener("click", () => {
                selectControl(code);
                flashControl(code);
            });
        });

        // 只在图中的右键按钮上处理真实右击，不影响网页其他位置。
        panel.querySelector('[data-control="MouseRight"]')
            .addEventListener("contextmenu", (event) => {
                event.preventDefault();
                selectControl("MouseRight");
                flashControl("MouseRight");
            });

        trialButton.addEventListener("click", () => {
            setTrial(!trialEnabled);

            if (trialEnabled) {
                panel.focus({ preventScroll: true });
            }
        });

        panel.addEventListener("keydown", (event) => {
            if (!trialEnabled) return;

            if (event.code === "Escape") {
                event.preventDefault();
                setTrial(false);
                trialButton.focus({ preventScroll: true });
                return;
            }

            // 【修补】只有面板自身聚焦时拦截实体按键；Tab 到按钮后，Space/Enter 仍能正常点击按钮。
            if (event.target !== panel) return;

            // 保留网页导航和浏览器组合快捷键。
            if (event.code === "Tab" || event.isComposing ||
                event.metaKey || event.altKey ||
                (event.ctrlKey && !event.code.startsWith("Control"))) {
                return;
            }

            if (!controls[event.code] || !keyNodes.has(event.code)) return;

            event.preventDefault();

            if (event.repeat) return;

            physicalKeys.add(event.code);
            selectControl(event.code);
            setDown(event.code, true);
        });

        panel.addEventListener("keyup", (event) => {
            if (!physicalKeys.has(event.code)) return;

            event.preventDefault();
            physicalKeys.delete(event.code);
            setDown(event.code, false);
        });

        // 离开组件或浏览器失焦后退出，避免出现按键一直亮着的状态。
        panel.addEventListener("focusout", (event) => {
            if (!panel.contains(event.relatedTarget)) setTrial(false);
        });

        window.addEventListener("blur", () => setTrial(false));

        document.addEventListener("visibilitychange", () => {
            if (document.hidden) setTrial(false);
        });

        selectControl("KeyW");
    }

    // ==================== 02 章节刻度导航 ====================
    function initChapterRail() {
        const sections = [...document.querySelectorAll(".guide-section")];
        const links = [...document.querySelectorAll(".chapter-rail a")];

        if (!sections.length || !links.length) return;

        let currentId = null;
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

            for (const section of sections) {
                if (section.getBoundingClientRect().top <= referenceLine) {
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
                    ? "已暂停 · 移入继续" : "已暂停 · 使用播放器按钮播放";
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
                    stateText.textContent = "请使用播放器按钮开始播放";
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
                ? "移入视频区域播放" : "使用播放器按钮播放";
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

        // ==================== 文字注释气泡 ====================
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

    // 【关键】每项单独初始化；控制台保留错误，防止一个板块阻断其余功能。
    // 各板块独立初始化
for (const initialize of [
    initControlGuide,
    initChapterRail,
    initAimAxes,
    initLessonVideos,
    initBuyGuide,
    initCrosshairCopy,
    initTextNotes
]) {
    try {
        initialize();
    } catch (error) {
        console.error(initialize.name, error);
    }
}
})();
