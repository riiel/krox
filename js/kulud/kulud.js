// Kulud ja tšekid: pildista -> loe automaatselt -> Merit (kinnitamist ootama) + Drive
import { ico } from '../icons.js';
import * as db from './store.js';
import { compress, toBase64, jpegToPdf } from './pilt.js';
import { scan } from './skanner.js';
import * as paevik from '../paevik/store.js';
import { eur } from '../util.js';
import { shareFile } from '../docx.js';

const KUUD = ['jaanuar', 'veebruar', 'märts', 'aprill', 'mai', 'juuni', 'juuli', 'august', 'september', 'oktoober', 'november', 'detsember'];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const kp = (s) => (s ? s.split('-').reverse().join('.') : '');
let month = paevik.today().slice(0, 7);
let pending = null; // värskelt pildistatud tšekk, mida pole veel salvestatud

const status = (k) => k.merit === 'ok' ? '<span class="tag ok">Meritis</span>'
  : k.merit === 'viga' ? '<span class="tag bad">Meriti viga</span>' : '<span class="tag wait">saatmata</span>';

// ---------- nimekiri ----------
async function list(el) {
  const items = (await db.all()).filter((k) => k.kuupaev.startsWith(month));
  const [y, m] = month.split('-').map(Number);
  const firma = items.filter((k) => k.makseviis !== 'isiklik'), oma = items.filter((k) => k.makseviis === 'isiklik');
  const sum = (a) => a.reduce((s, k) => s + db.total(k), 0);
  const saatmata = items.filter((k) => k.merit !== 'ok').length;

  el.innerHTML = `
    <label class="btn primary cam">${ico('kaamera')}Pildista tšekk
      <input type="file" id="cam" accept="image/*" capture="environment" hidden>
    </label>
    <label class="btn" style="display:block;text-align:center;margin-top:8px">${ico('pilt')}Vali galeriist
      <input type="file" id="gal" accept="image/*" hidden>
    </label>
    ${db.pin() ? '' : `<a class="card backup-hint" href="#/seaded">${ico('voti')}Automaatseks lugemiseks ja Meritisse saatmiseks sisesta seadetes PIN →</a>`}

    <div class="month-nav" style="margin-top:18px">
      <button class="btn" id="prev">‹</button><b>${KUUD[m - 1]} ${y}</b><button class="btn" id="next">›</button>
    </div>
    <div class="result">
      <div class="line"><span>Firma kaardiga (${firma.length})</span><b>${eur(sum(firma))}</b></div>
      <div class="line"><span>Oma rahaga (${oma.length})</span><b>${eur(sum(oma))}</b></div>
      <div class="line big"><span>Kokku</span><b>${eur(sum(items))}</b></div>
    </div>
    ${saatmata ? `<button class="btn" id="sendAll" style="width:100%;margin-top:10px">${ico('yles')}Saada Meritisse saatmata tšekid (${saatmata})</button>` : ''}
    <div style="margin-top:12px">
    ${items.length ? items.map((k) => `
      <a class="entry kulu" href="#/kulud/k/${k.id}">
        <img src="${URL.createObjectURL(k.pilt)}" alt="">
        <div style="flex:1;min-width:0">
          <div class="entry-top"><b>${esc(k.myyja) || 'Tundmatu'}</b><span>${eur(db.total(k))}</span></div>
          <div class="entry-sub">${kp(k.kuupaev)}${k.objekt ? ' · ' + esc(k.objekt) : ''} · ${k.makseviis === 'isiklik' ? 'oma raha' : 'firma kaart'}</div>
          <div style="margin-top:6px">${status(k)}</div>
        </div>
      </a>`).join('') : '<p class="note">Selle kuu tšekke pole.</p>'}
    </div>
    ${items.length ? `<button class="btn" id="csv" style="width:100%;margin-top:6px">${ico('alla')}Kuu nimekiri (CSV / Excel)</button>` : ''}`;

  const $ = (q) => el.querySelector('#' + q);
  const pick = async (input) => {
    const f = input.files[0]; if (!f) return;
    const scanned = await scan(f);
    const { blob, w, h } = await compress(scanned);
    pending = { pilt: blob, w, h };
    location.hash = '#/kulud/uus';
  };
  $('cam').onchange = () => pick($('cam'));
  $('gal').onchange = () => pick($('gal'));
  const shift = (d) => { const t = new Date(y, m - 1 + d, 1); month = paevik.iso(t).slice(0, 7); list(el); };
  $('prev').onclick = () => shift(-1);
  $('next').onclick = () => shift(1);
  if ($('sendAll')) $('sendAll').onclick = async () => {
    const b = $('sendAll'); b.disabled = true;
    let ok = 0, bad = 0;
    for (const k of items.filter((x) => x.merit !== 'ok')) {
      b.textContent = `Saadan… ${ok + bad + 1}/${saatmata}`;
      try { await sendMerit(k); ok++; } catch { bad++; }
    }
    alert(`Saadetud: ${ok}${bad ? `, ebaõnnestus: ${bad} (ava tšekk, et viga näha)` : ''}`);
    list(el);
  };
  if ($('csv')) $('csv').onclick = () => {
    const rows = [['Kuupäev', 'Müüja', 'Reg.kood', 'KMKR', 'Kirjeldus', 'Objekt', 'Makseviis', 'Summa', 'KM', 'Meritis']];
    items.forEach((k) => rows.push([k.kuupaev, k.myyja, k.regkood, k.kmkr, k.kirjeldus, k.objekt, k.makseviis === 'isiklik' ? 'oma raha' : 'firma kaart',
      db.total(k).toFixed(2).replace('.', ','), db.kmTotal(k).toFixed(2).replace('.', ','), k.merit === 'ok' ? 'jah' : 'ei']));
    const text = '﻿' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = `kulud-${month}.csv`; a.click();
  };
}

