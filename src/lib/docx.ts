/**
 * The text of a .docx file, read in the page: a .docx is a zip, and its words are in `word/document.xml`. Finds that
 * entry through the zip's central directory, inflates it with the browser's own `DecompressionStream`, and keeps one
 * line per paragraph. Returns null for anything it can't read (no such entry, an unknown compression, old browsers).
 */
export async function docxText(file: Blob): Promise<string | null> {
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    const view = new DataView(buf.buffer);
    // The end-of-central-directory record sits in the last 64 KB (its comment can be up to 65,535 bytes).
    let end = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        end = i;
        break;
      }
    }
    if (end < 0) return null;
    const count = view.getUint16(end + 10, true);
    let at = view.getUint32(end + 16, true);
    const decoder = new TextDecoder();
    for (let n = 0; n < count && view.getUint32(at, true) === 0x02014b50; n++) {
      const method = view.getUint16(at + 10, true);
      const size = view.getUint32(at + 20, true);
      const nameLength = view.getUint16(at + 28, true);
      const extraLength = view.getUint16(at + 30, true);
      const commentLength = view.getUint16(at + 32, true);
      const local = view.getUint32(at + 42, true);
      const name = decoder.decode(buf.subarray(at + 46, at + 46 + nameLength));
      at += 46 + nameLength + extraLength + commentLength;
      if (name !== 'word/document.xml') continue;
      // The local header repeats the name and has its own extra field before the data.
      const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      const data = buf.subarray(start, start + size);
      let xml: string;
      if (method === 0) xml = decoder.decode(data);
      else if (method === 8 && typeof DecompressionStream !== 'undefined') {
        const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        xml = await new Response(stream).text();
      } else return null;
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
      const lines = Array.from(doc.getElementsByTagNameNS(W, 'p')).map((p) =>
        Array.from(p.getElementsByTagNameNS(W, '*'))
          .map((el) => (el.localName === 't' ? el.textContent ?? '' : el.localName === 'tab' ? '\t' : el.localName === 'br' ? '\n' : ''))
          .join(''),
      );
      const text = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
      return text || null;
    }
    return null;
  } catch {
    return null;
  }
}
