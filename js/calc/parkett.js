// Parketi ridade jaotus: kas alustada täis lauaga või lõigata mõlemad ääred võrdseks
import { num, val, line, load, save } from '../util.js';

export function parkett(W, b, g) {
  const U = W - 2 * g;                 // kasutatav laius
  const n = Math.floor(U / b);         // mahub täis ridu
  const r = U - n * b;                 // jääk
  const full = { rows: n, last: r };   // A: alusta täis lauaga
  // B: võrdsed ääred (alati b/2 … b laiad)
  const eq = r < 0.5 ? { rows: n, edge: 0 } : { rows: n - 1, edge: (r + b) / 2 };
  return { U, full, eq };
}

export default {
  id: 'parkett',
  icon: '🪵',
  title: 'Parketi ridade jaotus',
  desc: 'Täis lauaga või võrdsed ääred?',
  render(el) {
    const st = load('parkett', { W: '', W2: '', b: '187', g: '10', min: '33' });
    el.innerHTML = `
      <div class="card">
        <div class="row">
          <div><label>Toa laius (mm)</label><input id="W" inputmode="decimal" placeholder="2670" value="${st.W}"></div>
          <div><label>Laius teisest otsast (mm)</label><input id="W2" inputmode="decimal" placeholder="valikuline" value="${st.W2}"></div>
        </div>
        <div class="row3">
          <div><label>Laua katvuslaius (mm)</label><input id="b" inputmode="decimal" value="${st.b}"></div>
          <div><label>Vuuk seinast (mm)</label><input id="g" inputmode="decimal" value="${st.g}"></div>
          <div><label>Min. rida (% lauast)</label><input id="min" inputmode="decimal" value="${st.min}"></div>
        </div>
      </div>
      <div class="result" id="out"></div>
      <p class="note">Katvuslaius = nähtav laius ilma punnita (pane kaks lauda kokku ja mõõda). Esimesel real lõika punn seinapoolsest servast ära.
      Kui seinad pole paralleelsed, märgi esimese rea lõikejoon seina järgi kaldu.</p>`;

    const $ = (id) => el.querySelector('#' + id);
    const ids = ['W', 'W2', 'b', 'g', 'min'];

    const calc = () => {
      ids.forEach((id) => (st[id] = $(id).value));
      save('parkett', st);
      const W = val($('W')), W2 = val($('W2')), b = val($('b')), g = val($('g'));
      const minW = (b * val($('min'))) / 100;
      if (!W || !b) { $('out').innerHTML = line('Sisesta toa laius', '—'); return; }

      const x = parkett(W, b, g);
      const okFull = x.full.last === 0 || x.full.last >= minW;
      const better = okFull ? 'Alusta täis lauaga' : 'Lõika mõlemad ääred võrdseks';
      let html =
        line('Kasutatav laius', num(x.U, 0) + ' mm') +
        line('Soovitus', better, true) +
        line('A) Täis lauaga: täis ridu', x.full.rows) +
        line('A) Viimane rida', x.full.last ? num(x.full.last, 0) + ' mm' + (okFull ? ' ✓' : ' ✗ liiga kitsas') : 'puudub ✓') +
        line('B) Võrdsed ääred: täis ridu', x.eq.rows) +
        line('B) Mõlemad ääred', x.eq.edge ? num(x.eq.edge, 1) + ' mm' : 'täis lauad');

      if (W2) {
        const y = parkett(W2, b, g);
        html += line('Teises otsas: viimane rida (A)', num(y.full.last, 0) + ' mm') +
                line('Teises otsas: ääred (B)', num(y.eq.edge, 1) + ' mm') +
                line('Seinte erinevus', num(Math.abs(W - W2), 0) + ' mm');
      }
      $('out').innerHTML = html;
    };

    ids.forEach((id) => $(id).addEventListener('input', calc));
    calc();
  },
};
