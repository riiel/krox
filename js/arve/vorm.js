// Arve / pakkumise vorm
import * as db from './store.js';
import * as paevik from '../paevik/store.js';
import { eur, rates } from '../util.js';
import { firma } from '../calc/seaded.js';

const YHIKUD = ['m²', 'jm', 'tk', 'h', 'kg', 'm³', 'kmpl'];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const addDays = (iso, d) => { const x = new Date(iso + 'T12:00'); x.setDate(x.getDate() + d); return paevik.iso(x); };
const num = (x) => String(Math.round(x * 100) / 100).replace('.', ',');
const KM_MARKED = [
  'Pöördmaksustamine / Reverse charge',
  'Käibe tekkimise koht ei ole Eesti (KMS § 10 lg 4 p 1) / Place of supply outside Estonia',
  'Intra-Community 0% supply, Art. 138 Dir. 2006/112/EU',
];

export default function vorm(el, id, q) {
  const old = id ? db.get(id) : null;
  const tyyp = old?.tyyp || q.t || 'arve';
  const t = paevik.today();
  const f = firma();
  const payDays = parseInt(f.tahtaeg) || 7;
  const d = old ? structuredClone(old) : {
    tyyp, nr: db.nextNr(tyyp, t, f.viimaneArve), kuupaev: t, keel: 'et', kmMarge: '',
    tahtaeg: addDays(t, tyyp === 'arve' ? payDays : 30),
    klient: { nimi: '', kood: '', aadress: '', email: '' },
    objekt: '', read: [{ kirjeldus: '', kogus: '', yhik: 'm²', hind: '' }],
    km: String(rates().km), markus: '', makstud: false,
  };
  const isArve = d.tyyp === 'arve';
  const kliendid = db.kliendid();
  const tood = paevik.tood();

  el.innerHTML = `
    <a class="back" href="#/arve">← Arved ja pakkumised</a>
    <h1>${old ? 'Muuda' : 'Uus'} ${isArve ? 'arve' : 'pakkumine'}</h1>
    <div class="card">
      <div class="row">
        <div><label>Number</label><input id="nr" value="${esc(d.nr)}"></div>
        <div><label>Kuupäev</label><input type="date" id="kuupaev" value="${d.kuupaev}"></div>
      </div>
      <div class="row">
        <div><label>${isArve ? 'Maksetähtaeg' : 'Kehtib kuni'}</label><input type="date" id="tahtaeg" value="${d.tahtaeg}"></div>
        <div><label>Arve keel</label><select id="keel"><option value="et">Eesti</option><option value="en">English</option></select></div>
      </div>
    </div>

    <h2>Klient</h2>
    <div class="card">
      <label>Nimi</label>
      <input id="k_nimi" list="kList" placeholder="Ettevõte või eraisik" value="${esc(d.klient.nimi)}">
      <datalist id="kList">${Object.keys(kliendid).map((k) => `<option value="${esc(k)}">`).join('')}</datalist>
      <label>KMKR nr või registrikood (ettevõttel)</label><input id="k_kood" placeholder="nt FI28827624" value="${esc(d.klient.kood)}">
      <label>Aadress (võib mitmel real)</label><textarea id="k_aadress" rows="3">${esc(d.klient.aadress)}</textarea>
      <label>E-post</label><input id="k_email" type="email" value="${esc(d.klient.email)}">
    </div>

    <h2>Tööd</h2>
    <div class="card">
      <label>Objekt</label>
      <input id="objekt" list="objList" placeholder="nt Tamme 5 vannituba" value="${esc(d.objekt)}">
      <datalist id="objList">${paevik.objektid().map((o) => `<option value="${esc(o)}">`).join('')}</datalist>
      <button class="btn small" id="impBtn" style="margin-top:12px">📒 Too read tööpäevikust</button>
      <div id="imp" class="imp" hidden>
        <div class="row">
          <div><label>Alates</label><input type="date" id="i_from" value="${t.slice(0, 8)}01"></div>
          <div><label>Kuni</label><input type="date" id="i_to" value="${t}"></div>
        </div>
        <label class="check"><input type="checkbox" id="i_h" checked> Lisa ka tunnitöö (kui tunnihind on märgitud)</label>
        <button class="btn primary small" id="impGo" style="margin-top:10px">Lisa read</button>
        <p class="note" id="impMsg"></p>
      </div>
      <datalist id="tooList">${Object.keys(tood).map((x) => `<option value="${esc(x)}">`).join('')}</datalist>
      <div id="read" style="margin-top:14px"></div>
      <button class="btn small" id="addRow">+ Lisa rida</button>
    </div>

    <div class="card">
      <label>Käibemaks</label>
      <div class="seg" id="kmSeg">
        <button data-v="${rates().km}">${rates().km}% (Eesti)</button>
        <button data-v="0">0% (välismaa / EL)</button>
        <button data-v="muu">Muu</button>
      </div>
      <div id="kmMuu" class="row" style="margin-top:8px"><div><label>Määr (%)</label><input id="km" inputmode="decimal" value="${esc(d.km)}"></div><div></div></div>
      <div id="kmMargeBox">
        <label>Käibemaksu märge arvel</label>
        <input id="kmMarge" list="kmList" value="${esc(d.kmMarge)}" placeholder="Vali või kirjuta">
        <datalist id="kmList">${KM_MARKED.map((m) => `<option value="${esc(m)}">`).join('')}</datalist>
        <p class="note">0% määra puhul peab arvel olema märge. Kui pole kindel, milline, küsi raamatupidajalt.</p>
      </div>
      <label>Märkus arvel</label>
      <textarea id="markus" rows="3" placeholder="nt Materjal kliendi poolt">${esc(d.markus)}</textarea>
    </div>

    <div class="result" id="tot"></div>
    <div class="actions">
      <button class="btn primary" id="save">Salvesta ja vaata</button>
      ${old ? '<button class="btn danger" id="del">Kustuta</button>' : ''}
    </div>`;

  const $ = (x) => el.querySelector('#' + x);

  const drawRows = () => {
    $('read').innerHTML = d.read.map((r, i) => `
      <div class="work" data-i="${i}">
        <input data-f="kirjeldus" list="tooList" placeholder="Kirjeldus, nt Seinte plaatimine" value="${esc(r.kirjeldus)}">
        <div class="work-row">
          <input data-f="kogus" inputmode="decimal" placeholder="Kogus" value="${esc(r.kogus)}">
          <select data-f="yhik">${YHIKUD.map((u) => `<option ${u === r.yhik ? 'selected' : ''}>${u}</option>`).join('')}</select>
          <input data-f="hind" inputmode="decimal" placeholder="€/ühik" value="${esc(r.hind)}">
          <button class="btn x" data-del="${i}" aria-label="Eemalda">✕</button>
        </div>
      </div>`).join('');
    $('read').querySelectorAll('[data-f]').forEach((inp) => inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', () => {
      const r = d.read[inp.closest('.work').dataset.i];
      r[inp.dataset.f] = inp.value;
      if (inp.dataset.f === 'kirjeldus' && tood[inp.value]) {
        if (!r.hind) r.hind = tood[inp.value].hind;
        r.yhik = tood[inp.value].yhik || r.yhik;
        drawRows();
      }
      tot();
    }));
    $('read').querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { d.read.splice(+b.dataset.del, 1); drawRows(); tot(); }));
  };

  const collect = () => {
    d.nr = $('nr').value.trim(); d.kuupaev = $('kuupaev').value; d.tahtaeg = $('tahtaeg').value;
    d.klient = { nimi: $('k_nimi').value.trim(), kood: $('k_kood').value.trim(), aadress: $('k_aadress').value.trim(), email: $('k_email').value.trim() };
    d.objekt = $('objekt').value.trim(); d.km = $('km').value; d.markus = $('markus').value.trim();
    d.keel = $('keel').value; d.kmMarge = $('kmMarge').value.trim();
  };
  const tot = () => {
    collect();
    const x = db.totals(d);
    $('tot').innerHTML = `
      <div class="line"><span>Summa käibemaksuta</span><b>${eur(x.neto)}</b></div>
      <div class="line"><span>Käibemaks ${esc(d.km)}%</span><b>${eur(x.km)}</b></div>
      <div class="line big"><span>Kokku</span><b>${eur(x.kokku)}</b></div>`;
  };

  // klient valitud nimekirjast -> täida ülejäänud
  $('k_nimi').addEventListener('change', () => {
    const k = kliendid[$('k_nimi').value];
    if (k) { $('k_kood').value = k.kood || ''; $('k_aadress').value = k.aadress || ''; $('k_email').value = k.email || ''; }
  });
  $('kuupaev').addEventListener('change', () => {
    if (!old) $('tahtaeg').value = addDays($('kuupaev').value, isArve ? payDays : 30);
  });
  $('keel').value = d.keel || 'et';

  // käibemaksu valik
  const kmUI = () => {
    const v = db.n($('km').value);
    const preset = v === db.n(rates().km) ? String(rates().km) : v === 0 ? '0' : 'muu';
    el.querySelectorAll('#kmSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === preset));
    $('kmMuu').style.display = preset === 'muu' ? '' : 'none';
    $('kmMargeBox').style.display = v === 0 ? '' : 'none';
  };
  el.querySelectorAll('#kmSeg button').forEach((b) => (b.onclick = () => {
    if (b.dataset.v !== 'muu') $('km').value = b.dataset.v;
    if (b.dataset.v === '0' && !$('kmMarge').value) $('kmMarge').value = KM_MARKED[0];
    kmUI();
    if (b.dataset.v === 'muu') { $('kmMuu').style.display = ''; $('km').focus(); }
    tot();
  }));
  $('km').addEventListener('input', kmUI);

  // import tööpäevikust
  $('impBtn').onclick = () => { $('imp').hidden = !$('imp').hidden; };
  $('impGo').onclick = () => {
    const obj = $('objekt').value.trim();
    const from = $('i_from').value, to = $('i_to').value;
    const entries = paevik.all().filter((e) => e.date >= from && e.date <= to && (!obj || e.objekt === obj));
    if (!entries.length) { $('impMsg').textContent = 'Selle objekti ja ajavahemiku kohta kirjeid ei leitud.'; return; }
    const agg = {};
    entries.forEach((e) => {
      e.read.filter((r) => r.too).forEach((r) => {
        const k = `${r.too}|${r.yhik}|${r.hind}`;
        agg[k] ??= { kirjeldus: r.too, yhik: r.yhik, hind: r.hind, kogus: 0 };
        agg[k].kogus += paevik.n(r.kogus);
      });
      if ($('i_h').checked && paevik.n(e.tunnihind) && paevik.n(e.tunnid)) {
        const k = `tund|${e.tunnihind}`;
        agg[k] ??= { kirjeldus: 'Tunnitöö', yhik: 'h', hind: e.tunnihind, kogus: 0 };
        agg[k].kogus += paevik.n(e.tunnid);
      }
    });
    const rows = Object.values(agg).map((r) => ({ ...r, kogus: num(r.kogus) }));
    d.read = d.read.filter((r) => r.kirjeldus || r.kogus).concat(rows);
    drawRows(); tot();
    $('impMsg').textContent = `Lisatud ${rows.length} rida ${entries.length} tööpäeva põhjal.`;
  };

  $('addRow').onclick = () => { d.read.push({ kirjeldus: '', kogus: '', yhik: 'm²', hind: '' }); drawRows(); };
  ['nr', 'km', 'k_nimi', 'objekt', 'markus'].forEach((x) => $(x).addEventListener('input', tot));
  $('save').onclick = () => {
    collect();
    d.read = d.read.filter((r) => r.kirjeldus || r.kogus);
    if (!d.nr) return alert('Lisa number');
    if (!d.klient.nimi) return alert('Lisa kliendi nimi');
    if (!d.read.length) return alert('Lisa vähemalt üks rida');
    db.upsert(d);
    location.hash = '#/arve/vaade/' + d.id;
  };
  if (old) $('del').onclick = () => { if (confirm('Kustutan selle dokumendi?')) { db.remove(d.id); location.hash = '#/arve'; } };

  drawRows();
  kmUI();
  tot();
}
