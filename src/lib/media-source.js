// 使用预览元素已经被 Vite 改写过的 src，避免另存一份不参与构建的 data-src。
export function mediaSourceFor(trigger) {
    const type = trigger.dataset.type;
    const label = trigger.dataset.caption || trigger.getAttribute('aria-label') || '媒体放大查看';
    if (type === 'diagram') {
        // 图示使用页面内选择器（如 #buy-guide .buy-diagram），不是素材URL。
        const source = trigger.dataset.src ? document.querySelector(trigger.dataset.src) : null;
        return source instanceof SVGSVGElement ? { type, source, label, width: source.viewBox.baseVal.width } : null;
    }
    const container = trigger.closest('.lesson-media, .media-window, .media-frame');
    const preview = container?.querySelector(type === 'video' ? 'video' : 'img');
    const src = type === 'video' ? preview?.currentSrc || preview?.querySelector('source')?.src || preview?.src
        : preview?.currentSrc || preview?.src;
    return src && ['video', 'image'].includes(type) ? { type, src, label } : null;
}
