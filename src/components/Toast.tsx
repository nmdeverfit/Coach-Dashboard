import { useStore } from '../state/store';

export function Toast() {
  const { state } = useStore();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center">
      {state.toast && (
        <div className="rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white shadow-dialog">{state.toast}</div>
      )}
    </div>
  );
}
