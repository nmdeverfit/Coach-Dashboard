/** An exported Figma vector placed with its frame's inset and bleed wrappers, so it sits exactly as drawn. */
export function Glyph({ src, size, inset, bleed }: { src: string; size: number; inset: string; bleed: string }) {
  return (
    <span className="relative shrink-0 overflow-hidden" style={{ width: size, height: size }}>
      <span className="absolute" style={{ inset }}>
        <span className="absolute" style={{ inset: bleed }}>
          <img src={src} alt="" className="block size-full max-w-none" />
        </span>
      </span>
    </span>
  );
}
