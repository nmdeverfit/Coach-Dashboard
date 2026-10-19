/**
 * Dark tooltip from the design ("Dismiss" on the panel title row). Shows above its trigger, which must carry the
 * `group/tip` class and `relative` positioning. `wide` lets a sentence wrap at 240 px instead of one line;
 * `start` lines it up with the trigger's left edge (for triggers at the left of a card) instead of centring it.
 * `below` hangs it under the trigger, where the space above is clipped (the first row of a scrolling list).
 */
export function Tooltip({ label, wide = false, start = false, below = false }: { label: string; wide?: boolean; start?: boolean; below?: boolean }) {
  return (
    <span
      role="tooltip"
      className={`pointer-events-none absolute z-20 hidden group-hover/tip:flex group-focus-visible/tip:flex ${
        below ? 'top-full mt-1.5 flex-col-reverse' : 'bottom-full mb-1.5 flex-col'
      } ${start ? 'left-0 items-start' : 'left-1/2 -translate-x-1/2 items-center'}`}
    >
      <span
        className={`rounded-md bg-[#343434] text-[12px] font-normal leading-[1.4] text-white ${
          wide ? 'w-max max-w-[240px] px-2.5 py-1.5 text-center' : 'whitespace-nowrap px-2 py-[3.2px]'
        }`}
      >
        {label}
      </span>
      <span className={`${below ? '-mb-1' : '-mt-1'} size-[6.87px] rotate-45 rounded-[0.8px] bg-[#343434] ${start ? 'ml-[22px]' : ''}`} />
    </span>
  );
}
