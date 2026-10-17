import { Captions, FileText, type LucideIcon } from 'lucide-react';

/**
 * A 40 px tile with a document icon tinted by file type, as shadcn-style uploaders show a chosen file (no Figma
 * frame; lucide icons, which the design does not draw). Subtitles (.srt) get the captions icon.
 */
const TYPES: Record<string, { icon: LucideIcon; fg: string; bg: string }> = {
  pdf: { icon: FileText, fg: '#d92d20', bg: '#fef3f2' },
  docx: { icon: FileText, fg: '#184eff', bg: '#e3ecff' },
  srt: { icon: Captions, fg: '#6c59e0', bg: '#f0edfc' },
  txt: { icon: FileText, fg: '#6b7280', bg: '#f4f6fb' },
};

export const fileExtension = (name: string) => name.slice(name.lastIndexOf('.') + 1).toLowerCase();

export function FileTypeIcon({ name }: { name: string }) {
  const { icon: Icon, fg, bg } = TYPES[fileExtension(name)] ?? TYPES.txt;
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: bg, color: fg }}>
      <Icon size={20} strokeWidth={1.75} aria-hidden />
    </span>
  );
}
