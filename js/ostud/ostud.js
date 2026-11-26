// Ostunimekiri: objektide kaupa, märgi ostetuks, jaga sõnumina
import { ico } from '../icons.js';
import * as st from './store.js';
import * as paevik from '../paevik/store.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Ühiku kuvamine õiges käändes: 1 kott, 4 kotti
const yk = (i) => { const k = parseFloat(String(i.kogus).replace(',', '.')); const many = k && k !== 1; return i.yhik === 'kott' && many ? 'kotti' : i.yhik === 'rull' && many ? 'rulli' : (i.yhik || ''); };
const YHIKUD = ['', 'tk', 'pk', 'kott', 'm²', 'jm', 'l', 'kg', 'rull', 'kmpl'];

function view(el) {
  const d = st.load();
  if (!d.listid.length) st.getList(d, 'Üldine');
  let l = d.listid.find((x) => x.id === d.aktiivne) || d.listid[0];
  d.aktiivne = l.id;
  const ostmata = l.items.filter((i) => !i.ostetud), ostetud = l.items.filter((i) => i.ostetud);
  const objektid = [...new Set([...paevik.objektid(), ...d.listid.map((x) => x.nimi)])];

  const row = (i) => `
    <div class="ost${i.ostetud ? ' done' : ''}" data-id="${i.id}">
      <button class="chk" data-act="toggle" aria-label="Ostetud">${i.ostetud ? '✓' : ''}</button>
      <span class="ost-nimi" data-act="edit">${esc(i.nimi)}</span>
      <span class="ost-kogus" data-act="edit">${esc(i.kogus)} ${esc(yk(i))}</span>
    </div>`;

  el.innerHTML = `
    <div class="list-pick">
      <select id="list">${d.listid.map((x) => `<option value="${x.id}" ${x.id === l.id ? 'selected' : ''}>${esc(x.nimi)} (${x.items.filter((i) => !i.ostetud).length})</option>`).join('')}
        <option value="__uus">+ Uus nimekiri / objekt…</option></select>
    </div>

    <div class="card add-ost">
      <input id="nimi" list="tuntud" placeholder="Mida osta? nt Krunt" autocomplete="off">
      <datalist id="tuntud">${st.tuntud(d).map((x) => `<option value="${esc(x)}">`).join('')}</datalist>
      <div class="add-row">
        <input id="kogus" inputmode="decimal" placeholder="Kogus">
        <select id="yhik">${YHIKUD.map((u) => `<option value="${u}">${u || 'ühik'}</option>`).join('')}</select>
        <button class="btn primary" id="lisa">${ico('lisa')}Lisa</button>
      </div>
    </div>

    <div class="ost-list">
      ${ostmata.length ? ostmata.map(row).join('') : '<p class="note" style="padding:8px 14px">Kõik ostetud või nimekiri tühi.</p>'}
    </div>

    ${ostetud.length ? `<h2>Ostetud (${ostetud.length})</h2><div class="ost-list">${ostetud.map(row).join('')}</div>` : ''}

    <div class="actions">
      ${ostmata.length ? `<button class="btn" id="jaga">${ico('jaga')}Jaga nimekirja</button>` : ''}
      ${ostetud.length ? `<button class="btn" id="puhasta">${ico('prugi')}Eemalda ostetud</button>` : ''}
    </div>
    <div class="actions" style="margin-top:8px">
      <button class="btn" id="nimeta">${ico('pliiats')}Nimeta ümber</button>
      ${d.listid.length > 1 ? `<button class="btn danger" id="kustuta">Kustuta nimekiri</button>` : ''}
    </div>
    <p class="note" id="msg">Plaatide kalkulaatorist saad koguse otse siia lisada.</p>
    <datalist id="objektid">${objektid.map((o) => `<option value="${esc(o)}">`).join('')}</datalist>`;

  const $ = (q) => el.querySelector('#' + q);
  const redraw = () => { st.save(d); view(el); };

  $('list').onchange = () => {
    if ($('list').value === '__uus') {
      const nimi = prompt('Nimekirja või objekti nimi:', paevik.objektid().slice(-1)[0] || '');
      if (nimi && nimi.trim()) { d.aktiivne = st.getList(d, nimi).id; }
      return redraw();
    }
    d.aktiivne = $('list').value; redraw();
  };
  const lisa = () => {
    const nimi = $('nimi').value.trim();
    if (!nimi) return $('nimi').focus();
    st.addItem(l, { nimi, kogus: $('kogus').value.trim(), yhik: $('yhik').value });
    st.save(d); view(el);
    el.querySelector('#nimi').focus();
  };
  $('lisa').onclick = lisa;
  ['nimi', 'kogus'].forEach((x) => $(x).addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); lisa(); } }));

  el.querySelectorAll('.ost').forEach((r) => {
    const it = l.items.find((i) => i.id === r.dataset.id);
    r.querySelector('[data-act=toggle]').onclick = () => { it.ostetud = !it.ostetud; redraw(); };
    r.querySelectorAll('[data-act=edit]').forEach((x) => (x.onclick = () => {
      r.classList.add('editing');
      r.innerHTML = `
        <input data-f="nimi" value="${esc(it.nimi)}">
        <input data-f="kogus" inputmode="decimal" value="${esc(it.kogus)}" placeholder="Kogus">
        <select data-f="yhik">${YHIKUD.map((u) => `<option value="${u}" ${u === it.yhik ? 'selected' : ''}>${u || '–'}</option>`).join('')}</select>
        <button class="btn primary small" data-s>OK</button>
        <button class="btn danger small" data-x>${ico('prugi')}</button>`;
      r.querySelector('[data-s]').onclick = () => { r.querySelectorAll('[data-f]').forEach((i) => (it[i.dataset.f] = i.value.trim())); redraw(); };
      r.querySelector('[data-x]').onclick = () => { l.items = l.items.filter((i) => i !== it); redraw(); };
      r.querySelector('[data-f=nimi]').focus();
    }));
  });

  if ($('jaga')) $('jaga').onclick = async () => {
    const text = `Ostunimekiri – ${l.nimi}\n` + ostmata.map((i) => `• ${i.nimi}${i.kogus ? ` – ${i.kogus} ${yk(i)}`.trimEnd() : ''}`).join('\n');
    try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { if (e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text); $('msg').textContent = 'Kopeeritud, saad sõnumisse kleepida.'; } catch { prompt('Kopeeri:', text); }
  };
  if ($('puhasta')) $('puhasta').onclick = () => { l.items = l.items.filter((i) => !i.ostetud); redraw(); };
  $('nimeta').onclick = () => { const v = prompt('Uus nimi:', l.nimi); if (v && v.trim()) { l.nimi = v.trim(); redraw(); } };
  if ($('kustuta')) $('kustuta').onclick = () => {
    if (!confirm(`Kustutan nimekirja „${l.nimi}“?`)) return;
    d.listid = d.listid.filter((x) => x !== l); d.aktiivne = d.listid[0]?.id || ''; redraw();
  };
}

export default {
  id: 'ostud',
  icon: 'ostukorv',
  title: 'Ostunimekiri',
  desc: 'Objektide kaupa, kalkulaatoritest',
  render(el) { view(el); },
};
