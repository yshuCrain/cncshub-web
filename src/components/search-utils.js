/* ============================================================================
 * src/components/search-utils.js —— 搜索的「纯函数」部分
 * ----------------------------------------------------------------------------
 * 【为什么单独一个文件】
 *   这些函数只吃参数、只吐结果：不碰 DOM、不碰 React、不记任何状态。
 *   好处有两个：
 *     1. 逻辑可以单独测试、单独复用（比如以后给搜索加节流，只动这里）；
 *     2. SiteSearch.jsx 里剩下的就全是「状态怎么变、界面怎么画」，
 *        两件事各自只有一种复杂度，不会搅在一起。
 *
 * 【归一化】normalize：NFKC 把全角字符折成半角（"ＣＳ２" → "cs2"），
 *   toLocaleLowerCase 统一大小写，trim 去首尾空白。
 *   用户输入和索引文本都过一遍它再比较，" Mirage " 和 "mirage" 才算同一个词。
 * ==========================================================================*/

export const normalize = text => String(text).normalize("NFKC").toLocaleLowerCase().trim();

/**
 * 给原始索引做一次预归一化。
 * 原始索引来自构建脚本生成的 src/data/search-index.json，
 * 每条形如 { title, page, url, text }。搜索每次按键都要比对全部条目，
 * 所以把「每个条目的小写版本」提前算好存起来，按键时就不用反复归一化了。
 */
export function buildSearchEntries(rawEntries) {
    return (rawEntries || []).map(entry => ({
        ...entry,
        normalizedTitle: normalize(entry.title),
        normalizedText: normalize(entry.page + " " + entry.text),
    }));
}

/**
 * 执行一次搜索。
 *
 * 匹配规则：查询里的每个空格分段都必须命中（AND 语义），所以
 * "mirage 中路" 只会命中同时提到两者的条目。
 *
 * 打分规则（分高排前）：
 *   +8  关键词命中标题          +1  只命中正文
 *   +20 标题与整个查询完全一致    +1  带 # 锚点的条目（更具体的落点优先）
 *
 * @param {Array}  entries  buildSearchEntries 的产物
 * @param {string} query    用户输入的原始文本（内部自己归一化）
 * @returns {{ terms: string[], total: number, matches: Array }}
 *          terms   归一化后的分段，用于在正文里定位高亮起点
 *          total   命中总数（用于「找到 N 条结果」的文案）
 *          matches 前八条，每条 { entry, score }
 */
export function searchEntries(entries, query) {
    const queryNormalized = normalize(query);
    if (!queryNormalized) return { terms: [], total: 0, matches: [] };

    const terms = queryNormalized.split(/\s+/);
    const scored = entries
        .map(entry => {
            const haystack = entry.normalizedTitle + " " + entry.normalizedText;
            if (!terms.every(term => haystack.includes(term))) return null;
            const score = terms.reduce(
                (total, term) => total + (entry.normalizedTitle.includes(term) ? 8 : 1),
                0,
            ) + (entry.normalizedTitle === queryNormalized ? 20 : 0)
                + (entry.url.includes("#") ? 1 : 0);
            return { entry, score };
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score);

    return { terms, total: scored.length, matches: scored.slice(0, 8) };
}

/**
 * 生成结果列表里的摘要文本。
 * 从第一个关键词的命中位置往前退 20 个字符开始，截 110 个字符，
 * 截断的两端补省略号 —— 让用户看到「关键词在什么上下文里出现」。
 */
export function excerptFor(entry, firstTerm) {
    const text = entry.text;
    const matchAt = normalize(text).indexOf(firstTerm);
    const start = Math.max(0, matchAt - 20);
    const clipped = text.slice(start, start + 110);
    const head = start ? "…" : "";
    const tail = text.length > start + 110 ? "…" : "";
    return entry.page + " / " + head + clipped + tail;
}
