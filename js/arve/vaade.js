// Arve / pakkumise vaade: valge A4 leht, prinditav ja PDF-iks salvestatav (eesti / inglise keel)
import * as db from './store.js';
import { firma } from '../calc/seaded.js';
import { eur, num } from '../util.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const kp = (d) => (d ? d.split('-').reverse().join('.') : '');
const br = (s) => esc(s).replace(/\n/g, '<br>');
const iso = (t) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;

const L = {
  et: {
    arve: 'ARVE', pakkumine: 'HINNAPAKKUMINE', nr: 'Arve nr', pnr: 'Pakkumine nr', kuupaev: 'Kuupäev',
    tahtaeg: 'Maksetähtpäev', kehtib: 'Kehtib kuni', viide: 'Viitenumber', viivis: 'Viivis',
    saaja: 'Arve saaja', klient: 'Klient', objekt: 'Objekt', kmkr: 'KMKR nr', reg: 'Reg-kood',
    kirjeldus: 'Kirjeldus', kogus: 'Kogus', yhik: 'Ühik', hind: 'Hind', summa: 'Summa km-ta',
    neto: 'Summa km-ta', km: 'Käibemaks', kokku: 'Arve kokku (EUR)', pkokku: 'Kokku (EUR)',
    maksa: (f, d, v) => `Palume tasuda hiljemalt <b>${kp(d.tahtaeg)}</b> arvelduskontole <b>${esc(f.iban)}</b>${f.pank ? ` (${esc(f.pank)})` : ''}, viitenumber <b>${v}</b>.`,
    mobiil: 'Mobiil', epost: 'E-post',
  },
  en: {
    arve: 'INVOICE', pakkumine: 'QUOTATION', nr: 'Invoice no', pnr: 'Quotation no', kuupaev: 'Date',
    tahtaeg: 'Due date', kehtib: 'Valid until', viide: 'Reference no', viivis: 'Late interest',
    saaja: 'Bill to', klient: 'Customer', objekt: 'Site', kmkr: 'VAT no', reg: 'Reg. code',
    kirjeldus: 'Description', kogus: 'Qty', yhik: 'Unit', hind: 'Price', summa: 'Amount excl. VAT',
    neto: 'Total excl. VAT', km: 'VAT', kokku: 'Invoice total (EUR)', pkokku: 'Total (EUR)',
    maksa: (f, d, v) => `Please pay by <b>${kp(d.tahtaeg)}</b> to account <b>${esc(f.iban)}</b>${f.swift ? ` (SWIFT ${esc(f.swift)})` : ''}, reference no <b>${v}</b>.`,
    mobiil: 'Mobile', epost: 'E-mail',
  },
};
const viivisEn = (s) => String(s || '').replace('päevas', 'per day');

