import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Modal from './Modal.jsx';
import { buildSearchEntries, excerptFor, searchEntries } from './search-utils.js';
import rawEntries from '../data/search-index.json';
import searchIcon from '../../assets/images/icons/search.svg';
import { siteBaseFor } from '../lib/site-url.js';

const entries = buildSearchEntries(rawEntries);
const siteBase = () => siteBaseFor(import.meta.env.BASE_URL, import.meta.url, window.location.href);

export default function SiteSearch() {
    const [opened, setOpened] = useState(false);
    const [query, setQuery] = useState('');
    const [submittedQuery, setSubmittedQuery] = useState('');
    const openRef = useRef(false);
    const inputRef = useRef(null);
    const triggerRef = useRef(null);
    const returnFocusRef = useRef(null);
    const composingRef = useRef(false);
    const result = useMemo(() => searchEntries(entries, submittedQuery), [submittedQuery]);
    const close = useCallback(() => { openRef.current = false; setOpened(false); }, []);
    const open = useCallback(() => {
        if (openRef.current) return;
        openRef.current = true;
        returnFocusRef.current = document.activeElement;
        const header = document.querySelector('.site-header');
        if (header) { header.classList.remove('is-hidden'); header.inert = false; }
        setOpened(true);
    }, []);
    useEffect(() => {
        const trigger = document.querySelector('.search-trigger');
        if (!trigger) return;
        triggerRef.current = trigger;
        trigger.addEventListener('click', open);
        return () => trigger.removeEventListener('click', open);
    }, [open]);
    useEffect(() => {
        triggerRef.current?.setAttribute('aria-expanded', String(opened));
        if (opened) inputRef.current?.select();
        else composingRef.current = false;
    }, [opened]);
    const onKeyDown = useCallback((event, overlay) => {
        if (event.key === 'ArrowDown' && event.target === inputRef.current) {
            const first = overlay.querySelector('.search-results a');
            if (first) { event.preventDefault(); first.focus(); }
        }
    }, []);
    const status = !submittedQuery.trim() ? '搜索教学、地图或设置关键词' : result.total
        ? '找到 ' + result.total + ' 条结果' + (result.total > 8 ? '，显示前 8 条' : '')
        : '没有找到相关内容，请换一个关键词';
    return <Modal open={opened} onClose={close} id="site-search-overlay" className="search-overlay"
        label="网站搜索" bodyClass="search-open" fadeMs={240} initialFocusRef={inputRef}
        returnFocusRef={returnFocusRef} onKeyDown={onKeyDown}>
        <form className="search-overlay-form" action="#" method="get" role="search"
            onSubmit={event => { event.preventDefault(); if (!composingRef.current) setSubmittedQuery(query); }}>
            <input ref={inputRef} className="search-overlay-input" type="search" name="q"
                placeholder="输入关键词搜索内容" aria-label="网站内容搜索" autoComplete="off" required
                value={query} onChange={event => {
                    setQuery(event.target.value);
                    if (!composingRef.current) setSubmittedQuery(event.target.value);
                }} onCompositionStart={() => { composingRef.current = true; }}
                onCompositionEnd={event => { composingRef.current = false; setSubmittedQuery(event.currentTarget.value); }} />
            <button className="search-overlay-submit" type="submit" aria-label="提交搜索"><img src={searchIcon} alt="" /></button>
        </form>
        <p className="search-status" role="status" aria-live="polite">{status}</p>
        <ol className="search-results" hidden={!result.matches.length}>
            {result.matches.map(({ entry }) => <li key={entry.url}>
                <a href={new URL(entry.url, siteBase()).href} onClick={close}>
                    <strong>{entry.title}</strong><span>{excerptFor(entry, result.terms[0])}</span>
                </a>
            </li>)}
        </ol>
        <p className="search-overlay-hint">按 ESC 或点击空白处关闭</p>
        <button className="search-overlay-close" type="button" aria-label="关闭搜索" onClick={close}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" aria-hidden="true">
                <path d="M5 5 19 19" /><path d="M19 5 5 19" />
            </svg>
        </button>
    </Modal>;
}
