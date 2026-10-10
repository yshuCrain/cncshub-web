// 正文快照在 content/dust2.md；只重建 Dust2 主内容，不修改公共导航。
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'guides/servicemaps/dust2.html');
const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const asset = name => '../../assets/images/servicemaps/dust2/' + name;
const ids = ['callouts', 'map-logic', 'ct-default', 'ct-variation', 'ct-midround', 't-default'];
const summaries = ['先认识每一个位置。', '读懂地图，再选择行动。', '开局争夺与常规落位。', '主动获取信息，改变节奏。', '根据局势，调整防守。', '抢占空间，协同推进。'];
const codes = ['CALLOUTS', 'MAP LOGIC', 'CT / DEFAULT', 'CT / VARIATIONS', 'CT / MID-ROUND', 'T / DEFAULT'];
const md = fs.readFileSync(path.join(root, 'content/dust2.md'), 'utf8').replace(/\r/g, '');
const chapters = [...md.matchAll(/^# (.+)\n([\s\S]*?)(?=^# |$(?![\s\S]))/gm)];
if (chapters.length !== 6) throw new Error('Dust2 should have exactly six top-level chapters.');

function calloutMap() {
    return `<figure class="dust-map media-frame"><img src="${asset('callouts.webp')}" width="4267" height="4267" alt="Dust2 全图点位名称：A 大、A 小、中路、B1、B2 与两个包点" loading="lazy"><figcaption>DustⅡ · 点位名称 <button class="zoom-trigger" type="button" data-type="image" data-caption="Dust2 点位名称">放大查看 ↗</button></figcaption></figure>`;
}
function b1Map() {
    // 与用户确认的圆圈顺序相同，截图编号不依赖文件名字母顺序。
    const spots = [[35.1,31.5],[37.3,31.5],[76.7,31.5],[60.5,61.5],[76.7,61.5]];
    return `<figure class="b1-explorer"><figcaption>单挂 B1 · 选位视角 <span>悬停或点击圆圈，查看实机画面</span></figcaption><div class="b1-map"><img src="${asset('b1-map.png')}" width="1000" height="500" alt="B1 俯视图，五个推荐站位可查看对应实机截图" loading="lazy">${spots.map(([x,y],i) => `<button class="b1-spot" type="button" style="--spot-x:${x}%;--spot-y:${y}%" data-spot="${i}" aria-label="查看 B1 站位 ${i+1} 的实机画面" aria-controls="b1-preview-${i+1}" aria-expanded="false">${i+1}</button>`).join('')}</div><div class="b1-previews">${spots.map((_,i) => `<div class="b1-preview media-frame" id="b1-preview-${i+1}" hidden><img src="${asset('b1-view-'+(i+1)+'.png')}" width="1920" height="1080" loading="lazy" alt="B1 站位 ${i+1} 实机视角"><div><span>站位 ${i+1} / 05</span><button type="button" class="zoom-trigger" data-type="image" data-caption="B1 站位 ${i+1} 实机视角">放大查看 ↗</button><button class="b1-dismiss" type="button" aria-label="收起 B1 实机画面">×</button></div></div>`).join('')}</div></figure>`;
}
function routes() {
    return `<figure class="dust-routes" data-route="a"><figcaption>中路控制 → 两线夹击 <span>路线示意</span></figcaption><div class="route-controls" role="group" aria-label="选择地图进攻路线"><button type="button" data-route-choice="a" aria-pressed="true">夹 A</button><button type="button" data-route-choice="b" aria-pressed="false">夹 B</button><button type="button" data-route-pause aria-pressed="false">暂停动画</button></div><div class="route-map"><img src="${asset('callouts.webp')}" alt="Dust2 地图上的夹 A 与夹 B 路线示意" width="4267" height="4267" loading="lazy"><svg viewBox="0 0 1000 1000" role="img" aria-label="切换按钮查看从中路和侧翼形成的两条夹击路线"><defs><marker id="dust-route-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="currentColor"/></marker></defs><g class="route-a"><path d="M465 630 L465 447 L567 447 L591 363 L610 258 L684 231"/><path d="M465 725 L680 725 L701 565 L800 561 L848 497 L852 331 L758 276"/></g><g class="route-b"><path d="M466 628 L462 488 L375 417 L310 417 L299 469 L214 469 L172 375 L161 259"/><path d="M444 833 L299 833 L189 840 L171 620 L183 474 L166 380 L168 260"/></g></svg></div></figure>`;
}
function bodyOf(source, index) {
    const output = [], headings = [];
    let paragraph = [], list = [], headingIndex = 0;
    const flushP = () => { if (paragraph.length) output.push('<p>' + paragraph.map(escape).join('<br>') + '</p>'); paragraph = []; };
    const flushL = () => { if (list.length) output.push('<ol>' + list.map(x => '<li value="' + x.number + '">' + escape(x.text) + '</li>').join('') + '</ol>'); list = []; };
    for (const raw of source.split('\n')) {
        const line = raw.trim();
        if (!line || line === '---') { flushP(); flushL(); continue; }
        if (line.startsWith('%%')) { flushP(); flushL(); if (line.includes('地图动画')) output.push(routes()); continue; }
        if (line.startsWith('![[')) { flushP(); flushL(); output.push(index === 0 ? calloutMap() : b1Map()); continue; }
        const heading = line.match(/^(#{2,3})\s+(.+)/);
        if (heading) {
            flushP(); flushL();
            const id = ids[index] + '-part-' + (++headingIndex);
            const level = heading[1].length + 1;
            headings.push({ id, title: heading[2], level });
            output.push(`<h${level} id="${id}">${escape(heading[2])}</h${level}>`);
        } else {
            const item = line.match(/^(\d+)[.、]\s*(.+)/);
            if (item) { flushP(); list.push({number:Number(item[1]), text:item[2]}); }
            else { flushL(); paragraph.push(line); }
        }
    }
    flushP(); flushL();
    return { html: output.join('\n'), headings };
}
const folders = chapters.map((match,index) => {
    const title = match[1].replace(/^\d+\.\s*/, '').replace(/[：:]$/, '');
    const { html, headings } = bodyOf(match[2],index);
    const number = String(index+1).padStart(2,'0');
    return `<section class="dust-folder" id="${ids[index]}" data-folder="${index}" aria-labelledby="${ids[index]}-title">
    <div class="folder-tab"><button class="folder-close" type="button" aria-label="关闭${title}，返回文件夹总览">×</button><button class="folder-open" type="button" aria-expanded="false" aria-controls="${ids[index]}-reader"><span>${number}</span> ${title}</button><span class="folder-tab-tail" aria-hidden="true"></span></div>
    <div class="folder-paper"><div class="folder-cover" aria-hidden="true"><span class="cover-code">DUSTⅡ / ${codes[index]}</span><span class="cover-number">${number}</span><p>${summaries[index]}</p><span class="cover-bottom">FIELD NOTES <span>↗</span></span></div>
    <div class="folder-reader" id="${ids[index]}-reader" role="region" aria-label="${title}正文，可在窗口内滚动" tabindex="0"><div class="reader-heading"><span>DUSTⅡ / ${number} — 06</span><h2 id="${ids[index]}-title">${title}</h2></div>
    <div class="reader-layout">${headings.some(x=>x.level===3) ? `<nav class="reader-toc" aria-label="${title}章内导航">${headings.filter(x=>x.level===3).map(x=>`<a href="#${x.id}">${escape(x.title)}</a>`).join('')}</nav>` : ''}<div class="reader-prose">${html}<p class="chapter-end">${number} / 06 · 本章结束 <span>将鼠标移到窗口外，滚动翻章</span></p></div></div></div></div></section>`;
}).join('\n');
const main = `<main id="main" class="dust-workspace" aria-label="Dust2 地图攻略文件夹">
    <div class="dust-scene" data-mode="overview">
        <div class="dust-grid" aria-hidden="true"></div>
        <div class="dust-masthead"><a href="../map-guides.html">← 地图攻略</a><span>战术档案 / 06 CHAPTERS</span></div>
        <div class="dust-identity"><span class="dust-emblem" aria-hidden="true"></span><h1>DUSTⅡ<span>炽热沙城 2</span></h1></div>
        <p class="dust-intro">从一个点位，<br>到整张地图。</p>
        <div class="dust-folders">${folders}</div>
        <div class="dust-scene-footer"><p class="dust-instruction" id="dust-instruction">靠近文件夹滚动浏览 · 点击标签展开</p><div class="dust-step-controls" role="group" aria-label="文件夹浏览"><button type="button" data-dust-prev aria-label="浏览前一个文件夹">↖</button><span class="dust-progress" aria-live="polite">01 / 06</span><button type="button" data-dust-next aria-label="浏览后一个文件夹">↘</button></div></div>
        <p class="sr-only" role="status" data-dust-status></p>
    </div>
</main>`;
let page = fs.readFileSync(file,'utf8').replace(/<main\b[\s\S]*?<\/main>/,main);
if (!page.includes('dust2.css')) page = page.replace('</head>','    <link rel="stylesheet" href="../../assets/css/dust2.css">\n</head>');
if (!page.includes('dust2.js')) page = page.replace('<script src="../../assets/js/site.js" defer></script>','<script src="../../assets/js/site.js" defer></script>\n    <script src="../../assets/js/dust2.js" defer></script>');
page = page.replace('<body>','<body class="dust-page">');
fs.writeFileSync(file,page);
console.log('Dust2: six chapters generated from content/dust2.md.');
