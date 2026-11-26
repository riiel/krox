// Pildi vähendamine ja JPEG -> PDF (ühe lehega A4, pilt mahutatud lehele)

export async function compress(file, max = 1600, quality = 0.82) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null);
  const img = bmp || await new Promise((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file);
  });
  const w0 = img.width, h0 = img.height;
  const k = Math.min(1, max / Math.max(w0, h0));
  const w = Math.round(w0 * k), h = Math.round(h0 * k);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', quality));
  return { blob, w, h };
}

export const toBase64 = (blob) => new Promise((res) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).split(',')[1]);
  r.readAsDataURL(blob);
});

// Minimaalne kehtiv PDF ühe JPEG-pildiga
export async function jpegToPdf(blob, w, h) {
  const jpg = new Uint8Array(await blob.arrayBuffer());
  const W = 595.28, H = 841.89, M = 28;            // A4 punktides
  const k = Math.min((W - 2 * M) / w, (H - 2 * M) / h);
  const dw = +(w * k).toFixed(2), dh = +(h * k).toFixed(2);
  const x = +((W - dw) / 2).toFixed(2), y = +(H - M - dh).toFixed(2);
  const content = `q ${dw} 0 0 ${dh} ${x} ${y} cm /Im0 Do Q`;

  const enc = new TextEncoder();
  const parts = [];
  const offsets = [];
  let len = 0;
  const push = (s) => { const b = typeof s === 'string' ? enc.encode(s) : s; parts.push(b); len += b.length; };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'.replace(/[\x80-\xff]/g, '*'));
  const obj = (i, body) => { offsets[i] = len; push(`${i} 0 obj\n`); body(); push('\nendobj\n'); };

  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'));
  obj(3, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`));
  obj(4, () => {
    push(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`);
    push(jpg);
    push('\nendstream');
  });
  obj(5, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));

  const xref = len;
  push(`xref\n0 6\n0000000000 65535 f \n${[1, 2, 3, 4, 5].map((i) => String(offsets[i]).padStart(10, '0') + ' 00000 n \n').join('')}`);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts, { type: 'application/pdf' });
}
