const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { root, sourceFiles, attributes, searchSource } = require('./site-utils.cjs');

const errors = [];
const files = sourceFiles();
const complain = (file, message) => errors.push(path.relative(root, file) + ': ' + message);
for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    if (/\.(js|cjs)$/.test(file)) {
        try { new vm.Script(source, { filename: file }); }
        catch (error) { complain(file, error.message); }
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
    for (const tag of tags) {
        const attrs = attributes(tag);
        for (const name of ['src', 'href', 'poster']) if (attrs[name]) references.push(attrs[name]);
        for (const name of ['aria-controls', 'aria-labelledby', 'aria-describedby']) {
            for (const id of (attrs[name] || '').split(/\s+/).filter(Boolean)) {
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
        const target = relative ? path.resolve(path.dirname(file), decodeURIComponent(relative.split('?')[0])) : file;
        if (!fs.existsSync(target)) { complain(file, 'Missing resource: ' + reference); continue; }
        if (fragment && target.endsWith('.html')) {
            const targetIds = [...fs.readFileSync(target, 'utf8').replace(/<!--[\s\S]*?-->/g, '').matchAll(/<[a-z][^>]*>/gi)]
                .map(match => attributes(match[0]).id);
            if (!targetIds.includes(decodeURIComponent(fragment))) complain(file, 'Missing anchor: ' + reference);
        }
    }
}
const indexFile = path.join(root, 'assets/js/search-index.js');
if (!fs.existsSync(indexFile) || fs.readFileSync(indexFile, 'utf8') !== searchSource()) {
    complain(indexFile, 'Search index is outdated; run node scripts/build-search-index.cjs');
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log('Checked ' + files.length + ' source files: syntax, local resources, IDs, anchors and search index are valid.');
