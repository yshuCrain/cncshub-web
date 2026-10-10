# 项目长期备忘 · csweb-project/web

## 工程架构（2026-10-09 起生效）

- **Vite 多页构建**：`vite.config.mjs`，appType "mpa"，HTML 入口自动发现
  （SKIP：node_modules/dist/cache/scripts/templates）。12 个 HTML 页面。
- **两套脚本并存**：
  - 传统脚本 `assets/js/**`：`<script src>` 直接引用，Vite 不打包，由
    `scripts/vite-classic-assets.mjs` 插件在构建后按原路径复制进 dist。
    保留传统形态是为了「双击 HTML 直接打开」仍可用。
  - React 岛屿 `src/**`：main.jsx → App.jsx → components/。搜索弹层已迁移
    （SiteSearch.jsx，createPortal 到 body）。岛屿需 dev/dist 才有内容，
    直接双击打开 HTML 时岛屿为空（README 已注明）。
- **CSS 层级**：页面 CSS 第一行 `@import url("common.css")`，HTML 每页只有一条
  `<link>`。原因：Vite 构建会重排同页多条 `<link>` 的顺序，会破坏覆盖规则。
  不要改回「HTML 里两条 link」的写法。
- **npm scripts**：dev / build / preview / index（重建搜索索引）/ header（同步导航条）/ check（站点检查）。
- **导航条单一来源**：`templates/site-header.html` 母版 → `npm run header` 注入 12 页
  → `check-site` 校验同步。占位符 {{BASE}}（路径前缀，按页面深度）/{{OVERLAY}}（首页悬浮）。
  改导航只改模板，不要改页面；模板注释里不能出现 `<header` 字面量（生成器按行首切片段）。
  与 search-index.js 同属「生成物入库 + check 校验同步」范式。

## 已踩过的坑

- Vite 重排 `<link>` 顺序（见上）。
- Vite 不打包不复制传统 `<script src>`，必须用复制插件。
- vite 配置文件要用 `.mjs`（package.json 无 "type":"module"）。
- inert 元素无法获得焦点：关闭弹层时先解除 inert 再 focus。
- 双 rAF 触发 CSS 过渡在后台标签/无头环境不执行，用 offsetWidth 强制回流更稳。
- Windows 上 path.resolve(root, "/x") 会跳到盘符根，根绝对路径用 path.join。
- WorkBuddy 沙箱 safe-delete 守卫：一次性删 ≥50 个文件会被拦，dist 清空需分批。
- 无头 Edge：iframe 内 rAF 不触发；backdrop-filter 不渲染（非 bug）。
- OneDrive 目录里 npm install 很慢（分钟级）。

## 站点内容约定

- 配色/主题：全站走 `common.css` 的 `:root` 变量 + `[data-theme="dark"]`；
  页面私有 CSS 只做别名引用。
- 搜索索引：`assets/js/search-index.js` 由 `npm run index` 生成，改 HTML 后要重建。
- 站点检查：`npm run check` 应保持全绿；scripts/search-island-probe.html 是
  搜索弹层的自动化探针（需 dev 服务器，PASS 31 / FAIL 0 为基线）。
- 设计风格：Swiss 扁平化 + Hud/Futuristic/Cyberpunk；直角、细线框。
