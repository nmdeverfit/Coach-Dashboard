/** The small bordered count beside a section title ("section number" in Figma). */
export function CountChip({ value }: { value: number }) {
  return (
    <span className="inline-flex min-w-[15px] items-center justify-center rounded-[4px] border border-line-chip bg-white px-1 py-0.5 text-[12px] font-semibold leading-[1.4] text-ink/80 tabular-nums">
      {value}
    </span>
  );
}