export default function vaade(el, id) {
  const d = db.get(id);
  if (!d) { el.innerHTML = '<p class="note">Dokumenti ei leitud.</p><a class="btn" href="#/arve">Tagasi</a>'; return; }
  const f = firma();
  const x = db.totals(d);
  const isArve = d.tyyp === 'arve';
  const t = L[d.keel] || L.et;
  const en = d.keel === 'en';
  const viide = isArve ? db.viitenumber(d.nr) : '';
  const kood = d.klient.kood ? (/^[A-Z]{2}/i.test(d.klient.kood) ? `${t.kmkr} ${esc(d.klient.kood)}` : `${t.reg} ${esc(d.klient.kood)}`) : '';

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
        ${d.klient.email ? `<a class="btn" href="mailto:${encodeURIComponent(d.klient.email)}?subject=${encodeURIComponent(`${en ? (isArve ? 'Invoice' : 'Quotation') : (isArve ? 'Arve' : 'Hinnapakkumine')} ${d.nr} – ${f.nimi}`)}&body=${encodeURIComponent(en
          ? `Hello,\n\nPlease find attached ${isArve ? 'invoice' : 'quotation'} no ${d.nr}.\n\nBest regards\n${f.nimi}\n${f.telefon}`
          : `Tere!\n\nSaadan ${isArve ? 'arve' : 'hinnapakkumise'} nr ${d.nr} (manuses).\n\nLugupidamisega\n${f.nimi}\n${f.telefon}`)}">✉ E-kiri</a>` : ''}
      </div>
      <p class="note" style="margin-top:0">PDF: vajuta „PDF / Prindi“ ja vali printeriks <b>Salvesta PDF-ina</b>.</p>
    </div>

    <div class="doc">
      <div class="doc-head">
        <img src="img/logo-header.png" alt="${esc(f.nimi)}" class="doc-logo">
        <div class="doc-title"><div class="t">${isArve ? t.arve : t.pakkumine}</div></div>
      </div>

      <div class="doc-parties">
        <div>
          <div class="lbl">${isArve ? t.saaja : t.klient}</div>
          <b>${esc(d.klient.nimi)}</b>
          ${d.klient.aadress ? `<div>${br(d.klient.aadress)}</div>` : ''}
          ${kood ? `<div style="margin-top:6px">${kood}</div>` : ''}
          ${d.klient.email ? `<div>${esc(d.klient.email)}</div>` : ''}
        </div>
        <div class="doc-meta">
          <div class="nr">${isArve ? t.nr : t.pnr} <b>${esc(d.nr)}</b></div>
          <div><span>${t.kuupaev}</span><span>${kp(d.kuupaev)}</span></div>
          <div><span>${isArve ? t.tahtaeg : t.kehtib}</span><span>${kp(d.tahtaeg)}</span></div>
          ${isArve ? `<div><span>${t.viide}</span><span>${viide}</span></div>` : ''}
          ${isArve && f.viivis ? `<div><span>${t.viivis}</span><span>${esc(en ? viivisEn(f.viivis) : f.viivis)}</span></div>` : ''}
        </div>
      </div>
      <div class="doc-seller">
        <b>${esc(f.nimi)}</b>
        ${f.aadress ? `<div>${esc(f.aadress)}${en ? ', Estonia' : ''}</div>` : ''}
        <div>${f.regkood ? `${t.reg} ${esc(f.regkood)}` : ''}${f.kmkr ? ` · ${t.kmkr} ${esc(f.kmkr)}` : ''}</div>
      </div>
      ${d.objekt ? `<div class="doc-obj"><span class="lbl">${t.objekt}:</span> ${esc(d.objekt)}</div>` : ''}

      <table class="doc-table">
        <thead><tr><th>${t.kirjeldus}</th><th class="r">${t.kogus}</th><th>${t.yhik}</th><th class="r">${t.hind}</th><th class="r">${t.summa}</th></tr></thead>
        <tbody>
          ${x.read.map((r) => `<tr><td>${esc(r.kirjeldus)}</td><td class="r">${num(db.n(r.kogus))}</td><td>${esc(r.yhik)}</td><td class="r">${eur(db.n(r.hind))}</td><td class="r">${eur(r.summa)}</td></tr>`).join('')}
        </tbody>
      </table>

      <div class="doc-totals">
        <div><span>${t.neto} ${esc(d.km)}%</span><b>${eur(x.neto)}</b></div>
        <div><span>${t.km} ${esc(d.km)}%</span><b>${eur(x.km)}</b></div>
        <div class="grand"><span>${isArve ? t.kokku : t.pkokku}</span><b>${eur(x.kokku)}</b></div>
      </div>
      ${db.n(d.km) === 0 && d.kmMarge ? `<div class="doc-vat">${esc(d.kmMarge)}</div>` : ''}

      ${d.markus ? `<div class="doc-note">${br(d.markus)}</div>` : ''}
      ${isArve ? `<div class="doc-pay">${t.maksa(f, d, viide)}</div>` : ''}

      <div class="doc-foot">
        <div>${f.telefon ? `${t.mobiil} ${esc(f.telefon)}<br>` : ''}${f.email ? `${t.epost} ${esc(f.email)}` : ''}</div>
        <div class="r">${esc(f.pank)}${f.swift ? ` SWIFT ${esc(f.swift)}` : ''}<br>${f.iban ? `IBAN ${esc(f.iban)}` : ''}</div>
      </div>
    </div>`;

  const $ = (s) => el.querySelector('#' + s);
  $('print').onclick = () => {
    const old = document.title;
    document.title = `${f.nimi} ${isArve ? (en ? 'Invoice' : 'Arve') : (en ? 'Quotation' : 'Pakkumine')} nr ${d.nr}`.replace(/[\\/:*?"<>|]/g, '');
    window.print();
    setTimeout(() => (document.title = old), 1000);
  };
  if (isArve) $('paid').onclick = () => { d.makstud = !d.makstud; db.upsert(d); vaade(el, id); };
  else $('toArve').onclick = () => {
    const today = new Date();
    const due = new Date(today); due.setDate(due.getDate() + (parseInt(f.tahtaeg) || 7));
    const arve = {
      ...structuredClone(d), id: undefined, tyyp: 'arve', nr: db.nextNr('arve', iso(today), f.viimaneArve),
      kuupaev: iso(today), tahtaeg: iso(due), makstud: false, pakkumine: d.nr,
    };
    delete arve.arveks;
    db.upsert(arve);
    d.arveks = arve.nr; db.upsert(d);
    location.hash = '#/arve/muuda/' + arve.id;
  };
}
