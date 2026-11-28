// Ostunimekiri: objektide kaupa, märgi ostetuks, jaga sõnumina
import { ico } from '../icons.js';
import * as st from './store.js';
import * as paevik from '../paevik/store.js';
import { api, pin } from '../kulud/store.js';
import { shareText } from '../native.js';

// Tõlked jagamiseks (Soome klient jne)
const KEELED = { et: 'Eesti', fi: 'Suomi', en: 'English' };
const GRUPP = {
  fi: { pood: 'Kaupasta', ladu: 'Varastosta', kodu: 'Kotoa', muu: 'Muuta' },
  en: { pood: 'From the store', ladu: 'From the warehouse', kodu: 'From home', muu: 'Other' },
};
const YK = {
  fi: { tk: 'kpl', pk: 'pkt', kott: 'säkki', kotti: 'säkkiä', 'm²': 'm²', jm: 'jm', l: 'l', kg: 'kg', rull: 'rulla', rulli: 'rullaa', kmpl: 'sarja' },
  en: { tk: 'pcs', pk: 'pack', kott: 'bag', kotti: 'bags', 'm²': 'm²', jm: 'lm', l: 'l', kg: 'kg', rull: 'roll', rulli: 'rolls', kmpl: 'set' },
};
const TKEY = 'krox.tolked';
const tCache = () => { try { return JSON.parse(localStorage.getItem(TKEY)) || {}; } catch { return {}; } };
async function tolgi(keel, read) {
  const c = tCache(); c[keel] ||= {};
  const puudu = [...new Set(read.filter((x) => x && !c[keel][x]))];
  if (puudu.length) {
    const r = await api('tolgi', { keel, read: puudu });
    puudu.forEach((x, i) => (c[keel][x] = r.read[i]));
    try { localStorage.setItem(TKEY, JSON.stringify(c)); } catch { /* */ }
  }
  return (x) => c[keel][x] || x;
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Ühiku kuvamine õiges käändes: 1 kott, 4 kotti
const yk = (i) => { const k = parseFloat(String(i.kogus).replace(',', '.')); const many = k && k !== 1; return i.yhik === 'kott' && many ? 'kotti' : i.yhik === 'rull' && many ? 'rulli' : (i.yhik || ''); };
const KUST = { pood: { nimi: 'Poest', ico: 'ostukorv' }, ladu: { nimi: 'Laost', ico: 'ladu' }, kodu: { nimi: 'Kodust', ico: 'kodu' }, muu: { nimi: 'Muu', ico: 'inimesed' } };
const kustOf = (i) => i.kust || 'pood';
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
      <button class="chk" data-act="toggle" aria-label="Olemas">${i.ostetud ? '✓' : ''}</button>
      <span class="ost-nimi" data-act="edit">${esc(i.nimi)}</span>
      <span class="ost-kogus" data-act="edit">${esc(i.kogus)} ${esc(yk(i))}</span>
    </div>`;

  el.innerHTML = `
    <div class="list-pick">
      <select id="list">${d.listid.map((x) => `<option value="${x.id}" ${x.id === l.id ? 'selected' : ''}>${esc(x.nimi)} (${x.items.filter((i) => !i.ostetud).length})</option>`).join('')}
        <option value="__uus">+ Uus nimekiri / objekt…</option></select>
    </div>

 <div class="card add-ost">
      <div class="seg kust" id="kust">${Object.entries(KUST).map(([k, v]) => `<button data-v="${k}">${ico(v.ico)}${v.nimi}</button>`).join('')}</div>
      <input id="nimi" list="tuntud" placeholder="Mida võtta? nt Krunt" autocomplete="off">
      <datalist id="tuntud">${st.tuntud(d).map((x) => `<option value="${esc(x)}">`).join('')}</datalist>
      <div class="add-row">
        <input id="kogus" inputmode="decimal" placeholder="Kogus">
        <select id="yhik">${YHIKUD.map((u) => `<option value="${u}">${u || 'ühik'}</option>`).join('')}</select>
        <button class="btn primary" id="lisa">${ico('lisa')}Lisa</button>
      </div>
    </div>

    ${ostmata.length ? Object.entries(KUST).map(([k, v]) => {
      const g = ostmata.filter((i) => kustOf(i) === k);
      return g.length ? `<h2 class="grp">${ico(v.ico)}${v.nimi} (${g.length})</h2><div class="ost-list">${g.map(row).join('')}</div>` : '';
    }).join('') : '<p class="note">Kõik olemas või nimekiri tühi.</p>'}

    ${ostetud.length ? `<h2>Olemas (${ostetud.length})</h2><div class="ost-list">${ostetud.map(row).join('')}</div>` : ''}

    <div class="actions">
      ${ostmata.length ? `<button class="btn" id="jaga">${ico('jaga')}Jaga / tõlgi</button>` : ''}
      ${ostetud.length ? `<button class="btn" id="puhasta">${ico('prugi')}Eemalda tehtud</button>` : ''}
    </div>
    <div id="jagaBox"></div>
    <div class="actions" style="margin-top:8px">
      <button class="btn" id="nimeta">${ico('pliiats')}Nimeta ümber</button>
      ${d.listid.length > 1 ? `<button class="btn danger" id="kustuta">Kustuta nimekiri</button>` : ''}
    </div>
    <p class="note" id="msg">Plaatide kalkulaatorist saad koguse otse siia lisada.</p>
    <datalist id="objektid">${objektid.map((o) => `<option value="${esc(o)}">`).join('')}</datalist>`;

  const $ = (q) => el.querySelector('#' + q);
  const redraw = () => { st.save(d); view(el); };
  let kust = d.viimaneKust || 'pood';
  const setKust = (v) => { kust = v; el.querySelectorAll('#kust button').forEach((b) => b.classList.toggle('on', b.dataset.v === v)); };
  el.querySelectorAll('#kust button').forEach((b) => (b.onclick = () => { setKust(b.dataset.v); d.viimaneKust = b.dataset.v; st.save(d); $('nimi').focus(); }));
  setKust(kust);

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
    st.addItem(l, { nimi, kogus: $('kogus').value.trim(), yhik: $('yhik').value, kust });
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
        <select data-f="kust" class="kust-sel">${Object.entries(KUST).map(([k, v]) => `<option value="${k}" ${k === kustOf(it) ? 'selected' : ''}>${v.nimi}</option>`).join('')}</select>
        <button class="btn primary small" data-s>OK</button>
        <button class="btn danger small" data-x>${ico('prugi')}</button>`;
      r.querySelector('[data-s]').onclick = () => { r.querySelectorAll('[data-f]').forEach((i) => (it[i.dataset.f] = i.value.trim())); redraw(); };
      r.querySelector('[data-x]').onclick = () => { l.items = l.items.filter((i) => i !== it); redraw(); };
      r.querySelector('[data-f=nimi]').focus();
    }));
  });

  if ($('jaga')) $('jaga').onclick = () => {
    const box = $('jagaBox');
    if (box.innerHTML) { box.innerHTML = ''; return; }
    const grupid = Object.keys(KUST).filter((k) => ostmata.some((i) => kustOf(i) === k));
    const S = { keel: localStorage.getItem('krox.ostud.keel') || 'et', grupid: new Set(grupid) };
    box.innerHTML = `
      <div class="card jaga-box">
        <label style="margin-top:0">Keel</label>
        <div class="seg" id="keel">${Object.entries(KEELED).map(([k, v]) => `<button data-v="${k}">${v}</button>`).join('')}</div>
        ${grupid.length > 1 ? `<label>Mida saata</label><div class="jaga-grp">${grupid.map((k) => `<label class="check"><input type="checkbox" value="${k}" checked> ${KUST[k].nimi}</label>`).join('')}</div>` : ''}
        <label>Tekst (saad enne saatmist muuta)</label>
        <textarea id="jtekst" rows="8"></textarea>
        <p class="note" id="jmsg"></p>
        <div class="actions">
          <button class="btn primary" id="jsaada">${ico('jaga')}Saada</button>
          <button class="btn" id="jkopeeri">${ico('kopeeri')}Kopeeri</button>
        </div>
      </div>`;
    const q = (x) => box.querySelector(x);
    let jarg = 0;
    const koosta = async () => {
      const nr = ++jarg;
      box.querySelectorAll('#keel button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.keel));
      const valik = Object.keys(KUST).filter((k) => S.grupid.has(k));
      const read = ostmata.filter((i) => S.grupid.has(kustOf(i)));
      let t = (x) => x, pais = (k) => KUST[k].nimi + ':', uh = (i) => yk(i), pealkiri = l.nimi;
      if (S.keel !== 'et') {
        if (!pin()) { q('#jmsg').textContent = 'Tõlkimiseks lisa Seadetes PIN.'; return; }
        q('#jmsg').textContent = 'Tõlgin…';
        try { t = await tolgi(S.keel, [l.nimi, ...read.map((i) => i.nimi)]); }
        catch (e) { if (nr === jarg) q('#jmsg').textContent = 'Tõlkimine ei õnnestunud: ' + e.message; return; }
        if (nr !== jarg) return;
        pealkiri = t(l.nimi);
        pais = (k) => GRUPP[S.keel][k] + ':';
        uh = (i) => YK[S.keel][yk(i)] ?? yk(i);
        q('#jmsg').textContent = 'Tõlgitud automaatselt — vaata üle.';
      } else q('#jmsg').textContent = '';
      const yksGrupp = valik.length === 1;
      q('#jtekst').value = `${pealkiri}\n\n` + valik.map((k) => {
        const g = read.filter((i) => kustOf(i) === k);
        return (yksGrupp ? '\n' : `\n${pais(k)}\n`) + g.map((i) => `• ${t(i.nimi)}${i.kogus ? ` – ${i.kogus} ${uh(i)}`.trimEnd() : ''}`).join('\n');
      }).join('\n').trim().replace(/^\n+/, '');
    };
    box.querySelectorAll('#keel button').forEach((b) => (b.onclick = () => { S.keel = b.dataset.v; localStorage.setItem('krox.ostud.keel', S.keel); koosta(); }));
    box.querySelectorAll('.jaga-grp input').forEach((c) => (c.onchange = () => { c.checked ? S.grupid.add(c.value) : S.grupid.delete(c.value); koosta(); }));
    q('#jsaada').onclick = async () => {
      const r = await shareText(q('#jtekst').value);
      if (r === 'copied') q('#jmsg').textContent = 'Kopeeritud, saad sõnumisse kleepida.';
    };
    q('#jkopeeri').onclick = async () => {
      try { await navigator.clipboard.writeText(q('#jtekst').value); q('#jmsg').textContent = 'Kopeeritud.'; }
      catch { q('#jtekst').select(); q('#jmsg').textContent = 'Tekst on valitud, vajuta „Kopeeri“.'; }
    };
    koosta();
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  title: 'Nimekiri',
  desc: 'Pood, ladu, kodu – objektide kaupa',
  render(el) { view(el); },
};
