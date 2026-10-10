import { createPortal } from 'react-dom';
import { lazy, Suspense } from 'react';
import SiteSearch from './components/SiteSearch.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import AudioToggle from './components/AudioToggle.jsx';

const MediaLightbox = lazy(() => import('./components/MediaLightbox.jsx'));
const themeSlot = document.getElementById('site-theme-control');
const audioSlot = document.getElementById('site-audio-control');
const hasMedia = !!document.querySelector('.zoom-trigger');

export default function App() {
    return <>
        <SiteSearch />
        {themeSlot && createPortal(<ThemeToggle />, themeSlot)}
        {audioSlot && createPortal(<AudioToggle />, audioSlot)}
        {hasMedia && <Suspense fallback={null}><MediaLightbox /></Suspense>}
    </>;
}
