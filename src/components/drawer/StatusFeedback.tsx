import iconCloseSmall from '../../assets/figma/icon-close-small.svg';
import type { Client } from '../../data/types';
import { useStore } from '../../state/store';
import { STATUS_LABEL } from '../StatusChip';

/**
 * "Does '{status}' look right for {first_name}?" (Spec 4 AC9.1; the design's "looks" is a copy defect).
 * Yes in one tap; Not quite opens the Change client status modal. No free-text box (AC9.5).
 */
export function StatusFeedback({ client }: { client: Client }) {
  const { state, setFeedback, showToast } = useStore();
  const answer = state.feedback[client.id];
  if (answer === 'hidden') return null;

  return (
    <div className="flex items-center gap-4 rounded-lg bg-surface-secondary px-3 py-2">
      <div className="flex min-h-[30px] min-w-0 flex-1 items-center justify-between gap-3">
        {answer ? (
          <p className="text-[13px] font-semibold leading-[1.5] text-ink-secondary">
            {answer === 'yes' ? 'Thanks. Your answer helps tune the status model.' : 'Thanks. We’ll use your correction to improve the status.'}
          </p>
        ) : (
          <>
            <p className="text-[13px] font-semibold leading-[1.5] text-ink-secondary">
              Does <span className="text-[#484848]">‘{STATUS_LABEL[client.status]}’</span> look right for {client.firstName}?
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFeedback(client.id, 'yes')}
                className="rounded-[4px] border border-line-light bg-white px-2.5 py-1 text-[13px] font-semibold leading-[1.5] text-ink-tertiary hover:text-ink"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => {
                  setFeedback(client.id, 'not_quite');
                  showToast('The Change client status modal (v1.13) opens here');
                }}
                className="rounded-[4px] border border-line-light bg-white px-2.5 py-1 text-[13px] font-semibold leading-[1.5] text-ink-tertiary hover:text-ink"
              >
                Not quite
              </button>
            </div>
          </>
        )}
      </div>
      <button
        type="button"
        aria-label="Hide this question"
        onClick={() => setFeedback(client.id, 'hidden')}
        className="relative size-4 shrink-0 overflow-hidden"
      >
        <img src={iconCloseSmall} alt="" className="absolute left-1/2 top-1/2 size-[19.2px] max-w-none -translate-x-1/2 -translate-y-1/2" />
      </button>
    </div>
  );
}
