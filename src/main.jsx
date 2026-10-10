/* ============================================================================
 * src/main.jsx —— React 的入口：把 <App/> 装进挂载点
 * ----------------------------------------------------------------------------
 * 三行代码，各干一件事：
 *   1. createRoot   —— 在指定 DOM 节点上建立一个 React 管理区（React 18+ 的写法，
 *                      取代旧的 ReactDOM.render）；
 *   2. <App />      —— 「大写开头 = 组件」。它看起来像 HTML，实际是函数调用；
 *   3. render       —— 把组件渲染出来的 DOM 插进挂载点。
 *
 * 【挂载点在哪】每个页面 </body> 前的 <div id="app-root"></div>。
 *   HTML 从此退化成「骨架 + 挂载点」：静态内容照旧写死在 HTML 里（利于首屏和 SEO），
 *   动态交互块由 React 通过挂载点接管。
 *
 * 【为什么 12 个页面共用这一个入口】
 *   Vite 构建时会做共享：12 个页面引用的是同一份 main.jsx 产物，
 *   React 本体只会被打包、下载一次，页面之间共享缓存。
 * ==========================================================================*/

import { createRoot } from "react-dom/client";
import App from "./App.jsx";

const mount = document.getElementById('app-root');
if (mount) createRoot(mount).render(<App />);
