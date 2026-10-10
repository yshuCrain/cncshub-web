/* ============================================================================
 * scripts/build-header.cjs —— 把导航条模板同步到全部页面
 * ----------------------------------------------------------------------------
 * 【解决什么问题】
 *   顶部导航条原本在 12 个 HTML 里各写一份（共 836 行），改一个导航项要改 12 处，
 *   漏改就出现线上不一致。现在收敛为：
 *       templates/site-header.html （唯一来源）
 *         → 本脚本注入到 12 个页面的 <header> 位置
 *         → check-site.cjs 校验「页面与模板是否一致」
 *   与工程里已有的「search-index.js 生成 + check 校验同步」是同一套范式。
 *
 * 【为什么不用 React 组件】
 *   导航必须在 HTML 里就存在：它是首屏内容、是 SEO 的入口、也是无 JS 时唯一的
 *   站内跳转手段。运行时渲染会牺牲这三点。这里选的是「构建期注入」——
 *   单一真源与静态输出两者兼得。
 *
 * 用法：npm run header（或直接 node scripts/build-header.cjs）
 * ==========================================================================*/

const fs = require('node:fs');
const path = require('node:path');
const { root, pageFiles } = require('./site-utils.cjs');

const TEMPLATE_FILE = path.join(root, 'templates/site-header.html');
// 只有首页的导航浮在首屏视频之上（透明背景），其余页面带底边线。
const OVERLAY_PAGES = new Set([path.join(root, 'index.html')]);
// 这些目录里的 HTML 不是站点页面：脚本工具、React 源码、模板本身。

/**
 * 站点根目录的相对前缀。按页面深度推导，页面搬家也不用手工改：
 *   index.html                → ./
 *   guides/map-guides.html    → ../
 *   guides/servicemaps/mirage → ../../
 */
function basePrefixFor(file) {
    const depth = path.relative(root, file).split(path.sep).length - 1;
    return depth ? '../'.repeat(depth) : './';
}

let templateSource = null;
/**
 * 读取模板，剔掉文件顶部的说明注释（那些注释是给维护者看的，不该注入页面）。
 * 【为什么按「行」切，而不是 indexOf('<header')】
 *   注释里完全可能提到 header 这个词；用字符串查找会命中注释，
 *   把注释尾巴当成正文注入 12 个页面（这个坑已经踩过一次）。
 *   只在「行首」匹配标签，注释里的同名文本就不会被误认。
 */
function templateBody() {
    if (templateSource === null) templateSource = fs.readFileSync(TEMPLATE_FILE, 'utf8');
    const lines = templateSource.split(/\r?\n/);
    const start = lines.findIndex(line => /^<header\b/.test(line));
    if (start === -1) throw new Error('模板里找不到以 <header 开头的行：' + TEMPLATE_FILE);
    return lines.slice(start).join('\n').replace(/\s+$/, '');
}

/** 生成某个页面应该拥有的导航条（未加缩进的版本）。 */
function headerBlockFor(file) {
    return templateBody()
        .replace(/\{\{BASE\}\}/g, basePrefixFor(file))
        .replace(/\{\{OVERLAY\}\}/g, OVERLAY_PAGES.has(file) ? ' is-overlay' : '');
}

/** 给每一行补上目标页面的缩进，保持与周围代码一致。 */
function indentBlock(block, indent) {
    return block.split('\n').map(line => (line ? indent + line : line)).join('\n');
}

/** 在页面源码里定位 <header> … </header> 的起止行号，找不到返回 null。 */
function headerRange(lines) {
    const start = lines.findIndex(line => /^\s*<header\b/.test(line));
    if (start === -1) return null;
    const end = lines.findIndex((line, index) => index > start && /^\s*<\/header>/.test(line));
    return end === -1 ? null : { start, end };
}

/** 把模板渲染结果写回页面源码；返回 null 表示该页面没有导航条（不该被处理）。 */
function applyToSource(file, source) {
    const eol = source.includes('\r\n') ? '\r\n' : '\n';
    const lines = source.split(/\r?\n/);
    const range = headerRange(lines);
    if (!range) return null;
    const indent = (lines[range.start].match(/^\s*/) || [''])[0];
    const rendered = indentBlock(headerBlockFor(file), indent).split('\n');
    return [...lines.slice(0, range.start), ...rendered, ...lines.slice(range.end + 1)].join(eol);
}

/** 供 check-site.cjs 调用：返回页面当前的导航条（去缩进，便于比对）。 */
function currentHeaderOf(source) {
    const range = headerRange(source.split(/\r?\n/));
    if (!range) return null;
    return source.split(/\r?\n/).slice(range.start, range.end + 1)
        .map(line => line.trim()).join('\n');
}

if (require.main === module) {
    let changed = 0;
    let skipped = 0;
    for (const file of pageFiles()) {
        const source = fs.readFileSync(file, 'utf8');
        const updated = applyToSource(file, source);
        if (updated === null) { skipped++; continue; }
        if (updated === source) continue;
        fs.writeFileSync(file, updated, 'utf8');
        changed++;
        console.log('  已同步 ' + path.relative(root, file).split(path.sep).join('/'));
    }
    console.log('\n导航条同步完成：' + changed + ' 个页面有变化'
        + (skipped ? '，' + skipped + ' 个页面无导航条（已跳过）' : '') + '。');
}

module.exports = { pageFiles, basePrefixFor, headerBlockFor, applyToSource, currentHeaderOf };
