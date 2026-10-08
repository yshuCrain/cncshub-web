/* 全站首屏主题预置 · assets/js/theme-init.js
   ────────────────────────────────────────────────────────────────
   【为什么必须有这个文件】
   在页面首次绘制之前就把主题写到 <html data-theme> 上，避免深色模式用户
   先看到一帧浅色背景（白闪）。这段逻辑必须：
     1. 在 <head> 里执行 —— 外部 defer 脚本晚于首次绘制，来不及；
     2. 同步执行 —— 内联或普通 <script src>，不能加 defer / async。
   引用方式（每个页面都要写，放在样式表之前、body 之前）：
       <script src="../assets/js/theme-init.js"></script>

   【取值优先级】用户手动选择（localStorage）> 系统偏好 > 浅色。
   键名 cncs-theme 与 assets/js/site.js 中的切换逻辑保持一致，改动要同步。
   ──────────────────────────────────────────────────────────────── */

(function () {
    "use strict";

    var root = document.documentElement;
    var saved = null;

    try {
        saved = localStorage.getItem("cncs-theme");
    } catch (e) {
        /* 浏览器禁用本地存储（无痕模式、隐私策略）时忽略，
           回退到系统偏好即可，不影响页面渲染。 */
    }

    root.dataset.theme =
        saved === "dark" || saved === "light"
            ? saved
            : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
})();
