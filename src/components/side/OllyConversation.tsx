import { useEffect, useRef, useState, type ReactNode } from 'react';
import iconArrowUp from '../../assets/figma/icon-arrow-up.svg';
import iconMic from '../../assets/figma/icon-mic.svg';
import iconThumbDown from '../../assets/figma/icon-thumb-down.svg';
import iconThumbUp from '../../assets/figma/icon-thumb-up.svg';
import { DEMO_TODAY } from '../../data/mock';
import { getProfile } from '../../data/profiles';
import type { Client } from '../../data/types';
import { buildClientAssessment } from '../../lib/client';
import { draftFor, draftTask, sendTask, tellAnswer, tellPrompt, tellTask, type OllyAnswer, type OllyChart, type OllyTaskSpec } from '../../lib/olly';
import { getClient, useStore, type OllyRequest } from '../../state/store';
import { OllyTask } from './OllyTask';

/**
 * Olly's conversation in the middle column (Figma 5699:137932 Tell me more, 5124:499989 Draft with AI). Tell me more
 * sends the one fixed prompt and answers from the stored status (Spec 4 AC2.3); Draft with AI writes a draft scoped
 * to the panel's to-do (AC2.2). Sending a draft lands in the inbox and never completes the to-do.
 */

/** Olly's chart colours (Figma "Bi Tool/Chart 1" and "Chart 2"). */
const CHART = ['#0e9cff', '#ff7657'] as const;

function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full justify-end">
      <p className="max-w-[88%] animate-bubble-in rounded-lg bg-brand p-2 text-[14px] leading-[1.4] text-white">{children}</p>
    </div>
  );
}

function Feedback() {
  const [vote, setVote] = useState<'up' | 'down' | null>(null);
  const button = (v: 'up' | 'down', src: string, label: string) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={vote === v}
      onClick={() => setVote(vote === v ? null : v)}
      className={`flex size-7 items-center justify-center rounded p-1.5 hover:bg-black/5 ${vote === v ? 'bg-brand/10' : ''}`}
    >
      <img src={src} alt="" width={17.23} height={17.23} />
    </button>
  );
  return (
    <div className="flex gap-[5px]">
      {button('up', iconThumbUp, 'Helpful')}
      {button('down', iconThumbDown, 'Not helpful')}
    </div>
  );
}

/** Two-part donut (Figma: 180 px, the coloured share starting at 12 o'clock). */
function Donut({ chart }: { chart: OllyChart }) {
  const [a, b] = chart.parts;
  const total = a.value + b.value || 1;
  const r = 70;
  const c = 2 * Math.PI * r;
  const share = (a.value / total) * c;
  return (
    <svg viewBox="0 0 180 180" className="size-[180px]" role="img" aria-label={`${chart.headline}: ${chart.caption}`}>
      <circle cx="90" cy="90" r={r} fill="none" stroke={CHART[1]} strokeWidth="26" />
      {a.value > 0 && (
        <circle
          cx="90"
          cy="90"
          r={r}
          fill="none"
          stroke={CHART[0]}
          strokeWidth="26"
          strokeDasharray={`${share} ${c - share}`}
          transform="rotate(-90 90 90)"
        />
      )}
      <circle cx="90" cy="90" r="57" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="2" />
    </svg>
  );
}

function ChartCard({ chart }: { chart: OllyChart }) {
  return (
    <div className="flex w-full flex-col items-center gap-4 rounded-lg border border-[#e6e6e6] bg-white/60 p-4">
      <p className="text-[14px] font-semibold leading-[1.5] text-ink">{chart.title}</p>
      <Donut chart={chart} />
      <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
        {chart.parts.map((p, i) => (
          <span key={p.label} className="flex items-center gap-2 text-[13px] font-semibold leading-[1.4] tracking-[-0.26px] text-ink">
            <span className="size-4 rounded" style={{ backgroundColor: CHART[i] }} />
            {p.label}
          </span>
        ))}
      </div>
      <div className="flex flex-col items-center gap-1 pt-2 leading-[1.5] text-ink">
        <p className="text-[16px] font-bold">{chart.headline}</p>
        <p className="text-[12px] font-semibold opacity-60">{chart.caption}</p>
      </div>
    </div>
  );
}

