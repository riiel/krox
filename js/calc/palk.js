// Palgakalkulaator (Eesti): bruto ↔ neto ↔ tööandja kulu
import { eur, val, round2, rates, line, seg, load, save } from '../util.js';
import { arvuta } from '../lahetus/calc.js';

// Viimase salvestatud lähetuse päevaraha
function viimaneLahetus() {
  try {
    const l = JSON.parse(localStorage.getItem('krox.lahetused')) || [];
    const x = l.sort((a, b) => (b.kuupaev + b.nr).localeCompare(a.kuupaev + a.nr))[0];
    return x ? { nr: x.nr, summa: arvuta(x.perioodid, +x.korge, +x.madal).kokku } : null;
  } catch { return null; }
}

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
  // sendi täpsusega: väikseim bruto, mille korral sihtsumma on täis
  let b = round2(hi);
  if (key === 'kulu') {
    // eelarvest mitte üle: suurim bruto, mille kulu <= sihtsumma
    while (b > 0 && fromGross(b, o).kulu > target + 1e-9) b = round2(b - 0.01);
    while (fromGross(round2(b + 0.01), o).kulu <= target + 1e-9) b = round2(b + 0.01);
    return b;
  }
  while (fromGross(b, o)[key] < target - 1e-9) b = round2(b + 0.01);
  while (b > 0 && fromGross(round2(b - 0.01), o)[key] >= target - 1e-9) b = round2(b - 0.01);
  return b;
}

export default {
  id: 'palk',
  icon: 'raha',
  short: 'Palk',
  title: 'Palgakalkulaator',
  desc: 'Bruto, neto ja tööandja kulu',
  render(el) {
    const r = rates();
    const st = load('palk', { mode: 'bruto', sum: '', sammas: 2, maksuvaba: r.maksuvaba, tk: true, paevaraha: '' });
    const vl = viimaneLahetus();
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
        <label>Maksuvaba lähetuse päevaraha (€)</label>
        <div class="row">
          <input id="pr" inputmode="decimal" placeholder="0" value="${st.paevaraha}">
          ${vl ? `<button class="btn" id="prLahetus" type="button">Lähetus ${vl.nr}: ${vl.summa} €</button>` : '<span></span>'}
        </div>
      </div>
      <div class="result" id="out"></div>
      <p class="note">Määrad: tulumaks ${r.tulumaks}%, töötuskindlustus ${r.tkTootaja}% + ${r.tkTooandja}%, sotsiaalmaks ${r.sotsiaalmaks}%.
      Maksuvaba tulu kehtib vaid siis, kui töötaja on esitanud avalduse (ühele tööandjale, kuni ${r.maksuvaba} €).
      Päevaraha on maksuvaba ainult vormistatud lähetuse ja piirmäärade korral. Sotsiaalmaksu kuumiinimumi siin ei arvestata. Määrasid saad muuta seadetes.</p>`;

    const $ = (id) => el.querySelector('#' + id);
    const modeBox = $('mode');
    modeBox.querySelector(`[data-v="${st.mode}"]`).classList.add('on');
    const labels = { bruto: 'Brutopalk (€ kuus)', neto: 'Soovitud netopalk (€ kuus)', kulu: 'Tööandja kogukulu (€ kuus)' };

    const calc = () => {
      $('sumLabel').textContent = labels[st.mode];
      st.sum = $('sum').value; st.sammas = +$('sammas').value; st.maksuvaba = val($('mvt')); st.tk = $('tk').checked; st.paevaraha = $('pr').value;
      save('palk', st);
      const s = val($('sum'));
      if (!s) { $('out').innerHTML = line('Sisesta summa', '—'); return; }
      const pr = val($('pr'));
      // Tööandja kulu režiimis on päevaraha summa sees: palgaks jääb ülejäänu
      const target = st.mode === 'kulu' ? s - pr : s;
      if (target <= 0) { $('out').innerHTML = line('Päevaraha on suurem kui summa', '—'); return; }
      const bruto = st.mode === 'bruto' ? target : solve(target, st.mode, st);
      const x = fromGross(bruto, st);
      $('out').innerHTML =
        (pr && st.mode === 'kulu' ? line('Kogusumma', eur(s)) + line('Päevaraha (maksuvaba)', '− ' + eur(pr)) + line('Palgaks jääb (tööandja kulu)', eur(x.kulu)) : '') +
        line('Brutopalk', eur(x.bruto)) +
        line(`II sammas (${st.sammas}%)`, '− ' + eur(x.pension)) +
        line('Töötuskindlustus', '− ' + eur(x.tk)) +
        line('Tulumaks', '− ' + eur(x.tulumaks)) +
        line('Netopalk', eur(x.neto), !pr) +
        (pr ? line('+ Päevaraha', eur(pr)) + line('Kätte kokku', eur(round2(x.neto + pr)), true) : '') +
        line('Sotsiaalmaks (tööandja)', eur(x.sots)) +
        line('Töötuskindlustus (tööandja)', eur(x.tkAndja)) +
        line(pr ? 'Tööandja kulu kokku (koos päevarahaga)' : 'Tööandja kogukulu', eur(round2(x.kulu + pr)), true) +
        line('Maksud ja maksed kokku (kulu − kätte)', eur(round2(x.kulu - x.neto))) +
        line('Kätte jääb kulust', (x.kulu + pr ? Math.round(((x.neto + pr) / (x.kulu + pr)) * 1000) / 10 : 0).toString().replace('.', ',') + ' %');
    };

    seg(modeBox, (v) => { st.mode = v; calc(); });
    if ($('prLahetus')) $('prLahetus').onclick = () => { $('pr').value = String(vl.summa); calc(); };
    el.querySelectorAll('input, select').forEach((i) => i.addEventListener('input', calc));
    calc();
  },
};
