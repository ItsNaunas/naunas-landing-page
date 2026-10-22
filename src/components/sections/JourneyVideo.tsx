'use client';

import { useRef, useState } from 'react';
import { signedUp } from '@/components/ui/LeakMapForm';
import styles from './JourneyVideo.module.css';

// The client-system film (the v4 "Sarah" story). Plays with sound on a click. Watch counts go to /api/video
// (play, quarter marks, end) for Content → Performance. When it ends, the Leak Map pop-up opens with the
// scorecard framing: once per visit, and not for someone who has already signed up.
const beacon = (e: string | string[]) => { try { navigator.sendBeacon?.('/api/video', new Blob([JSON.stringify({ e })], { type: 'application/json' })); } catch { /* ignore */ } };
const ONCE = 'leakmap_video_end_v1';

export function JourneyVideo({ onAuditClick }: { onAuditClick: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState(false);
  const sent = useRef<Set<string>>(new Set());
  const once = (e: string) => { if (!sent.current.has(e)) { sent.current.add(e); beacon(e); } };
  async function play() {
    if (!video.current) return;
    try {
      video.current.muted = false;
      await video.current.play();
      setStarted(true);
      setError(false);
      once('play');
      video.current.focus();
    } catch { setError(true); }
  }
  function onTime() {
    const v = video.current;
    if (!v || !v.duration) return;
    const pct = v.currentTime / v.duration;
    // Marks reached since the last tick go in one beacon (a seek can pass several at once).
    const due = ([['q25', 0.25], ['q50', 0.5], ['q75', 0.75]] as const).filter(([k, at]) => pct >= at && !sent.current.has(k)).map(([k]) => k);
    if (due.length) { due.forEach((k) => sent.current.add(k)); beacon(due); }
  }
  function onEnded() {
    setStarted(false);
    let shown = false;
    try { shown = sessionStorage.getItem(ONCE) === '1'; } catch { /* no storage */ }
    const open = !shown && !signedUp() && !document.querySelector('[role="dialog"]');
    // One beacon for both, so the two counts can't race each other in the store.
    if (!sent.current.has('end')) { sent.current.add('end'); beacon(open ? ['end', 'popup'] : 'end'); } else if (open) beacon('popup');
    if (!open) return;
    try { sessionStorage.setItem(ONCE, '1'); } catch { /* no storage */ }
    window.dispatchEvent(new CustomEvent('open-leak-map', { detail: { src: 'video_end', variant: 'scorecard' } }));
  }
  return <section id="see-the-system" className={styles.section} aria-labelledby="journey-video-title">
    <div className={styles.inner}><div className={styles.heading}><h2 id="journey-video-title">See how it all connects.</h2><span>From the first enquiry to the next step. Take a closer look.</span><button className={styles.watchButton} onClick={onAuditClick}>Book your free audit <span aria-hidden="true">→</span></button></div>
      <div className={styles.player}>
        <video ref={video} src="/media/naunas-client-system.mp4" poster="/media/naunas-client-system-poster.jpg" preload="none" playsInline controls={started} tabIndex={started ? 0 : -1} aria-label="Naunas client system video" onTimeUpdate={onTime} onEnded={onEnded} onError={() => setError(true)} />
        {!started && <button className={styles.play} onClick={play} aria-label="Play the Naunas system video with sound"><span className={styles.playIcon}><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m9 5 11 7-11 7z" /></svg></span><span>Watch the system in motion<small>3 min 44 sec · Play with sound</small></span></button>}
      </div>
      {error && <p className={styles.error}>Playback could not start. <a href="/media/naunas-client-system.mp4">Open the video directly</a> or try play again.</p>}
    </div>
  </section>;
}
