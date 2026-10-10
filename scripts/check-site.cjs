const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { root, sourceFiles, attributes, pageFiles, searchEntries } = require('./site-utils.cjs');
const { headerBlockFor, currentHeaderOf, footerBlockFor, currentFooterOf } = require('./build-components.cjs');

const errors = [];
const files = sourceFiles();
const complain = (file, message) => errors.push(path.relative(root, file) + ': ' + message);
for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    if (/\.(js|cjs)$/.test(file)) {
        // vm.Script 只认传统脚本语法。src/ 下的源码是给 Vite 的 ESM/JSX，
        // import/export 在这里会误报；它们的语法正确性由构建时的编译器把关。
        const usesModuleSyntax = /^\s*(?:import|export)\b/m.test(source);
        if (!usesModuleSyntax) {
            try { new vm.Script(source, { filename: file }); }
            catch (error) { complain(file, error.message); }
        }
        continue;
    }
    const clean = source.replace(/<!--[\s\S]*?-->|\/\*[\s\S]*?\*\//g, '');
    const tags = file.endsWith('.html') ? [...clean.matchAll(/<[a-z][^>]*>/gi)].map(match => match[0]) : [];
    const ids = tags.map(tag => attributes(tag).id).filter(Boolean);
    const seen = new Set();
    for (const id of ids) {
        if (seen.has(id)) complain(file, 'Duplicate ID: ' + id);
        seen.add(id);
    }
    const references = [];
    // React 岛屿渲染出来的 id 不在静态 HTML 里（如搜索弹层），静态检查扫不到，
    // 列在这里表示「运行时由 src/ 下的组件负责提供」。
    const islandIds = new Set(['site-search-overlay']);
    for (const tag of tags) {
        const attrs = attributes(tag);
        for (const name of ['src', 'href', 'poster']) if (attrs[name]) references.push(attrs[name]);
        for (const name of ['aria-controls', 'aria-labelledby', 'aria-describedby']) {
            for (const id of (attrs[name] || '').split(/\s+/).filter(Boolean)) {
                if (islandIds.has(id) && seen.has('app-root') && tags.some(tag => {
                    const script = attributes(tag);
                    return /^<script\b/i.test(tag) && script.type === 'module' && script.src === '/src/main.jsx';
                })) continue;
                if (!seen.has(id)) complain(file, 'Missing ' + name + ' target: ' + id);
            }
        }
        if (/^<img\b/i.test(tag) && !Object.hasOwn(attrs, 'alt')) complain(file, 'Image missing alt text');
        if (attrs.target === '_blank' && !(attrs.rel || '').split(/\s+/).includes('noopener')) {
            complain(file, 'External tab link missing rel="noopener"');
        }
    }
    if (file.endsWith('.css')) references.push(...[...clean.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map(match => match[1]));
    for (const reference of references) {
        if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(reference)) continue;
        const [relative, fragment] = reference.split('#');
        // 以 / 开头的是「站点根绝对路径」（如 /src/main.jsx），
        // 要相对站点根目录解析，而不是相对当前文件所在目录。
        // 注意用 join 而不是 resolve：Windows 上 resolve 会把 /src 解释成当前盘符的根目录。
        const base = relative.startsWith('/') ? root : path.dirname(file);
        const target = relative
            ? (relative.startsWith('/')
                ? path.join(root, decodeURIComponent(relative.split('?')[0]))
                : path.resolve(base, decodeURIComponent(relative.split('?')[0])))
            : file;
        if (!fs.existsSync(target)) { complain(file, 'Missing resource: ' + reference); continue; }
        if (fragment && target.endsWith('.html')) {
            const targetIds = [...fs.readFileSync(target, 'utf8').replace(/<!--[\s\S]*?-->/g, '').matchAll(/<[a-z][^>]*>/gi)]
                .map(match => attributes(match[0]).id);
            if (!targetIds.includes(decodeURIComponent(fragment))) complain(file, 'Missing anchor: ' + reference);
        }
    }
}
// 导航条同步：每个页面里的 <header> 必须与 templates/site-header.html 的生成结果一致。
// 比对前统一去除缩进，避免「只是缩进不同」被当成不一致。
for (const file of pageFiles()) {
    const source = fs.readFileSync(file, 'utf8');
    const current = currentHeaderOf(source);
    if (current === null) { complain(file, 'Missing header block'); continue; }
    const expected = headerBlockFor(file).split('\n').map(line => line.trim()).join('\n');
    if (current !== expected) complain(file, 'Navigation is outdated; run node scripts/build-header.cjs');
    try {
        const footer = footerBlockFor(file).split('\n').map(line => line.trim()).join('\n');
        if (currentFooterOf(source) !== footer) complain(file, 'Footer is outdated; run npm run components');
    } catch (error) { complain(file, error.message); }
}
const indexFile = path.join(root, 'src/data/search-index.json');
if (!fs.existsSync(indexFile) || fs.readFileSync(indexFile, 'utf8') !== JSON.stringify(searchEntries(), null, 2) + '\n') {
    complain(indexFile, 'Search index is outdated; run node scripts/build-search-index.cjs');
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log('Checked ' + files.length + ' source files: syntax, local resources, IDs, anchors and search index are valid.');