async function sendMerit(k) {
  const pdf = await jpegToPdf(k.pilt, k.w, k.h);
  try {
    const res = await db.api('merit', { action: 'send', kulu: { ...k, pilt: undefined, failinimi: db.failinimi(k, 'pdf') }, pdf: await toBase64(pdf) });
    k.merit = 'ok'; k.meritViga = ''; k.meritId = res.result?.BillId || '';
  } catch (e) {
    k.merit = 'viga'; k.meritViga = e.message;
    await db.put(k);
    throw e;
  }
  await db.put(k);
}

// ---------- vorm ----------
async function vorm(el, id) {
  const old = id ? await db.get(id) : null;
  if (!old && !pending) { location.hash = '#/kulud'; return; }
  const k = old || {
    ...pending, kuupaev: paevik.today(), myyja: '', regkood: '', kmkr: '', tsekiNr: '', kirjeldus: '', riik: 'EE',
    objekt: paevik.objektid().slice(-1)[0] || '', makseviis: 'firma', read: [{ maar: 24, kokku: '', km: '' }], markus: '', merit: '',
  };
  pending = null;
  const imgUrl = URL.createObjectURL(k.pilt);

  el.innerHTML = `
    <a class="back" href="#/kulud">← Kulud</a>
    <h1>${old ? 'Tšekk' : 'Uus tšekk'}</h1>
    <img src="${imgUrl}" class="tsekk-pilt" id="pilt" alt="Tšekk">
    <p class="note" id="ocr"></p>
    ${k.merit === 'viga' ? `<p class="note" style="color:#ff7a7a">Meriti viga: ${esc(k.meritViga)}</p>` : ''}

    <div class="card">
      <label>Makstud</label>
      <div class="seg" id="mv"><button data-v="firma">${ico('kaart')}Firma kaardiga</button><button data-v="isiklik">${ico('rahakott')}Oma rahaga</button></div>
      <label>Müüja</label><input id="myyja" value="${esc(k.myyja)}" placeholder="nt Bauhof Group AS">
      <div class="row">
        <div><label>Kuupäev</label><input type="date" id="kuupaev" value="${k.kuupaev}"></div>
        <div><label>Tšeki nr</label><input id="tsekiNr" value="${esc(k.tsekiNr)}"></div>
      </div>
      <div class="row">
        <div><label>Reg. kood</label><input id="regkood" inputmode="numeric" value="${esc(k.regkood)}"></div>
        <div><label>KMKR</label><input id="kmkr" value="${esc(k.kmkr)}"></div>
      </div>
      <label>Mida osteti</label><input id="kirjeldus" value="${esc(k.kirjeldus)}" placeholder="nt Plaatimisliim, krunt">
      <label>Objekt</label>
      <input id="objekt" list="objList" value="${esc(k.objekt)}">
      <datalist id="objList">${paevik.objektid().map((o) => `<option value="${esc(o)}">`).join('')}</datalist>
    </div>

    <h2>Summa</h2>
    <div class="card">
      <div class="km-head"><span>KM %</span><span>Summa koos KM</span><span>sh KM</span><span></span></div>
      <div id="read"></div>
      <button class="btn small" id="addRow">+ Teine KM määr</button>
    </div>
    <div class="result" id="tot"></div>

    <div class="actions">
      <button class="btn primary" id="save">${k.merit === 'ok' ? 'Salvesta' : 'Salvesta ja saada Meritisse'}</button>
    </div>
    <div class="actions" style="margin-top:8px">
      <button class="btn" id="drive">${ico('jaga')}Pilt Drive'i</button>
      ${old ? '<button class="btn danger" id="del">Kustuta</button>' : ''}
    </div>
    <p class="note" id="msg">${k.merit === 'ok' ? '✓ Tšekk on Meritis kinnitamist ootamas.' : ''}</p>`;

  const $ = (q) => el.querySelector('#' + q);
  const fields = ['myyja', 'kuupaev', 'tsekiNr', 'regkood', 'kmkr', 'kirjeldus', 'objekt'];
  const setMv = (v) => { k.makseviis = v; el.querySelectorAll('#mv button').forEach((b) => b.classList.toggle('on', b.dataset.v === v)); };
  setMv(k.makseviis);
  el.querySelectorAll('#mv button').forEach((b) => (b.onclick = () => setMv(b.dataset.v)));

  const drawRows = () => {
    $('read').innerHTML = k.read.map((r, i) => `
      <div class="km-row" data-i="${i}">
        <select data-f="maar">${[24, 13, 9, 0].map((p) => `<option ${+r.maar === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
        <input data-f="kokku" inputmode="decimal" placeholder="0,00" value="${esc(String(r.kokku).replace('.', ','))}">
        <input data-f="km" inputmode="decimal" placeholder="auto" value="${esc(String(r.km ?? '').replace('.', ','))}">
        <button class="btn x" data-del="${i}" ${k.read.length < 2 ? 'disabled' : ''}>✕</button>
      </div>`).join('');
    $('read').querySelectorAll('[data-f]').forEach((inp) => inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', () => {
      k.read[inp.closest('.km-row').dataset.i][inp.dataset.f] = inp.value; tot();
    }));
    $('read').querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { k.read.splice(+b.dataset.del, 1); drawRows(); tot(); }));
  };
  const tot = () => {
    $('tot').innerHTML = `<div class="line"><span>Käibemaks</span><b>${eur(db.kmTotal(k))}</b></div>
      <div class="line big"><span>Kokku</span><b>${eur(db.total(k))}</b></div>`;
  };
  const collect = () => { fields.forEach((f) => (k[f] = $(f).value.trim())); };
  const fill = (o) => {
    fields.forEach((f) => { if (o[f] != null && o[f] !== '') $(f).value = o[f]; });
    if (o.riik) k.riik = o.riik;
    const f2 = (v) => (v === '' || v == null || isNaN(+v) ? '' : (+v).toFixed(2));
    if (Array.isArray(o.km) && o.km.length) k.read = o.km.map((x) => ({ maar: x.maar, kokku: f2(x.kokku), km: f2(x.km) }));
    else if (o.kokku) k.read = [{ maar: 24, kokku: f2(o.kokku), km: '' }];
    drawRows(); tot();
  };

  $('addRow').onclick = () => { k.read.push({ maar: 13, kokku: '', km: '' }); drawRows(); };
  $('drive').onclick = async () => {
    collect();
    const res = await shareFile(k.pilt, db.failinimi(k, 'jpg'));
    if (res === 'downloaded') $('msg').textContent = 'Pilt salvestati „Allalaaditud“ kausta.';
  };
  $('save').onclick = async () => {
    collect();
    if (!db.total(k)) return alert('Lisa summa');
    if (!k.myyja) return alert('Lisa müüja');
    const b = $('save'); b.disabled = true;
    await db.put(k);
    if (k.merit !== 'ok' && db.pin()) {
      b.textContent = 'Saadan Meritisse…';
      try { await sendMerit(k); } catch (e) { b.disabled = false; b.textContent = 'Proovi uuesti saata'; $('msg').innerHTML = `<span style="color:#ff7a7a">Salvestatud, aga Meritisse saatmine ebaõnnestus: ${esc(e.message)}</span>`; return; }
    }
    location.hash = '#/kulud';
  };
  if (old) $('del').onclick = async () => { if (confirm('Kustutan selle tšeki äpist? (Meritist see ei kustu)')) { await db.remove(k.id); location.hash = '#/kulud'; } };

  drawRows(); tot();

  // automaatne lugemine uue tšeki puhul
  if (!old && db.pin()) {
    $('ocr').innerHTML = `${ico('otsi')}Loen tšekki…`;
    try {
      const o = await db.api('loe-tsekk', { image: await toBase64(k.pilt) });
      fill(o);
      $('ocr').textContent = '✓ Tšekk loetud. Kontrolli andmed üle.';
    } catch (e) {
      $('ocr').textContent = 'Automaatne lugemine ei õnnestunud (' + e.message + '). Täida käsitsi.';
    }
  } else if (!old) {
    $('ocr').textContent = 'Täida andmed käsitsi (automaatseks lugemiseks lisa seadetes PIN).';
  }
}

export default {
  id: 'kulud',
  icon: 'kaamera',
  title: 'Kulud ja tšekid',
  desc: 'Pildista → Merit + Drive',
  render(el, rest = []) {
    if (rest[0] === 'uus') return vorm(el, null);
    if (rest[0] === 'k') return vorm(el, rest[1]);
    list(el);
  },
};
