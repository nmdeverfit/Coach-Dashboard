import iconCheckboxTick from '../../assets/figma/icon-checkbox-tick.svg';
import iconChevron from '../../assets/figma/icon-chevron-form.svg';
import iconCompare from '../../assets/figma/icon-compare.svg';
import dot from '../../assets/figma/dot-drawer.svg';
import type { FormAnswer, RespondDetail } from '../../data/types';
import { formatMonthDay, parseDay } from '../../lib/dates';
import type { RespondView } from '../../lib/todos';
import { useStore } from '../../state/store';

function Answer({ answer }: { answer: FormAnswer }) {
  if (answer.kind === 'text') return <p className="text-[13px] leading-[1.5] text-ink">{answer.answer}</p>;
  if (answer.kind === 'choice')
    return (
      <div className="flex flex-col gap-1 py-1.5">
        {answer.selected.map((option) => (
          <div key={option} className="flex items-center gap-3">
            <span className="relative size-5 shrink-0 overflow-hidden rounded-[4px] bg-brand">
              <img src={iconCheckboxTick} alt="" className="absolute left-1 top-[4.5px] size-3" />
            </span>
            <span className="text-[13px] leading-[1.5] text-ink">{option}</span>
          </div>
        ))}
      </div>
    );
  const options = Array.from({ length: answer.max - answer.min + 1 }, (_, i) => answer.min + i);
  return (
    <div className="flex items-center gap-[3.79px]" role="img" aria-label={`Answered ${answer.value} on a ${answer.min} to ${answer.max} scale`}>
      {options.map((n) =>
        n === answer.value ? (
          <span
            key={n}
            className="flex h-9 min-w-0 flex-1 items-center justify-center rounded-[7.58px] border-[0.948px] border-brand/10 bg-brand/10 text-[14px] font-semibold leading-[1.5] text-[#0038ff]"
          >
            {n}
          </span>
        ) : (
          <span
            key={n}
            className="flex h-9 min-w-0 flex-1 items-center justify-center rounded-[7.58px] border-[0.948px] border-[#dadfea] bg-white text-[14px] leading-[1.5] text-black opacity-40"
          >
            {n}
          </span>
        ),
      )}
    </div>
  );
}

/** Respond (form review): the questions and answers render directly; Form is the only tab (Spec 4 AC3.3). */
export function RespondBody({ detail, view, reviewed }: { detail: RespondDetail; view: RespondView; reviewed: boolean }) {
  const { showToast } = useStore();
  return (
    <div className="px-[30px] pb-5">
      <section className="overflow-hidden rounded-lg border border-ink/15 bg-elevated p-px">
        <header className="flex items-center justify-between rounded-t-lg border-b border-ink/10 bg-white p-4">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => showToast(`The ${detail.form} response opens in the client’s Forms tab`)}
              className="flex items-center gap-1 text-[15px] font-semibold leading-[18px] text-ink hover:text-brand"
            >
              {detail.form}
              <img src={iconChevron} alt="" width={16} height={16} />
            </button>
            <p className="flex items-center gap-2 text-[13px] leading-normal text-ink-tertiary">
              <span>
                Submitted at <span className="text-ink">{formatMonthDay(parseDay(detail.submittedOn))}</span>
              </span>
              <img src={dot} alt="" width={4} height={4} />
              <span>{reviewed ? 'Reviewed' : 'Not reviewed'}</span>
            </p>
          </div>
          {/* Only with two or more responses to compare; it opens in a new tab (AC3.3). */}
          {view.canCompare && (
            <button
              type="button"
              onClick={() => showToast(`Compare response opens ${detail.responseCount} ${detail.form} responses in a new tab`)}
              className="flex h-9 items-center gap-2 rounded-md border border-black/15 bg-white px-[13px] text-[13px] font-semibold leading-5 tracking-[-0.26px] text-ink hover:bg-surface-secondary"
            >
              <img src={iconCompare} alt="" width={20} height={20} />
              Compare response
            </button>
          )}
        </header>
        <ol className="bg-[#f9fafa]">
          {detail.answers.map((a, i) => (
            <li key={a.question} className={`flex flex-col p-5 ${a.kind === 'scale' ? 'gap-4' : 'gap-2'} ${i ? 'border-t border-[#e6ebf2]' : ''}`}>
              <p className="text-[14px] font-semibold leading-[1.5] tracking-[-0.28px] text-ink">
                {i + 1}. {a.question}
              </p>
              <Answer answer={a} />
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
