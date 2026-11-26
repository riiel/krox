// Ruutude kalkulaator: üks sein (laius × kõrgus) või terve ruum; avad maha
import { num, val, line, seg, load, save } from '../util.js';

export default {
  id: 'pind',
  icon: '📐',
  title: 'Ruutude kalkulaator',
  desc: 'Seinad, põrand, ruum',
  render(el) {
    const st = load('pind', { mode: 'sein', sw: '', sh: '', p: '', l: '', k: '', avad: [] });
    if (!Array.isArray(st.seinad) || !st.seinad.length) st.seinad = [{ w: st.sw || '', h: st.sh || '' }];
    el.innerHTML = `
      <div class="card">
        <div class="seg" id="mode">
          <button data-v="sein">Sein</button>
          <button data-v="ruum">Terve ruum</button>
        </div>
        <div id="seinBox">
          <div class="wall wall-head"><label>Sein</label><label>Laius (m)</label><label>Kõrgus (m)</label><span></span></div>
          <div id="seinad"></div>
          <div class="actions" style="margin-top:4px">
            <button class="btn small" id="addSein">+ Lisa sein</button>
            <button class="btn small" id="clearSein">Tühjenda</button>
          </div>
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

    const drawSeinad = (focusLast = false) => {
      $('seinad').innerHTML = st.seinad.map((w, i) => `
        <div class="wall" data-i="${i}">
          <span class="wn">${i + 1}.</span>
          <input inputmode="decimal" data-f="w" value="${w.w}">
          <input inputmode="decimal" data-f="h" value="${w.h}">
          <button class="btn x" data-del="${i}" aria-label="Eemalda" ${st.seinad.length < 2 ? 'disabled' : ''}>✕</button>
        </div>`).join('');
      $('seinad').querySelectorAll('input').forEach((inp) => inp.addEventListener('input', () => {
        st.seinad[inp.closest('.wall').dataset.i][inp.dataset.f] = inp.value; calc();
      }));
      $('seinad').querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
        st.seinad.splice(+b.dataset.del, 1); drawSeinad(); calc();
      }));
      if (focusLast) $('seinad').querySelector('.wall:last-child [data-f=w]').focus();
    };

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
      ['p', 'l', 'k'].forEach((id) => (st[id] = $(id).value));
      $('seinBox').style.display = st.mode === 'sein' ? '' : 'none';
      $('ruumBox').style.display = st.mode === 'ruum' ? '' : 'none';
      const avad = st.avad.reduce((s, a) => s + v(a.w) * v(a.h) * v(a.n), 0);

      if (st.mode === 'sein') {
        const pinnad = st.seinad.map((w) => v(w.w) * v(w.h));
        const brutto = pinnad.reduce((a, b) => a + b, 0);
        const seinad = Math.max(0, brutto - avad);
        save('pind', { ...st, seinad });
        $('out').innerHTML =
          (st.seinad.length > 1 ? pinnad.map((p, i) => line(`${i + 1}. sein`, num(p) + ' m²')).join('') : '') +
          line(st.seinad.length > 1 ? 'Seinad kokku' : 'Seina pind', num(brutto) + ' m²') +
          (avad ? line('Uksed/aknad maha', '− ' + num(avad) + ' m²') : '') +
          line('Puhas pind', num(seinad) + ' m²', true);
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
    ['p', 'l', 'k'].forEach((id) => $(id).addEventListener('input', calc));
    $('addSein').addEventListener('click', () => {
      const last = st.seinad[st.seinad.length - 1];
      st.seinad.push({ w: '', h: last?.h || '' }); // kõrgus tavaliselt sama
      drawSeinad(true); calc();
    });
    $('clearSein').addEventListener('click', () => { st.seinad = [{ w: '', h: '' }]; st.avad = []; drawSeinad(true); drawAvad(); calc(); });
    drawSeinad();
    drawAvad();
    calc();
  },
};
