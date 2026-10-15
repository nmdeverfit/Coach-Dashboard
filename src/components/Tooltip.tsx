/**
 * Dark tooltip from the design ("Dismiss" on the panel title row). Shows above its trigger, which must carry the
 * `group/tip` class and `relative` positioning.
 */
export function Tooltip({ label }: { label: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden -translate-x-1/2 flex-col items-center group-hover/tip:flex group-focus-visible/tip:flex"
    >
      <span className="whitespace-nowrap rounded-md bg-[#343434] px-2 py-[3.2px] text-[12px] font-normal leading-[1.4] text-white">{label}</span>
      <span className="-mt-1 size-[6.87px] rotate-45 rounded-[0.8px] bg-[#343434]" />
    </span>
  );
}
