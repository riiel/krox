// Ruumi/pinna kalkulaator: põrand, seinad, avad (uksed/aknad) maha
import { num, val, line, load, save } from '../util.js';

export default {
  id: 'pind',
  icon: '📐',
  title: 'Ruutude kalkulaator',
  desc: 'Põranda ja seinte pind',
  render(el) {
    const st = load('pind', { p: '', l: '', k: '', avad: [{ w: '0,8', h: '2,0', n: 1 }] });
    el.innerHTML = `
      <div class="card">
        <div class="row3">
          <div><label>Pikkus (m)</label><input id="p" inputmode="decimal" placeholder="3,2" value="${st.p}"></div>
          <div><label>Laius (m)</label><input id="l" inputmode="decimal" placeholder="2,1" value="${st.l}"></div>
          <div><label>Kõrgus (m)</label><input id="k" inputmode="decimal" placeholder="2,5" value="${st.k}"></div>
        </div>
        <h2>Uksed ja aknad (maha)</h2>
        <div class="opening" style="margin-bottom:0"><label>Laius (m)</label><label>Kõrgus (m)</label><label>Tk</label><span></span></div>
        <div id="avad"></div>
        <button class="btn small" id="add">+ Lisa ava</button>
      </div>
      <div class="result" id="out"></div>
      <p class="note">Tulemus salvestub ja plaatide kalkulaator saab seda kasutada.</p>`;

    const $ = (id) => el.querySelector('#' + id);

    const drawAvad = () => {
      $('avad').innerHTML = st.avad.map((a, i) => `
        <div class="opening" data-i="${i}">
          <input inputmode="decimal" data-f="w" value="${a.w}">
          <input inputmode="decimal" data-f="h" value="${a.h}">
          <input inputmode="numeric" data-f="n" value="${a.n}">
          <button class="btn x" data-del="${i}" aria-label="Eemalda">✕</button>
        </div>`).join('');
      $('avad').querySelectorAll('input').forEach((inp) => inp.addEventListener('input', () => {
        st.avad[inp.closest('.opening').dataset.i][inp.dataset.f] = inp.value; calc();
      }));
      $('avad').querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
        st.avad.splice(+b.dataset.del, 1); drawAvad(); calc();
      }));
    };

    const calc = () => {
      st.p = $('p').value; st.l = $('l').value; st.k = $('k').value;
      const p = val($('p')), l = val($('l')), k = val($('k'));
      const v = (s) => parseFloat(String(s).replace(',', '.')) || 0;
      const avad = st.avad.reduce((s, a) => s + v(a.w) * v(a.h) * v(a.n), 0);
      const porand = p * l, ymber = 2 * (p + l);
      const seinad = Math.max(0, ymber * k - avad);
      save('pind', { ...st, porand, seinad });
      $('out').innerHTML =
        line('Põranda pind', num(porand) + ' m²', true) +
        line('Ümbermõõt (liistud)', num(ymber) + ' m') +
        line('Seinte pind kokku', num(ymber * k) + ' m²') +
        line('Avad maha', '− ' + num(avad) + ' m²') +
        line('Seinte pind (puhas)', num(seinad) + ' m²', true) +
        line('Põrand + seinad', num(porand + seinad) + ' m²');
    };

    $('add').addEventListener('click', () => { st.avad.push({ w: '', h: '', n: 1 }); drawAvad(); calc(); });
    ['p', 'l', 'k'].forEach((id) => $(id).addEventListener('input', calc));
    drawAvad();
    calc();
  },
};
