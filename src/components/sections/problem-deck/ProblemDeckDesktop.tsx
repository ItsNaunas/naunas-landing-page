'use client';

import { ProblemDeckCard } from './ProblemDeckCard';
import type { ProblemDeckCardData } from './types';
import {
  buildDeckTransform,
  deckTransition,
  depthForIndex,
  settleStaggerMs,
  stackBrightness,
  stackOpacity,
  buildHoverTransform,
  cardShadowIntensity,
  cardBackgroundBlur,
} from './transforms';

type DeckState = {
  sortedIndices: number[];
  frontIndex: number;
  isDealing: boolean;
  prefersReducedMotion: boolean;
  idleDrift: boolean;
  flashKey: number | null;
  shuffleIntervalSec: number;
  isHovered: boolean;
};

type ProblemDeckDesktopProps = {
  cards: readonly ProblemDeckCardData[];
  inView: boolean;
  deck: DeckState;
  ariaSummary: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

export function ProblemDeckDesktop({
  cards,
  inView,
  deck,
  ariaSummary,
  onMouseEnter,
  onMouseLeave,
}: ProblemDeckDesktopProps) {
  const n = cards.length;

  return (
    <div
      className={`relative mx-auto hidden min-h-[480px] w-full lg:block will-animate ${inView ? 'is-visible anim-up delay-200' : ''}`}
      style={{ perspective: '1400px' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="region"
      aria-label={ariaSummary}
    >
      <p className="sr-only">
        Four cards illustrate common problems; the top card cycles automatically about every{' '}
        {deck.shuffleIntervalSec} seconds. Hover the stack to pause.
      </p>
      <div className="absolute inset-x-0 bottom-0 top-8 flex items-end justify-center pb-1">
        <div className="relative h-full w-full max-w-[540px]">
          {/* Enhanced deck background stage */}
          <div 
            className="absolute inset-0 rounded-3xl opacity-30"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(242,97,63,0.08) 0%, transparent 70%)',
              filter: 'blur(20px)',
              transform: 'scale(1.1)',
            }}
          />
          {deck.sortedIndices.map((cardIndex) => {
            const card = cards[cardIndex];
            const depth = depthForIndex(cardIndex, deck.frontIndex, n);
            const dealingFront = deck.isDealing && depth === 0;
            const transform = buildDeckTransform(depth, dealingFront);
            const transitionDelayMs = settleStaggerMs(
              depth,
              deck.prefersReducedMotion,
              deck.isDealing,
            );
            const transition = deckTransition(
              deck.prefersReducedMotion,
              dealingFront,
              transitionDelayMs,
            );

            return (
              <ProblemDeckCard
                key={card.title}
                card={card}
                depth={depth}
                transform={transform}
                hoverTransform={buildHoverTransform(depth, deck.isHovered && depth === 0)}
                transition={transition}
                shadowIntensity={cardShadowIntensity(depth)}
                backgroundBlur={cardBackgroundBlur(depth)}
                filter={`brightness(${stackBrightness(depth)})`}
                opacity={stackOpacity(depth)}
                idleFloat={deck.idleDrift && depth === 0}
                flashLayerKey={depth === 0 ? deck.flashKey : null}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
