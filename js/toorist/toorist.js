// Tööriistad: nimekiri numbrite, seerianumbrite, piltide ja asukohtadega
import { ico } from '../icons.js';
import { compress } from '../kulud/pilt.js';
import * as paevik from '../paevik/store.js';

const KEY = 'krox.tooriistad';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ASUKOHT = {
  ladu: { nimi: 'Laos', ico: 'ladu' },
  auto: { nimi: 'Autos', ico: 'auto' },
  objekt: { nimi: 'Objektil', ico: 'asukoht' },
  laenatud: { nimi: 'Laenatud', ico: 'inimesed' },
  remont: { nimi: 'Remondis', ico: 'mutrivoti' },
  kadunud: { nimi: 'Kadunud', ico: 'kysimus' },
};
const TOOTJAD = ['Makita', 'Hilti', 'Bosch', 'DeWalt', 'Milwaukee', 'Festool', 'Metabo', 'Rubi', 'Sigma', 'Montolit', 'Kaarcher'];

// ---- andmed: nimekiri localStorage-s (läheb varukoopiasse), pildid IndexedDB-s ----
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const store = (l) => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { alert('Salvestamine ebaõnnestus'); } };
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('krox-pildid', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('pildid');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function pilt(id, blob) {
  const db = await idb();
  return new Promise((res, rej) => {
    const t = db.transaction('pildid', blob === undefined ? 'readonly' : 'readwrite');
    const s = t.objectStore('pildid');
    const q = blob === undefined ? s.get(id) : blob === null ? s.delete(id) : s.put(blob, id);
    t.oncomplete = () => res(q.result); t.onerror = () => rej(t.error);
  });
}
const nextNr = (l) => {
  const max = l.reduce((m, t) => Math.max(m, parseInt(String(t.nr).replace(/\D/g, '')) || 0), 0);
  return 'KROX-' + String(max + 1).padStart(2, '0');
};
const kohtTekst = (t) => {
  const a = ASUKOHT[t.asukoht] || ASUKOHT.ladu;
  return a.nimi + (t.kohtLisa ? ': ' + t.kohtLisa : '');
};

// ---------- nimekiri ----------
let filter = 'koik', otsi = '';
async function list(el) {
  const all = load();
  const q = otsi.toLowerCase();
  const shown = all.filter((t) => (filter === 'koik' || t.asukoht === filter) &&
    (!q || [t.nr, t.nimi, t.tootja, t.mudel, t.seerianr, t.kohtLisa].join(' ').toLowerCase().includes(q)))
    .sort((a, b) => String(a.nr).localeCompare(String(b.nr), 'et', { numeric: true }));
  const cnt = (k) => all.filter((t) => t.asukoht === k).length;

  el.innerHTML = `
    <a class="btn primary" href="#/toorist/uus" style="display:block;text-align:center;padding:14px">${ico('lisa')}Lisa tööriist</a>
    <input id="otsi" placeholder="Otsi: nr, nimi, mudel, seerianr…" value="${esc(otsi)}" style="margin-top:12px">
    <div class="chips">
      <button data-f="koik" class="${filter === 'koik' ? 'on' : ''}">Kõik ${all.length}</button>
      ${Object.entries(ASUKOHT).map(([k, v]) => cnt(k) ? `<button data-f="${k}" class="${filter === k ? 'on' : ''}">${v.nimi} ${cnt(k)}</button>` : '').join('')}
    </div>
    <div class="nav-list" style="margin-top:10px">
      ${shown.length ? shown.map((t) => `
        <a class="tool-row" href="#/toorist/t/${t.id}">
          <span class="thumb" data-pilt="${t.id}">${ico('mutrivoti')}</span>
          <span class="nr-text">
            <span class="t"><b class="tnr">${esc(t.nr)}</b> ${esc(t.nimi)}</span>
            <span class="d">${esc([t.tootja, t.mudel].filter(Boolean).join(' '))}${t.omanik === 'paarimees' ? ' · paarimehe' : ''}</span>
          </span>
          <span class="koht k-${t.asukoht}">${ico(ASUKOHT[t.asukoht]?.ico || 'ladu')}</span>
        </a>`).join('') : `<p class="note" style="padding:12px 14px">${all.length ? 'Midagi ei leitud.' : 'Tööriistu pole veel. Vajuta „Lisa tööriist“.'}</p>`}
    </div>
    ${all.length ? `<button class="btn" id="csv" style="width:100%;margin-top:12px">${ico('alla')}Nimekiri (CSV / Excel, kindlustusele)</button>` : ''}`;

  const $ = (x) => el.querySelector('#' + x);
  $('otsi').addEventListener('input', () => { otsi = $('otsi').value; const pos = $('otsi').selectionStart; list(el).then(() => { $('otsi').focus(); $('otsi').setSelectionRange(pos, pos); }); });
  el.querySelectorAll('.chips button').forEach((b) => (b.onclick = () => { filter = b.dataset.f; list(el); }));
  el.querySelectorAll('[data-pilt]').forEach(async (s) => {
    const t = all.find((x) => x.id === s.dataset.pilt);
    if (!t?.pilt) return;
    const blob = await pilt(t.id).catch(() => null);
    if (blob) s.innerHTML = `<img src="${URL.createObjectURL(blob)}" alt="">`;
  });
  if ($('csv')) $('csv').onclick = () => {
    const rows = [['Nr', 'Nimetus', 'Tootja', 'Mudel', 'Seerianr', 'Omanik', 'Asukoht', 'Ostetud', 'Hind', 'Märkus']];
    all.forEach((t) => rows.push([t.nr, t.nimi, t.tootja, t.mudel, t.seerianr, t.omanik === 'paarimees' ? 'paarimees' : 'KROX', kohtTekst(t), t.ostetud, t.hind, t.markus]));
    const text = '﻿' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = 'tooriistad.csv'; a.click();
  };
}

// ---------- vorm ----------
async function vorm(el, id) {
  const all = load();
  const old = id ? all.find((t) => t.id === id) : null;
  const t = old ? { ...old } : { nr: nextNr(all), nimi: '', tootja: 'Makita', mudel: '', seerianr: '', omanik: 'mina', asukoht: 'ladu', kohtLisa: '', ostetud: '', hind: '', markus: '', pilt: false };
  let newBlob = null;

  el.innerHTML = `
    <a class="back" href="#/toorist">← Tööriistad</a>
    <h1>${old ? esc(t.nr) + ' ' + esc(t.nimi) : 'Uus tööriist'}</h1>
    <label class="tool-photo" id="photo">
      <span id="ph">${ico('kaamera')}<small>Pildista tööriist ja seerianumbri silt</small></span>
      <input type="file" id="file" accept="image/*" capture="environment" hidden>
    </label>

    <h2>Kus on?</h2>
    <div class="koht-grid" id="ak">${Object.entries(ASUKOHT).map(([k, v]) => `<button data-v="${k}">${ico(v.ico)}<span>${v.nimi}</span></button>`).join('')}</div>
    <div id="lisaBox"><label id="lisaL"></label>
      <input id="kohtLisa" list="kohtList" value="${esc(t.kohtLisa)}">
      <datalist id="kohtList">${paevik.objektid().map((o) => `<option value="${esc(o)}">`).join('')}</datalist>
    </div>

    <h2>Andmed</h2>
    <div class="card">
      <div class="row">
        <div><label>Number</label><input id="nr" value="${esc(t.nr)}"></div>
        <div><label>Omanik</label><select id="omanik"><option value="mina">KROX</option><option value="paarimees">Paarimees</option></select></div>
      </div>
      <label>Nimetus</label><input id="nimi" placeholder="nt Akutrell, Nurklihvija 125" value="${esc(t.nimi)}">
      <div class="row">
        <div><label>Tootja</label><input id="tootja" list="tList" value="${esc(t.tootja)}"><datalist id="tList">${TOOTJAD.map((x) => `<option value="${x}">`).join('')}</datalist></div>
        <div><label>Mudel</label><input id="mudel" placeholder="nt DHP486" value="${esc(t.mudel)}"></div>
      </div>
      <label>Seerianumber</label><input id="seerianr" value="${esc(t.seerianr)}" placeholder="sildilt">
      <div class="row">
        <div><label>Ostetud</label><input type="date" id="ostetud" value="${esc(t.ostetud)}"></div>
        <div><label>Hind (€)</label><input id="hind" inputmode="decimal" value="${esc(t.hind)}"></div>
      </div>
      <label>Märkus</label><textarea id="markus" rows="2" placeholder="nt 2 akut 5Ah, kohvris">${esc(t.markus)}</textarea>
    </div>
    <div class="actions">
      <button class="btn primary" id="save">Salvesta</button>
      ${old ? '<button class="btn danger" id="del">Kustuta</button>' : ''}
    </div>
    ${old?.ajalugu?.length ? `<h2>Liikumised</h2><div class="card hist">${old.ajalugu.slice(-8).reverse().map((h) => `<div><span>${h.aeg.split('-').reverse().join('.')}</span> ${esc(h.koht)}</div>`).join('')}</div>` : ''}`;

  const $ = (x) => el.querySelector('#' + x);
  $('omanik').value = t.omanik;
  const LISA = { objekt: ['Mis objektil', 'nt Tamme 5'], laenatud: ['Kellele', 'nt paarimees, Jaan'], remont: ['Kus remondis', 'nt Makita hooldus Tallinn'], kadunud: ['Viimati nähtud', 'nt Kase 12, 20.11'], auto: ['Mis autos', 'valikuline'], ladu: ['Riiul / kast', 'valikuline'] };
  const setAk = (v) => {
    t.asukoht = v;
    el.querySelectorAll('#ak button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
    $('lisaL').textContent = LISA[v][0]; $('kohtLisa').placeholder = LISA[v][1];
  };
  el.querySelectorAll('#ak button').forEach((b) => (b.onclick = () => setAk(b.dataset.v)));
  setAk(t.asukoht);

  const showImg = (blob) => { $('ph').innerHTML = `<img src="${URL.createObjectURL(blob)}" alt="">`; };
  if (t.pilt) pilt(t.id).then((b) => b && showImg(b)).catch(() => {});
  $('file').onchange = async () => {
    const f = $('file').files[0]; if (!f) return;
    newBlob = (await compress(f, 1200, 0.8)).blob;
    showImg(newBlob);
  };

  $('save').onclick = async () => {
    const prevKoht = old ? kohtTekst(old) : '';
    ['nr', 'nimi', 'tootja', 'mudel', 'seerianr', 'ostetud', 'hind', 'markus', 'kohtLisa', 'omanik'].forEach((k) => (t[k] = $(k).value.trim()));
    if (!t.nimi) return alert('Lisa nimetus');
    if (!t.id) t.id = Date.now().toString(36);
    if (kohtTekst(t) !== prevKoht) t.ajalugu = [...(t.ajalugu || []), { aeg: paevik.today(), koht: kohtTekst(t) }];
    if (newBlob) { try { await pilt(t.id, newBlob); t.pilt = true; } catch { alert('Pildi salvestamine ebaõnnestus'); } }
    const l = load();
    const i = l.findIndex((x) => x.id === t.id);
    if (i >= 0) l[i] = t; else l.push(t);
    store(l);
    location.hash = '#/toorist';
  };
  if (old) $('del').onclick = async () => {
    if (!confirm(`Kustutan ${t.nr} ${t.nimi}?`)) return;
    store(load().filter((x) => x.id !== t.id));
    pilt(t.id, null).catch(() => {});
    location.hash = '#/toorist';
  };
}

export default {
  id: 'toorist',
  icon: 'mutrivoti',
  title: 'Tööriistad',
  desc: 'Number, seerianr, kus on',
  render(el, rest = []) {
    if (rest[0] === 'uus') return vorm(el, null);
    if (rest[0] === 't') return vorm(el, rest[1]);
    list(el);
  },
};
