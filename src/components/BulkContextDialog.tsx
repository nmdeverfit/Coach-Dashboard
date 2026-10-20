import { useMemo, useState, type ReactNode } from 'react';
import iconPicked from '../assets/figma/icon-circle-check-brand.svg';
import iconSearch from '../assets/figma/icon-search-note.svg';
import { clientGroups } from '../data/clientGroups';
import { clients } from '../data/mock';
import type { AiContext } from '../data/types';
import { useStore } from '../state/store';
import { Avatar } from './Avatar';
import { ContextQuestions, EMPTY_CONTEXT, finishContext, isEmptyContext } from './drawer/AiContext';
import { Modal } from './Modal';

type Scope = 'all' | 'groups' | 'clients';

/** Apply to: All clients · Client groups · Selected clients, as pills like the questions' chips. */
function ScopePill({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex h-9 items-center rounded-full border px-5 text-[13px] ${
        on ? 'border-brand bg-brand/5 font-semibold text-brand' : 'border-[#e0e0e0] bg-white text-black/60 hover:border-brand/40 hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

/** A client in the picker: picked rows turn brand-tinted with a check at the right. */
function PickRow({ picked, onToggle, children }: { picked: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={picked}
      onClick={onToggle}
      className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left ${picked ? 'bg-brand/5' : 'hover:bg-surface-secondary'}`}
    >
      {children}
      {picked && <img src={iconPicked} alt="" width={16} height={16} className="ml-auto shrink-0" />}
    </button>
  );
}

/** Client groups and Selected clients share one picker: a search box, "N selected" + Clear, then two columns of rows. */
function PickerBox({
  query,
  onQuery,
  placeholder,
  count,
  onClear,
  empty,
  children,
}: {
  query: string;
  onQuery: (q: string) => void;
  placeholder: string;
  count: number;
  onClear: () => void;
  empty: string | null;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line-light p-2">
      <div className="flex items-center gap-2">
        <label className="flex h-9 flex-1 items-center gap-2 rounded-[5px] border border-[#d4d7d9] bg-[#fafbfc] px-2.5 focus-within:border-brand">
          <img src={iconSearch} alt="" width={16} height={16} />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-muted"
          />
        </label>
        <span className="shrink-0 px-1 text-[12px] font-semibold text-ink-secondary">{count} selected</span>
        {count > 0 && (
          <button type="button" onClick={onClear} className="shrink-0 text-[12px] font-semibold text-ink underline hover:text-brand">
            Clear
          </button>
        )}
      </div>
      <div className="scroll-thin grid max-h-[208px] grid-cols-2 gap-x-1 overflow-y-auto">
        {children}
        {empty && <p className="col-span-2 px-2 py-3 text-[13px] text-ink-muted">{empty}</p>}
      </div>
    </div>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Dashboard Settings › Add context to clients (the user's call, no frame): the per-client Add context questions,
 * answered once for all clients, some client groups or a hand-picked set. A client's own context stays and is used
 * first; the rest show "Context added · From {source}" on their AI Assessment.
 */
export function BulkContextDialog({ onClose }: { onClose: () => void }) {
  const { state, addSharedContext } = useStore();
  const [scope, setScope] = useState<Scope>('all');
  const [groups, setGroups] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [groupQuery, setGroupQuery] = useState('');
  const [ctx, setCtx] = useState<AiContext>(EMPTY_CONTEXT);
  const set = (patch: Partial<AiContext>) => setCtx((c) => ({ ...c, ...patch }));

  const targets = useMemo(() => {
    if (scope === 'all') return clients.map((c) => c.id);
    if (scope === 'groups') return [...new Set(clientGroups.filter((g) => groups.includes(g.id)).flatMap((g) => g.members))];
    return picked;
  }, [scope, groups, picked]);
  const withOwn = targets.filter((id) => state.aiContext[id]).length;
  const q = query.trim().toLowerCase();
  const shown = clients.filter((c) => !q || c.name.toLowerCase().includes(q));
  const gq = groupQuery.trim().toLowerCase();
  const shownGroups = clientGroups.filter((g) => !gq || g.name.toLowerCase().includes(gq));

  const source =
    scope === 'all'
      ? 'All clients'
      : scope === 'clients'
        ? 'Selected clients'
        : (() => {
            const names = clientGroups.filter((g) => groups.includes(g.id)).map((g) => g.name);
            return names.length > 2 ? `${names[0]} +${names.length - 1}` : names.join(', ');
          })();

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const ready = targets.length > 0 && !isEmptyContext(ctx);

  return (
    <Modal
      title="Add context to clients"
      width={640}
      onClose={onClose}
      subtitle="Tell Olly what it should know about these clients. It applies from tomorrow’s 06:00 update."
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-[6px] border border-[#e0e0e0] bg-white px-[30px] text-[14px] font-semibold leading-5 tracking-[-0.28px] text-ink hover:bg-surface-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => {
              addSharedContext(targets, finishContext(ctx), source);
              onClose();
            }}
            className="h-9 rounded-lg border border-black/10 bg-brand px-[30px] text-[14px] font-semibold leading-5 tracking-[-0.28px] text-white hover:bg-brand/90 disabled:border-transparent disabled:bg-[#eeedec] disabled:text-ink-muted"
          >
            {targets.length ? `Add to ${plural(targets.length, 'client')}` : 'Add context'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-5 px-[30px] pb-6 pt-5">
        <section className="flex flex-col gap-3">
          <p className="text-[14px] font-semibold leading-[1.5] text-ink">Apply to</p>
          <div aria-label="Apply to" className="flex flex-wrap gap-2">
            <ScopePill on={scope === 'all'} onClick={() => setScope('all')}>
              All clients ({clients.length})
            </ScopePill>
            <ScopePill on={scope === 'groups'} onClick={() => setScope('groups')}>
              Client groups
            </ScopePill>
            <ScopePill on={scope === 'clients'} onClick={() => setScope('clients')}>
              Selected clients
            </ScopePill>
          </div>

          {scope === 'groups' && (
            <PickerBox
              query={groupQuery}
              onQuery={setGroupQuery}
              placeholder="Search groups"
              count={groups.length}
              onClear={() => setGroups([])}
              empty={shownGroups.length === 0 ? `No groups match “${groupQuery.trim()}”.` : null}
            >
              {shownGroups.map((g) => {
                const on = groups.includes(g.id);
                return (
                  <PickRow key={g.id} picked={on} onToggle={() => setGroups((l) => toggle(l, g.id))}>
                    <span className={`min-w-0 flex-1 truncate text-[13px] leading-[1.5] ${on ? 'font-semibold text-brand' : 'text-ink'}`}>{g.name}</span>
                    <span className="shrink-0 text-[12px] leading-[1.5] text-ink-secondary">{plural(g.members.length, 'client')}</span>
                  </PickRow>
                );
              })}
            </PickerBox>
          )}

          {scope === 'clients' && (
            <PickerBox
              query={query}
              onQuery={setQuery}
              placeholder="Search clients"
              count={picked.length}
              onClear={() => setPicked([])}
              empty={shown.length === 0 ? `No clients match “${query.trim()}”.` : null}
            >
              {shown.map((c) => (
                <PickRow key={c.id} picked={picked.includes(c.id)} onToggle={() => setPicked((l) => toggle(l, c.id))}>
                  <Avatar name={c.name} src={c.avatar} size={24} />
                  <span className={`truncate text-[13px] leading-[1.5] ${picked.includes(c.id) ? 'font-semibold text-brand' : 'text-ink'}`}>{c.name}</span>
                </PickRow>
              ))}
            </PickerBox>
          )}

          {withOwn > 0 && (
            <p className="rounded-md bg-surface-secondary px-3 py-2 text-[13px] leading-[1.5] text-ink-tertiary">
              {withOwn} of these clients already {withOwn === 1 ? 'has' : 'have'} their own context. Theirs stays and is used first.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-line-light bg-surface-secondary p-4">
          <ContextQuestions ctx={ctx} set={set} who={{ one: false, name: 'these clients' }} />
        </section>
      </div>
    </Modal>
  );
}
