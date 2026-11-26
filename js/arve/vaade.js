// Arve / pakkumise vaade: valge A4 leht, prinditav ja PDF-iks salvestatav
import * as db from './store.js';
import { firma } from '../calc/seaded.js';
import { eur, num } from '../util.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const kp = (d) => (d ? d.split('-').reverse().join('.') : '');

export default function vaade(el, id) {
  const d = db.get(id);
  if (!d) { el.innerHTML = '<p class="note">Dokumenti ei leitud.</p><a class="btn" href="#/arve">Tagasi</a>'; return; }
  const f = firma();
  const x = db.totals(d);
  const isArve = d.tyyp === 'arve';
  const title = isArve ? 'ARVE' : 'HINNAPAKKUMINE';

  el.innerHTML = `
    <div class="no-print">
      <a class="back" href="#/arve">← Arved ja pakkumised</a>
      <div class="actions" style="margin:6px 0 14px">
        <button class="btn primary" id="print">🖨 PDF / Prindi</button>
        <a class="btn" href="#/arve/muuda/${d.id}">✎ Muuda</a>
      </div>
      <div class="actions" style="margin:0 0 14px">
        ${isArve
          ? `<button class="btn" id="paid">${d.makstud ? '↺ Märgi maksmata' : '✓ Märgi makstuks'}</button>`
          : `<button class="btn" id="toArve">→ Tee sellest arve</button>`}
        ${d.klient.email ? `<a class="btn" id="mail" href="mailto:${encodeURIComponent(d.klient.email)}?subject=${encodeURIComponent(`${isArve ? 'Arve' : 'Hinnapakkumine'} ${d.nr} – ${f.nimi}`)}&body=${encodeURIComponent(`Tere!\n\nSaadan ${isArve ? 'arve' : 'hinnapakkumise'} nr ${d.nr} (manuses).\n\nLugupidamisega\n${f.nimi}\n${f.telefon}`)}">✉ E-kiri</a>` : ''}
      </div>
      <p class="note" style="margin-top:0">PDF: vajuta „PDF / Prindi“ ja vali printeriks <b>Salvesta PDF-ina</b>.</p>
    </div>

    <div class="doc">
      <div class="doc-head">
        <img src="img/logo-header.png" alt="${esc(f.nimi)}" class="doc-logo">
        <div class="doc-title">
          <div class="t">${title}</div>
          <div>Nr <b>${esc(d.nr)}</b></div>
          <div>Kuupäev: ${kp(d.kuupaev)}</div>
          <div>${isArve ? 'Maksetähtaeg' : 'Kehtib kuni'}: ${kp(d.tahtaeg)}</div>
        </div>
      </div>

      <div class="doc-parties">
        <div>
          <div class="lbl">${isArve ? 'Maksja' : 'Klient'}</div>
          <b>${esc(d.klient.nimi)}</b>
          ${d.klient.kood ? `<div>${esc(d.klient.kood)}</div>` : ''}
          ${d.klient.aadress ? `<div>${esc(d.klient.aadress)}</div>` : ''}
          ${d.klient.email ? `<div>${esc(d.klient.email)}</div>` : ''}
        </div>
        <div>
          <div class="lbl">${isArve ? 'Müüja' : 'Pakkuja'}</div>
          <b>${esc(f.nimi)}</b>
          ${f.regkood ? `<div>Reg. kood ${esc(f.regkood)}</div>` : ''}
          ${f.kmkr ? `<div>KMKR ${esc(f.kmkr)}</div>` : ''}
          ${f.aadress ? `<div>${esc(f.aadress)}</div>` : ''}
        </div>
      </div>
      ${d.objekt ? `<div class="doc-obj"><span class="lbl">Objekt:</span> ${esc(d.objekt)}</div>` : ''}

      <table class="doc-table">
        <thead><tr><th>Kirjeldus</th><th class="r">Kogus</th><th>Ühik</th><th class="r">Hind</th><th class="r">Summa</th></tr></thead>
        <tbody>
          ${x.read.map((r) => `<tr><td>${esc(r.kirjeldus)}</td><td class="r">${num(db.n(r.kogus))}</td><td>${esc(r.yhik)}</td><td class="r">${eur(db.n(r.hind))}</td><td class="r">${eur(r.summa)}</td></tr>`).join('')}
        </tbody>
      </table>

      <div class="doc-totals">
        <div><span>Summa käibemaksuta</span><b>${eur(x.neto)}</b></div>
        <div><span>Käibemaks ${esc(d.km)}%</span><b>${eur(x.km)}</b></div>
        <div class="grand"><span>${isArve ? 'Tasuda kokku' : 'Kokku'}</span><b>${eur(x.kokku)}</b></div>
      </div>

      ${d.markus ? `<div class="doc-note">${esc(d.markus).replace(/\n/g, '<br>')}</div>` : ''}
      ${isArve ? `<div class="doc-pay">Palume tasuda hiljemalt <b>${kp(d.tahtaeg)}</b> arvelduskontole <b>${esc(f.iban)}</b>${f.pank ? ` (${esc(f.pank)})` : ''}. Selgitusse märkige arve number <b>${esc(d.nr)}</b>.</div>` : ''}

      <div class="doc-foot">
        <span>${esc(f.nimi)}</span>
        ${f.regkood ? `<span>Reg. kood ${esc(f.regkood)}</span>` : ''}
        ${f.kmkr ? `<span>KMKR ${esc(f.kmkr)}</span>` : ''}
        ${f.iban ? `<span>${esc(f.iban)}</span>` : ''}
        ${f.telefon ? `<span>${esc(f.telefon)}</span>` : ''}
        ${f.email ? `<span>${esc(f.email)}</span>` : ''}
      </div>
    </div>`;

  const $ = (s) => el.querySelector('#' + s);
  $('print').onclick = () => {
    const old = document.title;
    document.title = `${isArve ? 'Arve' : 'Pakkumine'} ${d.nr} ${d.klient.nimi}`.replace(/[\\/:*?"<>|]/g, '');
    window.print();
    setTimeout(() => (document.title = old), 1000);
  };
  if (isArve) $('paid').onclick = () => { d.makstud = !d.makstud; db.upsert(d); vaade(el, id); };
  else $('toArve').onclick = () => {
    const t = new Date();
    const iso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    const due = new Date(t); due.setDate(due.getDate() + 14);
    const arve = {
      ...structuredClone(d), id: undefined, tyyp: 'arve', nr: db.nextNr('arve', iso), kuupaev: iso,
      tahtaeg: `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`,
      makstud: false, pakkumine: d.nr,
    };
    delete arve.arveks;
    db.upsert(arve);
    d.arveks = arve.nr; db.upsert(d);
    location.hash = '#/arve/muuda/' + arve.id;
  };
}
