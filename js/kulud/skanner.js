// Dokumendiskanner (nagu Google Drive'is): servade leidmine, perspektiivi sirgendamine, valge taust
import { ico } from '../icons.js';

const loadImg = (blob) => new Promise((res, rej) => {
  const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(blob);
});

// ---------- servade automaatne leidmine ----------
// Hele paber tumedamal taustal: Otsu lävi -> suurim hele ala -> nurgad äärmuspunktidest
function detect(img) {
  const S = 360, k = Math.min(1, S / Math.max(img.width, img.height));
  const w = Math.round(img.width * k), h = Math.round(img.height * k);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const g = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = d[i * 4], gr = d[i * 4 + 1], b = d[i * 4 + 2];
    const mx = Math.max(r, gr, b), mn = Math.min(r, gr, b);
    g[i] = Math.max(0, Math.min(255, (r * 0.3 + gr * 0.59 + b * 0.11) - (mx - mn) * 0.8)); // paber on hele ja värvitu
  }
  // Otsu
  const hist = new Array(256).fill(0); g.forEach((v) => hist[v]++);
  let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sB = 0, wB = 0, best = 0, th = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t]; if (!wB) continue; const wF = w * h - wB; if (!wF) break;
    sB += t * hist[t]; const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) ** 2;
    if (v > best) { best = v; th = t; }
  }
  // mask + sulgemine (paisuta ja ahenda), et voldijooned ja tekst ei lõhuks paberit tükkideks
  let m = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) m[i] = g[i] > th ? 1 : 0;
  const morph = (src, dil, r) => {
    const o = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = dil ? 0 : 1;
      for (let dy = -r; dy <= r && (dil ? !v : v); dy++) for (let dx = -r; dx <= r; dx++) {
        const xx = x + dx, yy = y + dy;
        const s2 = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : src[yy * w + xx];
        if (dil && s2) { v = 1; break; } if (!dil && !s2) { v = 0; break; }
      }
      o[y * w + x] = v;
    }
    return o;
  };
  const R = Math.max(2, Math.round(Math.max(w, h) / 90));
  m = morph(morph(m, true, R), false, R);   // sulgemine
  m = morph(morph(m, false, 1), true, 1);   // avamine: eemalda peened triibud
  // suurim hele ühtne ala
  const lab = new Int32Array(w * h); let bestLab = 0, bestSize = 0, cur = 0;
  const st = new Int32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (!m[i] || lab[i]) continue;
    cur++; let sp = 0, size = 0; st[sp++] = i; lab[i] = cur;
    while (sp) {
      const p = st[--sp]; size++;
      const x = p % w, y = (p / w) | 0;
      const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
      for (const q of nb) if (q >= 0 && !lab[q] && m[q]) { lab[q] = cur; st[sp++] = q; }
    }
    if (size > bestSize) { bestSize = size; bestLab = cur; }
  }
  const pad = 0.04;
  const fallback = [[pad, pad], [1 - pad, pad], [1 - pad, 1 - pad], [pad, 1 - pad]].map(([x, y]) => [x * img.width, y * img.height]);
  if (bestSize < w * h * 0.08 || bestSize > w * h * 0.97) return fallback;
  let tl, tr, br, bl, a = Infinity, b2 = -Infinity, c2 = -Infinity, d2 = Infinity;
  for (let i = 0; i < w * h; i++) {
    if (lab[i] !== bestLab) continue;
    const x = i % w, y = (i / w) | 0;
    if (x + y < a) { a = x + y; tl = [x, y]; }
    if (x + y > b2) { b2 = x + y; br = [x, y]; }
    if (x - y > c2) { c2 = x - y; tr = [x, y]; }
    if (x - y < d2) { d2 = x - y; bl = [x, y]; }
  }
  return [tl, tr, br, bl].map(([x, y]) => [x / k, y / k]);
}

