import iconClose from '../assets/figma/icon-toast-close.svg';
import { useStore } from '../state/store';

/**
 * The design's toast (Figma 4805:185601): #151619, rounded 5, 20 px padding, 13 px semibold white text, a 12 px ✕ at
 * least 90 px after it. Always at the top-right corner, 16 px in from the top and right edges, above every panel and
 * popup; it goes after 3 s or on ✕. A new message replaces the one showing.
 */
export function Toast() {
  const { state, hideToast } = useStore();
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 top-4 z-[70] flex justify-end">
      {state.toast && (
        <div key={state.toastSeq} role="status" className="pointer-events-auto flex animate-toast-in items-center gap-[90px] overflow-hidden rounded-[5px] bg-[#151619] p-5 shadow-dialog">
          <p className="max-w-[360px] text-[13px] font-semibold leading-5 text-white">{state.toast}</p>
          <button type="button" aria-label="Close" onClick={hideToast} className="relative size-3 shrink-0 overflow-hidden opacity-90 hover:opacity-100">
            <span className="absolute inset-[6.25%]">
              <img src={iconClose} alt="" className="absolute inset-0 block size-full max-w-none" />
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
