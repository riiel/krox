// Värvi ja krundi kalkulaator: liitrid, kihid, lahjendus ja parim purkide kombinatsioon
import { num, val, line, seg, load, save } from '../util.js';
import { ico } from '../icons.js';
import { addMany } from '../ostud/store.js';
import * as paevik from '../paevik/store.js';

const DEF = {
  varv: { kulu: '9', kihid: '2', varu: '10', purgid: '0,9; 2,7; 9', lahj: '0', nimi: 'Värv' },
  krunt: { kulu: '8', kihid: '1', varu: '10', purgid: '1; 5; 10', lahj: '0', nimi: 'Krunt' },
};

// Parim purkide valik: odavaim hinnanguline kombinatsioon, mille maht >= vajadus.
// Suures purgis on liiter odavam (hind ~ maht^0,85), nii et 1×9 l eelistatakse 3×2,7 l-le.
export function purgid(vaja, sizes) {
  const s = [...new Set(sizes.map((x) => Math.round(x * 10)).filter((x) => x > 0))].sort((a, b) => b - a);
  if (!s.length || vaja <= 0) return null;
  const need = Math.ceil(vaja * 10 - 1e-9);
  const lim = need + s[0];
  const price = (z) => Math.pow(z / 10, 0.85);
  const best = new Array(lim + 1).fill(Infinity), from = new Array(lim + 1).fill(-1);
  best[0] = 0;
  for (let v = 1; v <= lim; v++) for (const z of s) if (z <= v && best[v - z] + price(z) < best[v] - 1e-9) { best[v] = best[v - z] + price(z); from[v] = z; }
  let v = -1;
  for (let x = need; x <= lim; x++) if (best[x] < Infinity && (v < 0 || best[x] < best[v] - 1e-9)) v = x;
  if (v < 0) return null;
  const count = {};
  for (let x = v; x > 0; x -= from[x]) count[from[x]] = (count[from[x]] || 0) + 1;
  return { kokku: v / 10, list: Object.entries(count).map(([z, k]) => ({ maht: z / 10, tk: k })).sort((a, b) => b.maht - a.maht) };
}

