// Kütus pooleks paarimehega: ostud, tema osa, maksed, võlg
import { ico } from '../icons.js';
import { eur, rates } from '../util.js';

const KEY = 'krox.kytus';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n = (s) => parseFloat(String(s ?? '').replace(',', '.')) || 0;
const r2 = (x) => Math.round(x * 100) / 100;
const kp = (s) => (s ? s.split('-').reverse().join('.') : '');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const load = () => { try { return { nimi: '', ostud: [], ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return { nimi: '', ostud: [] }; } };
const save = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { alert('Salvestamine ebaõnnestus'); } };

// Paarimehe osa: Soome = pool; Eesti = (summa ilma KM-ta) / 2, ümardatud üles 5 € kaupa
export function osa(summa, riik, km = 24) {
  const s = n(summa);
  if (!s) return 0;
  if (riik === 'FI') return r2(s / 2);
  const pool = s / (1 + km / 100) / 2;
  return Math.ceil(pool / 5 - 1e-9) * 5;
}
const jaak = (o) => r2(n(o.osa) - n(o.makstud));

function view(el) {
  const d = load();
  const km = n(rates().km) || 24;
  const ostud = [...d.ostud].sort((a, b) => (b.kuupaev + b.id).localeCompare(a.kuupaev + a.id));
  const volg = r2(d.ostud.reduce((s, o) => s + jaak(o), 0));
  const nimi = d.nimi || 'Paarimees';
  const st = { riik: d.viimaneRiik || 'FI' };

  el.innerHTML = `
    <div class="result">
      <div class="line big"><span>${esc(nimi)} võlgneb</span><b>${eur(volg)}</b></div>
    </div>
    ${volg > 0 ? `<div class="actions" style="margin-top:8px">
      <button class="btn" id="maksis">${ico('raha')}Maksis…</button>
      <button class="btn" id="kopeeri">${ico('kopeeri')}Kopeeri kokkuvõte</button>
    </div>` : ''}
    <p class="note" id="msg"></p>

    <h2>Uus tankimine</h2>
    <div class="card">
      <div class="seg" id="riik"><button data-v="FI">🇫🇮 Soome</button><button data-v="EE">🇪🇪 Eesti</button></div>
      <div class="row">
        <div><label>Summa (€)</label><input id="summa" inputmode="decimal" placeholder="nt 150"></div>
        <div><label>Kuupäev</label><input type="date" id="kuupaev" value="${today()}"></div>
      </div>
      <div class="row">
        <div><label>Tema osa (€)</label><input id="osa" inputmode="decimal"></div>
        <div><label>Märkus</label><input id="markus" placeholder="valikuline"></div>
      </div>
      <p class="note" id="selgitus"></p>
      <button class="btn primary" id="lisa" style="width:100%;margin-top:6px">Lisa</button>
    </div>

    <h2>Ostud</h2>
    ${ostud.length ? ostud.map((o) => {
      const j = jaak(o);
      const tag = j <= 0 ? '<span class="tag ok">makstud</span>' : n(o.makstud) > 0 ? `<span class="tag wait">osaliselt, jääk ${eur(j)}</span>` : '<span class="tag bad">maksmata</span>';
      return `<div class="entry" data-id="${o.id}">
        <div class="entry-top"><b>${o.riik === 'FI' ? '🇫🇮' : '🇪🇪'} ${eur(n(o.summa))}</b><span>${kp(o.kuupaev)}</span></div>
        <div class="entry-sub">Tema osa ${eur(n(o.osa))}${o.markus ? ' · ' + esc(o.markus) : ''}</div>
        <div class="entry-top" style="margin-top:8px;align-items:center">${tag}
          <span class="mini">
            ${j > 0 ? `<button class="btn small" data-act="koik">✓ Makstud</button>` : ''}
            <button class="btn small" data-act="muuda">${ico('pliiats')}</button>
          </span>
        </div>
      </div>`;
    }).join('') : '<p class="note">Oste pole veel.</p>'}

    <h2>Seaded</h2>
    <div class="card">
      <label>Paarimehe nimi</label><input id="nimi" value="${esc(d.nimi)}" placeholder="nt Andres">
      <p class="note">Eesti ostu puhul: summa ilma käibemaksuta (${km}%), jagatud kahega ja ümardatud üles 5 € kaupa. Soome ostu puhul: pool summast.</p>
    </div>`;

  const $ = (q) => el.querySelector('#' + q);
  let osaTouched = false;
  const setRiik = (v) => { st.riik = v; el.querySelectorAll('#riik button').forEach((b) => b.classList.toggle('on', b.dataset.v === v)); upd(); };
  const upd = () => {
    const s = n($('summa').value);
    if (!osaTouched) $('osa').value = s ? String(osa(s, st.riik, km)).replace('.', ',') : '';
    $('selgitus').textContent = !s ? '' : st.riik === 'FI'
      ? `${eur(s)} / 2 = ${eur(s / 2)}`
      : `${eur(s)} ilma KM-ta ${eur(s / (1 + km / 100))}, pool ${eur(s / (1 + km / 100) / 2)}, ümardatud ${eur(osa(s, 'EE', km))}`;
  };
  el.querySelectorAll('#riik button').forEach((b) => (b.onclick = () => setRiik(b.dataset.v)));
  $('summa').addEventListener('input', upd);
  $('osa').addEventListener('input', () => { osaTouched = !!$('osa').value; });
  setRiik(st.riik);

  $('lisa').onclick = () => {
    const s = n($('summa').value);
    if (!s) return alert('Lisa summa');
    d.ostud.push({ id: Date.now().toString(36), kuupaev: $('kuupaev').value || today(), riik: st.riik, summa: s, osa: n($('osa').value), makstud: 0, markus: $('markus').value.trim() });
    d.viimaneRiik = st.riik;
    save(d); view(el);
  };
  $('nimi').addEventListener('change', () => { d.nimi = $('nimi').value.trim(); save(d); view(el); });

  // makse: jaotab vanimatele maksmata ostudele
  if ($('maksis')) $('maksis').onclick = () => {
    const v = prompt(`Kui palju ${nimi} maksis? (kogu võlg ${eur(volg).replace(' €', '')} €)`, String(volg).replace('.', ','));
    if (v == null) return;
    let rest = n(v);
    if (rest <= 0) return;
    [...d.ostud].sort((a, b) => a.kuupaev.localeCompare(b.kuupaev)).forEach((o) => {
      const j = jaak(o);
      if (rest <= 0 || j <= 0) return;
      const pay = Math.min(j, rest);
      o.makstud = r2(n(o.makstud) + pay); rest = r2(rest - pay);
    });
    save(d); view(el);
    if (rest > 0) alert(`Üle jäi ${eur(rest)} (rohkem kui võlg).`);
  };
  if ($('kopeeri')) $('kopeeri').onclick = async () => {
    const rows = [...d.ostud].filter((o) => jaak(o) > 0).sort((a, b) => a.kuupaev.localeCompare(b.kuupaev))
      .map((o) => `${kp(o.kuupaev)} ${o.riik === 'FI' ? 'Soome' : 'Eesti'} ${n(o.summa).toFixed(2)} € → ${jaak(o).toFixed(2)} €`);
    const text = `Kütus pooleks:\n${rows.join('\n')}\nKokku: ${volg.toFixed(2)} €`.replace(/\./g, ',');
    try { await navigator.clipboard.writeText(text); $('msg').textContent = 'Kopeeritud, saad saata sõnumiga.'; }
    catch { prompt('Kopeeri:', text); }
  };

  el.querySelectorAll('.entry[data-id]').forEach((row) => {
    const o = d.ostud.find((x) => x.id === row.dataset.id);
    row.querySelectorAll('[data-act]').forEach((b) => (b.onclick = () => {
      if (b.dataset.act === 'koik') { o.makstud = n(o.osa); save(d); view(el); return; }
      // muutmine
      row.innerHTML = `
        <div class="row">
          <div><label>Summa (€)</label><input data-f="summa" inputmode="decimal" value="${String(o.summa).replace('.', ',')}"></div>
          <div><label>Kuupäev</label><input type="date" data-f="kuupaev" value="${o.kuupaev}"></div>
        </div>
        <div class="row">
          <div><label>Tema osa</label><input data-f="osa" inputmode="decimal" value="${String(o.osa).replace('.', ',')}"></div>
          <div><label>Makstud</label><input data-f="makstud" inputmode="decimal" value="${String(o.makstud || 0).replace('.', ',')}"></div>
        </div>
        <label>Märkus</label><input data-f="markus" value="${esc(o.markus)}">
        <div class="actions"><button class="btn primary" data-s="1">Salvesta</button><button class="btn danger" data-x="1">Kustuta</button></div>`;
      row.querySelector('[data-s]').onclick = () => {
        row.querySelectorAll('[data-f]').forEach((i) => { o[i.dataset.f] = ['summa', 'osa', 'makstud'].includes(i.dataset.f) ? n(i.value) : i.value.trim(); });
        save(d); view(el);
      };
      row.querySelector('[data-x]').onclick = () => { if (confirm('Kustutan selle ostu?')) { d.ostud = d.ostud.filter((x) => x !== o); save(d); view(el); } };
    }));
  });
}

export default {
  id: 'kytus',
  icon: 'kytus',
  title: 'Kütus pooleks',
  desc: 'Paarimehe osa ja võlg',
  render(el) { view(el); },
};
