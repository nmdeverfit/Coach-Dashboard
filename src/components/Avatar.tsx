const FALLBACK_COLORS = ['#c7d7fe', '#fde2c4', '#d1f2e0', '#f9d0e0', '#e3d7fb', '#cdeefa'];

function colorFor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

interface AvatarProps {
  name: string;
  src?: string;
  size?: number;
}

/** Round client photo; clients without a photo get initials on a soft tint. */
export function Avatar({ name, src, size = 28 }: AvatarProps) {
  const style = { width: size, height: size };
  if (src) {
    return <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={style} />;
  }
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-ink"
      style={{ ...style, backgroundColor: colorFor(name) }}
    >
      {initials(name)}
    </span>
  );
}
