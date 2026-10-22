'use client';

import { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion } from 'framer-motion';
import styles from './HeroJourney.module.css';

const TRACK = 'M900 -900 C710 -480 530 -220 170 -55 C-65 30 -30 135 205 196 C365 238 140 277 235 352 C320 432 508 413 590 510 C675 588 865 610 1250 610';
const stages = [
  { title: 'Enquiry received', status: 'Captured', x: 128, y: 62, dot: { left: '19%', top: '14%' } },
  { title: 'Proposal signed', status: 'Signed', x: 352, y: 300, dot: { left: '40%', top: '26%' } },
  { title: 'Client onboarded', status: 'Ready', x: 464, y: 469, dot: { left: '49%', top: '49%' } },
];

// Moods borrowed from the video Dot (naunas-studio docs/dot.md); worried/deflated stay out of the hero.
type Mood = 'curious' | 'focused' | 'determined' | 'delighted';
const STAGE_MOODS: Mood[] = ['focused', 'determined', 'delighted'];

function StageIcon({ index }: { index: number }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{index === 0 ? <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></> : index === 1 ? <><path d="M6 3h8l4 4v14H6zM14 3v5h4" /><path className={styles.signature} pathLength="1" d="M8 16q5-9 3-2t5-1" /></> : <><rect x="5" y="3" width="15" height="18" rx="2" /><path className={styles.checklist} pathLength="1" d="m8 9 2 2 4-4m-6 9 2 2 4-4M16 10h1M16 17h1" /></>}</svg>;
}

