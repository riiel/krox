import { isNative, shareNative } from './native.js';
// Väike .docx generaator ilma lisateekideta (ZIP "store" režiimis + WordprocessingML)

// ---- ZIP ----
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

function zip(files) {
  const enc = new TextEncoder();
  const parts = [], central = [];
  let offset = 0;
  const u16 = (v) => [v & 0xff, (v >>> 8) & 0xff];
  const u32 = (v) => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];
  files.forEach(({ name, data }) => {
    const nameB = enc.encode(name), dataB = enc.encode(data), crc = crc32(dataB);
    const common = [...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(dataB.length), ...u32(dataB.length), ...u16(nameB.length), ...u16(0)];
    const local = new Uint8Array([...u32(0x04034b50), ...common]);
    parts.push(local, nameB, dataB);
    central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...common, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), nameB);
    offset += local.length + nameB.length + dataB.length;
  });
  const cSize = central.reduce((s, p) => s + p.length, 0);
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cSize), ...u32(offset), ...u16(0)]);
  return new Blob([...parts, ...central, end], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

// ---- Word ----
const x = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// runs: string või [{t, b}]
function p(runs, { indent = 0, spaceAfter = 120, bullet = '', size } = {}) {
  const list = typeof runs === 'string' ? [{ t: runs }] : runs;
  const ind = indent ? `<w:ind w:left="${indent}" w:hanging="${bullet ? 300 : 0}"/>` : '';
  const sz = size ? `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>` : '';
  const r = (t, b) => `<w:r><w:rPr>${b ? '<w:b/>' : ''}${sz}</w:rPr><w:t xml:space="preserve">${x(t)}</w:t></w:r>`;
  return `<w:p><w:pPr><w:spacing w:after="${spaceAfter}"/>${ind}</w:pPr>${bullet ? r(bullet + '\t') : ''}${list.map((q) => r(q.t, q.b)).join('')}</w:p>`;
}

// blocks: [{type:'p'|'bullet'|'sub'|'gap', runs}]
export function docx(blocks) {
  const body = blocks.map((b) => {
    if (b.type === 'gap') return p('', { spaceAfter: 0 });
    if (b.type === 'bullet') return p(b.runs, { indent: 600, bullet: '•', spaceAfter: 60 });
    if (b.type === 'sub') return p(b.runs, { indent: 1200, bullet: '◦', spaceAfter: 40 });
    if (b.type === 'title') return p(b.runs, { spaceAfter: 240, size: 26 });
    return p(b.runs);
  }).join('');

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1418" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr>
<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="et-EE"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>`;

  return zip([
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>` },
    { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
    { name: 'word/_rels/document.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: 'word/document.xml', data: document },
    { name: 'word/styles.xml', data: styles },
  ]);
}

// Jaga faili (Android: Drive, Gmail jne); kui ei toeta, laadi alla
export async function shareFile(blob, name) {
  if (isNative) return shareNative(blob, name);
  const file = new File([blob], name, { type: blob.type });
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: name }); return 'shared'; }
  } catch (e) { if (e.name === 'AbortError') return 'cancel'; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = name; a.click();
  return 'downloaded';
}