// ---------- perspektiiv ----------
function solve(A, b) { // Gaussi elimineerimine
  const n = b.length;
  for (let i = 0; i < n; i++) {
    let m = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r;
    [A[i], A[m]] = [A[m], A[i]]; [b[i], b[m]] = [b[m], b[i]];
    for (let r = i + 1; r < n; r++) { const f = A[r][i] / A[i][i]; for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; }
  }
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; }
  return x;
}
function homography(from, to) { // leiab H: from -> to
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = from[i], [u, v] = to[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  return [...solve(A, b), 1];
}
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);

function warp(img, q, maxSide = 2000) {
  let W = Math.max(dist(q[0], q[1]), dist(q[3], q[2])), H = Math.max(dist(q[0], q[3]), dist(q[1], q[2]));
  const s = Math.min(1, maxSide / Math.max(W, H)); W = Math.round(W * s); H = Math.round(H * s);
  const src = document.createElement('canvas'); src.width = img.width; src.height = img.height;
  const sctx = src.getContext('2d'); sctx.drawImage(img, 0, 0);
  const sd = sctx.getImageData(0, 0, img.width, img.height).data, sw = img.width, sh = img.height;
  const h = homography([[0, 0], [W, 0], [W, H], [0, H]], q);
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const octx = out.getContext('2d'); const od = octx.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const z = h[6] * x + h[7] * y + 1;
    const u = (h[0] * x + h[1] * y + h[2]) / z, v = (h[3] * x + h[4] * y + h[5]) / z;
    const x0 = Math.max(0, Math.min(sw - 2, u | 0)), y0 = Math.max(0, Math.min(sh - 2, v | 0));
    const fx = Math.min(1, Math.max(0, u - x0)), fy = Math.min(1, Math.max(0, v - y0));
    const o = (y * W + x) * 4, i00 = (y0 * sw + x0) * 4, i10 = i00 + 4, i01 = i00 + sw * 4, i11 = i01 + 4;
    for (let c = 0; c < 3; c++) {
      od.data[o + c] = (sd[i00 + c] * (1 - fx) + sd[i10 + c] * fx) * (1 - fy) + (sd[i01 + c] * (1 - fx) + sd[i11 + c] * fx) * fy;
    }
    od.data[o + 3] = 255;
  }
  octx.putImageData(od, 0, 0);
  return out;
}

// ---------- "skanni" filter: tausta tasandamine, valge paber, tume tekst ----------
function enhance(canvas, mode) {
  if (mode === 'varv') return canvas;
  const W = canvas.width, H = canvas.height, ctx = canvas.getContext('2d');
  const id = ctx.getImageData(0, 0, W, H), d = id.data;
  // tausta hinnang: väike koopia + hägu
  const bw = Math.max(8, Math.round(W / 24)), bh = Math.max(8, Math.round(H / 24));
  const b = document.createElement('canvas'); b.width = bw; b.height = bh;
  const bctx = b.getContext('2d'); bctx.filter = 'blur(2px)'; bctx.drawImage(canvas, 0, 0, bw, bh);
  // "max" filter, et tekst ei tumendaks tausta hinnangut
  const small = bctx.getImageData(0, 0, bw, bh).data, bg = new Float32Array(bw * bh);
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    let m = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = Math.min(bw - 1, Math.max(0, x + dx)), yy = Math.min(bh - 1, Math.max(0, y + dy)), i = (yy * bw + xx) * 4;
      m = Math.max(m, small[i] * 0.3 + small[i + 1] * 0.59 + small[i + 2] * 0.11);
    }
    bg[y * bw + x] = Math.max(40, m);
  }
  const bgAt = (x, y) => { // bilineaarne
    const fx = Math.min(bw - 1.001, Math.max(0, x / W * bw - 0.5)), fy = Math.min(bh - 1.001, Math.max(0, y / H * bh - 0.5));
    const x0 = fx | 0, y0 = fy | 0, ax = fx - x0, ay = fy - y0;
    const a = bg[y0 * bw + x0], b1 = bg[y0 * bw + x0 + 1], c = bg[(y0 + 1) * bw + x0], e = bg[(y0 + 1) * bw + x0 + 1];
    return (a * (1 - ax) + b1 * ax) * (1 - ay) + (c * (1 - ax) + e * ax) * ay;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const gray = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
    let v = (gray / bgAt(x, y)) * 255;            // 255 = paber
    v = 255 - Math.max(0, 255 - v) * 2.2;          // tekst tumedamaks
    v = v > 235 ? 255 : Math.max(0, v);
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(id, 0, 0);
  return canvas;
}

