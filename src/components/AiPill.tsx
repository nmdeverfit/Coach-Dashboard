/** The "AI" pill (Figma): beside the client list's Status header and on Olly's tab. */
export function AiPill() {
  return (
    <span
      className="rounded-full border border-black/40 px-[7px] py-0.5 font-display text-[10px] font-bold leading-normal text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.25)]"
      style={{ backgroundImage: 'radial-gradient(100% 160% at 50% 100%, #d64fff 25%, #a052f4 44%, #6b55ea 62%, #3559df 81%, #005cd4 100%)' }}
    >
      AI
    </span>
  );
}
