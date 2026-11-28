// Väike PDF-i koostaja ilma lisateekideta: A4, Helvetica (WinAnsi, sobib eesti/soome tähtedega), jooned, JPEG-pildid.
// Koordinaadid: x, y punktides ülevalt vasakult (A4 = 595 × 842).
const WH = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,350,556,350,222,556,333,1000,556,556,333,1000,667,333,1000,350,611,350,350,222,222,333,333,350,556,1000,333,1000,500,333,944,350,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500];
const WB = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,350,556,350,278,556,500,1000,556,556,333,1000,667,333,1000,350,611,350,350,278,278,500,500,350,556,1000,333,1000,556,333,944,350,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556];
const SPEC = { '€': 128, '‚': 130, 'ƒ': 131, '„': 132, '…': 133, '†': 134, '‡': 135, 'ˆ': 136, '‰': 137, 'Š': 138, '‹': 139, 'Œ': 140, 'Ž': 142, '‘': 145, '’': 146, '“': 147, '”': 148, '•': 149, '–': 150, '—': 151, '˜': 152, '™': 153, 'š': 154, '›': 155, 'œ': 156, 'ž': 158, 'Ÿ': 159 };
const code = (ch) => { const c = ch.charCodeAt(0); if (c >= 32 && c < 128) return c; if (SPEC[ch]) return SPEC[ch]; if (c >= 160 && c < 256) return c; if (ch === '²') return 178; if (ch === '\u202f') return 160; if (ch === '\u2212') return 45; return 63; };
const esc = (s) => [...String(s)].map((ch) => { const c = code(ch); return c === 40 || c === 41 || c === 92 ? '\\' + ch : c < 128 ? String.fromCharCode(c) : '\\' + c.toString(8).padStart(3, '0'); }).join('');
const rgb = (hex = '#000') => { const h = hex.replace('#', ''); const n = h.length === 3 ? h.split('').map((x) => x + x).join('') : h; return [0, 2, 4].map((i) => (parseInt(n.slice(i, i + 2), 16) / 255).toFixed(3)).join(' '); };
const f = (n) => +n.toFixed(2);

export class Pdf {
  constructor() { this.pages = []; this.images = []; this.W = 595.28; this.H = 841.89; }
  page() { this.cur = []; this.pages.push(this.cur); return this; }
  width(s, size = 10, bold = false) { const t = bold ? WB : WH; return [...String(s)].reduce((a, ch) => a + (t[code(ch) - 32] || 556), 0) * size / 1000; }
  text(x, y, s, { size = 10, bold = false, color = '#000', align = 'left' } = {}) {
    if (s == null || s === '') return;
    const w = this.width(s, size, bold);
    const x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    this.cur.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${rgb(color)} rg ${f(x0)} ${f(this.H - y)} Td (${esc(s)}) Tj ET`);
  }
  // murrab teksti ridadeks laiuse järgi
  wrap(s, maxW, size = 10, bold = false) {
    const out = [];
    String(s ?? '').split('\n').forEach((para) => {
      let line = '';
      para.split(/\s+/).filter(Boolean).forEach((word) => {
        const t = line ? line + ' ' + word : word;
        if (this.width(t, size, bold) <= maxW || !line) line = t; else { out.push(line); line = word; }
      });
      out.push(line);
    });
    return out;
  }
  line(x1, y1, x2, y2, { w = 0.6, color = '#000' } = {}) { this.cur.push(`${w} w ${rgb(color)} RG ${f(x1)} ${f(this.H - y1)} m ${f(x2)} ${f(this.H - y2)} l S`); }
  rect(x, y, w, h, { fill = '#eee' } = {}) { this.cur.push(`${rgb(fill)} rg ${f(x)} ${f(this.H - y - h)} ${f(w)} ${f(h)} re f`); }
  // jpeg: Uint8Array, iw/ih: pildi pikslid
  image(jpeg, iw, ih, x, y, w, h) {
    let i = this.images.findIndex((im) => im.data === jpeg);
    if (i < 0) { this.images.push({ data: jpeg, iw, ih }); i = this.images.length - 1; }
    this.cur.push(`q ${f(w)} 0 0 ${f(h)} ${f(x)} ${f(this.H - y - h)} cm /Im${i} Do Q`);
  }
  blob() {
    const enc = new TextEncoder();
    const parts = []; const offs = []; let len = 0;
    const push = (s) => { const b = typeof s === 'string' ? enc.encode(s) : s; parts.push(b); len += b.length; };
    const objs = [];
    const add = (body) => { objs.push(body); return objs.length; };
    const fontR = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const fontB = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const imgIds = this.images.map((im) => add({ img: im }));
    const xo = imgIds.map((id, i) => `/Im${i} ${id} 0 R`).join(' ');
    const res = `<< /Font << /F1 ${fontR} 0 R /F2 ${fontB} 0 R >>${xo ? ` /XObject << ${xo} >>` : ''} >>`;
    const pagesId = objs.length + this.pages.length * 2 + 1;
    const pageIds = this.pages.map((ops) => {
      const c = ops.join('\n');
      const cid = add({ stream: c });
      return add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${this.W} ${this.H}] /Resources ${res} /Contents ${cid} 0 R >>`);
    });
    add(`<< /Type /Pages /Kids [${pageIds.map((i) => i + ' 0 R').join(' ')}] /Count ${pageIds.length} >>`);
    const catalog = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'.replace(/[\x80-\xff]/g, '*'));
    objs.forEach((o, i) => {
      offs[i + 1] = len;
      push(`${i + 1} 0 obj\n`);
      if (typeof o === 'string') push(o);
      else if (o.stream != null) { const b = enc.encode(o.stream); push(`<< /Length ${b.length} >>\nstream\n`); push(b); push('\nendstream'); }
      else { const im = o.img; push(`<< /Type /XObject /Subtype /Image /Width ${im.iw} /Height ${im.ih} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.data.length} >>\nstream\n`); push(im.data); push('\nendstream'); }
      push('\nendobj\n');
    });
    const xref = len;
    push(`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.slice(1).map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join(''));
    push(`trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(parts, { type: 'application/pdf' });
  }
}
