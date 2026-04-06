'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { DECK_MOTION } from './config';
import { sortedDeckIndices } from './transforms';

type UseProblemDeckArgs = {
  inView: boolean;
  paused: boolean;
  cardCount: number;
};

export function useProblemDeck({ inView, paused, cardCount }: UseProblemDeckArgs) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const n = cardCount;

  const [frontIndex, setFrontIndex] = useState(0);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [isDealing, setIsDealing] = useState(false);
  const [flashKey, setFlashKey] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const flashClearRef = useRef<number | null>(null);
  const flashSeqRef = useRef(0);

  const triggerFrontFlash = useCallback(() => {
    flashSeqRef.current += 1;
    setFlashKey(flashSeqRef.current);
    if (flashClearRef.current !== null) window.clearTimeout(flashClearRef.current);
    flashClearRef.current = window.setTimeout(() => {
      setFlashKey(null);
      flashClearRef.current = null;
    }, DECK_MOTION.flashClearMs);
  }, []);

  useEffect(() => {
    if (!inView) {
      setShuffleEnabled(false);
      setFrontIndex(0);
      setIsDealing(false);
      setIsHovered(false);
      return;
    }
    const t = window.setTimeout(() => setShuffleEnabled(true), DECK_MOTION.introDelayMs);
    return () => window.clearTimeout(t);
  }, [inView]);

  useEffect(() => {
    if (!inView || !shuffleEnabled || paused || isHovered) return;

    if (prefersReducedMotion) {
      const id = window.setInterval(() => {
        setFrontIndex((i) => (i + 1) % n);
      }, DECK_MOTION.shuffleIntervalMs);
      return () => window.clearInterval(id);
    }

    const id = window.setInterval(() => setIsDealing(true), DECK_MOTION.shuffleIntervalMs);
    return () => window.clearInterval(id);
  }, [inView, shuffleEnabled, paused, prefersReducedMotion, n]);

  useEffect(() => {
    if (!isDealing || prefersReducedMotion) return;
    const t = window.setTimeout(() => {
      setFrontIndex((i) => (i + 1) % n);
      setIsDealing(false);
      triggerFrontFlash();
    }, DECK_MOTION.dealPhaseMs);
    return () => window.clearTimeout(t);
  }, [isDealing, prefersReducedMotion, n, triggerFrontFlash]);

  const sortedIndices = useMemo(
    () => sortedDeckIndices(frontIndex, n),
    [frontIndex, n],
  );

  const idleDrift =
    inView && shuffleEnabled && !paused && !isDealing && !prefersReducedMotion;

  return {
    frontIndex,
    sortedIndices,
    isDealing,
    shuffleEnabled,
    prefersReducedMotion,
    idleDrift,
    flashKey,
    isHovered,
    shuffleIntervalSec: Math.round(DECK_MOTION.shuffleIntervalMs / 1000),
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  };
}
