import { formatMonthDay, parseDay } from './dates';

const clock12 = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

/** "Apr 10 - 11:25 AM", the notes list and the note popup's Created / Last Edited lines. */
export const noteStamp = (at: string) => `${formatMonthDay(parseDay(at.slice(0, 10)))} - ${clock12(at.slice(11, 16))}`;

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

/** The note's words without markup, for search and for telling an empty editor apart. */
export const noteText = (html: string) =>
  html
    .replace(/<\/(p|li|div)>|<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim();

const KEEP: Record<string, string> = { P: 'p', DIV: 'p', B: 'b', STRONG: 'b', I: 'i', EM: 'i', UL: 'ul', OL: 'ol', LI: 'li', BR: 'br' };

/**
 * What the editor wrote, reduced to the subset a note stores: paragraphs, bold, italic and the two lists. Anything
 * else (spans, styles, attributes) keeps only its text, so a note always renders the same in the popup.
 */
export function cleanNoteHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const part = (child: ChildNode): string => {
    if (child.nodeType === Node.TEXT_NODE) {
      return (child.textContent ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return '';
    const tag = KEEP[(child as Element).tagName];
    if (tag === 'br') return '<br>';
    const inner = walk(child);
    return tag ? `<${tag}>${inner}</${tag}>` : inner;
  };
  const walk = (node: Node) => Array.from(node.childNodes).map(part).join('');
  // Words typed straight into the editor (before any Enter) sit outside a paragraph: each run of them becomes one.
  let out = '';
  let run = '';
  for (const child of Array.from(doc.body.childNodes)) {
    const block = child.nodeType === Node.ELEMENT_NODE && ['p', 'ul', 'ol'].includes(KEEP[(child as Element).tagName]);
    if (!block) {
      run += part(child);
      continue;
    }
    if (run.trim()) out += `<p>${run}</p>`;
    run = '';
    out += part(child);
  }
  if (run.trim()) out += `<p>${run}</p>`;
  return out
    .replace(/<(b|i|li)><\/\1>/g, '')
    .replace(/<p>(<br>)?<\/p>/g, '')
    .trim();
}
