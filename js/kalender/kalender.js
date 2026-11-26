// Kalender: kohtumised, laevapiletid, meeldetuletused, märkmed. Telefoni meeldetuletus läbi Google'i kalendri.
import { ico } from '../icons.js';

const KEY = 'krox.kalender';
const KUUD = ['jaanuar', 'veebruar', 'märts', 'aprill', 'mai', 'juuni', 'juuli', 'august', 'september', 'oktoober', 'november', 'detsember'];
const PAEVAD = ['pühapäev', 'esmaspäev', 'teisipäev', 'kolmapäev', 'neljapäev', 'reede', 'laupäev'];
const TYYBID = {
  kohtumine: { nimi: 'Kohtumine', ico: 'inimesed' },
  laev: { nimi: 'Laev', ico: 'laev' },
  meeldetuletus: { nimi: 'Meeldetuletus', ico: 'kell' },
  markus: { nimi: 'Märkus', ico: 'markus' },
};
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => iso(new Date());
const kp = (s) => { const d = new Date(s + 'T12:00'); return `${PAEVAD[d.getDay()].slice(0, 1).toUpperCase()} ${d.getDate()}. ${KUUD[d.getMonth()].slice(0, 3)}`; };

const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const store = (l) => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { alert('Salvestamine ebaõnnestus'); } };
const sortKey = (e) => e.kuupaev + (e.aeg || '00:00');

// Tulevased sündmused (avalehe jaoks)
export function tulemas(paevi = 14, max = 3) {
  const t = today();
  const end = iso(new Date(Date.now() + paevi * 864e5));
  return load().filter((e) => e.kuupaev >= t && e.kuupaev <= end).sort((a, b) => sortKey(a).localeCompare(sortKey(b))).slice(0, max);
}
export function tulemasHtml() {
  const l = tulemas();
  if (!l.length) return '';
  const t = today(), h = iso(new Date(Date.now() + 864e5));
  return `<h2>Tulemas</h2><div class="nav-list">${l.map((e) => `
    <a class="nav-row" href="#/kalender/e/${e.id}">
      ${ico(TYYBID[e.tyyp]?.ico || 'kalender', 'gold')}
      <span class="nr-text"><span class="t">${esc(e.pealkiri)}</span>
      <span class="d">${e.kuupaev === t ? 'Täna' : e.kuupaev === h ? 'Homme' : kp(e.kuupaev)}${e.aeg ? ' ' + e.aeg : ''}${e.koht ? ' · ' + esc(e.koht) : ''}</span></span>
    </a>`).join('')}</div>`;
}

// Google'i kalendri link (Androidis avab Kalendri äpi, kus on meeldetuletused)
function googleLink(e) {
  const d = e.kuupaev.replace(/-/g, '');
  let dates;
  if (e.aeg) {
    const [h, m] = e.aeg.split(':').map(Number);
    const endMin = h * 60 + m + (parseInt(e.kestus) || 60);
    const endDate = new Date(e.kuupaev + 'T12:00'); endDate.setDate(endDate.getDate() + Math.floor(endMin / 1440));
    const em = endMin % 1440;
    dates = `${d}T${pad(h)}${pad(m)}00/${iso(endDate).replace(/-/g, '')}T${pad(Math.floor(em / 60))}${pad(em % 60)}00`;
  } else {
    const n = new Date(e.kuupaev + 'T12:00'); n.setDate(n.getDate() + 1);
    dates = `${d}/${iso(n).replace(/-/g, '')}`;
  }
  const details = [e.broneering && `Broneering: ${e.broneering}`, e.markmed].filter(Boolean).join('\n');
  const p = new URLSearchParams({ action: 'TEMPLATE', text: e.pealkiri, dates, ctz: 'Europe/Tallinn' });
  if (details) p.set('details', details);
  if (e.koht) p.set('location', e.koht);
  return 'https://calendar.google.com/calendar/render?' + p.toString();
}

// ---------- kuu vaade ----------
let sel = today();
function month(el) {
  const all = load();
  const [y, m] = sel.split('-').map(Number);
  const ym = sel.slice(0, 7);
  const perDay = {};
  all.filter((e) => e.kuupaev.startsWith(ym)).forEach((e) => (perDay[e.kuupaev] ??= []).push(e));
  const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const days = new Date(y, m, 0).getDate();
  const t = today();
  let cells = '<span></span>'.repeat(offset);
  for (let d = 1; d <= days; d++) {
    const ds = `${ym}-${pad(d)}`;
    const ev = perDay[ds] || [];
    cells += `<button class="day${ds === sel ? ' sel' : ''}${ds === t ? ' today' : ''}${ev.length ? ' has' : ''}" data-d="${ds}">
      <span>${d}</span>${ev.length ? `<small class="dots">${ev.slice(0, 3).map(() => '•').join('')}</small>` : ''}</button>`;
  }
  const dayList = (perDay[sel] || []).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const next = all.filter((e) => e.kuupaev >= t).sort((a, b) => sortKey(a).localeCompare(sortKey(b))).slice(0, 5);

  const card = (e) => `
    <a class="entry ev" href="#/kalender/e/${e.id}">
      ${ico(TYYBID[e.tyyp]?.ico || 'kalender', 'gold')}
      <div style="flex:1;min-width:0">
        <div class="entry-top"><b>${esc(e.pealkiri)}</b><span>${e.aeg || ''}</span></div>
        ${e.koht || e.broneering ? `<div class="entry-sub">${[e.koht && esc(e.koht), e.broneering && 'Bron. ' + esc(e.broneering)].filter(Boolean).join(' · ')}</div>` : ''}
        ${e.markmed ? `<div class="entry-sub">${esc(e.markmed).slice(0, 90)}</div>` : ''}
      </div>
    </a>`;

  el.innerHTML = `
    <div class="month-nav"><button class="btn" id="prev">‹</button><b>${KUUD[m - 1]} ${y}</b><button class="btn" id="next">›</button></div>
    <div class="cal">${['E', 'T', 'K', 'N', 'R', 'L', 'P'].map((d) => `<span class="dow">${d}</span>`).join('')}${cells}</div>
    <div class="day-head"><h2>${kp(sel)}</h2><a class="btn primary" href="#/kalender/uus?d=${sel}">${ico('lisa')}Lisa</a></div>
    ${dayList.length ? dayList.map(card).join('') : '<p class="note">Sel päeval pole midagi.</p>'}
    ${next.length ? `<h2>Järgmised</h2>${next.map((e) => card(e).replace('<b>', `<b><span class="ev-date">${kp(e.kuupaev)}</span> `)).join('')}` : ''}`;

  const shift = (k) => { sel = iso(new Date(y, m - 1 + k, 1)); month(el); };
  el.querySelector('#prev').onclick = () => shift(-1);
  el.querySelector('#next').onclick = () => shift(1);
  el.querySelectorAll('.day').forEach((b) => (b.onclick = () => { sel = b.dataset.d; month(el); }));
}

