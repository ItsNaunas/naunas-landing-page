/**
 * Tunable deck motion — change shuffle feel here without touching components.
 */
export const DECK_MOTION = {
  shuffleIntervalMs: 3800,
  introDelayMs: 1000,
  dealPhaseMs: 450,
  settleDurationMs: 1200,
  settleStaggerMs: 60,
  stackLiftPx: 20,
  /** Per depth — keep rear cards readable, not muddy */
  scaleStepPerDepth: 0.026,
  opacityStepPerDepth: 0.06,
  rotateXDegPerDepth: 1.05,
  brightnessStepPerDepth: 0.032,
  /** Up-and-over deal: tuck top card upward before index advances */
  dealLiftPx: -30,
  /** Small nudge toward outer gutter (px) */
  dealSlideXPx: 8,
  dealRotateZDeg: 0.35,
  dealExtraRotateXDeg: 3.5,
  dealScaleMul: 0.985,
  /** Enhanced shuffle arc motion */
  shuffleArcHeight: 15,
  shuffleRotationZ: 1.5,
  /** Hover interactions */
  hoverRotationDeg: 2,
  hoverScale: 1.02,
  hoverLiftPx: 8,
  /** Visual depth enhancements */
  shadowIntensityPerDepth: 0.15,
  backgroundBlurPerDepth: 0.3,
  springEase: 'cubic-bezier(0.34, 1.12, 0.36, 1)',
  dealEase: 'cubic-bezier(0.22, 0.88, 0.2, 1)',
  flashClearMs: 260,
} as const;
