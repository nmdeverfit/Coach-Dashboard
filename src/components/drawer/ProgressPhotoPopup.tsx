import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import divider from '../../assets/figma/divider-v-11.svg';
import iconCheck from '../../assets/figma/icon-check-photo.svg';
import iconClose from '../../assets/figma/icon-popup-close-24.svg';
import iconEdit from '../../assets/figma/icon-edit-photo.svg';
import iconRemove from '../../assets/figma/icon-remove-photo.svg';
import iconShare from '../../assets/figma/icon-share.svg';
import { weightOn, type PhotoAngle, type ProgressPhoto } from '../../data/bodyMetrics';
import { addPhotos } from '../../lib/photoStore';
import { UploadPhotoModal } from './UploadPhotoModal';
import type { Client } from '../../data/types';
import { axisDate } from '../../lib/bodyMetrics';
import { useStore } from '../../state/store';

type Angle = 'all' | PhotoAngle;
const ANGLES: Angle[] = ['all', 'front', 'left', 'right', 'back'];

/**
 * Progress Photo popup (Figma 6560:461012, the user's call): opened by View All or a photo on the Metrics & Photos
 * tab. Left, on `#f3f5f8`: the Compare mode switch and Add new, the All · Front · Left · Right · Back filter, then a
 * card per day ("Aug 31", "82.1 kg - 16%", its photo). Right: "Progress Photo", Share, the picked photo with its date on
 * a dark fade, and Weight | Body Fat under it. Compare mode (Figma 6565:463190) always has one photo ticked (the one in
 * view, never none, the user's call); a second shows beside it, and until then the empty slot reads "Choose images on
 * the left panel to compare". Ticking a third replaces the earlier one. Add new opens Upload Progress Photo.
 */
