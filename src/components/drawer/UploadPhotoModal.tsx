import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import iconAdd from '../../assets/figma/icon-add-tag.svg';
import iconCalendar from '../../assets/figma/icon-calendar-upload.svg';
import iconClose from '../../assets/figma/icon-popup-close-24.svg';
import glyph from '../../assets/figma/upload-photo-glyph.svg';
import type { PhotoAngle } from '../../data/bodyMetrics';
import { DEMO_TODAY } from '../../data/mock';
import { formatMonthDay, parseDay } from '../../lib/dates';
import { DatePicker } from './Pickers';

export interface UploadedPhoto {
  id: string;
  src: string;
  angle?: PhotoAngle;
}

const ANGLES: PhotoAngle[] = ['front', 'left', 'right', 'back'];
const longDate = (iso: string) => `${formatMonthDay(parseDay(iso))}, ${parseDay(iso).getUTCFullYear()}`;

/** The drop zone's picture: two tilted cards and an image glyph, as drawn (Figma 6565:468586). */
function DropArt() {
  return (
    <span className="relative block h-10 w-[37.863px] overflow-hidden" aria-hidden>
      <span className="absolute left-[0.85px] top-[2.06px] flex h-[36.569px] w-[32.227px] items-center justify-center">
        <span className="block h-[31.189px] w-[24.951px] -rotate-[15deg] rounded-[2.4px] border-[1.44px] border-[#ccd1db] bg-[#fafbfc]" />
      </span>
      <span className="absolute left-[9.66px] top-[1.44px] flex h-[32.452px] w-[26.542px] items-center justify-center">
        <span className="block h-[31.189px] w-[24.951px] rotate-3 rounded-[2.4px] border-[1.44px] border-[#ccd1db] bg-[#fafbfc]" />
      </span>
      <span className="absolute inset-[41.1%_7.18%_16.24%_27.93%] rotate-[3.81deg]">
        <img src={glyph} alt="" className="absolute inset-0 block size-full max-w-none" />
      </span>
    </span>
  );
}

/**
 * Upload Progress Photo (Figma 6565:465542 empty, 6565:467125 with a photo; the user's call), opened by Add new in the
 * Progress Photo popup. 742 px: the title and the photos' date (a calendar up to today), then a drop zone (drag images
 * in or Choose Files); once a photo is in, each shows as a 196 × 339 card (Add tag picks its angle, × removes it) with a
 * narrower drop zone after them. Weight and Body fat are optional; Upload stays grey until a photo is in.
 */
