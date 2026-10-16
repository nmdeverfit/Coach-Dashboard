import { useEffect, useState, type ReactNode } from 'react';
import iconChevronDown from '../../assets/figma/icon-chevron-down.svg';

/**
 * Olly at work, as the user's screen recording shows it: "Sending this to the right place…" with pulsing dots, then
 * the task's title over a list of steps (spinner → ✓, one after another), then one line ("✓ Planned 2 changes ⌄")
 * that folds the steps away, and the result fades in under it.
 */

import type { OllyTaskSpec } from '../../lib/olly';

const ROUTING_MS = 900;
const STEP_MS = 750;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function Dots() {
  // Olly gradient stops, one per dot.
  return (
    <span className="flex items-center gap-[3px]" aria-hidden>
      {['#c159aa', '#6c59e0', '#2469f3'].map((c, i) => (
        <span key={c} className="size-[6px] animate-dot-wave rounded-full" style={{ backgroundColor: c, animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}

/** Status text with a light band sweeping across it. */
function Shimmer({ children }: { children: ReactNode }) {
  return (
    <span
      className="animate-shimmer bg-clip-text text-[13px] font-semibold leading-[1.5] text-transparent"
      style={{ backgroundImage: 'linear-gradient(90deg, #6b6e8a 0%, #6b6e8a 40%, #c8cad6 50%, #6b6e8a 60%, #6b6e8a 100%)', backgroundSize: '200% 100%' }}
    >
      {children}
    </span>
  );
}

function Spinner() {
  return <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-brand/15 border-t-brand" aria-hidden />;
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0" aria-hidden>
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="#184eff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckCircle() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0" aria-hidden>
      <circle cx="8" cy="8" r="8" fill="#184eff" />
      <path d="M4.8 8.2 7 10.4l4.2-4.6" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StepList({ steps, progress }: { steps: string[]; progress: number }) {
  return (
    <ul className="flex flex-col gap-2 pl-2">
      {steps.slice(0, progress + 1).map((s, i) => (
        <li key={s} className={`flex animate-bubble-in items-center gap-2.5 text-[13px] leading-[1.5] ${i < progress ? 'text-ink' : 'text-ink/60'}`}>
          {i < progress ? <Check /> : <Spinner />}
          {s}
        </li>
      ))}
    </ul>
  );
}

/**
 * Runs once on mount. `stopped` freezes it where it is (the composer's Stop); `onSettled` fires when it finishes or
 * stops, so the conversation can take the next prompt.
 */
export function OllyTask({ spec, stopped, onSettled, children }: { spec: OllyTaskSpec; stopped: boolean; onSettled: () => void; children: ReactNode }) {
  // -1 = routing; 0…n-1 = working on that step; n = done.
  const [progress, setProgress] = useState(() => (reducedMotion() ? spec.steps.length : -1));
  const [open, setOpen] = useState(false);
  const done = progress >= spec.steps.length;

  useEffect(() => {
    if (done || stopped) {
      onSettled();
      return;
    }
    const t = window.setTimeout(() => setProgress((p) => p + 1), progress < 0 ? ROUTING_MS : STEP_MS);
    return () => window.clearTimeout(t);
    // onSettled is the caller's; it only needs to run when the task settles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, done, stopped]);

  if (stopped && !done) {
    return <p className="text-[13px] leading-[1.5] text-ink-secondary">Stopped. Ask again whenever you’re ready.</p>;
  }
  if (!done) {
    return (
      <div className="flex flex-col gap-3" role="status" aria-live="polite">
        <p className="flex items-center gap-2">
          <Dots />
          <Shimmer>{progress < 0 ? 'Sending this to the right place…' : spec.title}</Shimmer>
        </p>
        {progress >= 0 && <StepList steps={spec.steps} progress={progress} />}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 self-start text-[13px] font-semibold leading-[1.5] text-ink">
        <CheckCircle />
        {spec.doneLabel}
        <img src={iconChevronDown} alt="" width={12} height={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <StepList steps={spec.steps} progress={spec.steps.length} />}
      <div className="animate-bubble-in">{children}</div>
    </div>
  );
}
