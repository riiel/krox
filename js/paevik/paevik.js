// Tööpäevik: kuukalender, päeva kirjed, kuu kokkuvõte
import { ico } from '../icons.js';
import * as db from './store.js';
import { eur, num } from '../util.js';
import kirje from './kirje.js';
import { lastBackup } from '../backup.js';

const KUUD = ['jaanuar', 'veebruar', 'märts', 'aprill', 'mai', 'juuni', 'juuli', 'august', 'september', 'oktoober', 'november', 'detsember'];
let sel = db.today(); // valitud päev

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtDate = (d) => { const [y, m, dd] = d.split('-'); return `${+dd}. ${KUUD[+m - 1]}`; };

function entryCard(e) {
  const t = db.tunnid(e), s = db.summa(e);
  const read = e.read.filter((r) => r.too).map((r) => `${esc(r.too)} ${num(db.n(r.kogus))} ${esc(r.yhik)}`).join(', ');
  return `
    <a class="entry" href="#/paevik/kirje/${e.id}">
      <div class="entry-top"><b>${esc(e.objekt) || 'Objekt määramata'}</b><span>${t ? num(t) + ' h' : ''}</span></div>
      ${read ? `<div class="entry-sub">${read}</div>` : ''}
      ${e.markmed ? `<div class="entry-sub muted">${ico('pliiats')}${esc(e.markmed).slice(0, 80)}</div>` : ''}
      ${s ? `<div class="entry-sum">${eur(s)}</div>` : ''}
    </a>`;
}

function csv(ym, list) {
  const rows = [['Kuupäev', 'Objekt', 'Algus', 'Lõpp', 'Tunnid', 'Tunnihind', 'Töö', 'Kogus', 'Ühik', 'Hind', 'Rea summa', 'Märkmed']];
  const f = (x) => String(x ?? '').replace('.', ',');
  list.forEach((e) => {
    const base = [e.date, e.objekt, e.algus, e.lopp, f(e.tunnid), f(e.tunnihind)];
    const r = e.read.filter((x) => x.too);
    if (!r.length) rows.push([...base, '', '', '', '', '', e.markmed]);
    r.forEach((x, i) => rows.push([...(i ? ['', '', '', '', '', ''] : base), x.too, f(x.kogus), x.yhik, f(x.hind),
      f((db.n(x.kogus) * db.n(x.hind)).toFixed(2)), i ? '' : e.markmed]));
  });
  const text = '﻿' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  a.download = `toopaevik-${ym}.csv`;
  a.click();
}

function backupHint() {
  if (!db.all().length) return '';
  const lb = lastBackup();
  const days = lb ? Math.floor((Date.now() - new Date(lb).getTime()) / 864e5) : null;
  if (days !== null && days < 14) return `<p class="note">Viimane varukoopia: ${lb.split('-').reverse().join('.')}</p>`;
  return `<a class="card backup-hint" href="#/seaded">${ico('salvesta')}${lb ? `Viimane varukoopia ${days} päeva tagasi` : 'Varukoopiat pole veel tehtud'}, tee uus seadetes →</a>`;
}

function month(el) {
  const [y, m] = sel.split('-').map(Number);
  const ym = sel.slice(0, 7);
  const list = db.byMonth(ym);
  const perDay = {};
  list.forEach((e) => { (perDay[e.date] ??= []).push(e); });

  // kalendri ruudustik, nädal algab esmaspäevast
  const first = new Date(y, m - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(y, m, 0).getDate();
  const t = db.today();
  let cells = '<span></span>'.repeat(offset);
  for (let d = 1; d <= days; d++) {
    const ds = `${ym}-${String(d).padStart(2, '0')}`;
    const h = (perDay[ds] || []).reduce((s, e) => s + db.tunnid(e), 0);
    const has = perDay[ds]?.length;
    cells += `<button class="day${ds === sel ? ' sel' : ''}${ds === t ? ' today' : ''}${has ? ' has' : ''}" data-d="${ds}">
      <span>${d}</span>${has ? `<small>${h ? num(h, 1) + 'h' : '•'}</small>` : ''}</button>`;
  }

  // kokkuvõte objektide kaupa
  const obj = {};
  list.forEach((e) => {
    const k = e.objekt || 'Objekt määramata';
    obj[k] ??= { h: 0, s: 0, q: {} };
    obj[k].h += db.tunnid(e); obj[k].s += db.summa(e);
    e.read.filter((r) => r.too).forEach((r) => {
      const key = `${r.too} (${r.yhik || ''})`;
      obj[k].q[key] = (obj[k].q[key] || 0) + db.n(r.kogus);
    });
  });
  const totH = list.reduce((s, e) => s + db.tunnid(e), 0);
  const totS = list.reduce((s, e) => s + db.summa(e), 0);
  const dayList = perDay[sel] || [];

  el.innerHTML = `
    <div class="month-nav">
      <button class="btn" id="prev">‹</button>
      <b>${KUUD[m - 1]} ${y}</b>
      <button class="btn" id="next">›</button>
    </div>
    <div class="cal">
      ${['E', 'T', 'K', 'N', 'R', 'L', 'P'].map((d) => `<span class="dow">${d}</span>`).join('')}
      ${cells}
    </div>

    <div class="day-head"><h2>${fmtDate(sel)}</h2><a class="btn primary" href="#/paevik/kirje/uus?d=${sel}">+ Lisa</a></div>
    ${dayList.length ? dayList.map(entryCard).join('') : '<p class="note">Sel päeval kirjeid pole.</p>'}

    <h2>Kuu kokkuvõte</h2>
    <div class="result">
      <div class="line"><span>Tööpäevi</span><b>${Object.keys(perDay).length}</b></div>
      <div class="line"><span>Tunde kokku</span><b>${num(totH)} h</b></div>
      <div class="line big"><span>Summa kokku</span><b>${eur(totS)}</b></div>
    </div>
    ${Object.entries(obj).map(([k, o]) => `
      <div class="card obj">
        <div class="entry-top"><b>${esc(k)}</b><span>${eur(o.s)}</span></div>
        <div class="entry-sub">${o.h ? num(o.h) + ' h' : ''}${Object.entries(o.q).map(([q, v]) => ` · ${esc(q)}: ${num(v)}`).join('')}</div>
      </div>`).join('')}
    ${list.length ? `<button class="btn" id="csv" style="width:100%;margin-top:6px">${ico('alla')}Lae kuu alla (CSV / Excel)</button>` : ''}
    ${backupHint()}`;

  const shift = (k) => { const d = new Date(y, m - 1 + k, 1); sel = db.iso(d); month(el); };
  el.querySelector('#prev').onclick = () => shift(-1);
  el.querySelector('#next').onclick = () => shift(1);
  el.querySelectorAll('.day').forEach((b) => (b.onclick = () => { sel = b.dataset.d; month(el); }));
  const c = el.querySelector('#csv'); if (c) c.onclick = () => csv(ym, list);
}

export default {
  id: 'paevik',
  icon: 'paevik',
  title: 'Tööpäevik',
  desc: 'Tunnid, tükitöö, märkmed',
  render(el, rest = [], q = {}) {
    if (rest[0] === 'kirje') {
      return kirje(el, rest[1], q.d || sel, (date) => { sel = date; location.hash = '#/paevik'; });
    }
    month(el);
  },
};
