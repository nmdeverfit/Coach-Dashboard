import iconSparkle from '../../assets/figma/icon-ai-sparkle.svg';
import quoteLine from '../../assets/figma/ai-quote-line.svg';
import iconTellMeMore from '../../assets/figma/icon-tell-me-more.svg';
import type { Assessment } from '../../lib/checkin';

/** Gradient used on the "AI Assessment" label in Figma. */
const AI_GRADIENT =
  'radial-gradient(120% 260% at 0% 0%, #f2617d 0%, #c159aa 22%, #8f51d6 44%, #6c59e0 58%, #4861e9 72%, #2469f3 86%, #0071fd 100%)';

interface Props {
  assessment: Assessment;
  onTellMeMore: () => void;
}

export function AiAssessment({ assessment, onTellMeMore }: Props) {
  const { headline, bullets } = assessment;
  return (
    <section className="relative flex flex-col gap-3 rounded-lg border border-ai-line bg-white p-4 shadow-ai-card">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <img src={iconSparkle} alt="" width={16} height={16} />
          <h3 className="bg-clip-text text-[14px] font-semibold leading-[1.5] text-transparent" style={{ backgroundImage: AI_GRADIENT }}>
            AI Assessment
          </h3>
        </div>
        <div className="flex items-stretch gap-3 px-1">
          <div className="flex w-0 shrink-0 items-center justify-center [container-type:size]" aria-hidden>
            <div className="w-[100cqh] flex-none rotate-90">
              <div className="relative h-0 w-full">
                <div className="absolute inset-[-2px_-1.85%]">
                  <img src={quoteLine} alt="" className="block size-full max-w-none" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="text-[13px] font-semibold leading-[1.5] text-ink">
              {headline.before}
              {headline.signal && (
                <>
                  {' '}
                  <span className="rounded-[4px] bg-brand/10 px-1 text-[#2160ff]">{headline.signal}</span>
                </>
              )}
              {headline.after && ` ${headline.after}`}
            </p>
            <ul className="list-disc text-[13px] leading-[1.5] text-ink-tertiary">
              {bullets.map((b) => (
                <li key={b} className="ms-[19.5px]">
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onTellMeMore}
          className="ai-btn flex h-9 items-center gap-2 rounded-[4px] border border-black/15 bg-white px-[11px] text-[13px] font-semibold text-ink shadow-ai-button"
        >
          <img src={iconTellMeMore} alt="" width={20} height={20} />
          Tell me more
        </button>
      </div>
    </section>
  );
}
