// Ruutude kalkulaator: üks sein (laius × kõrgus) või terve ruum; avad maha
import { num, val, line, seg, load, save } from '../util.js';

export default {
  id: 'pind',
  icon: '📐',
  title: 'Ruutude kalkulaator',
  desc: 'Sein, põrand, ruum',
  render(el) {
    const st = load('pind', { mode: 'sein', sw: '', sh: '', p: '', l: '', k: '', avad: [] });
    el.innerHTML = `
      <div class="card">
        <div class="seg" id="mode">
          <button data-v="sein">Sein</button>
          <button data-v="ruum">Terve ruum</button>
        </div>
        <div id="seinBox" class="row">
          <div><label>Laius (m)</label><input id="sw" inputmode="decimal" value="${st.sw}"></div>
          <div><label>Kõrgus (m)</label><input id="sh" inputmode="decimal" value="${st.sh}"></div>
        </div>
        <div id="ruumBox" class="row3">
          <div><label>Pikkus (m)</label><input id="p" inputmode="decimal" value="${st.p}"></div>
          <div><label>Laius (m)</label><input id="l" inputmode="decimal" value="${st.l}"></div>
          <div><label>Kõrgus (m)</label><input id="k" inputmode="decimal" value="${st.k}"></div>
        </div>
        <h2>Uksed ja aknad (maha)</h2>
        <div id="avadHead" class="opening" style="margin-bottom:0"><label>Laius (m)</label><label>Kõrgus (m)</label><label>Tk</label><span></span></div>
        <div id="avad"></div>
        <button class="btn small" id="add">+ Lisa uks / aken</button>
      </div>
      <div class="result" id="out"></div>
      <p class="note">Tulemus salvestub ja plaatide kalkulaator saab seda kasutada.</p>`;

    const $ = (id) => el.querySelector('#' + id);
    $('mode').querySelector(`[data-v="${st.mode}"]`).classList.add('on');
    const v = (s) => parseFloat(String(s).replace(',', '.')) || 0;

    const drawAvad = () => {
      $('avadHead').style.display = st.avad.length ? '' : 'none';
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
      ['sw', 'sh', 'p', 'l', 'k'].forEach((id) => (st[id] = $(id).value));
      $('seinBox').style.display = st.mode === 'sein' ? '' : 'none';
      $('ruumBox').style.display = st.mode === 'ruum' ? '' : 'none';
      const avad = st.avad.reduce((s, a) => s + v(a.w) * v(a.h) * v(a.n), 0);

      if (st.mode === 'sein') {
        const brutto = val($('sw')) * val($('sh'));
        const seinad = Math.max(0, brutto - avad);
        save('pind', { ...st, seinad });
        $('out').innerHTML =
          line('Seina pind', num(brutto) + ' m²') +
          line('Uksed/aknad maha', '− ' + num(avad) + ' m²') +
          line('Seina pind (puhas)', num(seinad) + ' m²', true);
        return;
      }

      const p = val($('p')), l = val($('l')), k = val($('k'));
      const porand = p * l, ymber = 2 * (p + l);
      const seinad = Math.max(0, ymber * k - avad);
      save('pind', { ...st, porand, seinad });
      $('out').innerHTML =
        line('Põranda pind', num(porand) + ' m²', true) +
        line('Ümbermõõt (liistud)', num(ymber) + ' m') +
        line('Seinte pind kokku', num(ymber * k) + ' m²') +
        line('Uksed/aknad maha', '− ' + num(avad) + ' m²') +
        line('Seinte pind (puhas)', num(seinad) + ' m²', true) +
        line('Põrand + seinad', num(porand + seinad) + ' m²');
    };

    seg($('mode'), (m) => { st.mode = m; calc(); });
    $('add').addEventListener('click', () => { st.avad.push({ w: '', h: '', n: 1 }); drawAvad(); calc(); });
    ['sw', 'sh', 'p', 'l', 'k'].forEach((id) => $(id).addEventListener('input', calc));
    drawAvad();
    calc();
  },
};
