// Palgakalkulaator (Eesti): bruto ↔ neto ↔ tööandja kulu
import { eur, val, round2, rates, line, seg, load, save } from '../util.js';

// Põhiarvutus brutopalgast
export function fromGross(bruto, o) {
  const r = rates();
  const pension = round2(bruto * o.sammas / 100);
  const tk = o.tk ? round2(bruto * r.tkTootaja / 100) : 0;
  const maksuvaba = Math.min(o.maksuvaba, Math.max(0, bruto - pension - tk));
  const maksustatav = Math.max(0, bruto - pension - tk - maksuvaba);
  const tulumaks = round2(maksustatav * r.tulumaks / 100);
  const neto = round2(bruto - pension - tk - tulumaks);
  const sots = round2(bruto * r.sotsiaalmaks / 100);
  const tkAndja = o.tk ? round2(bruto * r.tkTooandja / 100) : 0;
  return { bruto, pension, tk, maksuvaba, tulumaks, neto, sots, tkAndja, kulu: round2(bruto + sots + tkAndja) };
}

// Pöördarvutus: leiab bruto, mille korral valitud väärtus = sihtsumma
function solve(target, key, o) {
  let lo = 0, hi = target * 3 + 1000;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (fromGross(mid, o)[key] < target) lo = mid; else hi = mid;
  }
  return round2(hi);
}

export default {
  id: 'palk',
  icon: 'raha',
  short: 'Palk',
  title: 'Palgakalkulaator',
  desc: 'Bruto, neto ja tööandja kulu',
  render(el) {
    const r = rates();
    const st = load('palk', { mode: 'bruto', sum: '', sammas: 2, maksuvaba: r.maksuvaba, tk: true });
    el.innerHTML = `
      <div class="card">
        <div class="seg" id="mode">
          <button data-v="bruto">Brutopalk</button>
          <button data-v="neto">Netopalk</button>
          <button data-v="kulu">Tööandja kulu</button>
        </div>
        <label id="sumLabel">Summa (€ kuus)</label>
        <input id="sum" inputmode="decimal" placeholder="nt 1800" value="${st.sum}">
        <div class="row">
          <div>
            <label>II sammas</label>
            <select id="sammas">
              ${[0, 2, 4, 6].map((p) => `<option value="${p}" ${p == st.sammas ? 'selected' : ''}>${p}%</option>`).join('')}
            </select>
          </div>
          <div>
            <label>Maksuvaba tulu (€)</label>
            <input id="mvt" inputmode="decimal" value="${st.maksuvaba}">
          </div>
        </div>
        <label class="check"><input type="checkbox" id="tk" ${st.tk ? 'checked' : ''}> Töötuskindlustusmakse</label>
      </div>
      <div class="result" id="out"></div>
      <p class="note">Määrad: tulumaks ${r.tulumaks}%, töötuskindlustus ${r.tkTootaja}% + ${r.tkTooandja}%, sotsiaalmaks ${r.sotsiaalmaks}%.
      Maksuvaba tulu kehtib vaid siis, kui töötaja on esitanud avalduse (ühele tööandjale, kuni ${r.maksuvaba} €).
      Sotsiaalmaksu kuumiinimumi siin ei arvestata. Määrasid saad muuta ⚙ seadetes.</p>`;

    const $ = (id) => el.querySelector('#' + id);
    const modeBox = $('mode');
    modeBox.querySelector(`[data-v="${st.mode}"]`).classList.add('on');
    const labels = { bruto: 'Brutopalk (€ kuus)', neto: 'Soovitud netopalk (€ kuus)', kulu: 'Tööandja kogukulu (€ kuus)' };

    const calc = () => {
      $('sumLabel').textContent = labels[st.mode];
      st.sum = $('sum').value; st.sammas = +$('sammas').value; st.maksuvaba = val($('mvt')); st.tk = $('tk').checked;
      save('palk', st);
      const s = val($('sum'));
      if (!s) { $('out').innerHTML = line('Sisesta summa', '—'); return; }
      const bruto = st.mode === 'bruto' ? s : solve(s, st.mode, st);
      const x = fromGross(bruto, st);
      $('out').innerHTML =
        line('Brutopalk', eur(x.bruto)) +
        line(`II sammas (${st.sammas}%)`, '− ' + eur(x.pension)) +
        line('Töötuskindlustus', '− ' + eur(x.tk)) +
        line('Tulumaks', '− ' + eur(x.tulumaks)) +
        line('Netopalk (kätte)', eur(x.neto), true) +
        line('Sotsiaalmaks (tööandja)', eur(x.sots)) +
        line('Töötuskindlustus (tööandja)', eur(x.tkAndja)) +
        line('Tööandja kogukulu', eur(x.kulu), true);
    };

    seg(modeBox, (v) => { st.mode = v; calc(); });
    el.querySelectorAll('input, select').forEach((i) => i.addEventListener('input', calc));
    calc();
  },
};
