// Plaatide paigutus: kust alustada, et servad tuleksid võrdsed ja piisavalt laiad (mõlemas suunas)
import { num, val, line, load, save } from '../util.js';

// Ühe suuna variandid. W = pinna mõõt, t = plaat, j = vuuk (mm)
export function suund(W, t, j) {
  const p = t + j;
  const half = W / 2;
  const kJ = Math.max(0, Math.floor((half - j / 2) / p));
  const cutJ = half - j / 2 - kJ * p;                // vuuk keskel
  const kT = Math.max(0, Math.floor((half - t / 2 - j) / p));
  const cutT = half - t / 2 - j - kT * p;            // plaat keskel
  const kF = Math.floor((W + j) / p);
  const cutF = W - kF * p;                           // täisplaadiga seinast
  const v = [
    { id: 'F', nimi: 'Täisplaat seinast', serv1: t, serv2: cutF > 0.5 ? cutF : 0, plaate: kF + (cutF > 0.5 ? 1 : 0), algus: 0 },
    { id: 'J', nimi: 'Vuuk keskel', serv1: cutJ, serv2: cutJ, plaate: 2 * kJ + (cutJ > 0.5 ? 2 : 0), algus: cutJ > 0.5 ? cutJ + j : 0 },
    { id: 'T', nimi: 'Plaat keskel', serv1: cutT, serv2: cutT, plaate: 2 * kT + 1 + (cutT > 0.5 ? 2 : 0), algus: cutT > 0.5 ? cutT + j : 0 },
  ];
  // parim: suurim väikseim serv (täisplaat-variandis 0 = ilma lõiketa, see on parim)
  const skoor = (x) => (x.serv2 === 0 && x.id === 'F' ? Infinity : Math.min(x.serv1, x.serv2));
  const parim = [...v].sort((a, b) => skoor(b) - skoor(a))[0];
  return { v, parim };
}

export default {
  id: 'paigutus',
  icon: 'paigutus',
  short: 'Paigutus',
  title: 'Plaatide paigutus',
  desc: 'Kust alustada, et servad oleks võrdsed',
  render(el) {
    const st = load('paigutus', { W: '', H: '', tw: '600', th: '600', j: '2', min: '33' });
    el.innerHTML = `
      <div class="card">
        <div class="row">
          <div><label>Pinna laius (mm)</label><input id="W" inputmode="decimal" placeholder="nt 2350" value="${st.W}"></div>
          <div><label>Kõrgus / pikkus (mm)</label><input id="H" inputmode="decimal" placeholder="nt 2720" value="${st.H}"></div>
        </div>
        <div class="row">
          <div><label>Plaadi laius (mm)</label><input id="tw" inputmode="decimal" value="${st.tw}"></div>
          <div><label>Plaadi kõrgus (mm)</label><input id="th" inputmode="decimal" value="${st.th}"></div>
        </div>
        <div class="row">
          <div><label>Vuuk (mm)</label><input id="j" inputmode="decimal" value="${st.j}"></div>
          <div><label>Min. serv (% plaadist)</label><input id="min" inputmode="decimal" value="${st.min}"></div>
        </div>
      </div>
      <div id="out"></div>
      <p class="note">Sisesta pinna mõõt nii, nagu laudise puhul: servavuuk või silikoonivahe on juba maha arvatud. „Alusta“ näitab, kui kaugele seinast märgid esimese täisplaadi serva (sinna loodi või laser).</p>`;
    const $ = (id) => el.querySelector('#' + id);
    const ids = ['W', 'H', 'tw', 'th', 'j', 'min'];

    const blokk = (pealkiri, W, t, j, minW, telg) => {
      const r = suund(W, t, j);
      const ok = (x) => (x.serv2 === 0 && x.id === 'F') || Math.min(x.serv1, x.serv2) >= minW;
      const p = r.parim;
      const servTxt = (x) => (x.id === 'F' ? (x.serv2 ? `täis + ${num(x.serv2, 0)} mm` : 'ilma lõiketa') : `${num(x.serv1, 0)} + ${num(x.serv2, 0)} mm`);
      return `<h2>${pealkiri}</h2><div class="result">
        ${line('Soovitus', p.nimi + (ok(p) ? ' ✓' : ' – servad jäävad kitsaks'), true)}
        ${line('Servad', servTxt(p))}
        ${p.algus ? line(`Alusta (${telg})`, `${num(p.algus, 0)} mm seinast`, true) : line('Alusta', 'täisplaadiga seina äärest')}
        ${line('Plaate reas', p.plaate)}
        ${r.v.filter((x) => x !== p).map((x) => line(x.nimi, servTxt(x) + (ok(x) ? '' : ' ✗'))).join('')}
      </div>`;
    };

    const calc = () => {
      ids.forEach((id) => (st[id] = $(id).value));
      save('paigutus', st);
      const W = val($('W')), H = val($('H')), tw = val($('tw')), th = val($('th')), j = val($('j'));
      if (!tw || !th || (!W && !H)) { $('out').innerHTML = `<div class="result">${line('Sisesta pinna ja plaadi mõõdud', '—')}</div>`; return; }
      const m = val($('min')) / 100;
      let html = '';
      if (W) html += blokk('Laiuses (vasak ↔ parem)', W, tw, j, tw * m, 'vasakult');
      if (H) html += blokk('Kõrguses / pikkuses', H, th, j, th * m, 'alt / eest');
      if (W && H) {
        const a = suund(W, tw, j).parim.plaate, b = suund(H, th, j).parim.plaate;
        html += `<div class="result" style="margin-top:10px">${line('Plaate kokku (lõigatud tükid sh)', `${a} × ${b} = ${a * b} tk`, true)}</div>`;
      }
      $('out').innerHTML = html;
    };
    ids.forEach((id) => $(id).addEventListener('input', calc));
    calc();
  },
};
