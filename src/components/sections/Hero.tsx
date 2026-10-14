'use client';
import type { MouseEvent } from 'react';
import { HeroJourney } from './HeroJourney';
import { Magnetic } from '@/components/ui/Magnetic';
import { Button } from '@/components/ui/Button';
import styles from './Hero.module.css';
function Arrow() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function scrollToHash(event: MouseEvent<HTMLAnchorElement>) {
  const target = document.getElementById(event.currentTarget.hash.slice(1));
  if (!target) return;
  event.preventDefault();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
}
export function Hero({ onAuditClick }: { onAuditClick: () => void }) {
  return <section id="hero" className={styles.hero}><div className={styles.inner}><div className={styles.layout}>
    <div className={styles.copy}><h1 className={styles.headline}>More signed<br />projects.<br /><span className={styles.flow}>Less chasing.<svg className={styles.headlineUnderline} viewBox="0 0 500 24" preserveAspectRatio="none" aria-hidden="true"><path d="M5 9 Q240 1 495 8" pathLength="1" /><path d="M12 21 Q245 13 488 20" pathLength="1" /></svg></span></h1><p className={styles.body}>Turn enquiries into signed projects, get clients started sooner, and spend less time chasing.</p>
    <div className={styles.actions}><Magnetic><Button size="lg" onClick={onAuditClick} data-cta="audit">Book your free audit <Arrow /></Button></Magnetic><a href="#see-the-system" className={styles.secondary} onClick={scrollToHash}><span className={styles.secondaryLabel}>See how it works</span><Arrow /></a></div>
    <a href="#testimonials" className={styles.proof} onClick={scrollToHash}><div className={styles.trustGroup}><span className={styles.trustLabel}>Trusted by</span><div className={styles.avatarCluster}><div className={styles.avatars}>{[{initial:'U',name:'Uche Ibeh'},{initial:'D',name:'Derick Prosper'},{initial:'A',name:'Abdullah Said'}].map(client => <span key={client.initial} title={client.name}>{client.initial}</span>)}</div><span className={styles.clientBadge}>+10</span></div></div><div><p className={styles.quote}>&ldquo;You&apos;re making things make sense.&rdquo;</p><p className={styles.attribution}>Derick Prosper · Soul in the Horn</p><span className={styles.reviewRow}><span className={styles.reviewStars} aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <svg key={index} width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" /></svg>)}</span><span className={styles.reviewCue}>Read the reviews <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v16m-6-6 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></span></span></div></a>
    </div>
    <div className={styles.visual}><HeroJourney /></div>
  </div></div></section>;
}
