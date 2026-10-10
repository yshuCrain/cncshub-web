// 相对 base 构建时，入口位于 assets/；不能用当前深层页面目录作为站点根目录。
export function siteBaseFor(base, moduleUrl, pageUrl) {
    return new URL(base === '' || base.startsWith('.') ? '../' : base,
        base === '' || base.startsWith('.') ? moduleUrl : pageUrl);
}
