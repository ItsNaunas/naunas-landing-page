import { CardIcon } from './CardIcon';
import type { ProblemDeckCardData } from './types';

type ProblemDeckCardProps = {
  card: ProblemDeckCardData;
  depth: number;
  transform: string;
  hoverTransform: string;
  transition: string;
  shadowIntensity: string;
  backgroundBlur: number;
  filter: string;
  opacity: number;
  idleFloat: boolean;
  /** When set, one-shot accent ring (new front card). */
  flashLayerKey: number | null;
};

export function ProblemDeckCard({
  card,
  depth,
  transform,
  hoverTransform,
  transition,
  shadowIntensity,
  backgroundBlur,
  filter,
  opacity,
  idleFloat,
  flashLayerKey,
}: ProblemDeckCardProps) {
  const combinedTransform = hoverTransform ? `${transform} ${hoverTransform}` : transform;
  
  return (
    <article
      data-deck-depth={depth}
      className="problem-deck-card absolute bottom-0 right-0 w-full max-w-[520px]"
      style={{
        transform: combinedTransform,
        opacity,
        filter: `${filter} ${backgroundBlur > 0 ? `blur(${backgroundBlur}px)` : ''}`,
        transition,
        boxShadow: shadowIntensity,
      }}
    >
      <div
        className={`problem-deck-card-face relative min-h-[240px] sm:min-h-[260px] rounded-2xl border px-7 py-8 sm:px-8 sm:py-9 ${idleFloat ? 'problem-deck-idle-float-inner' : ''}`}
      >
        {flashLayerKey !== null ? (
          <div
            key={flashLayerKey}
            className="problem-deck-flash-ring absolute inset-0 z-10 rounded-2xl"
            aria-hidden
          />
        ) : null}
        <div className="relative z-[1] flex gap-5">
          <div className="problem-deck-card-icon-well flex h-14 w-14 shrink-0 items-center justify-center rounded-xl">
            <CardIcon name={card.icon} size={28} />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className="text-balance font-semibold text-lg sm:text-xl leading-snug tracking-tight"
              style={{ color: 'var(--problem-fg, var(--fg))' }}
            >
              {card.title}
            </h3>
            <p
              className="mt-3 text-pretty text-base leading-relaxed"
              style={{ color: 'var(--problem-muted, var(--muted))' }}
            >
              {card.description}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
