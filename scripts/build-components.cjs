const fs = require('node:fs');
const path = require('node:path');
const { root, pageFiles } = require('./site-utils.cjs');
const { applyToSource: applyHeader, currentHeaderOf, headerBlockFor } = require('./build-header.cjs');

function footerBlockFor(file) {
    const variant = path.relative(root, file).split(path.sep).join('/') === 'guides/rookie-guides.html' ? 'article-footer' : 'site-footer';
    return fs.readFileSync(path.join(root, 'templates', variant + '.html'), 'utf8').trim();
}
function footerRange(source) {
    // 先排除注释中的示例标签，定位唯一真实的 footer。
    const masked = source.replace(/<!--[\s\S]*?-->/g, match => ' '.repeat(match.length));
    const matches = [...masked.matchAll(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi)];
    if (matches.length !== 1) throw new Error('Expected one footer, found ' + matches.length);
    return { start: matches[0].index, end: matches[0].index + matches[0][0].length };
}
function currentFooterOf(source) {
    const { start, end } = footerRange(source);
    return source.slice(start, end).split(/\r?\n/).map(line => line.trim()).join('\n');
}
function applyComponents(file, source) {
    let updated = applyHeader(file, source);
    if (updated === null) throw new Error('Missing site header: ' + file);
    const { start, end } = footerRange(updated);
    const lineStart = updated.lastIndexOf('\n', start) + 1;
    const indent = updated.slice(lineStart, start).match(/^\s*$/)?.[0] || '';
    const eol = source.includes('\r\n') ? '\r\n' : '\n';
    const block = footerBlockFor(file).split('\n').map((line, index) => index ? indent + line : line).join(eol);
    return updated.slice(0, start) + block + updated.slice(end);
}
if (require.main === module) {
    let changed = 0;
    for (const file of pageFiles()) {
        const source = fs.readFileSync(file, 'utf8');
        const updated = applyComponents(file, source);
        if (source === updated) continue;
        fs.writeFileSync(file, updated);
        changed++;
    }
    console.log('Static components synchronized: ' + changed + ' / ' + pageFiles().length + ' pages updated.');
}
module.exports = { applyComponents, footerBlockFor, currentFooterOf, currentHeaderOf, headerBlockFor };
