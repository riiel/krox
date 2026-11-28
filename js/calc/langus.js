// Langus trapi / renni suunas: kõrguste vahe punktide kaupa
import { num, val, line, load, save } from '../util.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export default {
  id: 'langus',
  icon: 'langus',
  short: 'Langus',
  title: 'Langus trapi suunas',
  desc: 'Kõrguste vahe punktide kaupa',
  render(el) {
    const st = load('langus', { kalle: '1,5', punktid: [{ n: 'Kaugeim nurk', d: '' }, { n: 'Uks', d: '' }], h: '', l: '' });
    const draw = () => {
      el.innerHTML = `
        <div class="card">
          <label>Kalle (%)</label>
          <div class="row3" style="align-items:center">
            <input id="kalle" inputmode="decimal" value="${esc(st.kalle)}">
            <button class="btn small" data-k="1">1%</button>
            <button class="btn small" data-k="1,5">1,5%</button>
            <button class="btn small" data-k="2">2%</button>
          </div>
          <label>Punktid (kaugus trapist või rennist, cm)</label>
          <div id="pp">${st.punktid.map((p, i) => `
            <div class="row lg-row" data-i="${i}">
              <input data-f="n" value="${esc(p.n)}" placeholder="Nimi">
              <input data-f="d" inputmode="decimal" value="${esc(p.d)}" placeholder="cm">
              <b class="lg-mm"></b>
              <button class="btn small" data-x aria-label="Kustuta">✕</button>
            </div>`).join('')}</div>
          <button class="btn" id="lisa" style="width:100%;margin-top:8px">+ Lisa punkt</button>
        </div>
        <div class="result" id="out"></div>

        <h2>Kontrolli kallet</h2>
        <div class="card">
          <div class="row">
            <div><label>Kõrguste vahe (mm)</label><input id="h" inputmode="decimal" value="${esc(st.h)}"></div>
            <div><label>Kaugus (cm)</label><input id="l" inputmode="decimal" value="${esc(st.l)}"></div>
          </div>
        </div>
        <div class="result" id="out2"></div>
        <p class="note">Duššialal tavaliselt 1–2% trapi suunas, mujal märjas ruumis võib vähem. Kõrgus on mm võrra kõrgemal kui trapi ääre kõrgus (plaadi pealispind).</p>`;
      bind();
    };
    const $ = (id) => el.querySelector('#' + id);
    const calc = () => {
      save('langus', st);
      const k = parseFloat(String(st.kalle).replace(',', '.')) || 0;
      let max = 0;
      el.querySelectorAll('.lg-row').forEach((row) => {
        const d = parseFloat(String(st.punktid[+row.dataset.i].d).replace(',', '.')) || 0;
        const mm = d * 10 * k / 100;
        max = Math.max(max, mm);
        row.querySelector('.lg-mm').textContent = d ? `+${num(mm, 1)} mm` : '';
      });
      $('out').innerHTML = line('1 meetri kohta', `${num(k * 10, 1)} mm`) + line('Suurim kõrguste vahe', `${num(max, 1)} mm`, true);
      const h = val($('h')), l = val($('l'));
      $('out2').innerHTML = h && l ? line('Kalle', `${num(h / (l * 10) * 100, 2)} %`, true) + line('1 meetri kohta', `${num(h / (l / 100), 1)} mm`) : line('Sisesta vahe ja kaugus', '—');
    };
    function bind() {
      $('kalle').addEventListener('input', () => { st.kalle = $('kalle').value; calc(); });
      el.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => { st.kalle = b.dataset.k; $('kalle').value = st.kalle; calc(); }));
      el.querySelectorAll('.lg-row').forEach((row) => {
        const p = st.punktid[+row.dataset.i];
        row.querySelectorAll('[data-f]').forEach((i) => i.addEventListener('input', () => { p[i.dataset.f] = i.value; calc(); }));
        row.querySelector('[data-x]').onclick = () => { st.punktid.splice(+row.dataset.i, 1); save('langus', st); draw(); };
      });
      $('lisa').onclick = () => { st.punktid.push({ n: '', d: '' }); save('langus', st); draw(); el.querySelector('.lg-row:last-child [data-f=n]')?.focus(); };
      ['h', 'l'].forEach((id) => $(id).addEventListener('input', () => { st[id] = $(id).value; calc(); }));
      calc();
    }
    draw();
  },
};
