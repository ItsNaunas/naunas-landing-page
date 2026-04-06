'use client';

import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-200 cursor-pointer rounded-full whitespace-nowrap active:scale-[0.98]';

  const variants = {
    primary: 'bg-[var(--accent)] text-[#0C0C0C] font-semibold hover:bg-[var(--accent-hover)] glow-accent',
    outline: 'border border-white/20 text-[var(--fg)] hover:border-white/50 hover:bg-white/5',
    ghost:   'text-[var(--fg)] hover:text-[var(--accent)]',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-3.5 text-sm',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