/** Quick Summary: the assessment's facts, then where they come from, then the chart. Explains, never prescribes. */
function Answer({ answer }: { answer: OllyAnswer }) {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-4 border-b border-[#e6e6e6] pb-6">
        <p className="text-[18px] font-bold leading-[1.5] text-ink">Quick Summary</p>
        <ul className="list-disc text-[14px] leading-[1.5] text-ink">
          {answer.bullets.map((b) => (
            <li key={b} className="ms-[21px]">
              {b}
            </li>
          ))}
        </ul>
        <blockquote className="border-l-4 border-[#e6e6e6] pl-4 text-[14px] italic leading-[1.5] text-ink">{answer.context}</blockquote>
      </div>
      {answer.chart && (
        <>
          <p className="text-[14px] font-bold leading-[1.5] text-ink">Here’s a deeper look at the data for better context:</p>
          <ChartCard chart={answer.chart} />
        </>
      )}
      <Feedback />
    </div>
  );
}


/** The draft card: "Message to {client}", an editable draft and Send (gradient stroke as drawn). */
function DraftCard({ client, text, onChange, onSend, sent, busy }: {
  client: Client;
  text: string;
  onChange: (t: string) => void;
  onSend: () => void;
  sent: boolean;
  busy: boolean;
}) {
  return (
    <div
      className="flex w-full flex-col gap-3 rounded-xl border-2 border-transparent p-3"
      style={{ background: 'linear-gradient(rgba(255,255,255,0.9), rgba(255,255,255,0.9)) padding-box, linear-gradient(180deg, #fbb3c2, #a9c3ff) border-box' }}
    >
      <div className="flex items-center gap-1 border-b border-black/10 pb-2.5 text-[12px] leading-[1.4] text-ink">
        Message to
        <span className="rounded bg-surface-secondary px-1.5 py-1 font-semibold leading-[1.5]">{client.name}</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        readOnly={sent}
        rows={6}
        aria-label="Draft message"
        className="w-full resize-none rounded-xl border border-black/10 bg-elevated px-3 pb-3 pt-3.5 text-[13px] font-semibold leading-[1.4] text-ink outline-none focus:border-brand/40"
      />
      <button
        type="button"
        disabled={sent || busy || !text.trim()}
        onClick={onSend}
        className="h-[30px] rounded-[5px] bg-brand text-[12px] font-semibold leading-[1.5] text-white hover:bg-brand/90 disabled:opacity-50"
      >
        {sent ? 'Sent' : 'Send'}
      </button>
    </div>
  );
}

