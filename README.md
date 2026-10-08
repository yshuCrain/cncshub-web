# 反恐精英中文网

纯静态网站，无需安装前端依赖或构建框架。可直接打开 `index.html`，也可通过静态服务器预览。

## 代码结构

- `assets/css/common.css`：全站字体、主题、导航、搜索与基础布局。
- `assets/js/theme-init.js`：在首帧前恢复主题，同步放在各页的 `<head>` 中。
- `assets/js/site.js`：公共导航、搜索弹层、主题切换和音乐控制，使用 `defer`。
- `assets/js/search-index.js`：从页面正文生成的搜索数据，在 `site.js` 之前加载。
- `assets/css/index.css`、`assets/js/index.js`：首页专用代码。
- `assets/css/rookie-guides.css`、`assets/js/rookie-guides.js`：新手教学专用代码。
- `assets/css/map-guides.css`：地图页面与基础文章排版。
- `guides/servicemaps/`：七张地图页面。

页面先引入公共样式，再引入页面样式。颜色和字体优先使用公共变量；新增组件保持直角、细线框与明确的视觉层级。

## 修改内容后的检查

使用 Node.js 运行以下命令，无需 `npm install`：

```sh
node scripts/build-search-index.cjs
node scripts/check-site.cjs
```

第一个命令更新页面及带锚点的教学章节索引，第二个命令检查脚本语法、本地资源、重复 ID、锚点、辅助说明引用及搜索索引是否最新。搜索索引应随 HTML 内容一起更新。

修改公共交互后，需检查首页、新手教学、地图总览和一张地图详情页的桌面与手机布局，确认导航展开、Escape 关闭、搜索结果跳转、主题切换和焦点恢复正常。

## 媒体约定

背景音乐与教学视频使用 `preload="none"`；视频封面和原生图片尺寸负责预留位置。首页背景视频仅在首屏可见且允许动态效果时播放，离开首屏或切换到后台时暂停。教学视频保留悬浮预览和点击放大播放。

素材与相应 HTML 使用相对路径；静态部署应包含 `assets` 中实际使用的字体、图标、图片、音频和视频文件。
