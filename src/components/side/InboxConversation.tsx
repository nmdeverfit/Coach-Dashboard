import { useEffect, useRef, useState } from 'react';
import iconSend from '../../assets/figma/icon-send.svg';
import { threadDay, threadFor, threadTime, type ThreadMessage } from '../../lib/olly';
import { getClient, useStore } from '../../state/store';
import { Avatar } from '../Avatar';

/**
 * The inbox with one client (Figma 5699:137775): the thread by day, the coach's messages on the right, then an empty
 * composer (Send message, Spec 4 AC2.2). Sending never completes the to-do.
 */
export function InboxConversation({ clientId }: { clientId: string }) {
  const { state, sendMessage } = useStore();
  const client = getClient(clientId);
  const [text, setText] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const sent = state.sent[clientId] ?? [];
  const thread: (ThreadMessage & { fresh?: boolean })[] = [
    ...threadFor(client),
    ...sent.map((m) => ({ from: 'coach' as const, at: m.at, text: m.text, fresh: true })),
  ];

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [sent.length]);

  const submit = () => {
    if (!text.trim()) return;
    sendMessage(clientId, text.trim(), state.side?.clientId === clientId ? state.side.highlightId : undefined);
    setText('');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div ref={scroller} className="scroll-thin flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pb-4">
        {thread.map((m, i) => {
          const day = m.at.slice(0, 10);
          const newDay = i === 0 || thread[i - 1].at.slice(0, 10) !== day;
          return (
            <div key={`${m.at}-${i}`} className={`flex flex-col gap-2.5 ${m.fresh ? 'animate-bubble-in' : ''}`}>
              {newDay && <p className="px-2 pb-2 pt-3 text-center text-[13px] text-[#66717e]">{threadDay(day)}</p>}
              {m.from === 'client' ? (
                <div className="flex items-end gap-2.5 px-5">
                  <span className="pb-[19px]">
                    <Avatar name={client.name} src={client.avatar} size={28} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col items-start gap-[5px]">
                    <p className="rounded-b-2xl rounded-tr-2xl bg-[#f3f3f4] px-4 py-2 text-[13px] text-black">{m.text}</p>
                    <span className="text-[11px] text-[#3b4859]">{threadTime(m.at)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-end gap-[5px] px-5">
                  <p className="max-w-[292px] whitespace-pre-wrap rounded-b-2xl rounded-tl-2xl bg-brand px-4 py-2 text-[13px] text-white">{m.text}</p>
                  <span className="text-[11px] text-[#3b4859]">{m.fresh ? 'Just now' : threadTime(m.at)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex shrink-0 items-center gap-3 border-t border-[#e8e8e8] px-[15px] pb-[15px] pt-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={`Message ${client.name}`}
          className="h-[26px] min-w-0 flex-1 bg-transparent text-[13px] text-black outline-none placeholder:text-black/40"
        />
        <button type="button" aria-label="Send" onClick={submit} className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-brand pl-[5px] pr-[3px] hover:bg-brand/90">
          <img src={iconSend} alt="" width={16} height={16} />
        </button>
      </div>
    </div>
  );
}
