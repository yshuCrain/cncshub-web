import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { buildSearchEntries, searchEntries, normalize, excerptFor } from '../src/components/search-utils.js';
import { classicScriptAssets } from '../scripts/vite-classic-assets.mjs';
import { siteBaseFor } from '../src/lib/site-url.js';

const require = createRequire(import.meta.url);
const { root, pageFiles, searchEntries: generatedEntries } = require('../scripts/site-utils.cjs');
const { applyComponents, currentHeaderOf, headerBlockFor, currentFooterOf, footerBlockFor } = require('../scripts/build-components.cjs');

test('One page registry excludes build outputs, tools and templates', () => {
    assert.equal(pageFiles().length, 14);
    assert.ok(pageFiles().every(file => !/[/\\](dist|scripts|templates|src)[/\\]/.test(path.relative(root, file))));
});
test('Static component synchronization is idempotent at every page depth', () => {
    for (const file of pageFiles()) {
        const source = fs.readFileSync(file, 'utf8');
        const updated = applyComponents(file, source);
        assert.equal(applyComponents(file, updated), updated);
        assert.equal(currentHeaderOf(updated), headerBlockFor(file).split('\n').map(line => line.trim()).join('\n'));
        assert.equal(currentFooterOf(updated), footerBlockFor(file).split('\n').map(line => line.trim()).join('\n'));
        assert.equal(updated.includes('site-header is-overlay'), file === path.join(root, 'index.html'));
    }
});
test('Search normalizes width and case, requires all terms, and ranks specific chapters', () => {
    assert.equal(normalize(' ＣＳ２ Mirage '), 'cs2 mirage');
    const entries = buildSearchEntries(generatedEntries());
    assert.ok(searchEntries(entries, 'mirage').matches.some(({ entry }) => entry.url.endsWith('/mirage.html')));
    assert.equal(searchEntries(entries, '语音').matches[0].entry.url, 'guides/rookie-guides.html#communication');
    assert.equal(searchEntries(entries, '准心设置').matches[0].entry.url, 'guides/rookie-guides.html#crosshair');
    assert.ok(searchEntries(entries, 'mirage 站位').total > 0);
    assert.equal(searchEntries(entries, 'mirage 不存在的关键词').total, 0);
    assert.deepEqual(searchEntries(entries, '  '), { terms: [], total: 0, matches: [] });
    assert.ok(excerptFor({ page: '地图', text: 'Example Mirage 中路' }, 'mirage').includes('Mirage'));
});
test('Generated index includes all eight rookie chapters and real destinations', () => {
    const entries = generatedEntries();
    const rookie = entries.filter(entry => entry.url.startsWith('guides/rookie-guides.html#'));
    assert.deepEqual(rookie.map(entry => entry.url.split('#')[1]), ['aiming', 'equipment', 'video', 'sensitivity', 'communication', 'crosshair', 'platforms', 'extras']);
    for (const entry of entries) assert.ok(fs.existsSync(path.join(root, entry.url.split('#')[0])));
});
test('Search links resolve from the site root under absolute, prefixed and relative deployment', () => {
    const page = 'https://example.test/cs/guides/servicemaps/ancient.html';
    const moduleUrl = 'https://example.test/cs/assets/main-hash.js';
    for (const base of ['/cs/', './', '']) assert.equal(siteBaseFor(base, moduleUrl, page).href, 'https://example.test/cs/');
    assert.equal(siteBaseFor('/', moduleUrl, page).href, 'https://example.test/');
});
test('Classic scripts retain order and sync semantics with hashed paths, including subdirectory hosting', () => {
    for (const base of ['/', '/cs/', './']) {
        const [input, output] = classicScriptAssets();
        input.configResolved({ root, base }); input.buildStart();
        const context = { filename: path.join(root, 'guides/servicemaps/ancient.html') };
        const html = '<!-- <script src="example.js"></script> --><script src="../../assets/js/theme-init.js"></script><script src="../../assets/js/site.js" defer></script><script type="module" src="/src/main.jsx"></script>';
        const masked = input.transformIndexHtml.handler(html, context);
        const result = output.transformIndexHtml.handler(masked, context);
        const emitted = [];
        output.generateBundle.call({ emitFile: asset => emitted.push(asset) });
        assert.equal(emitted.length, 2);
        assert.match(result, /theme-init-[a-f\d]{12}\.js"><\/script>/);
        assert.match(result, /site-[a-f\d]{12}\.js" defer/);
        assert.ok(result.indexOf('theme-init-') < result.indexOf('site-'));
        assert.ok(result.includes('type="module" src="/src/main.jsx"'));
        assert.ok(result.includes('<!-- <script src="example.js"></script> -->'));
        assert.ok(result.includes(base === './' ? '../../assets/js/' : base + 'assets/js/'));
    }
});