/** Composer; while Olly works its send button turns into Stop (blue disc, white square), as recorded. */
function Composer({ busy, onAsk, onStop }: { busy: boolean; onAsk: (text: string) => void; onStop: () => void }) {
  const [text, setText] = useState('');
  const submit = () => {
    if (busy || !text.trim()) return;
    onAsk(text.trim());
    setText('');
  };
  return (
    <div className="shrink-0 px-3 pb-4">
      <div className="flex h-[140px] flex-col gap-3 rounded-2xl border border-black/5 bg-white px-2 pb-2 pt-3 shadow-[0_24px_40px_rgba(0,0,0,0.11)]">
        <div className="relative flex-1 px-1">
          {!text && (
            <p className="pointer-events-none absolute left-1 top-0 flex items-center gap-1 text-[13px] leading-[1.4] text-ink/50">
              Ask, @mention, or hold
              <span className="flex h-[18px] w-[26px] items-center justify-center rounded border border-ink text-[11px] font-semibold text-ink opacity-40">Ctrl</span>
              to speak
            </p>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            aria-label="Ask Olly"
            className="size-full resize-none bg-transparent text-[13px] leading-[1.4] text-ink outline-none"
          />
        </div>
        <div className="flex items-end justify-end gap-2">
          <span className="p-[6.4px]" aria-hidden>
            <img src={iconMic} alt="" width={19.2} height={19.2} />
          </span>
          {busy ? (
            <button
              type="button"
              aria-label="Stop"
              onClick={onStop}
              className="flex size-8 items-center justify-center rounded-full"
              style={{ backgroundImage: 'linear-gradient(160deg, #5b8cff 0%, #184eff 100%)' }}
            >
              <span className="size-3 rounded-[3px] bg-white" />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Send to Olly"
              onClick={submit}
              className={`flex size-8 items-center justify-center rounded-full ${text.trim() ? 'bg-brand' : 'bg-[#dadfea]'}`}
            >
              <img src={iconArrowUp} alt="" width={19.2} height={19.2} className={text.trim() ? 'brightness-0 invert' : ''} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface Turn {
  id: number;
  /** The coach's message. */
  user: string;
  task: OllyTaskSpec;
  result: 'answer' | 'draft' | 'sent';
  stopped?: boolean;
}

export function OllyConversation({ clientId, request }: { clientId: string; request: OllyRequest }) {
  const { state, sendMessage, openInbox } = useStore();
  const client = getClient(clientId);
  const todo = state.todos.find((t) => t.id === request.todoId);
  const assessment = request.assessment ?? buildClientAssessment(client, getProfile(client.id), DEMO_TODAY);
  const draft = draftFor(client, todo, DEMO_TODAY);
  const answer = tellAnswer(client, assessment, DEMO_TODAY);
  const [text, setText] = useState(draft.text);
  const [turns, setTurns] = useState<Turn[]>(() => [
    request.mode === 'tell'
      ? { id: 0, user: tellPrompt(client, DEMO_TODAY), task: tellTask(client, DEMO_TODAY), result: 'answer' }
      : { id: 0, user: draft.request, task: draftTask(client), result: 'draft' },
  ]);
  const [busy, setBusy] = useState(true);
  const sent = turns.some((t) => t.result === 'sent' && !t.stopped);
  const scroller = useRef<HTMLDivElement>(null);

  // The first answer reads from the top; later turns scroll into view.
  useEffect(() => {
    if (turns.length > 1) scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [turns.length]);

  const push = (turn: Omit<Turn, 'id'>) => {
    setBusy(true);
    setTurns((t) => [...t, { ...turn, id: t.length }]);
  };
  const send = () => {
    sendMessage(client.id, text.trim());
    push({ user: 'Send', task: sendTask(client), result: 'sent' });
  };
  // Phase 1 answers only from the stored status, so a follow-up gets the same record (AC2.3, OQ5).
  const ask = (q: string) => push({ user: q, task: tellTask(client, DEMO_TODAY), result: 'answer' });
  const stop = () => {
    setTurns((t) => t.map((turn, i) => (i === t.length - 1 ? { ...turn, stopped: true } : turn)));
    setBusy(false);
  };

  const resultOf = (turn: Turn) => {
    switch (turn.result) {
      case 'answer':
        return <Answer answer={answer} />;
      case 'draft':
        return (
          <div className="flex w-full flex-col gap-3">
            <div className="flex flex-col gap-2">
              <DraftCard client={client} text={text} onChange={setText} onSend={send} sent={sent} busy={busy} />
              <p className="text-[14px] leading-[1.5] text-ink">
                Anything you’d like to change? Otherwise, click <b>Send</b> when you’re ready.
              </p>
            </div>
            <Feedback />
          </div>
        );
      case 'sent':
        return (
          <div className="flex flex-col gap-2">
            <p className="text-[14px] leading-[1.5] text-ink">✅ Message sent successfully! Anything else I can help with?</p>
            <div className="flex flex-col items-start gap-1">
              <Feedback />
              <button
                type="button"
                onClick={() => openInbox(client.id)}
                className="flex h-8 items-center rounded border border-[#ccd2de] bg-white p-2 text-[13px] font-semibold leading-[1.4] text-ink hover:bg-surface-secondary"
              >
                Open Inbox
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scroller} className="scroll-thin flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-6 pt-4">
        {turns.map((turn) => (
          <div key={turn.id} className="flex flex-col gap-5">
            <UserBubble>{turn.user}</UserBubble>
            <OllyTask spec={turn.task} stopped={Boolean(turn.stopped)} onSettled={() => setBusy(false)}>
              {resultOf(turn)}
            </OllyTask>
          </div>
        ))}
      </div>
      <Composer busy={busy} onAsk={ask} onStop={stop} />
    </div>
  );
}