export function UploadPhotoModal({
  clientName,
  onClose,
  onUpload,
}: {
  clientName: string;
  onClose: () => void;
  onUpload: (photos: UploadedPhoto[], date: string, weight: number | null, bodyFat: number | null) => void;
}) {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [date, setDate] = useState(DEMO_TODAY);
  const [picking, setPicking] = useState(false);
  const [weight, setWeight] = useState('');
  const [fat, setFat] = useState('');
  const [dragging, setDragging] = useState(false);
  const [tagging, setTagging] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const dateBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Registered after the photo popup's, which leaves Esc to this one while it is up.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || picking) return;
      e.stopImmediatePropagation();
      if (tagging) setTagging(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, picking, tagging]);

  const take = (files: FileList | null) => {
    const images = [...(files ?? [])].filter((f) => f.type.startsWith('image/'));
    if (!images.length) return;
    setPhotos((p) => [...p, ...images.map((f, i) => ({ id: `up-${Date.now()}-${i}`, src: URL.createObjectURL(f) }))]);
  };
  const num = (s: string) => (s.trim() && !Number.isNaN(Number(s)) ? Math.round(Number(s) * 10) / 10 : null);

  const drop = (
    <div
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        take(e.dataTransfer.files);
      }}
      className={`flex flex-col items-center justify-center gap-[15px] rounded-[4px] border border-dashed bg-[#fafbfc] px-12 py-[88px] text-center text-[13px] leading-[1.5] text-[#7a7a7a] ${
        dragging ? 'border-brand bg-brand/[0.03]' : 'border-[#dadfea]'
      } ${photos.length ? 'w-[212px] shrink-0 self-stretch' : 'min-h-0 flex-1'}`}
    >
      <DropArt />
      <p>
        Drag &amp; Drop your images here
        <br />
        or{' '}
        <button type="button" onClick={() => input.current?.click()} className={`text-brand ${photos.length ? 'underline' : 'hover:underline'}`}>
          Choose Files
        </button>
      </p>
    </div>
  );

  const field = (label: string, unit: string, value: string, set: (v: string) => void) => (
    <label className="flex w-[200px] flex-col gap-[5px]">
      <span className="text-[10px] font-semibold uppercase leading-[normal] text-[#6a778a]">{label}</span>
      <span className="flex">
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => set(e.target.value.replace(/[^\d.]/g, ''))}
          className="h-9 min-w-0 flex-1 rounded-l-[4px] border border-[#dadfea] px-2.5 text-[13px] text-black outline-none focus:border-brand"
        />
        <span className="flex items-center rounded-r-[4px] border-y border-r border-[#dadfea] bg-[#fafbfc] px-3 text-[13px] text-black">{unit}</span>
      </span>
    </label>
  );

  return createPortal(
    <div className="fixed inset-0 z-[55] flex animate-fade-in items-center justify-center bg-black/50 p-10">
      <div role="dialog" aria-modal="true" aria-label={`Upload ${clientName}’s progress photo`} className="relative flex h-[618px] max-h-full w-[742px] animate-pop-in flex-col rounded-lg bg-white shadow-[0_8px_70px_rgba(0,0,0,0.2)]">
        <button type="button" aria-label="Close" onClick={onClose} className="absolute -right-3 -top-3 z-10 size-6 hover:opacity-80">
          <img src={iconClose} alt="" width={24} height={24} className="block" />
        </button>
        <header className="flex items-center justify-between px-6 pb-5 pt-6">
          <h2 className="text-[20px] font-semibold leading-[normal] text-ink">Upload Progress Photo</h2>
          <button
            ref={dateBtn}
            type="button"
            onClick={() => setPicking((p) => !p)}
            className={`flex items-center gap-2 rounded-lg border bg-white px-4 py-3 text-[13px] leading-[1.2] text-ink ${picking ? 'border-brand' : 'border-[#dadfea] hover:border-ink-muted'}`}
          >
            <img src={iconCalendar} alt="" width={16} height={16} />
            <span className="w-[100px] text-left">{longDate(date)}</span>
          </button>
          {picking && <DatePicker anchor={dateBtn} value={date} max={DEMO_TODAY} onPick={setDate} onClose={() => setPicking(false)} />}
        </header>
        <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 pb-6">
          {photos.length === 0 ? (
            drop
          ) : (
            <div className="scroll-upload flex min-h-0 flex-1 gap-4 overflow-x-auto pb-4 pr-3 pt-3">
              {photos.map((p) => (
                <div key={p.id} className="relative h-[339px] w-[196px] shrink-0 rounded-lg border border-black/10">
                  <img src={p.src} alt="" className="size-full rounded-lg object-cover" />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => setPhotos((all) => all.filter((q) => q.id !== p.id))}
                    className="absolute -right-3 -top-3 size-6 hover:opacity-80"
                  >
                    <img src={iconClose} alt="" width={24} height={24} className="block" />
                  </button>
                  <div className="absolute bottom-[20px] left-1/2 -translate-x-1/2">
                    <button
                      type="button"
                      onClick={() => setTagging(tagging === p.id ? null : p.id)}
                      className="flex items-center gap-2 whitespace-nowrap rounded-[4px] bg-white py-1 pl-2 pr-3 text-[14px] font-semibold capitalize leading-[normal] text-black"
                    >
                      <img src={iconAdd} alt="" width={20} height={20} />
                      {p.angle ?? 'Add tag'}
                    </button>
                    {tagging === p.id && (
                      <ul className="absolute bottom-full left-1/2 mb-1 w-[120px] -translate-x-1/2 overflow-hidden rounded-[4px] border border-[#dadfea] bg-white py-1 shadow-[0_4px_16px_rgba(32,35,83,0.12)]">
                        {ANGLES.map((a) => (
                          <li key={a}>
                            <button
                              type="button"
                              onClick={() => {
                                setPhotos((all) => all.map((q) => (q.id === p.id ? { ...q, angle: a } : q)));
                                setTagging(null);
                              }}
                              className={`flex w-full px-3 py-1.5 text-left text-[13px] capitalize hover:bg-surface-secondary ${p.angle === a ? 'font-semibold text-brand' : 'text-ink'}`}
                            >
                              {a}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
              {drop}
            </div>
          )}
          <div className="flex gap-6">
            {field('Weight', 'kg', weight, setWeight)}
            {field('Body fat', '%', fat, setFat)}
          </div>
        </div>
        <footer className="flex justify-end border-t border-[#dee0e4] px-5 py-[18px]">
          <button
            type="button"
            disabled={!photos.length}
            onClick={() => onUpload(photos, date, num(weight), num(fat))}
            className="rounded-[4px] bg-brand px-4 py-2.5 text-[13px] font-semibold leading-5 text-white hover:bg-brand/90 disabled:bg-[#bfbfbf]"
          >
            Upload
          </button>
        </footer>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            take(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
    </div>,
    document.body,
  );
}
