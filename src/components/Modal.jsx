import { createPortal } from 'react-dom';
import { useLayoutEffect, useRef, useState } from 'react';
import { trapFocus, visibleControls } from '../lib/focus.js';

// 所有弹层共用焦点隔离、页面滚动锁和焦点归还；内容与样式由调用方提供。
export default function Modal({ open, onClose, id, className, label, describedBy, bodyClass,
    initialFocusRef, returnFocusRef, onKeyDown, fadeMs = 0, children }) {
    const overlayRef = useRef(null);
    const [present, setPresent] = useState(open);
    const [visible, setVisible] = useState(false);

    useLayoutEffect(() => {
        if (open) { setPresent(true); return; }
        setVisible(false);
        const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : fadeMs;
        const timer = setTimeout(() => setPresent(false), delay);
        return () => clearTimeout(timer);
    }, [open, fadeMs]);

    useLayoutEffect(() => {
        if (!open || !present) return;
        const overlay = overlayRef.current;
        const returnTarget = returnFocusRef?.current || document.activeElement;
        const previous = new Map();
        for (const child of document.body.children) {
            if (child === overlay || child.matches('script, style, link')) continue;
            previous.set(child, child.inert);
            child.inert = true;
        }
        document.body.classList.add(bodyClass);
        void overlay.offsetWidth;
        setVisible(true);
        (initialFocusRef?.current || visibleControls(overlay)[0] || overlay).focus({ preventScroll: true });
        const keydown = event => {
            if (event.isComposing) return;
            onKeyDown?.(event, overlay);
            if (event.defaultPrevented) return;
            if (event.key === 'Escape') { event.preventDefault(); onClose(); }
            else trapFocus(event, overlay);
        };
        document.addEventListener('keydown', keydown);
        return () => {
            document.removeEventListener('keydown', keydown);
            previous.forEach((inert, element) => { element.inert = inert; });
            document.body.classList.remove(bodyClass);
            if (returnTarget?.isConnected) returnTarget.focus({ preventScroll: true });
        };
    }, [open, present, bodyClass, initialFocusRef, returnFocusRef, onKeyDown, onClose]);

    return createPortal(
        <div ref={overlayRef} id={id} className={className + (visible ? ' is-open' : '')}
            role="dialog" aria-modal="true" aria-label={label} aria-describedby={describedBy}
            tabIndex={-1} hidden={!present} inert={!open}
            onPointerDown={event => { if (event.target === overlayRef.current) onClose(); }}>
            {children}
        </div>, document.body);
}
