// Pildi suurendamine täisekraanil: kahe sõrmega suumimine, lohistamine, topeltpuude
import { ico } from './icons.js';

let closeCur = null;
export const zoomOpen = () => !!closeCur;
export const zoomClose = () => closeCur && closeCur();

export function zoom(src) {
  const wrap = document.createElement('div');
  wrap.className = 'zoom-wrap';
  wrap.innerHTML = `<img alt=""><button class="zoom-x" aria-label="Sulge">${ico('sulge')}</button><div class="zoom-hint">Suumi kahe sõrmega · topeltpuude</div>`;
  const img = wrap.querySelector('img');
  img.src = src;
  document.body.append(wrap);
  document.body.style.overflow = 'hidden';

  let s = 1, x = 0, y = 0;
  const apply = (anim) => { img.style.transition = anim ? 'transform .2s' : 'none'; img.style.transform = `translate(${x}px,${y}px) scale(${s})`; };
  const clamp = () => {
    const r = wrap.getBoundingClientRect();
    const bw = img.offsetWidth * s, bh = img.offsetHeight * s;
    const mx = Math.max(0, (bw - r.width) / 2), my = Math.max(0, (bh - r.height) / 2);
    x = Math.min(mx, Math.max(-mx, x)); y = Math.min(my, Math.max(-my, y));
  };
  // suumi punkti (cx, cy) ümber (ekraani koordinaadid)
  const zoomAt = (ns, cx, cy) => {
    ns = Math.min(8, Math.max(1, ns));
    const r = wrap.getBoundingClientRect();
    const px = cx - r.left - r.width / 2, py = cy - r.top - r.height / 2;
    x = px - (px - x) * (ns / s); y = py - (py - y) * (ns / s); s = ns;
    if (s === 1) { x = 0; y = 0; }
    clamp();
  };

  const pts = new Map();
  let start = null, lastTap = 0;
  const two = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; };
  wrap.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.zoom-x')) return;
    wrap.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { const t = two(); start = { ...t, s, x, y }; }
    else if (pts.size === 1) {
      const now = Date.now();
      if (now - lastTap < 300) { zoomAt(s > 1.2 ? 1 : 3, e.clientX, e.clientY); apply(true); lastTap = 0; return; }
      lastTap = now;
      start = { px: e.clientX, py: e.clientY, x, y };
    }
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2 && start?.d) {
      const t = two();
      s = start.s; x = start.x; y = start.y;
      zoomAt(start.s * (t.d / start.d), start.cx, start.cy);
      x += t.cx - start.cx; y += t.cy - start.cy; clamp();
      apply();
    } else if (pts.size === 1 && start?.px !== undefined && s > 1) {
      x = start.x + e.clientX - start.px; y = start.y + e.clientY - start.py; clamp(); apply();
    }
  });
  const up = (e) => {
    pts.delete(e.pointerId);
    if (pts.size === 1) { const [p] = pts.values(); start = { px: p.x, py: p.y, x, y }; }
    else if (!pts.size) start = null;
  };
  wrap.addEventListener('pointerup', up);
  wrap.addEventListener('pointercancel', up);
  wrap.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(s * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX, e.clientY); apply(); }, { passive: false });

  const close = () => { wrap.remove(); document.body.style.overflow = ''; closeCur = null; };
  wrap.querySelector('.zoom-x').onclick = close;
  closeCur = close;
  apply();
}