export function ProgressPhotoPopup({
  client,
  photos,
  startId,
  compare: compareAtOpen,
  onClose,
}: {
  client: Client;
  photos: ProgressPhoto[];
  /** The photo to open on (View All and Compare: the latest). */
  startId: string;
  /** Opened from Compare: compare mode with that photo ticked. */
  compare: boolean;
  onClose: () => void;
}) {
  const { showToast } = useStore();
  const [compare, setCompare] = useState(compareAtOpen);
  const [angle, setAngle] = useState<Angle>('all');
  const [picked, setPicked] = useState(startId);
  const [ticked, setTicked] = useState<string[]>([startId]);
  const [uploading, setUploading] = useState(false);
  const shown = photos.filter((p) => angle === 'all' || p.angle === angle);
  const order = (id: string) => photos.findIndex((p) => p.id === id);
  const byId = (id: string) => photos.find((p) => p.id === id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (uploading) return; // Upload Progress Photo takes its own keys.
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onClose();
      }
      // ↑ / ↓ step through the list in view mode (newest first, as listed).
      if (!compare && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        const i = shown.findIndex((p) => p.id === picked);
        const next = shown[Math.min(shown.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)))];
        if (next) setPicked(next.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [compare, onClose, shown, picked, uploading]);

  const toggleCompare = () => {
    // On: the photo in view is ticked, so the compare view is never blank. Off: the first ticked stays in view.
    if (!compare) setTicked([picked]);
    else setPicked(ticked[0] ?? picked);
    setCompare(!compare);
  };
  // The last ticked photo can't be unticked (never blank); a third replaces the earlier tick.
  const tick = (id: string) =>
    setTicked((t) => (t.includes(id) ? (t.length > 1 ? t.filter((n) => n !== id) : t) : t.length < 2 ? [...t, id] : [t[1], id]));
  // Side by side, newer on the left, as drawn.
  const pair = ticked.filter((id) => byId(id)).sort((a, b) => order(a) - order(b));
  const current = byId(picked) ?? photos[0];

  return createPortal(
    <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/50 p-10" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${client.firstName}’s progress photos`}
        className="relative flex h-[722px] max-h-full animate-pop-in rounded-lg bg-white shadow-[0_8px_70px_rgba(0,0,0,0.2)]"
        style={{ width: compare ? 1238 : 974 }}
      >
        <button type="button" aria-label="Close" onClick={onClose} className="absolute -right-3 -top-3 z-10 size-6 hover:opacity-80">
          <img src={iconClose} alt="" width={24} height={24} className="block" />
        </button>

        {/* Left: the photo log */}
        <aside className="flex w-[362px] shrink-0 flex-col overflow-hidden rounded-l-lg bg-[#f3f5f8]">
          <div className="flex items-center justify-between px-6 pt-6">
            <button type="button" role="switch" aria-checked={compare} onClick={toggleCompare} className="flex items-center gap-2">
              <span className={`relative h-5 w-9 rounded-full transition-colors ${compare ? 'bg-brand' : 'bg-[#e4e5e7]'}`}>
                <span className={`absolute inset-y-[10%] w-[44%] rounded-[30px] bg-white transition-all ${compare ? 'left-[50%]' : 'left-[5.56%]'}`} />
              </span>
              <span className="text-[12px] font-semibold leading-none text-[#728096]">Compare mode</span>
            </button>
            <button
              type="button"
              onClick={() => setUploading(true)}
              className="rounded-[4px] bg-brand px-4 py-[9px] text-[13px] leading-[normal] text-white hover:bg-brand/90"
            >
              Add new
            </button>
          </div>
          <div role="tablist" aria-label="Photo angle" className="flex gap-1 px-6 pb-5 pt-6">
            {ANGLES.map((a) => (
              <button
                key={a}
                type="button"
                role="tab"
                aria-selected={angle === a}
                onClick={() => setAngle(a)}
                className={`flex-1 rounded-[4px] px-3 py-[5px] text-center text-[14px] font-semibold capitalize leading-5 ${
                  angle === a ? 'bg-brand/10 text-brand' : 'text-[#636a73] hover:text-ink'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
          <div className="scroll-photos-v flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-6 pb-6">
            {shown.length === 0 && <p className="py-10 text-center text-[13px] leading-[1.5] text-ink-muted">No {angle} photos from {client.firstName} yet.</p>}
            {shown.map((p) => {
              const on = compare ? ticked.includes(p.id) : picked === p.id;
              const weight = p.weight ?? weightOn(client, p.date);
              return (
                <div key={p.id} className={`rounded-[4px] ${!compare && on ? 'border-2 border-brand/20' : 'border-2 border-transparent'}`}>
                  <button
                    type="button"
                    onClick={() => (compare ? tick(p.id) : setPicked(p.id))}
                    aria-pressed={on}
                    className={`flex w-full flex-col gap-2 rounded-[4px] bg-white px-4 py-[14px] text-left ${
                      !compare && on ? 'border border-brand shadow-[0_4px_8px_rgba(0,0,0,0.08)]' : 'border border-transparent hover:border-brand/30'
                    }`}
                  >
                    <span className="flex w-full items-center justify-between font-semibold">
                      <span className="text-[14px] leading-[1.2] tracking-[-0.28px] text-[#151619]">{axisDate(p.date)}</span>
                      <span className="text-[10px] text-[#6a778a]">
                        {weight === null ? '—' : `${weight} kg`} - {p.bodyFat === null ? '—' : `${p.bodyFat}%`}
                      </span>
                    </span>
                    <span className={`relative flex self-start rounded-[6px] p-[3px] ${on ? 'border border-brand shadow-[0_4px_8px_rgba(0,0,0,0.12)]' : 'border border-transparent'}`}>
                      <img src={p.src} alt="" className="h-[76px] w-[63px] rounded-[4px] border border-black/10 object-cover object-top" />
                      {compare && on && <img src={iconCheck} alt="" width={21} height={21} className="absolute bottom-1 right-1" />}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Right: the photo, or two side by side */}
        <section className="flex min-w-0 flex-1 flex-col rounded-r-lg bg-white">
          <header className="flex items-start justify-between px-6 pb-5 pt-6">
            <h2 className="text-[20px] font-semibold leading-7 tracking-[-0.4px] text-[#151619]">Progress Photo</h2>
            <button
              type="button"
              onClick={() => showToast(`Sharing ${client.firstName}’s progress photos opens in the client’s profile`)}
              className="flex items-center gap-2 rounded-[4px] border border-[#dadfea] px-4 py-[9px] text-[13px] leading-[normal] text-black hover:bg-surface-secondary"
            >
              <img src={iconShare} alt="" width={16} height={16} />
              Share
            </button>
          </header>
          <div className="flex min-h-0 flex-1 items-stretch justify-center gap-6 px-8 pb-6 pt-1">
            {compare ? (
              <>
                {pair.map((id) => (
                  <PhotoColumn key={id} client={client} photo={byId(id)!} onRemove={pair.length > 1 ? () => tick(id) : undefined} />
                ))}
                {pair.length === 1 && (
                  // The second photo's place until one is ticked (the user's copy).
                  <div className="flex w-[302px] shrink-0 flex-col gap-4">
                    <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed border-[#dadfea] bg-[#fafbfc] px-10 text-center text-[13px] leading-[1.5] text-[#7a7a7a]">
                      Choose images on the left panel to compare
                    </div>
                    <div className="h-[63px] shrink-0" aria-hidden />
                  </div>
                )}
              </>
            ) : (
              current && <PhotoColumn client={client} photo={current} />
            )}
          </div>
        </section>
      </div>
      {uploading && (
        <UploadPhotoModal
          clientName={client.firstName}
          onClose={() => setUploading(false)}
          onUpload={(files, date, weight, bodyFat) => {
            const added: ProgressPhoto[] = files.map((f) => ({ id: f.id, date, src: f.src, angle: f.angle, bodyFat, weight: weight ?? undefined }));
            addPhotos(client.id, added);
            setUploading(false);
            // The new photo opens in view; in compare mode it is ticked beside the first.
            if (compare) setTicked((t) => [t[0], added[0].id].filter(Boolean) as string[]);
            else setPicked(added[0].id);
            setAngle('all');
            showToast(added.length > 1 ? `${added.length} progress photos uploaded` : 'Progress photo uploaded');
          }}
        />
      )}
    </div>,
    document.body,
  );
}

/** One photo: 302 px wide, rounded 8, its date on a black fade, then Weight | Body Fat on `#f5f5f5`. */
function PhotoColumn({ client, photo, onRemove }: { client: Client; photo: ProgressPhoto; onRemove?: () => void }) {
  const { showToast } = useStore();
  const weight = photo.weight ?? weightOn(client, photo.date);
  return (
    <div className="flex w-[302px] shrink-0 flex-col gap-4">
      <div className="group relative min-h-0 flex-1 overflow-hidden rounded-lg">
        <img src={photo.src} alt={`${client.firstName}, ${axisDate(photo.date)}`} className="absolute inset-0 size-full object-cover object-top" />
        <div className="absolute inset-x-0 bottom-0 flex h-[132px] items-end bg-gradient-to-b from-black/0 to-black p-4">
          <p className="text-[13px] font-semibold leading-[1.2] tracking-[-0.2px] text-white">{axisDate(photo.date)}</p>
        </div>
        {onRemove && (
          <button
            type="button"
            aria-label="Remove from compare"
            onClick={onRemove}
            className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-[4px] border border-white/20 bg-black/40 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
          >
            <img src={iconRemove} alt="" width={16} height={16} />
          </button>
        )}
      </div>
      <div className="relative flex items-center justify-between rounded-lg bg-[#f5f5f5] pb-3 pt-4">
        <Stat label="Weight" value={weight === null ? '—' : `${weight} kg`} />
        <img src={divider} alt="" width={11} height={1} className="rotate-90" />
        <Stat label="Body Fat" value={photo.bodyFat === null ? '—' : `${photo.bodyFat}%`} />
        <button type="button" aria-label="Edit" onClick={() => showToast('Editing a photo’s figures opens in the client’s profile')} className="absolute right-2 top-2 hover:opacity-70">
          <img src={iconEdit} alt="" width={16} height={16} />
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex h-[35px] flex-1 flex-col items-center justify-center text-center font-semibold leading-[normal] text-black">
      <span className="text-[12px] opacity-50">{label}</span>
      <span className="text-[14px]">{value}</span>
    </div>
  );
}
