import { useCallback, useEffect, useRef, useState } from 'react';
import moonIcon from '../../assets/images/icons/moon.svg';
import sunIcon from '../../assets/images/icons/sun.svg';

const STORAGE_KEY = 'cncs-theme';
const valid = value => value === 'dark' || value === 'light';
const readSaved = () => { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } };

export default function ThemeToggle() {
    const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');
    const manual = useRef(valid(readSaved()));
    const apply = useCallback(value => {
        document.documentElement.dataset.theme = value;
        document.querySelectorAll('meta[name="theme-color"]').forEach(meta => {
            meta.content = value === 'dark' ? '#111315' : '#F3F4F4';
        });
        setTheme(value);
    }, []);
    useEffect(() => {
        const system = window.matchMedia('(prefers-color-scheme: dark)');
        const followSystem = () => { if (!manual.current) apply(system.matches ? 'dark' : 'light'); };
        const followStorage = event => {
            if (event.key !== STORAGE_KEY && event.key !== null) return;
            const saved = readSaved();
            manual.current = valid(saved);
            apply(manual.current ? saved : system.matches ? 'dark' : 'light');
        };
        system.addEventListener('change', followSystem);
        window.addEventListener('storage', followStorage);
        apply(document.documentElement.dataset.theme || 'light');
        return () => { system.removeEventListener('change', followSystem); window.removeEventListener('storage', followStorage); };
    }, [apply]);
    const toggle = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        manual.current = true;
        apply(next);
        try { localStorage.setItem(STORAGE_KEY, next); } catch { /* 本次切换仍然有效。 */ }
    };
    return <button className="theme-button" id="theme-button" type="button" aria-label="深色主题"
        aria-pressed={theme === 'dark'} title={theme === 'dark' ? '切换为浅色主题' : '切换为深色主题'} onClick={toggle}>
        <img className="icon icon-moon" src={moonIcon} alt="" />
        <img className="icon icon-sun" src={sunIcon} alt="" />
    </button>;
}
