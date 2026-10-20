import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** In-page confirmation, used by Dismiss and Dismiss all. */
export function ConfirmDialog({ title, body, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    // Its Esc goes no further: not to a popup or panel behind it, which would see it once the dialog has gone.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40" onMouseDown={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-body"
        className="w-[400px] rounded-lg bg-white p-6 shadow-dialog"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-[16px] font-bold leading-[1.4] text-ink">
          {title}
        </h2>
        <p id="confirm-body" className="mt-2 text-[13px] leading-[1.5] text-ink-tertiary">
          {body}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-8 rounded-[4px] border border-line-button px-4 text-[13px] font-semibold text-ink-tertiary hover:bg-surface-secondary"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="h-8 rounded-[4px] bg-ink px-4 text-[13px] font-semibold text-white hover:bg-ink/90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