export function HeroJourney() {
  const reducedMotion = useReducedMotion();
  const [selected, setSelected] = useState(1);
  const [preview, setPreview] = useState<number | null>(null);
  const [bouncing, setBouncing] = useState(false);
  const shown = preview ?? selected;
  const sceneRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<SVGCircleElement>(null);
  const progress = useMotionValue(.5);
  const [arrived, setArrived] = useState(1);
  const [introDone, setIntroDone] = useState(false);
  const interacting = useRef(false);
  const scrolling = useRef(false);
  const [cheering, setCheering] = useState(false);
  const [stageMood, setStageMood] = useState<Mood | null>(null);
  const firstArrival = useRef(true);
  const mood: Mood = cheering ? 'delighted' : stageMood ?? 'curious';
  useEffect(() => {
    const path = pathRef.current;
    const scene = sceneRef.current;
    if (!path || !scene || reducedMotion) return;
    const length = path.getTotalLength();
    let home = 0, best = Infinity;
    for (let i = 0; i <= 1000; i++) {
      const point = path.getPointAtLength(length * i / 1000);
      const distance = Math.hypot(point.x - 310, point.y - 395);
      if (distance < best) { best = distance; home = i / 1000; }
    }
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const hero = scene.closest('section');
        if (!hero) return;
        const rect = hero.getBoundingClientRect();
        const amount = Math.max(0, Math.min(1, -rect.top / (rect.height * .65)));
        if (amount > .02) {
          scrolling.current = true; interacting.current = true;
          progress.stop(); progress.set(home + (.98 - home) * amount);
          scene.dataset.scrolling = 'true';
        } else if (scrolling.current) {
          scrolling.current = false; scene.dataset.scrolling = 'false';
          animate(progress, home, { duration: .6 }); setSelected(1); setPreview(null); setBouncing(true);
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', onScroll); };
  }, [progress, reducedMotion]);
  useEffect(() => {
    const scene = sceneRef.current;
    const hero = scene?.closest('section');
    if (!scene || !hero || reducedMotion) return;
    // Dot's eyes follow the mouse anywhere in the hero, aimed from Dot itself; idle look resumes after a pause.
    let frame = 0, idle = 0;
    const rest = () => { delete scene.dataset.tracking; scene.style.setProperty('--eye-x', '0px'); scene.style.setProperty('--eye-y', '0px'); scene.style.setProperty('--tilt', '0deg'); };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const dot = dotRef.current?.getBoundingClientRect();
        if (!dot) return;
        const dx = event.clientX - (dot.left + dot.width / 2), dy = event.clientY - (dot.top + dot.height / 2);
        const distance = Math.hypot(dx, dy), reach = distance + 60;
        // Close by, only the eyes move; further away Dot tilts its whole body towards the cursor.
        const turn = Math.max(0, Math.min(1, (distance - 140) / 260));
        scene.dataset.tracking = 'true';
        scene.style.setProperty('--eye-x', `${(dx / reach * dot.width * .1).toFixed(2)}px`);
        scene.style.setProperty('--eye-y', `${(dy / reach * dot.width * .075).toFixed(2)}px`);
        scene.style.setProperty('--tilt', `${(Math.max(-9, Math.min(9, dx / 40)) * turn).toFixed(2)}deg`);
      });
      clearTimeout(idle);
      idle = window.setTimeout(rest, 2500);
    };
    hero.addEventListener('pointermove', onMove);
    hero.addEventListener('pointerleave', rest);
    return () => { cancelAnimationFrame(frame); clearTimeout(idle); hero.removeEventListener('pointermove', onMove); hero.removeEventListener('pointerleave', rest); };
  }, [reducedMotion]);
  useEffect(() => {
    // Delighted while the audit CTA (anywhere in the hero) is hovered or focused.
    const hero = sceneRef.current?.closest('section');
    if (!hero) return;
    const check = (event: Event) => setCheering(!!(event.target as Element | null)?.closest?.('[data-cta="audit"]'));
    const off = () => setCheering(false);
    hero.addEventListener('pointerover', check);
    hero.addEventListener('focusin', check);
    hero.addEventListener('pointerleave', off);
    hero.addEventListener('focusout', off);
    return () => { hero.removeEventListener('pointerover', check); hero.removeEventListener('focusin', check); hero.removeEventListener('pointerleave', off); hero.removeEventListener('focusout', off); };
  }, []);
  useEffect(() => {
    // Each stop gets a short reaction (focused → determined → delighted), then the face relaxes.
    if (firstArrival.current) { firstArrival.current = false; return; }
    setStageMood(STAGE_MOODS[arrived]);
    const timer = setTimeout(() => setStageMood(null), 1800);
    return () => clearTimeout(timer);
  }, [arrived]);
  useEffect(() => {
    if (reducedMotion) return;
    const timers = [setTimeout(() => { if (!interacting.current) setSelected(0); }, 700), setTimeout(() => { if (!interacting.current) setSelected(1); }, 2200), setTimeout(() => { if (!interacting.current) setSelected(2); }, 3700), setTimeout(() => { setIntroDone(true); if (!interacting.current) setSelected(1); }, 4900)];
    return () => timers.forEach(clearTimeout);
  }, [reducedMotion]);
  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const length = path.getTotalLength();
    // Locate each stop on the actual curved track, independent of viewport size.
    const targets = [{ x: 90, y: 160 }, { x: 310, y: 395 }, { x: 520, y: 470 }];
    const target = targets[shown];
    let best = 0, distance = Infinity;
    for (let i = 0; i <= 1000; i++) {
      const point = path.getPointAtLength(length * i / 1000);
      const next = Math.hypot(point.x - target.x, point.y - target.y);
      if (next < distance) { best = i / 1000; distance = next; }
    }
    const render = (value: number) => {
      const point = path.getPointAtLength(value * length);
      pulseRef.current?.setAttribute('cx', String(point.x)); pulseRef.current?.setAttribute('cy', String(point.y));
      if (dotRef.current) {
        dotRef.current.style.left = `${point.x / 700 * 100}%`;
        dotRef.current.style.top = `${(point.y - 72) / 650 * 100}%`;
        const ahead = path.getPointAtLength(Math.min(length, value * length + 8));
        dotRef.current.style.setProperty('--lean', `${Math.max(-9, Math.min(9, (ahead.y - point.y) * 1.2))}deg`);
      }
    };
    const unsubscribe = progress.on('change', render);
    render(progress.get());
    const scene = sceneRef.current;
    if (scene && !reducedMotion) {
      if (!scene.dataset.tracking) scene.style.setProperty('--eye-x', shown === 0 ? '-5px' : '5px');
      scene.dataset.moving = 'true';
    }
    const animation = animate(progress, best, { duration: reducedMotion ? 0 : .95, delay: reducedMotion ? 0 : .16, ease: [.3, 0, .2, 1], onComplete: () => { setArrived(shown); if (scene) scene.dataset.moving = 'false'; if (shown === 1 && !scrolling.current && !reducedMotion) setBouncing(true); } });
    return () => { animation.stop(); unsubscribe(); };
  }, [shown, reducedMotion, progress]);
  return <div ref={sceneRef} className={styles.scene} data-intro-done={introDone || !!reducedMotion} data-stage={shown} data-mood={mood} aria-label="Interactive client journey" onPointerLeave={() => setPreview(null)}>
    <div className={styles.grid} />
    <svg className={styles.track} viewBox="0 0 700 650" preserveAspectRatio="none" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="journey-orange" x1="0" y1="0" x2="450" y2="550" gradientUnits="userSpaceOnUse"><stop stopColor="#ff985a" /><stop offset=".5" stopColor="#ff711f" /><stop offset=".7" stopColor="#ff7829" /><stop offset=".77" stopColor="#ffbd96" /><stop offset="1" stopColor="#ffd1b5" /></linearGradient>
        <linearGradient id="journey-light" x1="0" y1="0" x2="450" y2="550" gradientUnits="userSpaceOnUse"><stop stopColor="#ffd1a0" /><stop offset=".65" stopColor="#ffac67" /><stop offset="1" stopColor="#ffe1cd" /></linearGradient>
        <radialGradient id="journey-bead" cx="32%" cy="25%"><stop stopColor="#fffbe2" /><stop offset=".35" stopColor="#ffd99a" /><stop offset=".75" stopColor="#ff9c4a" /><stop offset="1" stopColor="#f67526" /></radialGradient>
        <filter id="journey-shadow" x="-50%" y="-30%" width="200%" height="180%"><feGaussianBlur stdDeviation="16" /></filter>
        <filter id="journey-soft"><feGaussianBlur stdDeviation="3" /></filter>
        <filter id="journey-shine"><feGaussianBlur stdDeviation="5" /></filter>
      </defs>
      <path d={TRACK} stroke="#a94b24" strokeWidth="62" opacity=".2" transform="translate(2 24)" filter="url(#journey-shadow)" />
      <path ref={pathRef} d={TRACK} stroke="url(#journey-orange)" strokeWidth="64" strokeLinecap="round" />
      <path d={TRACK} stroke="#d75b22" strokeWidth="43" opacity=".27" transform="translate(0 8)" filter="url(#journey-soft)" />
      <path d={TRACK} stroke="url(#journey-light)" strokeWidth="22" opacity=".65" transform="translate(-3 -9)" filter="url(#journey-shine)" />
      <path d={TRACK} stroke="#fff0d5" strokeWidth="5" opacity=".35" transform="translate(-5 -19)" filter="url(#journey-soft)" />
      {stages.map((stage, index) => <g key={stage.title} className={shown === index ? styles.lit : undefined}><path d={`M${stage.x} ${stage.y} h40`} stroke="#fff6e8" strokeWidth="2" /><circle cx={stage.x} cy={stage.y} r="10" fill="url(#journey-bead)" stroke="#ffc694" strokeWidth="1.5" /></g>)}
      <circle ref={pulseRef} className={styles.pulse} cx="270" cy="250" r="10" fill="url(#journey-bead)" stroke="#fff1b5" strokeWidth="2" />
    </svg>
    <div ref={dotRef} className={styles.dotPosition} data-bouncing={bouncing}>
      <span className={styles.contactShadow} /><div className={styles.personality} data-reaction={arrived}>
      <motion.button type="button" className={styles.dot} aria-label="Bounce Dot" onClick={() => setBouncing(true)} whileHover={reducedMotion ? undefined : { rotate: -7, scale: 1.04 }} animate={bouncing && !reducedMotion ? { y: [0, -18, 0, -4, 0], scaleY: [1, 1.04, .96, 1, 1] } : { y: 0, scaleY: 1 }} transition={{ duration: .6 }} onAnimationComplete={() => setBouncing(false)}><span className={styles.eyes}><span /><span /></span></motion.button></div>
    </div>
    {stages.map((stage,index) => <button type="button" key={stage.title} className={`${styles.card} ${styles[`card${index}`]}`} data-active={arrived === index} aria-pressed={shown === index} onPointerEnter={event => { if(event.pointerType === 'mouse') { interacting.current = true; setPreview(index); } }} onPointerLeave={() => setPreview(null)} onFocus={() => { interacting.current = true; setPreview(index); }} onBlur={() => setPreview(null)} onClick={() => { interacting.current = true; setSelected(index); }}><span className={styles.icon}><StageIcon index={index} /></span><span className={styles.cardCopy}><strong>{stage.title}</strong><span className={styles.preview}>{index === 0 ? <span className={styles.message}>New website enquiry</span> : index === 1 ? <svg className={styles.signaturePreview} viewBox="0 0 110 20" aria-label="Signed document"><path className={styles.signature} pathLength="1" d="M3 16C12 0 19 0 13 12S23 18 30 9s-1 13 12 4 8 5 20-3 10 4 21 0M7 18h94" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg> : <span className={styles.checkItems}><span>✓ Welcome sent</span><span>✓ Portal ready</span></span>}</span><small>{stage.status}</small><span className={styles.explanation}>{['Every enquiry captured, ready for a reply.', 'Agreement signed. The next step is ready.', 'A warm welcome and one place for the project.'][index]}</span></span></button>)}
  </div>;
}
