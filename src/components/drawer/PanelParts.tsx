import type { ReactNode } from 'react';
import iconMessage from '../../assets/figma/icon-message-dots.svg';
import iconPencilAi from '../../assets/figma/icon-pencil-ai.svg';
import { useStore } from '../../state/store';

/** Part D (Spec 4 BL1): the data tabs. Tabs whose v1 data area is not wired yet read muted, as in the design. */
export function TabBar<K extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly { key: K; label: string; muted?: boolean }[];
  active: K;
  onChange: (key: K) => void;
}) {
  return (
    <div role="tablist" aria-label="Client data" className="flex w-full items-center border-b border-line">
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.key)}
            className={
              on
                ? '-mb-px border-b-2 border-brand px-5 pb-2.5 pt-2 text-[13px] font-semibold leading-normal text-brand'
                : `px-5 py-1.5 text-[13px] font-semibold leading-normal tracking-[-0.26px] hover:text-ink ${t.muted ? 'text-ink/40' : 'text-ink-secondary'}`
            }
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** Data area wrapper under the assessment: a top border, then the tabs and the active tab's cards. */
export function DataArea({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col border-t border-line px-[30px] pb-2 pt-2.5">
      <div className="flex flex-col items-end gap-[15px] py-3">{children}</div>
    </div>
  );
}

export function TabPlaceholder({ label }: { label: string }) {
  return (
    <p className="w-full rounded-lg border border-dashed border-line-light bg-elevated px-4 py-10 text-center text-[13px] text-ink-secondary">
      The {label} tab keeps CID v1’s data area. It will be wired in once its frame is shared.
    </p>
  );
}

type Variant = 'primary' | 'ai' | 'plain';

const VARIANT: Record<Variant, string> = {
  primary: 'border-black/10 bg-brand text-white hover:bg-brand/90',
  ai: 'border-line-light bg-white text-ink shadow-ai-draft hover:bg-surface-secondary',
  plain: 'border-line-light bg-white text-ink hover:bg-surface-secondary',
};

export function FooterButton({
  variant,
  icon,
  label,
  onClick,
  disabled,
}: {
  variant: Variant;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-10 items-center gap-2 rounded-lg border px-6 text-[14px] font-semibold leading-5 tracking-[-0.28px] disabled:cursor-default disabled:opacity-60 ${VARIANT[variant]}`}
    >
      <span className="flex size-5 shrink-0 items-center justify-center">{icon}</span>
      {label}
    </button>
  );
}

/** Part G: one footer pinned to the bottom, a primary action plus at most two secondary controls (Spec 4 BL1). */
export function PanelFooter({ children }: { children: ReactNode }) {
  return <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-line bg-white px-[30px] pb-5 pt-4 shadow-footer">{children}</footer>;
}

/** "Draft with AI": Olly Voice with a draft, in a middle column beside the panel (Spec 4 BL1, AC2.2). */
export function DraftWithAiButton({ firstName, about }: { firstName: string; about?: string }) {
  const { showToast } = useStore();
  return (
    <FooterButton
      variant="ai"
      icon={<img src={iconPencilAi} alt="" width={20} height={20} />}
      label="Draft with AI"
      onClick={() => showToast(`Draft with AI opens beside this panel with a message for ${firstName}${about ? ` ${about}` : ''}`)}
    />
  );
}

/** "Send message": an empty composer in the same middle column. Sending never completes the to-do. */
export function SendMessageButton() {
  const { showToast } = useStore();
  return (
    <FooterButton
      variant="plain"
      icon={<img src={iconMessage} alt="" width={16.2} height={16.2} />}
      label="Send message"
      onClick={() => showToast('The message composer opens beside this panel, empty')}
    />
  );
}
