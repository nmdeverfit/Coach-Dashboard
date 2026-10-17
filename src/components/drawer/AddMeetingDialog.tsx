import { useRef, useState, type ReactNode } from 'react';
import iconChevron from '../../assets/figma/icon-chevron-tz.svg';
import iconClipboardBrand from '../../assets/figma/icon-clipboard-brand.svg';
import iconClipboard from '../../assets/figma/icon-clipboard.svg';
import iconCloud from '../../assets/figma/icon-cloud-upload.svg';
import iconUploadBrand from '../../assets/figma/icon-upload-brand.svg';
import iconUpload from '../../assets/figma/icon-upload.svg';
import { DEMO_TODAY } from '../../data/mock';
import type { Client, Transcript } from '../../data/types';
import { DURATIONS, TRANSCRIPT_MAX_BYTES, TRANSCRIPT_TYPES, endOf, fieldDate, fieldTime, fileSize, normalizeLink } from '../../lib/meetings';
import { useStore } from '../../state/store';
import { Avatar } from '../Avatar';
import { FileTypeIcon, fileExtension } from '../FileTypeIcon';
import { Glyph } from '../Glyph';
import { Modal } from '../Modal';

const TIME_ZONES = ['UTC-7', 'UTC-5', 'UTC+0', 'UTC+7'];
/** The demo's "now" (the brief is generated at 06:00): a meeting with a transcript has already happened. */
const NOW = '06:00';
/** Duration and End time are hidden for now (the user's call, to keep the form short); flip to bring them back. */
const SHOW_DURATION = false;
/** .txt and .srt are read as text so the transcript can be shown; .docx and .pdf are kept as files. */
const READABLE = ['.txt', '.srt'];

// #e0e0e0 is the design's "Light" input stroke; #f7f7f7 "Lightest" fills the read-only client field.
const BOX = 'flex h-10 w-full items-center rounded-lg border text-[14px] leading-[22px] text-ink';
const boxBorder = (error?: string) => `bg-white ${error ? 'border-danger' : 'border-[#e0e0e0] focus-within:border-brand'}`;

type Mode = 'upload' | 'paste';
type Errors = Partial<Record<'title' | 'date' | 'time' | 'link' | 'transcript', string>>;

function Field({ label, optional, labelSize = 13, error, children }: { label: string; optional?: boolean; labelSize?: 12 | 13; error?: string; children: ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-1">
      <p className="flex items-baseline gap-1 whitespace-nowrap leading-[18px]">
        <span className="font-semibold text-ink" style={{ fontSize: labelSize }}>
          {label}
        </span>
        {optional && <span className="text-[12px] text-ink-secondary">(Optional)</span>}
      </p>
      {children}
      {error && <p className="text-[12px] leading-[18px] text-danger">{error}</p>}
    </div>
  );
}

/** A native date or time picker under the design's field, so the value reads "Aug 31, 2026" / "7:00 AM". */
function PickerInput({
  type,
  value,
  min,
  max,
  label,
  onChange,
}: {
  type: 'date' | 'time';
  value: string;
  min?: string;
  max?: string;
  label: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type={type}
      aria-label={label}
      value={value}
      min={min}
      max={max}
      required
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.currentTarget.showPicker?.()}
      className="absolute inset-0 cursor-pointer opacity-0"
    />
  );
}

/** The design's chevron at the right of a select field. */
const chevron = (
  <span className="pointer-events-none flex size-5 items-center justify-center">
    <Glyph src={iconChevron} size={14} inset="37.5% 25%" bleed="-15.15% -7.58% -30.31% -7.57%" />
  </span>
);