// ---------- vorm ----------
function vorm(el, id, d) {
  const all = load();
  const old = id ? all.find((x) => x.id === id) : null;
  const e = old ? { ...old } : { tyyp: 'kohtumine', pealkiri: '', kuupaev: d || sel, aeg: '', kestus: 60, koht: '', broneering: '', markmed: '' };

  el.innerHTML = `
    <a class="back" href="#/kalender">← Kalender</a>
    <h1>${old ? 'Muuda' : 'Uus sündmus'}</h1>
    <div class="seg tyyp" id="tyyp">${Object.entries(TYYBID).map(([k, v]) => `<button data-v="${k}">${ico(v.ico)}<span>${v.nimi}</span></button>`).join('')}</div>
    <div class="card" style="margin-top:12px">
      <label>Pealkiri</label><input id="pealkiri" value="${esc(e.pealkiri)}">
      <div class="row">
        <div><label>Kuupäev</label><input type="date" id="kuupaev" value="${e.kuupaev}"></div>
        <div><label>Kellaaeg</label><input type="time" id="aeg" value="${e.aeg}"></div>
      </div>
      <label id="kohtL">Koht</label><input id="koht" value="${esc(e.koht)}">
      <div id="bronBox"><label>Broneeringu nr</label><input id="broneering" value="${esc(e.broneering)}"></div>
      <label>Märkmed</label><textarea id="markmed" rows="3">${esc(e.markmed)}</textarea>
    </div>
    <div class="actions">
      <button class="btn primary" id="save">Salvesta</button>
      ${old ? '<button class="btn danger" id="del">Kustuta</button>' : ''}
    </div>
    ${old ? `<a class="btn" id="gcal" href="${googleLink(e)}" target="_blank" rel="noopener" style="display:block;text-align:center;margin-top:10px">${ico('kell')}Lisa telefoni kalendrisse (meeldetuletus)</a>` : ''}
    <p class="note">${old ? 'Avab Google\'i kalendri, kus saad meeldetuletuse aja valida.' : 'Pärast salvestamist saad sündmuse telefoni kalendrisse lisada, et tuleks meeldetuletus.'}</p>`;

  const $ = (q) => el.querySelector('#' + q);
  const PH = { kohtumine: 'nt Kohtumine kliendiga', laev: 'nt Laev Tallinn → Helsinki', meeldetuletus: 'nt Maksa kütusearve', markus: 'nt Helistada plaatijale' };
  const setT = (v) => {
    e.tyyp = v;
    el.querySelectorAll('#tyyp button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
    $('pealkiri').placeholder = PH[v];
    $('bronBox').style.display = v === 'laev' ? '' : 'none';
    $('kohtL').textContent = v === 'laev' ? 'Sadam / terminal' : 'Koht';
    $('koht').placeholder = v === 'laev' ? 'nt D-terminal, Tallinn' : '';
    if (v === 'laev' && !$('pealkiri').value) $('pealkiri').value = 'Laev Tallinn → Helsinki';
  };
  el.querySelectorAll('#tyyp button').forEach((b) => (b.onclick = () => setT(b.dataset.v)));
  setT(e.tyyp);

  $('save').onclick = () => {
    ['pealkiri', 'kuupaev', 'aeg', 'koht', 'broneering', 'markmed'].forEach((k) => (e[k] = $(k).value.trim()));
    if (!e.pealkiri) return alert('Lisa pealkiri');
    if (!e.kuupaev) return alert('Vali kuupäev');
    if (e.tyyp !== 'laev') e.broneering = '';
    if (!e.id) { e.id = Date.now().toString(36); all.push(e); } else all[all.findIndex((x) => x.id === e.id)] = e;
    store(all);
    sel = e.kuupaev;
    location.hash = '#/kalender/e/' + e.id;
  };
  if (old) $('del').onclick = () => { if (confirm('Kustutan selle sündmuse?')) { store(all.filter((x) => x.id !== e.id)); location.hash = '#/kalender'; } };
}

export default {
  id: 'kalender',
  icon: 'kalender',
  title: 'Kalender',
  desc: 'Kohtumised, laevad, meeldetuletused',
  render(el, rest = [], q = {}) {
    if (rest[0] === 'uus') return vorm(el, null, q.d);
    if (rest[0] === 'e') return vorm(el, rest[1]);
    month(el);
  },
};