// ---------- kasutajaliides ----------
export function scan(file) {
  return new Promise(async (resolve) => {
    const img = await loadImg(file);
    let q = detect(img);
    let mode = 'skann';
    const wrap = document.createElement('div');
    wrap.className = 'scan-wrap';
    wrap.innerHTML = `
      <div class="scan-top"><b>Kärbi tšekk</b><span class="note">Lohista nurki, kui vaja</span></div>
      <div class="scan-stage"><canvas id="sc"></canvas></div>
      <div class="seg scan-mode"><button data-v="skann" class="on">Skann (valge taust)</button><button data-v="varv">Värviline</button></div>
      <div class="actions scan-act">
        <button class="btn" id="scOrig">Ilma kärpimata</button>
        <button class="btn primary" id="scOk">${ico('kaamera')}Skanni</button>
      </div>`;
    document.body.appendChild(wrap);
    const cv = wrap.querySelector('#sc'), ctx = cv.getContext('2d');
    const stage = wrap.querySelector('.scan-stage');
    let k = 1;
    const fit = () => {
      const r = stage.getBoundingClientRect();
      k = Math.min(r.width / img.width, r.height / img.height);
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      draw();
    };
    const draw = () => {
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.beginPath(); ctx.rect(0, 0, cv.width, cv.height);
      ctx.moveTo(q[0][0] * k, q[0][1] * k); [1, 2, 3, 0].forEach((i) => ctx.lineTo(q[i][0] * k, q[i][1] * k));
      ctx.fill('evenodd');
      ctx.strokeStyle = '#c4a96b'; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(q[0][0] * k, q[0][1] * k); [1, 2, 3, 0].forEach((i) => ctx.lineTo(q[i][0] * k, q[i][1] * k)); ctx.stroke();
      q.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x * k, y * k, 13, 0, 7); ctx.fillStyle = 'rgba(196,169,107,.35)'; ctx.fill(); ctx.lineWidth = 3; ctx.stroke(); });
    };
    let drag = -1;
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / k, (e.clientY - r.top) / k]; };
    cv.addEventListener('pointerdown', (e) => {
      const p = pos(e); let m = Infinity;
      q.forEach((c, i) => { const dd = dist(c, p) * k; if (dd < m) { m = dd; drag = i; } });
      if (m > 45) drag = -1; else cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', (e) => {
      if (drag < 0) return;
      const [x, y] = pos(e); q[drag] = [Math.max(0, Math.min(img.width, x)), Math.max(0, Math.min(img.height, y))]; draw();
    });
    cv.addEventListener('pointerup', () => { drag = -1; });
    wrap.querySelectorAll('.scan-mode button').forEach((b) => (b.onclick = () => {
      mode = b.dataset.v; wrap.querySelectorAll('.scan-mode button').forEach((x) => x.classList.toggle('on', x === b));
    }));
    const done = (blob) => { window.removeEventListener('resize', fit); wrap.remove(); resolve(blob); };
    wrap.querySelector('#scOrig').onclick = () => done(file);
    wrap.querySelector('#scOk').onclick = async () => {
      const btn = wrap.querySelector('#scOk'); btn.disabled = true; btn.textContent = 'Töötlen…';
      await new Promise((r) => setTimeout(r, 30));
      const out = enhance(warp(img, q), mode);
      out.toBlob((b) => done(b || file), 'image/jpeg', 0.88);
    };
    window.addEventListener('resize', fit);
    requestAnimationFrame(fit);
  });
}
