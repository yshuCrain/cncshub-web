import { useCallback, useEffect, useRef, useState } from 'react';
import Modal from './Modal.jsx';
import { mediaSourceFor } from '../lib/media-source.js';

function Diagram({ source }) {
    const host = useRef(null);
    useEffect(() => {
        const clone = source.cloneNode(true);
        clone.removeAttribute('id');
        clone.removeAttribute('aria-labelledby');
        clone.setAttribute('aria-label', source.getAttribute('aria-label') || '教学示意图');
        clone.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
        clone.style.setProperty('--buy-accent', getComputedStyle(source).getPropertyValue('--buy-accent'));
        clone.style.setProperty('--media-accent', getComputedStyle(source).getPropertyValue('--media-accent'));
        host.current.replaceChildren(clone);
        return () => clone.remove();
    }, [source]);
    return <div className="lightbox-diagram" ref={host} />;
}

export default function MediaLightbox() {
    const [media, setMedia] = useState(null);
    const [fitted, setFitted] = useState(false);
    const [width, setWidth] = useState(null);
    const [error, setError] = useState(false);
    const stageRef = useRef(null);
    const closeRef = useRef(null);
    const returnFocusRef = useRef(null);
    const close = useCallback(() => setMedia(null), []);
    useEffect(() => {
        const open = event => {
            const trigger = event.target.closest('.zoom-trigger');
            if (!trigger) return;
            const source = mediaSourceFor(trigger);
            if (!source) return;
            event.preventDefault();
            document.querySelectorAll('.lesson-media video').forEach(video => video.pause());
            returnFocusRef.current = trigger;
            setError(false);
            setFitted(source.type === 'diagram');
            setWidth(source.width || null);
            setMedia(source);
        };
        document.addEventListener('click', open);
        return () => document.removeEventListener('click', open);
    }, []);
    useEffect(() => {
        if (!media) return;
        stageRef.current.scrollTop = 0;
        stageRef.current.scrollLeft = 0;
    }, [media]);
    const toggleFit = () => { setFitted(value => !value); stageRef.current.scrollLeft = 0; };
    return <Modal open={!!media} onClose={close} id="media-lightbox" className="lightbox" label="媒体放大查看"
        describedBy="lightbox-caption" bodyClass="lightbox-open" initialFocusRef={closeRef} returnFocusRef={returnFocusRef}>
        <button ref={closeRef} className="lightbox-close" type="button" aria-label="关闭放大查看" onClick={close}>✕</button>
        <figure className="lightbox-figure">
            <figcaption className="lightbox-toolbar">
                <span className="lightbox-caption" id="lightbox-caption">{media?.label}</span>
                <button className="lightbox-fit" type="button" aria-pressed={fitted} hidden={!media || media.type === 'video'} onClick={toggleFit}>
                    {fitted ? '原尺寸' : '适应宽度'}
                </button>
            </figcaption>
            <div ref={stageRef} className={'lightbox-stage' + (fitted ? ' is-fitted' : '')} role="region" tabIndex={0}
                aria-label="放大媒体，可滚动查看" style={width ? { '--image-width': width + 'px' } : undefined}>
                {error && <p role="alert">媒体暂时无法加载，请关闭后重试。</p>}
                {media?.type === 'video' && <video key={media.src} src={media.src} controls autoPlay loop muted playsInline preload="auto"
                    aria-label={media.label} onError={() => setError(true)} />}
                {media?.type === 'image' && <img key={media.src} src={media.src} alt={media.label} decoding="async"
                    onLoad={event => { const size = event.currentTarget.naturalWidth; setWidth(size); if (size > 1440) setFitted(true); }}
                    onError={() => setError(true)} />}
                {media?.type === 'diagram' && <Diagram source={media.source} />}
            </div>
        </figure>
    </Modal>;
}
