const FOCUSABLE = "a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), video[controls], [tabindex]:not([tabindex='-1'])";

export function visibleControls(container) {
    return [...container.querySelectorAll(FOCUSABLE)].filter(element =>
        !element.closest('[inert]') && element.getClientRects().length > 0 &&
        getComputedStyle(element).visibility !== 'hidden');
}

export function trapFocus(event, container) {
    if (event.key !== 'Tab') return;
    const controls = visibleControls(container);
    const first = controls[0];
    const last = controls.at(-1);
    if (!first) { event.preventDefault(); container.focus(); return; }
    if (!container.contains(document.activeElement)) {
        event.preventDefault(); first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
    }
}
