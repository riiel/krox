// Tööpäeviku kirje vorm
import * as db from './store.js';
import { eur } from '../util.js';

const YHIKUD = ['m²', 'jm', 'tk', 'h', 'kg', 'm³', 'kmpl'];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function hoursBetween(a, b, pausMin) {
  if (!a || !b) return '';
  const [ah, am] = a.split(':').map(Number), [bh, bm] = b.split(':').map(Number);
  let min = bh * 60 + bm - (ah * 60 + am);
  if (min < 0) min += 24 * 60; // üle südaöö
  min -= db.n(pausMin);
  return min > 0 ? String(Math.round((min / 60) * 100) / 100).replace('.', ',') : '';
}

export default function kirje(el, id, date, done) {
  const old = id && id !== 'uus' ? db.get(id) : null;
  const e = old ? structuredClone(old) : {
    date, objekt: db.objektid().slice(-1)[0] || '', algus: '08:00', lopp: '16:30', paus: '30', tunnid: '', tunnihind: '',
    read: [], markmed: '',
  };
  if (!old) e.tunnid = hoursBetween(e.algus, e.lopp, e.paus);
  const tood = db.tood();

  el.innerHTML = `
    <a class="back" href="#/paevik">← Tööpäevik</a>
    <h1>${old ? 'Muuda kirjet' : 'Uus kirje'}</h1>
    <div class="card">
      <label>Kuupäev</label><input type="date" id="date" value="${e.date}">
      <label>Objekt</label>
      <input id="objekt" list="objList" placeholder="nt Tamme 5 vannituba" value="${esc(e.objekt)}">
      <datalist id="objList">${db.objektid().map((o) => `<option value="${esc(o)}">`).join('')}</datalist>
    </div>

    <h2>Tunnid</h2>
    <div class="card">
      <div class="row3 time-row">
        <div><label>Algus</label><input type="time" id="algus" value="${e.algus}"></div>
        <div><label>Lõpp</label><input type="time" id="lopp" value="${e.lopp}"></div>
        <div><label>Paus min</label><input id="paus" inputmode="numeric" value="${e.paus}"></div>
      </div>
      <div class="row">
        <div><label>Tunnid</label><input id="tunnid" inputmode="decimal" value="${e.tunnid}"></div>
        <div><label>Tunnihind € (kui tunnitöö)</label><input id="tunnihind" inputmode="decimal" value="${e.tunnihind}"></div>
      </div>
    </div>

    <h2>Tükitöö</h2>
    <div class="card">
      <datalist id="tooList">${Object.keys(tood).map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
      <div id="read"></div>
      <button class="btn small" id="addRow">+ Lisa töö</button>
    </div>

    <h2>Märkmed</h2>
    <div class="card"><textarea id="markmed" rows="4" placeholder="Mis tehti, mis jäi pooleli, mida osta…">${esc(e.markmed)}</textarea></div>

    <div class="result"><div class="line big"><span>Päeva summa</span><b id="sum"></b></div></div>
    <div class="actions">
      <button class="btn primary" id="save">Salvesta</button>
      ${old ? '<button class="btn danger" id="del">Kustuta</button>' : ''}
    </div>`;

  const $ = (x) => el.querySelector('#' + x);

  const drawRows = () => {
    $('read').innerHTML = e.read.map((r, i) => `
      <div class="work" data-i="${i}">
        <input data-f="too" list="tooList" placeholder="Töö, nt plaatimine" value="${esc(r.too)}">
        <div class="work-row">
          <input data-f="kogus" inputmode="decimal" placeholder="Kogus" value="${esc(r.kogus)}">
          <select data-f="yhik">${YHIKUD.map((u) => `<option ${u === r.yhik ? 'selected' : ''}>${u}</option>`).join('')}</select>
          <input data-f="hind" inputmode="decimal" placeholder="€/ühik" value="${esc(r.hind)}">
          <button class="btn x" data-del="${i}" aria-label="Eemalda">✕</button>
        </div>
      </div>`).join('');
    $('read').querySelectorAll('[data-f]').forEach((inp) => {
      inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', () => {
        const r = e.read[inp.closest('.work').dataset.i];
        r[inp.dataset.f] = inp.value;
        // tuttav töö -> täida ühik ja hind
        if (inp.dataset.f === 'too' && tood[inp.value]) {
          const t = tood[inp.value];
          if (!r.hind) r.hind = t.hind;
          r.yhik = t.yhik || r.yhik;
          drawRows();
          el.querySelector(`.work[data-i="${e.read.indexOf(r)}"] [data-f="kogus"]`)?.focus();
        }
        sum();
      });
    });
    $('read').querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { e.read.splice(+b.dataset.del, 1); drawRows(); sum(); }));
  };

  const collect = () => {
    ['date', 'objekt', 'algus', 'lopp', 'paus', 'tunnid', 'tunnihind', 'markmed'].forEach((k) => (e[k] = $(k).value.trim?.() ?? $(k).value));
  };
  const sum = () => { collect(); $('sum').textContent = eur(db.summa(e)); };

  ['algus', 'lopp', 'paus'].forEach((k) => $(k).addEventListener('input', () => {
    $('tunnid').value = hoursBetween($('algus').value, $('lopp').value, $('paus').value); sum();
  }));
  ['tunnid', 'tunnihind'].forEach((k) => $(k).addEventListener('input', sum));
  $('addRow').onclick = () => { e.read.push({ too: '', kogus: '', yhik: 'm²', hind: '' }); drawRows(); el.querySelector('.work:last-child input')?.focus(); };
  $('save').onclick = () => {
    collect();
    if (!e.date) return alert('Vali kuupäev');
    e.read = e.read.filter((r) => r.too || r.kogus);
    db.upsert(e);
    done(e.date);
  };
  if (old) $('del').onclick = () => { if (confirm('Kustutan selle kirje?')) { db.remove(e.id); done(e.date); } };

  drawRows();
  sum();
}
