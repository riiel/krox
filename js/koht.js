// Koha väli: soovitused (varem kasutatud kohad + aadressiotsing) ja kaardinupp
import { ico } from './icons.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const mapUrl = (q) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);

// Photon (OpenStreetMap) aadressiotsing, eelistab Pärnu ümbrust
async function otsi(q, signal) {
  const u = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lat=58.385&lon=24.497`;
  const r = await fetch(u, { signal });
  if (!r.ok) return [];
  const j = await r.json();
  const seen = new Set();
  return (j.features || []).map(({ properties: p }) => {
    const tanav = [p.street, p.housenumber].filter(Boolean).join(' ');
    const koht = p.city || p.town || p.village || p.county || '';
    const osad = [p.name, tanav !== p.name && tanav, koht !== p.name && koht, p.countrycode && p.countrycode !== 'EE' && p.country];
    return osad.filter(Boolean).join(', ');
  }).filter((t) => t && !seen.has(t) && seen.add(t));
}

// input: <input> element; varem: varem kasutatud kohtade nimekiri (uuemad eespool)
export function kohtVali(input, varem = []) {
  const wrap = document.createElement('div');
  wrap.className = 'koht-wrap';
  input.parentNode.insertBefore(wrap, input);
  const rida = document.createElement('div');
  rida.className = 'koht-row';
  const map = document.createElement('a');
  map.className = 'btn koht-map';
  map.target = '_blank'; map.rel = 'noopener';
  map.innerHTML = ico('asukoht');
  map.title = 'Ava kaardil';
  rida.append(input, map);
  const list = document.createElement('div');
  list.className = 'koht-list';
  list.hidden = true;
  wrap.append(rida, list);
  input.autocomplete = 'off';

  const upd = () => { const v = input.value.trim(); map.href = v ? mapUrl(v) : 'https://www.google.com/maps'; };
  upd();
  const unikaalsed = [...new Set(varem.filter(Boolean))];
  let ctl, t;
  const show = (items) => {
    if (!items.length || document.activeElement !== input) { list.hidden = true; return; }
    list.innerHTML = items.map(([tekst, oma]) => `<button type="button" data-v="${esc(tekst)}">${ico(oma ? 'kalender' : 'asukoht')}<span>${esc(tekst)}</span></button>`).join('');
    list.hidden = false;
  };
  const run = () => {
    upd();
    const q = input.value.trim();
    const ql = q.toLowerCase();
    const omad = unikaalsed.filter((x) => !ql || (x.toLowerCase().includes(ql) && x.toLowerCase() !== ql)).slice(0, 4).map((x) => [x, true]);
    show(omad);
    clearTimeout(t); ctl?.abort();
    if (q.length < 3 || !navigator.onLine) return;
    t = setTimeout(async () => {
      ctl = new AbortController();
      try {
        const res = (await otsi(q, ctl.signal)).filter((x) => !omad.some(([o]) => o === x)).map((x) => [x, false]);
        show([...omad, ...res].slice(0, 7));
      } catch { /* võrguviga, jääb ainult omad */ }
    }, 350);
  };
  input.addEventListener('input', run);
  input.addEventListener('focus', run);
  input.addEventListener('blur', () => setTimeout(() => (list.hidden = true), 200));
  list.addEventListener('pointerdown', (ev) => ev.preventDefault()); // ära kaota fookust enne valikut
  list.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-v]');
    if (!b) return;
    input.value = b.dataset.v;
    list.hidden = true; upd();
    input.dispatchEvent(new Event('change'));
  });
}
