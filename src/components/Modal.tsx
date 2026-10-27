import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import iconClose from '../assets/figma/icon-modal-close.svg';

/**
 * The design's popup (Figma 5726:511926): 500 px, white, rounded 16, the 18 px black × sitting on the top-right
 * corner, a 20 px semibold title over a bottom border, then the body and a right-aligned footer. Rendered into
 * <body> so a sliding panel's transform never becomes its containing block. Esc closes it; the open panel behind it
 * ignores that Esc and any click while it is up (`aria-modal`, see `useCloseOnOutside`).
 */
export function Modal({
  title,
  subtitle,
  width = 500,
  height,
  onClose,
  closeOnBackdrop = false,
  footer,
  headerBorder = true,
  footerBorder = true,
  header,
  radius = 16,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  width?: number;
  /** A fixed height (Notes timeline trial: every note popup the same size); the body then fills it as a column. */
  height?: string;
  onClose: () => void;
  /** Off for forms, so a stray click never throws away what the coach typed. */
  closeOnBackdrop?: boolean;
  footer?: ReactNode;
  /** Off when the body starts with its own bordered bar (the meeting popup's tabs). */
  headerBorder?: boolean;
  /** Off for a short form whose buttons sit right under it (Change Client Status). */
  footerBorder?: boolean;
  /** Replaces the title row (the note popups draw their own); `title` then only names the dialog. */
  header?: ReactNode;
  /** Corner radius: 16 as on most popups, 12 on the note popups. */
  radius?: number;
  children: ReactNode;
}) {
  const titleId = useId();
  useEffect(() => {
    // A confirmation opened over it (Delete note) takes that Esc for itself. Otherwise the popup does, and no later
    // listener (the panel behind) sees it after the popup has gone.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('[role="alertdialog"]')) return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/50 p-10"
      onMouseDown={(e) => closeOnBackdrop && e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={header ? undefined : titleId}
        aria-label={header ? title : undefined}
        className="relative flex max-h-full animate-pop-in flex-col bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.05),0_8px_70px_rgba(0,0,0,0.2)]"
        style={{ width, height, borderRadius: radius }}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-0 top-0 z-[1] size-[18px] -translate-y-1/2 translate-x-1/2 rounded-full hover:opacity-80"
        >
          <img src={iconClose} alt="" width={18} height={18} className="block" />
        </button>
        {header ?? (
          <header className={`shrink-0 px-[30px] py-5 ${headerBorder ? 'border-b border-line' : ''}`}>
            <h2 id={titleId} className="text-[20px] font-semibold leading-[1.5] text-ink">
              {title}
            </h2>
            {subtitle && <div className="mt-1 text-[13px] leading-[1.5] text-ink-tertiary">{subtitle}</div>}
          </header>
        )}
        <div className={`min-h-0 flex-1 overflow-y-auto ${height ? 'flex flex-col' : ''}`}>{children}</div>
        {footer && <footer className={`flex shrink-0 justify-end gap-2 px-[30px] ${footerBorder ? 'border-t border-line py-5' : 'pb-6 pt-4'}`}>{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
