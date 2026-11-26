// Arved ja pakkumised: nimekiri + alamlehed
import * as db from './store.js';
import { eur } from '../util.js';
import vorm from './vorm.js';
import vaade from './vaade.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const kp = (d) => (d ? d.split('-').reverse().join('.') : '');
let filter = 'koik';

function status(d) {
  if (d.tyyp === 'pakkumine') return d.arveks ? '<span class="tag">arveks tehtud</span>' : '<span class="tag">pakkumine</span>';
  if (d.makstud) return '<span class="tag ok">makstud</span>';
  const t = new Date().toISOString().slice(0, 10);
  return d.tahtaeg && d.tahtaeg < t ? '<span class="tag bad">üle tähtaja</span>' : '<span class="tag wait">ootel</span>';
}

function list(el) {
  const docs = db.all().filter((d) => filter === 'koik' || d.tyyp === filter);
  const ootel = db.all().filter((d) => d.tyyp === 'arve' && !d.makstud);
  const ootelSum = ootel.reduce((s, d) => s + db.totals(d).kokku, 0);
  el.innerHTML = `
    <div class="actions" style="margin-top:0">
      <a class="btn primary" href="#/arve/uus?t=arve">+ Uus arve</a>
      <a class="btn" href="#/arve/uus?t=pakkumine">+ Uus pakkumine</a>
    </div>
    ${ootel.length ? `<div class="result" style="margin-top:14px"><div class="line"><span>Laekumata arveid (${ootel.length})</span><b>${eur(ootelSum)}</b></div></div>` : ''}
    <div class="seg" id="f" style="margin:16px 0 10px">
      <button data-v="koik">Kõik</button><button data-v="arve">Arved</button><button data-v="pakkumine">Pakkumised</button>
    </div>
    ${docs.length ? docs.map((d) => `
      <a class="entry" href="#/arve/vaade/${d.id}">
        <div class="entry-top"><b>${d.tyyp === 'arve' ? 'Arve' : 'Pakkumine'} ${esc(d.nr)}</b><span>${kp(d.kuupaev)}</span></div>
        <div class="entry-sub">${esc(d.klient?.nimi) || 'Klient määramata'}${d.objekt ? ' · ' + esc(d.objekt) : ''}</div>
        <div class="entry-top" style="margin-top:6px">${status(d)}<b style="color:var(--accent)">${eur(db.totals(d).kokku)}</b></div>
      </a>`).join('') : '<p class="note">Siin pole veel midagi. Alusta uue arve või pakkumisega.</p>'}`;
  el.querySelector(`#f [data-v="${filter}"]`).classList.add('on');
  el.querySelectorAll('#f button').forEach((b) => (b.onclick = () => { filter = b.dataset.v; list(el); }));
}

export default {
  id: 'arve',
  icon: '📄',
  title: 'Arved ja pakkumised',
  desc: 'PDF logoga kliendile',
  render(el, rest = [], q = {}) {
    if (rest[0] === 'uus') return vorm(el, null, q);
    if (rest[0] === 'muuda') return vorm(el, rest[1], q);
    if (rest[0] === 'vaade') return vaade(el, rest[1]);
    list(el);
  },
};