export default {
  id: 'varv',
  icon: 'rull',
  short: 'Värv, krunt',
  title: 'Värv ja krunt',
  desc: 'Liitrid ja purgid',
  render(el) {
    const st = load('varv', { mode: 'varv', m2: '', varv: { ...DEF.varv }, krunt: { ...DEF.krunt } });
    el.innerHTML = `
      <div class="seg" id="mode"><button data-v="varv">Värv</button><button data-v="krunt">Krunt</button></div>
      <div class="card" style="margin-top:12px">
        <label>Pind (m²)</label>
        <div class="row">
          <input id="m2" inputmode="decimal" placeholder="nt 25" value="${st.m2}">
          <div class="seg" id="from"><button data-v="seinad">Seinad</button><button data-v="porand">Lagi/põr.</button></div>
        </div>
        <p class="note" style="margin-top:6px">Nupud võtavad pinna ruutude kalkulaatorist.</p>
        <div class="row">
          <div><label>Kulu (m²/l, 1 kiht)</label><input id="kulu" inputmode="decimal"></div>
          <div><label>Kihte</label><input id="kihid" inputmode="numeric"></div>
        </div>
        <div class="row">
          <div><label>Varu (%)</label><input id="varu" inputmode="decimal"></div>
          <div id="lahjBox"><label>Lahjendus 1 : x (vesi)</label><input id="lahj" inputmode="decimal" placeholder="0 = valmis"></div>
        </div>
        <label>Purkide suurused (l), semikooloniga</label>
        <input id="purgid" placeholder="nt 0,9; 2,7; 9">
        <p class="note" id="hint"></p>
      </div>
      <div class="result" id="out"></div>

      <h2>Ostunimekirja</h2>
      <div class="card">
        <label>Toote nimi</label><input id="o_nimi">
        <label>Objekt</label>
        <input id="o_obj" list="v_obj" value="${(paevik.objektid().slice(-1)[0] || '').replace(/"/g, '&quot;')}">
        <datalist id="v_obj">${paevik.objektid().map((o) => `<option value="${o.replace(/"/g, '&quot;')}">`).join('')}</datalist>
        <button class="btn primary" id="toList" style="width:100%;margin-top:12px">${ico('ostukorv')}Lisa ostunimekirja</button>
        <p class="note" id="o_msg"></p>
      </div>`;

    const $ = (id) => el.querySelector('#' + id);
    const F = ['kulu', 'kihid', 'varu', 'purgid', 'lahj'];
    let res = null;
    const HINT = {
      varv: 'Sisevärv katab tavaliselt 8–12 m²/l kihi kohta, krobelisel pinnal vähem. Vaata purgilt.',
      krunt: 'Valmiskrunt umbes 6–10 m²/l. Kontsentraadi puhul märgi lahjendus (nt 1:3 = 1 osa krunti, 3 osa vett).',
    };

    const fill = () => {
      const c = st[st.mode];
      F.forEach((f) => ($(f).value = c[f]));
      $('lahjBox').style.visibility = st.mode === 'krunt' ? 'visible' : 'hidden';
      $('hint').textContent = HINT[st.mode];
      $('o_nimi').value = c.nimi;
      el.querySelectorAll('#mode button').forEach((b) => b.classList.toggle('on', b.dataset.v === st.mode));
    };

    const calc = () => {
      const c = st[st.mode];
      F.forEach((f) => (c[f] = $(f).value));
      c.nimi = $('o_nimi').value;
      st.m2 = $('m2').value;
      save('varv', st);
      const m2 = val($('m2')), kulu = val($('kulu')), kihid = val($('kihid')) || 1, varu = val($('varu')) / 100;
      const lahj = st.mode === 'krunt' ? val($('lahj')) : 0;
      if (!m2 || !kulu) { $('out').innerHTML = line('Sisesta pind ja kulu', '—'); res = null; return; }
      const valmis = (m2 * kihid / kulu) * (1 + varu);   // kasutusvalmis segu
      const toode = valmis / (1 + lahj);                 // ostetav kogus
      const sizes = $('purgid').value.split(/[;\s]+/).map((x) => parseFloat(x.replace(',', '.'))).filter((x) => x > 0);
      const p = purgid(toode, sizes);
      res = { toode, p };
      $('out').innerHTML =
        line('Pind × kihid', `${num(m2)} m² × ${kihid}`) +
        (lahj ? line('Valmis segu (koos veega)', num(valmis, 1) + ' l') + line(`Krunti (1:${num(lahj)})`, num(toode, 1) + ' l', true)
              : line(`Vaja ${st.mode === 'varv' ? 'värvi' : 'krunti'} (+${num(varu * 100)}%)`, num(toode, 1) + ' l', true)) +
        (p ? line('Osta', p.list.map((x) => `${x.tk} × ${num(x.maht)} l`).join(' + '), true) + line('Kokku purkides', num(p.kokku, 1) + ' l (üle ' + num(p.kokku - toode, 1) + ' l)') : '');
    };

    seg($('mode'), (v) => { st.mode = v; fill(); calc(); });
    seg($('from'), (v) => {
      const p = load('pind', {});
      if (p[v] != null) $('m2').value = num(p[v]).replace(/\s/g, '');
      calc();
    });
    [...F, 'm2', 'o_nimi'].forEach((id) => $(id).addEventListener('input', calc));
    $('toList').onclick = () => {
      if (!res?.p) { $('o_msg').textContent = 'Sisesta enne pind ja purkide suurused.'; return; }
      const nimi = $('o_nimi').value.trim() || DEF[st.mode].nimi;
      const l = addMany($('o_obj').value.trim() || 'Üldine', res.p.list.map((x) => ({ nimi: `${nimi} ${num(x.maht)} l`, kogus: x.tk, yhik: 'tk' })));
      $('o_msg').innerHTML = `✓ Lisatud nimekirja „${l.nimi.replace(/</g, '&lt;')}“. <a href="#/ostud" style="color:var(--accent)">Ava nimekiri →</a>`;
    };
    fill();
    calc();
  },
};
