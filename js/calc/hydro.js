// Hüdroisolatsioon: mastiks, krunt, lint, nurgad ja mansetid
import { ico } from '../icons.js';
import { num, val, line, load, save, seg } from '../util.js';
import { addMany } from '../ostud/store.js';
import * as paevik from '../paevik/store.js';

export default {
  id: 'hydro',
  icon: 'tilk',
  short: 'Hüdro',
  title: 'Hüdroisolatsioon',
  desc: 'Mastiks, krunt, lint, nurgad',
  render(el) {
    const st = load('hydro', { m2: '', kulu: '0,8', kihid: '2', pakk: '7', krunt: '0,15', ymber: '', vnurki: '4', vk: '2', sise: '4', valis: '0', mansett: '2', trapp: '1', varu: '10' });
    el.innerHTML = `
      <div class="card">
        <label>Pind (m²)</label>
        <div class="row" style="align-items:center">
          <input id="m2" inputmode="decimal" value="${st.m2}">
          <div class="seg" id="from"><button data-v="porand">Põrand</button><button data-v="seinad">Seinad</button><button data-v="koos">Koos</button></div>
        </div>
        <div class="row">
          <div><label>Kulu kg/m² kihi kohta</label><input id="kulu" inputmode="decimal" value="${st.kulu}"></div>
          <div><label>Kihte</label><input id="kihid" inputmode="numeric" value="${st.kihid}"></div>
        </div>
        <div class="row">
          <div><label>Pakend (kg)</label><input id="pakk" inputmode="decimal" value="${st.pakk}"></div>
          <div><label>Krunt l/m²</label><input id="krunt" inputmode="decimal" value="${st.krunt}"></div>
        </div>
      </div>

      <h2>Lint ja detailid</h2>
      <div class="card">
        <div class="row">
          <div><label>Põranda ümbermõõt (m)</label><input id="ymber" inputmode="decimal" value="${st.ymber}"></div>
          <div><label>Varu (%)</label><input id="varu" inputmode="decimal" value="${st.varu}"></div>
        </div>
        <div class="row">
          <div><label>Püstnurki (tk)</label><input id="vnurki" inputmode="numeric" value="${st.vnurki}"></div>
          <div><label>Püstnurga kõrgus (m)</label><input id="vk" inputmode="decimal" value="${st.vk}"></div>
        </div>
        <div class="row">
          <div><label>Sisenurgad (tk)</label><input id="sise" inputmode="numeric" value="${st.sise}"></div>
          <div><label>Välisnurgad (tk)</label><input id="valis" inputmode="numeric" value="${st.valis}"></div>
        </div>
        <div class="row">
          <div><label>Torumansetid (tk)</label><input id="mansett" inputmode="numeric" value="${st.mansett}"></div>
          <div><label>Trapimansett (tk)</label><input id="trapp" inputmode="numeric" value="${st.trapp}"></div>
        </div>
      </div>
      <div class="result" id="out"></div>

      <h2>Ostunimekirja</h2>
      <div class="card">
        <label>Objekt</label>
        <input id="o_obj" list="h_obj" value="${(paevik.objektid().slice(-1)[0] || '').replace(/"/g, '&quot;')}">
        <datalist id="h_obj">${paevik.objektid().map((o) => `<option value="${o.replace(/"/g, '&quot;')}">`).join('')}</datalist>
        <button class="btn primary" id="toList" style="width:100%;margin-top:12px">${ico('ostukorv')}Lisa ostunimekirja</button>
        <p class="note" id="o_msg"></p>
      </div>
      <p class="note">Kulu vaata pakendilt (vedelmastiksil tavaliselt 0,5–1,0 kg/m² kihi kohta). Lint läheb põranda ja seina nurka ning püstnurkadesse; nurgatükid sise- ja välisnurkadesse.</p>`;
    const $ = (id) => el.querySelector('#' + id);
    const F = ['m2', 'kulu', 'kihid', 'pakk', 'krunt', 'ymber', 'vnurki', 'vk', 'sise', 'valis', 'mansett', 'trapp', 'varu'];
    let res = null;

    const calc = () => {
      F.forEach((f) => (st[f] = $(f).value));
      save('hydro', st);
      const m2 = val($('m2')), varu = 1 + val($('varu')) / 100;
      const kg = m2 * val($('kulu')) * (val($('kihid')) || 1) * varu;
      const pakk = val($('pakk'));
      const pk = pakk ? Math.ceil(kg / pakk - 0.02) : 0;
      const krunt = m2 * val($('krunt')) * varu;
      const lint = (val($('ymber')) + val($('vnurki')) * val($('vk'))) * varu;
      res = { kg, pk, pakk, krunt, lint, sise: val($('sise')), valis: val($('valis')), mansett: val($('mansett')), trapp: val($('trapp')) };
      if (!m2) { $('out').innerHTML = line('Sisesta pind', '—'); return; }
      $('out').innerHTML =
        line('Mastiksit', `${num(kg, 1)} kg`) +
        (pk ? line('Osta', `${pk} × ${num(pakk)} kg`, true) : '') +
        (krunt ? line('Krunti', `${num(krunt, 1)} l`) : '') +
        (lint ? line('Hüdroisolatsiooni linti', `${Math.ceil(lint)} jm`, true) : '') +
        (res.sise ? line('Sisenurgad', `${res.sise} tk`) : '') +
        (res.valis ? line('Välisnurgad', `${res.valis} tk`) : '') +
        (res.mansett ? line('Torumansetid', `${res.mansett} tk`) : '') +
        (res.trapp ? line('Trapimansett', `${res.trapp} tk`) : '');
    };
    seg($('from'), (v) => {
      const p = load('pind', {});
      const m = v === 'koos' ? (+p.porand || 0) + (+p.seinad || 0) : p[v];
      if (m != null) $('m2').value = num(m).replace(/\s/g, '');
      const a = parseFloat(String(p.p || '').replace(',', '.')), b = parseFloat(String(p.l || '').replace(',', '.'));
      if (a && b && !$('ymber').value) $('ymber').value = num(2 * (a + b)).replace(/\s/g, '');
      calc();
    });
    F.forEach((id) => $(id).addEventListener('input', calc));
    $('toList').onclick = () => {
      if (!res || !res.kg) { $('o_msg').textContent = 'Sisesta enne pind.'; return; }
      const items = [
        res.pk && { nimi: `Hüdroisolatsioon ${num(res.pakk)} kg`, kogus: res.pk, yhik: 'tk' },
        res.krunt && { nimi: 'Hüdroisolatsiooni krunt', kogus: num(Math.ceil(res.krunt)), yhik: 'l' },
        res.lint && { nimi: 'Hüdroisolatsiooni lint', kogus: Math.ceil(res.lint), yhik: 'jm' },
        res.sise && { nimi: 'Hüdro sisenurk', kogus: res.sise, yhik: 'tk' },
        res.valis && { nimi: 'Hüdro välisnurk', kogus: res.valis, yhik: 'tk' },
        res.mansett && { nimi: 'Torumansett', kogus: res.mansett, yhik: 'tk' },
        res.trapp && { nimi: 'Trapimansett', kogus: res.trapp, yhik: 'tk' },
      ].filter(Boolean);
      const l = addMany($('o_obj').value.trim() || 'Üldine', items);
      $('o_msg').innerHTML = `✓ Lisatud ${items.length} rida nimekirja „${l.nimi.replace(/</g, '&lt;')}“. <a href="#/ostud" style="color:var(--accent)">Ava nimekiri →</a>`;
    };
    calc();
  },
};
