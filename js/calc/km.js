// Käibemaksu kalkulaator: lisa KM või eralda KM
import { eur, val, round2, rates, line, seg, load, save } from '../util.js';

export default {
  id: 'km',
  icon: 'protsent',
  short: 'Käibemaks',
  title: 'Käibemaks',
  desc: 'Lisa või eralda KM',
  render(el) {
    const r = rates();
    const st = load('km', { mode: 'lisa', sum: '', maar: r.km });
    el.innerHTML = `
      <div class="card">
        <div class="seg" id="mode">
          <button data-v="lisa">Lisa KM</button>
          <button data-v="eralda">Eralda KM</button>
        </div>
        <label id="sumLabel"></label>
        <input id="sum" inputmode="decimal" placeholder="nt 1000" value="${st.sum}">
        <label>KM määr (%)</label>
        <div class="row">
          <select id="preset">
            ${[24, 13, 9, 0].map((p) => `<option value="${p}">${p}%</option>`).join('')}
            <option value="muu">Muu…</option>
          </select>
          <input id="maar" inputmode="decimal" value="${st.maar}">
        </div>
      </div>
      <div class="result" id="out"></div>
      <p class="note">Üldine KM määr on ${r.km}%. Ehitus- ja plaatimistööd käivad üldise määraga.</p>`;

    const $ = (id) => el.querySelector('#' + id);
    $('mode').querySelector(`[data-v="${st.mode}"]`).classList.add('on');
    $('preset').value = [24, 13, 9, 0].includes(+st.maar) ? String(st.maar) : 'muu';

    const calc = () => {
      $('sumLabel').textContent = st.mode === 'lisa' ? 'Summa ilma KM-ta (€)' : 'Summa koos KM-ga (€)';
      st.sum = $('sum').value; st.maar = val($('maar'));
      save('km', st);
      const s = val($('sum')), p = st.maar / 100;
      let neto, kmSum, bruto;
      if (st.mode === 'lisa') { neto = s; kmSum = round2(s * p); bruto = round2(s + kmSum); }
      else { bruto = s; neto = round2(s / (1 + p)); kmSum = round2(bruto - neto); }
      $('out').innerHTML =
        line('Ilma KM-ta', eur(neto)) +
        line(`Käibemaks (${st.maar}%)`, eur(kmSum)) +
        line('Koos KM-ga', eur(bruto), true);
    };

    seg($('mode'), (v) => { st.mode = v; calc(); });
    $('preset').addEventListener('change', () => {
      if ($('preset').value !== 'muu') $('maar').value = $('preset').value;
      else $('maar').focus();
      calc();
    });
    $('sum').addEventListener('input', calc);
    $('maar').addEventListener('input', () => {
      $('preset').value = [24, 13, 9, 0].includes(val($('maar'))) ? String(val($('maar'))) : 'muu';
      calc();
    });
    calc();
  },
};
