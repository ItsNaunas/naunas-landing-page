import type { ProblemCardIcon } from './types';

type CardIconProps = {
  name: ProblemCardIcon;
  size?: number;
};

export function CardIcon({ name, size = 22 }: CardIconProps) {
  const stroke = 'var(--accent)';
  const sw = 1.5;
  switch (name) {
    case 'funnel':
      return (
        <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden>
          <path
            d="M4 4h14l-5 7v6l-4-2v-4L4 4z"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M13 16l4 3" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case 'clock':
      return (
        <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="7.5" stroke={stroke} strokeWidth={sw} />
          <path d="M11 7v5l3 2" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'eye_off':
      return (
        <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden>
          <path
            d="M3 11s3.5-6.5 8-6.5 8 6.5 8 6.5-3.5 6.5-8 6.5-8-6.5-8-6.5z"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="11" cy="11" r="2.5" stroke={stroke} strokeWidth={sw} />
          <path d="M4 4l14 14" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case 'target':
      return (
        <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="8" stroke={stroke} strokeWidth={sw} />
          <circle cx="11" cy="11" r="4" stroke={stroke} strokeWidth={sw} />
          <circle cx="11" cy="11" r="1.2" fill={stroke} />
        </svg>
      );
    default: {
      const _exhaustive: never = name;
      return _exhaustive;
    }
  }
}
