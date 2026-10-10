import { useEffect, useRef, useState } from 'react';
import musicOn from '../../assets/images/icons/music-on.svg';
import musicOff from '../../assets/images/icons/music-off.svg';
import soundtrack from '../../assets/audios/Valve Studio Orchestra - Game Time.flac?url';

export default function AudioToggle() {
    const audioRef = useRef(null);
    const requested = useRef(false);
    const request = useRef(0);
    const [playing, setPlaying] = useState(false);
    const [error, setError] = useState('');
    const sync = () => {
        const audio = audioRef.current;
        if (!audio) return;
        requested.current = !audio.paused && !audio.ended && !audio.error;
        setPlaying(requested.current);
    };
    useEffect(() => {
        const audio = audioRef.current;
        return () => { ++request.current; requested.current = false; audio.pause(); };
    }, []);
    const toggle = async () => {
        const audio = audioRef.current;
        const current = ++request.current;
        requested.current = !requested.current;
        if (!requested.current) { audio.pause(); sync(); return; }
        if (audio.error) audio.load();
        try { await audio.play(); if (current === request.current) setError(''); }
        catch (failure) {
            if (current !== request.current) return;
            requested.current = false;
            if (failure.name !== 'AbortError') setError('音乐暂时无法播放，请重试');
        }
        if (current === request.current) sync();
    };
    return <>
        <audio ref={audioRef} id="theme-audio" src={soundtrack} loop preload="none"
            onPlay={sync} onPause={sync} onEnded={sync} onError={sync} />
        <button className="audio-button" id="audio-button" type="button" onClick={toggle}
            aria-label={playing ? '暂停背景音乐' : '播放背景音乐'} aria-pressed={playing} title={error || undefined}>
            <img id="audio-icon" src={playing ? musicOn : musicOff} alt="" />
        </button>
    </>;
}
