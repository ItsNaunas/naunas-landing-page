import { DECK_MOTION as M } from './config';

export function depthForIndex(cardIndex: number, frontIndex: number, n: number): number {
  return (cardIndex - frontIndex + n) % n;
}

export function sortedDeckIndices(frontIndex: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => depthForIndex(b, frontIndex, n) - depthForIndex(a, frontIndex, n),
  );
}

export type StackBase = {
  liftPx: number;
  scale: number;
  opacity: number;
  rotateX: number;
};

export function getStackBase(depth: number): StackBase {
  return {
    liftPx: -depth * M.stackLiftPx,
    scale: 1 - depth * M.scaleStepPerDepth,
    opacity: 1 - depth * M.opacityStepPerDepth,
    rotateX: depth * M.rotateXDegPerDepth,
  };
}

/**
 * Full CSS transform for one card. Deal phase adds “up and over” on the front card only.
 */
export function buildDeckTransform(depth: number, isDealingFront: boolean): string {
  const s = getStackBase(depth);
  if (!isDealingFront) {
    return `translateX(0px) translateY(${s.liftPx}px) rotateZ(0deg) scale(${s.scale}) rotateX(${s.rotateX}deg)`;
  }
  const y = s.liftPx + M.dealLiftPx;
  const rotX = s.rotateX + M.dealExtraRotateXDeg;
  const rotZ = M.dealRotateZDeg + M.shuffleRotationZ;
  const scale = s.scale * M.dealScaleMul;
  return `translateX(${M.dealSlideXPx}px) translateY(${y - M.shuffleArcHeight}px) rotateZ(${rotZ}deg) scale(${scale}) rotateX(${rotX}deg)`;
}

/**
 * Enhanced transform with hover effects for front card
 */
export function buildHoverTransform(depth: number, isHovered: boolean): string {
  if (depth !== 0 || !isHovered) return '';
  return `translateY(-${M.hoverLiftPx}px) rotateZ(${M.hoverRotationDeg}deg) scale(${M.hoverScale})`;
}

/**
 * Calculate shadow intensity based on depth
 */
export function cardShadowIntensity(depth: number): string {
  const intensity = Math.max(0, 1 - depth * M.shadowIntensityPerDepth);
  const blur = 8 + depth * 4;
  const spread = 2 + depth * 2;
  return `0 ${4 + depth * 2}px ${blur}px rgba(0, 0, 0, ${intensity * 0.15}), 0 ${2 + depth}px ${spread}px rgba(0, 0, 0, ${intensity * 0.08})`;
}

/**
 * Calculate background blur for depth cards
 */
export function cardBackgroundBlur(depth: number): number {
  return depth * M.backgroundBlurPerDepth;
}

export function stackBrightness(depth: number): number {
  return 1 - depth * M.brightnessStepPerDepth;
}

export function stackOpacity(depth: number): number {
  return getStackBase(depth).opacity;
}

export function deckTransition(reducedMotion: boolean, dealingFront: boolean, delayMs: number = 0): string {
  const delay = delayMs > 0 ? ` ${delayMs}ms` : '';
  if (reducedMotion) {
    return `transform${delay} 0.4s ease, opacity${delay} 0.35s ease, filter${delay} 0.35s ease`;
  }
  if (dealingFront) {
    return `transform${delay} ${M.dealPhaseMs}ms ${M.dealEase}, opacity${delay} 0.28s ease, filter${delay} 0.28s ease`;
  }
  return `transform${delay} ${M.settleDurationMs}ms ${M.springEase}, opacity${delay} 0.58s ease, filter${delay} 0.58s ease`;
}

export function settleStaggerMs(
  depth: number,
  reducedMotion: boolean,
  isDealing: boolean,
): number {
  if (reducedMotion || isDealing) return 0;
  return depth * M.settleStaggerMs;
}
