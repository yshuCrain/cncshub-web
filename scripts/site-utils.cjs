const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
function sourceFiles(directory = root) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') return [];
        // dist 是 Vite 的构建产物：里面的 HTML 用根绝对路径引用带哈希的资源，
        // 拿「源码检查器」去查它只会得到一堆假报错。产物质量由 preview + 探针负责。
        if (directory === root && entry.name === 'dist') return [];
        // templates 里是待注入的 HTML 片段（如导航条母版），含 {{BASE}} 占位符，
        // 不是可独立打开的页面，也不该进搜索索引。
        if (directory === root && entry.name === 'templates') return [];
        const file = path.join(directory, entry.name);
        return entry.isDirectory() ? sourceFiles(file) : /\.(html|css|js|jsx|mjs|cjs)$/.test(file) ? [file] : [];
    }).sort();
}

// 构建入口、组件生成器和搜索索引共用同一份页面清单。
function pageFiles() {
    const excluded = new Set(['scripts', 'src', 'templates', 'tests']);
    return sourceFiles().filter(file => file.endsWith('.html') &&
        !excluded.has(path.relative(root, file).split(path.sep)[0]));
}

function decodeEntities(text) {
    const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
    return text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, key) => {
        if (key[0] !== '#') return named[key.toLowerCase()];
        const code = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : Number(key.slice(1));
        return code <= 0x10ffff ? String.fromCodePoint(code) : entity;
    });
}

function plainText(html) {
    return decodeEntities(html.replace(/<!--[\s\S]*?-->|<(script|style|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
        .replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function attributes(tag) {
    return Object.fromEntries([...tag.matchAll(/([^\s=<>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
        .map(match => [match[1].toLowerCase(), decodeEntities(match[2] ?? match[3] ?? match[4])]));
}

function searchEntries() {
    const entries = [];
    for (const file of pageFiles()) {
        const html = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
        const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || '';
        const page = plainText(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '')
            .replace(/\s*[-–]\s*反恐精英中文网$/, '');
        const url = path.relative(root, file).split(path.sep).join('/');
        entries.push({ title: page, page, url, text: plainText(main).slice(0, 2200) });
        for (const match of main.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/gi)) {
            const id = attributes(match[1]).id;
            const heading = match[2].match(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/i);
            if (!id || !heading) continue;
            entries.push({ title: plainText(heading[1]), page, url: url + '#' + id, text: plainText(match[2]).slice(0, 2200) });
        }
    }
    return entries;
}


module.exports = { root, sourceFiles, pageFiles, decodeEntities, plainText, attributes, searchEntries };