/** Upload file / Paste text. The design sets the first label semibold and the second regular, in both states. */
function SourceButton({ on, icon, label, semibold, onClick }: { on: boolean; icon: ReactNode; label: string; semibold?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border p-2 text-[13px] leading-[22px] ${
        on ? 'border-brand bg-brand/[0.03] text-brand' : 'border-[#e0e0e0] text-ink hover:bg-surface-secondary'
      } ${semibold ? 'font-semibold' : ''}`}
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * Add a meeting (Figma 5726:141326 Upload file, 5729:516037 Paste text): client (fixed), title, start date and time
 * with a time zone, duration (no frame; hidden for now, see SHOW_DURATION), an optional meeting link, and the transcript as a file (.txt, .docx, .srt, .pdf, up to 10 MB) or pasted text.
 * The meeting must have ended by now. Checked on submit.
 */
export function AddMeetingDialog({ client, onClose }: { client: Client; onClose: () => void }) {
  const { addMeeting } = useStore();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(DEMO_TODAY);
  const [time, setTime] = useState('');
  const [minutes, setMinutes] = useState(60);
  const [timeZone, setTimeZone] = useState(TIME_ZONES[0]);
  const [link, setLink] = useState('');
  const [mode, setMode] = useState<Mode>('upload');
  const [file, setFile] = useState<{ name: string; size: number; text?: string } | null>(null);
  const [pasted, setPasted] = useState('');
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const fileInput = useRef<HTMLInputElement>(null);

  const clear = (key: keyof Errors) => setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  const switchTo = (m: Mode) => {
    setMode(m);
    clear('transcript');
  };

  const pick = (f: File | undefined) => {
    if (!f) return;
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
    if (!TRANSCRIPT_TYPES.includes(ext) || f.size > TRANSCRIPT_MAX_BYTES) {
      setErrors((e) => ({ ...e, transcript: 'Use a .txt, .docx, .srt or .pdf file up to 10 MB.' }));
      return;
    }
    clear('transcript');
    setFile({ name: f.name, size: f.size });
    if (READABLE.includes(ext)) f.text().then((text) => setFile((cur) => (cur?.name === f.name ? { ...cur, text } : cur)));
  };

  const submit = () => {
    const url = normalizeLink(link);
    const transcript: Transcript | null =
      mode === 'upload' ? file && { kind: 'file', ...file } : pasted.trim() ? { kind: 'text', text: pasted.trim() } : null;
    const next: Errors = {
      title: title.trim() ? undefined : 'Give the meeting a title.',
      date: date <= DEMO_TODAY ? undefined : 'Pick a day up to today.',
      time: !time
        ? 'Pick a start time.'
        : date === DEMO_TODAY && endOf(time, SHOW_DURATION ? minutes : 0) > NOW
          ? SHOW_DURATION
            ? `The meeting must have ended by now (${fieldTime(NOW)} today).`
            : `Pick a time before now (${fieldTime(NOW)} today).`
          : undefined,
      link: link.trim() && !url ? 'Enter a full link, like zoom.us/j/123.' : undefined,
      transcript: transcript ? undefined : mode === 'upload' ? 'Upload the transcript file.' : 'Paste the transcript.',
    };
    setErrors(next);
    if (Object.values(next).some(Boolean) || !transcript) return;
    addMeeting(client.id, { id: `${client.id}-added-${Date.now()}`, title: title.trim(), date, start: time, minutes: SHOW_DURATION ? minutes : undefined, timeZone, link: url ?? undefined, transcript });
    onClose();
  };

  return (
    <Modal
      title="Add a meeting"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="h-9 rounded-[6px] border border-[#e0e0e0] bg-white px-[30px] text-[14px] font-semibold leading-5 tracking-[-0.28px] text-ink hover:bg-surface-secondary">
            Cancel
          </button>
          <button type="button" onClick={submit} className="h-9 rounded-lg border border-black/10 bg-brand px-[30px] text-[14px] font-semibold leading-5 tracking-[-0.28px] text-white hover:bg-brand/90">
            Add meeting
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-[30px] pb-[30px] pt-5">
        <Field label="Client">
          <div className={`${BOX} gap-2 border-[#e0e0e0] bg-[#f7f7f7] px-3 font-semibold`}>
            <Avatar name={client.name} src={client.avatar} size={20} />
            <span className="truncate">{client.name}</span>
          </div>
        </Field>

        <Field label="Title" error={errors.title}>
          <label className={`${BOX} ${boxBorder(errors.title)} pl-3 pr-2.5`}>
            <input
              autoFocus
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                clear('title');
              }}
              placeholder="e.g. Monthly check-in call"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-muted"
            />
          </label>
        </Field>

        <div className="flex gap-2">
          <Field label="Start date" error={errors.date}>
            <div className={`${BOX} ${boxBorder(errors.date)} relative pl-3 pr-2.5`}>
              {fieldDate(date)}
              <PickerInput
                type="date"
                label="Start date"
                value={date}
                max={DEMO_TODAY}
                onChange={(v) => {
                  if (!v) return;
                  setDate(v);
                  clear('date');
                }}
              />
            </div>
          </Field>
          <Field label="Start time" error={errors.time}>
            <div className={`${BOX} ${boxBorder(errors.time)} gap-2.5 pl-3 pr-2`}>
              <span className="relative flex h-full min-w-0 flex-1 items-center">
                {time ? fieldTime(time) : <span className="text-ink-muted">Select time</span>}
                <PickerInput
                  type="time"
                  label="Start time"
                  value={time}
                  onChange={(v) => {
                    setTime(v);
                    clear('time');
                  }}
                />
              </span>
              <span className="flex items-center gap-1">
                <span className="h-[18px] w-px bg-[#e0e0e0]" />
                <span className="relative flex items-center py-0.5 pl-1.5 pr-0.5 text-[11px] font-semibold leading-[18px] text-[#8c8c8c]">
                  {timeZone}
                  {chevron}
                  <select
                    aria-label="Time zone"
                    value={timeZone}
                    onChange={(e) => setTimeZone(e.target.value)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  >
                    {TIME_ZONES.map((z) => (
                      <option key={z}>{z}</option>
                    ))}
                  </select>
                </span>
              </span>
            </div>
          </Field>
        </div>

        {SHOW_DURATION && (
          <div className="flex gap-2">
            <Field label="Duration">
              <div className={`${BOX} ${boxBorder()} relative justify-between pl-3 pr-2`}>
                {minutes} min
                {chevron}
                <select
                  aria-label="Duration"
                  value={minutes}
                  onChange={(e) => {
                    setMinutes(Number(e.target.value));
                    clear('time');
                  }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                >
                  {DURATIONS.map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </select>
              </div>
            </Field>
            <Field label="End time">
              <div className={`${BOX} border-[#e0e0e0] bg-[#f7f7f7] px-3`}>
                {time ? fieldTime(endOf(time, minutes)) : <span className="text-ink-muted">–</span>}
              </div>
            </Field>
          </div>
        )}

        <Field label="Meeting link" optional error={errors.link}>
          <label className={`${BOX} ${boxBorder(errors.link)} pl-3 pr-2.5`}>
            <input
              value={link}
              onChange={(e) => {
                setLink(e.target.value);
                clear('link');
              }}
              placeholder="Zoom, Google Meet or any other link"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-muted"
            />
          </label>
        </Field>

        {/* The design sets this label at 12 px, the others at 13. */}
        <Field label="Transcript" labelSize={12} error={errors.transcript}>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <SourceButton
                on={mode === 'upload'}
                icon={<img src={mode === 'upload' ? iconUploadBrand : iconUpload} alt="" width={20} height={20} />}
                label="Upload file"
                semibold
                onClick={() => switchTo('upload')}
              />
              <SourceButton
                on={mode === 'paste'}
                icon={<Glyph src={mode === 'paste' ? iconClipboardBrand : iconClipboard} size={20} inset="15.13% 15.43% 14.87% 20.43%" bleed="-4.78% -5.22%" />}
                label="Paste text"
                onClick={() => switchTo('paste')}
              />
            </div>
            {mode === 'upload' ? (
              file ? (
                // The chosen file: type icon, name over size, then Replace and Remove at the right edge.
                <div className="flex items-center gap-3 rounded-lg border-[1.5px] border-[#e0e0e0] p-3 text-[13px] leading-[1.5]">
                  <FileTypeIcon name={file.name} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="truncate font-semibold text-ink" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-[12px] leading-[18px] text-ink-tertiary">
                      {fileSize(file.size)} · {fileExtension(file.name).toUpperCase()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 font-semibold">
                    <button type="button" onClick={() => fileInput.current?.click()} className="text-brand hover:underline">
                      Replace
                    </button>
                    <button type="button" onClick={() => setFile(null)} className="text-ink-secondary hover:text-ink">
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    pick(e.dataTransfer.files[0]);
                  }}
                  className={`flex h-[120px] flex-col items-center justify-center gap-1 rounded-lg border-[1.5px] border-dashed p-3 text-center text-[13px] leading-[1.5] tracking-[-0.26px] ${
                    dragging ? 'border-brand bg-brand/[0.03]' : errors.transcript ? 'border-danger' : 'border-[#e0e0e0] hover:border-brand/60'
                  }`}
                >
                  <img src={iconCloud} alt="" width={36} height={36} />
                  <span className="text-ink">
                    Drop a transcript, or <span className="font-semibold underline">browse</span>
                  </span>
                  <span className="text-ink-tertiary">.txt, .docx, .srt, .pdf — up to 10 MB.</span>
                </button>
              )
            ) : (
              <textarea
                value={pasted}
                onChange={(e) => {
                  setPasted(e.target.value);
                  clear('transcript');
                }}
                placeholder="Paste the transcript here..."
                className={`h-[120px] resize-none rounded-lg border-[1.5px] p-3 text-[14px] leading-[22px] text-ink outline-none placeholder:text-ink-muted ${
                  errors.transcript ? 'border-danger' : 'border-[#e0e0e0] focus:border-brand'
                }`}
              />
            )}
            <input
              ref={fileInput}
              type="file"
              accept={TRANSCRIPT_TYPES.join(',')}
              className="hidden"
              onChange={(e) => {
                pick(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
        </Field>
      </div>
    </Modal>
  );
}
