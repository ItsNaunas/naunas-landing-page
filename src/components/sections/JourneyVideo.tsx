'use client';

import { useRef, useState } from 'react';
import styles from './JourneyVideo.module.css';

export function JourneyVideo({ onAuditClick }: { onAuditClick: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState(false);
  async function play() {
    if (!video.current) return;
    try {
      video.current.muted = false;
      await video.current.play();
      setStarted(true);
      setError(false);
      video.current.focus();
    } catch { setError(true); }
  }
  return <section id="see-the-system" className={styles.section} aria-labelledby="journey-video-title">
    <div className={styles.inner}><div className={styles.heading}><h2 id="journey-video-title">See how it all connects.</h2><span>From the first enquiry to the next step. Take a closer look.</span><button className={styles.watchButton} onClick={onAuditClick}>Book your free audit <span aria-hidden="true">→</span></button></div>
      <div className={styles.player}>
        <video ref={video} src="/media/naunas-client-system.mp4" poster="/media/naunas-client-system-poster.jpg" preload="none" playsInline controls={started} tabIndex={started ? 0 : -1} aria-label="Naunas client system video" onEnded={() => setStarted(false)} onError={() => setError(true)} />
        {!started && <button className={styles.play} onClick={play} aria-label="Play the Naunas system video with sound"><span className={styles.playIcon}><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m9 5 11 7-11 7z" /></svg></span><span>Watch the system in motion<small>3 min 44 sec · Play with sound</small></span></button>}
      </div>
      {error && <p className={styles.error}>Playback could not start. <a href="/media/naunas-client-system.mp4">Open the video directly</a> or try play again.</p>}
    </div>
  </section>;
}
