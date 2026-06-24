interface AvatarProps {
  size?: number;
}

export function Avatar({ size = 96 }: AvatarProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/assets/sections/hero/avatar.png"
      alt="Naufal"
      width={size}
      height={size}
      className="rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        objectFit: 'cover',
        background: 'rgba(242,97,63,0.12)',
        border: '2px solid rgba(242,97,63,0.5)',
        boxShadow: '0 0 0 4px rgba(242,97,63,0.12)',
      }}
    />
  );
}
