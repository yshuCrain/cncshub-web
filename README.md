# 反恐精英中文网

Vite 多页静态站点。正文、导航和页脚保留在 HTML 中；搜索、主题、音乐与媒体查看由 React 岛屿负责。页面级教学演示继续由独立脚本增强。

## 开发与构建

```sh
npm ci                  # 按 package-lock.json 安装依赖
npm run dev             # 开发服务器，默认端口 5173
npm run build           # 同步组件与索引 → 校验 → 单元测试 → 生产构建
npm run preview         # 预览 dist，默认端口 4173
```

`dev` 与 `build` 会自动更新生成内容。React 组件需要 HTTP 环境，请使用开发服务器或构建预览；直接双击源 HTML 不能运行 React 交互。

## 模块边界

| 模块 | 职责与维护入口 |
| --- | --- |
| 静态公共组件 | `templates/site-header.html`、`site-footer.html`；新手页使用 `article-footer.html` 变体。模板通过 `scripts/build-components.cjs` 同步到所有页面。 |
| 公共样式 | `assets/css/common.css` 使用 `foundation` 层；各页面 CSS 使用 `pages` 层。所有样式先声明同一层级顺序，因此链接重排也不会改变覆盖关系。公共 CSS 在产物中共享一份。 |
| 首帧主题 | `assets/js/theme-init.js` 在 `<head>` 同步执行，避免主题闪烁。 |
| 公共导航 | `assets/js/site.js` 仅负责导航展开、键盘操作与滚动显隐。 |
| React 入口 | `src/main.jsx` 挂载；`src/App.jsx` 组装组件并挂入导航中的工具槽位。媒体组件只在含放大入口的页面加载。 |
| 搜索 | `src/components/SiteSearch.jsx` 负责界面，`search-utils.js` 负责匹配与摘要；数据由 HTML 正文生成到 `src/data/search-index.json`，通过模块导入。 |
| 弹层 | `src/components/Modal.jsx` 统一 Portal、焦点隔离、Escape、滚动锁、关闭过渡及焦点恢复。搜索和媒体查看共用它。 |
| 工具控件 | `ThemeToggle.jsx`、`AudioToggle.jsx` 独立维护状态；图标与音频通过导入交给 Vite 处理。 |
| 媒体查看 | `MediaLightbox.jsx` 共用弹层；`src/lib/media-source.js` 从预览元素读取实际素材地址，支持图片、视频和带标注的 SVG。 |
| 页面交互 | `assets/js/index.js` 负责首页视频与打字效果；`rookie-guides.js` 保留键鼠演示、章节导航、教学动画、准心复制及文字注释；`map-guides.js` 控制地图九宫格的行列比例与悬停、键盘聚焦。 |

构建入口、组件生成器与搜索索引共同使用 `scripts/site-utils.cjs` 的页面清单。工具、模板、依赖和旧构建产物均不作为网站页面。

## 内容与组件修改

Dust2 的六个文件夹以 `content/dust2.md` 为正文快照。修改快照后运行 `npm run dust2`（启动与构建也会自动执行）；`scripts/build-dust2.cjs` 生成该页主内容，公共导航和页脚仍由原组件流程维护。外部 Obsidian 文件不会被改写或自动同步。

`assets/css/dust2.css` 和 `assets/js/dust2.js` 负责斜轴浏览、抽出展开、前后覆盖和窗口内外的独立滚动。可用窗口外滚轮、下方箭头或键盘方向键翻章；第一章向前、空白处、标签上的 × 或 Escape 返回总览。正文不向外传递滚动。没有脚本时保留六章的普通文档阅读。

B1 站位截图存放在 `assets/images/servicemaps/dust2/`。编号依次对应原截图时间 `03.00.06.09`、`02.59.43.88`、`03.03.03.25`、`02.59.03.68`、`03.03.10.08`。悬停、聚焦或点击圆圈可预览，放大查看复用公共媒体组件。

导航、页脚只修改对应模板，再执行 `npm run components`；不要单独修改某个页面的生成片段。正文继续修改 HTML。搜索数据为生成文件，内容变化后运行 `npm run index`；正常启动和构建时会自动更新。

```sh
npm run prepare:site    # 同步导航、页脚与搜索数据
npm run check           # 资源、ID、锚点、ARIA 引用、模板同步和索引时效
npm test                # 页面清单、组件幂等性、搜索、部署路径和普通脚本指纹
```

JSX 和构建配置的语法由生产构建检查。搜索探针位于 `scripts/search-island-probe.html`，通过开发服务器访问，焦点失败会真实记录为失败。

修改交互后需检查桌面与手机：导航展开、搜索跳转、关闭期间重新打开、Tab 焦点循环、图片/视频/SVG 放大、音乐连续点击以及主题同步。测试生产产物，不能只检查开发服务器。

## 素材与部署

React 中的图标和素材使用 `import`。静态 HTML 使用 `src`、`poster`、SVG `image href` 等真实资源属性。媒体放大入口不重复保存图片或视频 URL，而是读取旁边预览元素已经由 Vite 改写的地址；图示的 `data-src` 是页面内 SVG 选择器。

音乐与教学视频使用 `preload="none"`。首页背景视频仅在首屏可见、页面处于前台且允许动态效果时播放。教学视频保留悬浮预览和点击放大播放。

`scripts/vite-classic-assets.mjs` 将实际引用的普通脚本作为带内容指纹的构建资产输出，保留同步/`defer` 语义。部署完整的 `dist/`，无需额外复制源码目录。

地图总览使用 `assets/images/servicemaps/marks/` 中九个原创单色 SVG；CSS 蒙版让标志随主题与交互色变化。原始地图徽章保留在 `icons/`。地图入口是原生链接，未启用 JavaScript 时仍可跳转。

当前 `.gitignore` 按原有约定排除了图片、字体、音视频等素材，原创几何地图 SVG 作为源码单独放行。若从 Git 克隆后构建，需另行同步其余素材；本机的完整素材已纳入 `dist/`。

子目录与相对路径部署可通过 Vite 的 base 参数构建：

```sh
npm run build -- --base=/cs/
npm run build -- --base=./
```

SSH 私钥保存在用户家目录，不属于网站源码或发布产物。
