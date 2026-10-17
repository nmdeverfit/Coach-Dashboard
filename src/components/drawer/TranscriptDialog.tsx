import { COACH_FIRST_NAME } from '../../data/mock';
import type { Client, Meeting } from '../../data/types';
import { fileSize, meetingDate, meetingTime, platformOf } from '../../lib/meetings';
import { useStore } from '../../state/store';
import { Modal } from '../Modal';

/** What "View transcript" opens (no Figma frame): the meeting's date, time and platform over its transcript. */
export function TranscriptDialog({ client, meeting, onClose }: { client: Client; meeting: Meeting; onClose: () => void }) {
  const { showToast } = useStore();
  const t = meeting.transcript;
  const text = t.kind === 'text' ? t.text : t.kind === 'file' ? t.text : undefined;

  return (
    <Modal
      title={meeting.title}
      subtitle={[meetingDate(meeting.date), meetingTime(meeting), meeting.link && platformOf(meeting.link)].filter(Boolean).join(' · ')}
      width={600}
      onClose={onClose}
      closeOnBackdrop
    >
      <div className="px-[30px] pb-[30px] pt-5">
        {t.kind === 'file' && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[#e0e0e0] px-3 py-2.5">
            <p className="min-w-0 truncate text-[13px] font-semibold leading-[18px] text-ink">
              {t.name} <span className="font-normal text-ink-tertiary">· {fileSize(t.size)}</span>
            </p>
            <button type="button" onClick={() => showToast(`${t.name} downloads`)} className="shrink-0 text-[13px] font-semibold text-brand hover:underline">
              Download
            </button>
          </div>
        )}
        {t.kind === 'lines' ? (
          <ol className="flex flex-col gap-4">
            {t.lines.map((l, i) => (
              <li key={i} className="flex flex-col gap-0.5">
                <p className="flex items-baseline gap-2">
                  <span className="text-[13px] font-semibold leading-[18px] text-ink">{l.from === 'coach' ? COACH_FIRST_NAME : client.firstName}</span>
                  <span className="text-[12px] tabular-nums leading-[18px] text-ink-muted">{l.at}</span>
                </p>
                <p className="text-[13px] leading-[1.5] text-[#484848]">{l.text}</p>
              </li>
            ))}
          </ol>
        ) : text !== undefined ? (
          <p className="whitespace-pre-wrap break-words text-[13px] leading-[1.5] text-[#484848]">{text}</p>
        ) : (
          <p className="text-[13px] leading-[1.5] text-ink-tertiary">There’s no preview for this file type. Download it to read the transcript.</p>
        )}
      </div>
    </Modal>
  );
}
