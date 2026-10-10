import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, extname, posix, relative, resolve, sep } from 'node:path';

// 同步主题脚本仍保留普通 script；构建时对引用的脚本生成指纹并保持原执行顺序。
export function classicScriptAssets() {
    let config;
    const records = new Map();
    const tags = new Map();
    return [
        {
            name: 'cncs:classic-script-input', apply: 'build',
            configResolved(value) { config = value; },
            buildStart() { records.clear(); tags.clear(); },
            transformIndexHtml: { order: 'pre', handler(html, context) {
                return html.replace(/<!--[\s\S]*?-->|<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>\s*<\/script>/gi, (tag, src) => {
                    if (tag.startsWith('<!--')) return tag;
                    if (/\btype\s*=\s*["']module["']/i.test(tag) || /^(?:[a-z]+:|\/\/)/i.test(src)) return tag;
                    const file = src.startsWith('/') ? resolve(config.root, '.' + src) : resolve(dirname(context.filename), src);
                    const within = relative(config.root, file);
                    if (within.startsWith('..') || extname(file) !== '.js') throw new Error('Invalid classic script: ' + src);
                    const source = readFileSync(file, 'utf8');
                    const hash = createHash('sha256').update(source).digest('hex').slice(0, 12);
                    const name = within.split(sep).join('/').replace(/\.js$/, '-' + hash + '.js');
                    records.set(name, source);
                    const token = 'cncs-classic-' + tags.size;
                    tags.set(token, { tag, src, name });
                    return '<!--' + token + '-->';
                });
            } },
        },
        {
            name: 'cncs:classic-script-output', apply: 'build',
            transformIndexHtml: { order: 'post', handler(html, context) {
                const page = relative(config.root, context.filename).split(sep).join('/');
                return html.replace(/<!--(cncs-classic-\d+)-->/g, (_, token) => {
                    const record = tags.get(token);
                    const url = config.base === './' || config.base === ''
                        ? posix.relative(posix.dirname(page), record.name)
                        : config.base + record.name;
                    return record.tag.replace(record.src, url);
                });
            } },
            generateBundle() {
                for (const [fileName, source] of records) this.emitFile({ type: 'asset', fileName, source });
            },
        },
    ];
}
