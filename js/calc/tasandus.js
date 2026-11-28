// Isetasanduv segu: kotid, vesi, krunt, servariba
import { ico } from '../icons.js';
import { num, val, line, load, save, seg } from '../util.js';
import { addMany } from '../ostud/store.js';
import * as paevik from '../paevik/store.js';

export default {
  id: 'tasandus',
  icon: 'kiht',
  short: 'Tasandus',
  title: 'Isetasanduv segu',
  desc: 'Kotid, vesi, krunt, servariba',
  render(el) {
    const st = load('tasandus', { m2: '', mm: '10', kulu: '1,6', kott: '25', vesi: '5', krunt: '0,15', ymber: '', varu: '5' });
    el.innerHTML = `
      <div class="card">
        <label>Pind (m²)</label>
        <div class="row" style="align-items:center">
          <input id="m2" inputmode="decimal" value="${st.m2}">
          <div class="seg" id="from"><button data-v="porand">Põrandalt</button></div>
        </div>
        <div class="row">
          <div><label>Keskmine paksus (mm)</label><input id="mm" inputmode="decimal" value="${st.mm}"></div>
          <div><label>Kulu kg/m² 1 mm kohta</label><input id="kulu" inputmode="decimal" value="${st.kulu}"></div>
        </div>
        <div class="row">
          <div><label>Kott (kg)</label><input id="kott" inputmode="decimal" value="${st.kott}"></div>
          <div><label>Vett koti kohta (l)</label><input id="vesi" inputmode="decimal" value="${st.vesi}"></div>
        </div>
        <div class="row">
          <div><label>Krunt l/m²</label><input id="krunt" inputmode="decimal" value="${st.krunt}"></div>
          <div><label>Ümbermõõt servaribale (m)</label><input id="ymber" inputmode="decimal" value="${st.ymber}"></div>
        </div>
        <div class="row">
          <div><label>Varu (%)</label><input id="varu" inputmode="decimal" value="${st.varu}"></div><div></div>
        </div>
      </div>
      <div class="result" id="out"></div>

      <h2>Ostunimekirja</h2>
      <div class="card">
        <label>Objekt</label>
        <input id="o_obj" list="t_obj" value="${(paevik.objektid().slice(-1)[0] || '').replace(/"/g, '&quot;')}">
        <datalist id="t_obj">${paevik.objektid().map((o) => `<option value="${o.replace(/"/g, '&quot;')}">`).join('')}</datalist>
        <button class="btn primary" id="toList" style="width:100%;margin-top:12px">${ico('ostukorv')}Lisa ostunimekirja</button>
        <p class="note" id="o_msg"></p>
      </div>
      <p class="note">Kulu ja vee kogus on kotil (tavaliselt 1,5–1,8 kg/m² mm kohta). Paksuse leiad näiteks laseriga mitmest kohast mõõtes ja keskmist võttes.</p>`;
    const $ = (id) => el.querySelector('#' + id);
    const F = ['m2', 'mm', 'kulu', 'kott', 'vesi', 'krunt', 'ymber', 'varu'];
    let res = null;
    const calc = () => {
      F.forEach((f) => (st[f] = $(f).value));
      save('tasandus', st);
      const m2 = val($('m2')), varu = 1 + val($('varu')) / 100;
      const kg = m2 * val($('mm')) * val($('kulu')) * varu;
      const kott = val($('kott'));
      const kotte = kott ? Math.ceil(kg / kott - 0.02) : 0;
      const vesi = kotte * val($('vesi'));
      const krunt = m2 * val($('krunt')) * varu;
      const riba = val($('ymber')) * varu;
      res = { kg, kotte, kott, krunt, riba };
      if (!m2 || !val($('mm'))) { $('out').innerHTML = line('Sisesta pind ja paksus', '—'); return; }
      $('out').innerHTML =
        line('Segu', `${num(kg, 0)} kg`) +
        (kotte ? line('Osta', `${kotte} kotti × ${num(kott)} kg`, true) : '') +
        (vesi ? line('Vett kokku', `${num(vesi, 0)} l`) : '') +
        line('Maht', `${num(m2 * val($('mm')) / 1000, 2)} m³`) +
        (krunt ? line('Krunti', `${num(krunt, 1)} l`) : '') +
        (riba ? line('Servariba', `${Math.ceil(riba)} jm`) : '');
    };
    seg($('from'), () => {
      const p = load('pind', {});
      if (p.porand != null) $('m2').value = num(p.porand).replace(/\s/g, '');
      const a = parseFloat(String(p.p || '').replace(',', '.')), b = parseFloat(String(p.l || '').replace(',', '.'));
      if (a && b && !$('ymber').value) $('ymber').value = num(2 * (a + b)).replace(/\s/g, '');
      calc();
    });
    F.forEach((id) => $(id).addEventListener('input', calc));
    $('toList').onclick = () => {
      if (!res || !res.kotte) { $('o_msg').textContent = 'Sisesta enne pind ja paksus.'; return; }
      const items = [
        { nimi: `Isetasanduv segu ${num(res.kott)} kg`, kogus: res.kotte, yhik: 'kott' },
        res.krunt && { nimi: 'Põrandakrunt', kogus: num(Math.ceil(res.krunt)), yhik: 'l' },
        res.riba && { nimi: 'Servariba', kogus: Math.ceil(res.riba), yhik: 'jm' },
      ].filter(Boolean);
      const l = addMany($('o_obj').value.trim() || 'Üldine', items);
      $('o_msg').innerHTML = `✓ Lisatud nimekirja „${l.nimi.replace(/</g, '&lt;')}“. <a href="#/ostud" style="color:var(--accent)">Ava nimekiri →</a>`;
    };
    calc();
  },
};
