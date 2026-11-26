// Seaded: firma andmed, maksumäärad, varukoopia
import { val, rates, save, load, DEFAULT_RATES } from '../util.js';
import { exportAll, importFile, lastBackup } from '../backup.js';

const fields = [
  ['tulumaks', 'Tulumaks (%)'],
  ['maksuvaba', 'Maksuvaba tulu (€ kuus)'],
  ['tkTootaja', 'Töötuskindlustus, töötaja (%)'],
  ['tkTooandja', 'Töötuskindlustus, tööandja (%)'],
  ['sotsiaalmaks', 'Sotsiaalmaks (%)'],
  ['km', 'Käibemaks (%)'],
];

export const DEFAULT_FIRMA = {
  nimi: 'KROX OÜ', regkood: '', kmkr: 'EE102941724', aadress: 'Metsa tn 15a-65, 80024 Pärnu', iban: 'EE82 7700 7710 1252 7693', pank: 'LHV Pank',
  telefon: '+372 529 9715', email: 'krox.ou@gmail.com',
};
const firmaFields = [
  ['nimi', 'Nimi'], ['regkood', 'Registrikood'], ['kmkr', 'KMKR number'], ['aadress', 'Aadress'],
  ['iban', 'Pangakonto (IBAN)'], ['pank', 'Pank'], ['telefon', 'Telefon'], ['email', 'E-post'],
];
export const firma = () => load('firma', DEFAULT_FIRMA);

const esc = (s) => String(s ?? '').replace(/"/g, '&quot;');

export default {
  id: 'seaded',
  icon: '⚙',
  title: 'Seaded',
  desc: '',
  render(el) {
    const r = rates(), f = firma();
    const lb = lastBackup();
    el.innerHTML = `
      <h2>Varukoopia</h2>
      <div class="card">
        <p class="note" style="margin-top:0">Kõik andmed (tööpäevik, hinnad, seaded) on ainult selles telefonis.
        Tee aeg-ajalt varukoopia ja hoia faili näiteks Google Drive'is.</p>
        <p class="note"><b>Viimane varukoopia:</b> ${lb ? lb.split('-').reverse().join('.') : 'pole veel tehtud'}</p>
        <div class="actions" style="margin-top:8px">
          <button class="btn primary" id="exp">⬇ Tee varukoopia</button>
          <button class="btn" id="imp">⬆ Taasta failist</button>
        </div>
        <input type="file" id="file" accept=".json,application/json" hidden>
        <p class="note" id="bmsg"></p>
      </div>

      <h2>Firma andmed</h2>
      <div class="card">
        ${firmaFields.map(([k, t]) => `<label>${t}</label><input data-f="${k}" value="${esc(f[k])}">`).join('')}
        <div style="margin-top:16px"><button class="btn primary" id="saveF">Salvesta</button></div>
        <p class="note" id="fmsg">Neid andmeid kasutatakse arvetel ja pakkumistel.</p>
      </div>

      <h2>Maksumäärad</h2>
      <div class="card">
        ${fields.map(([k, t]) => `<label>${t}</label><input data-k="${k}" inputmode="decimal" value="${String(r[k]).replace('.', ',')}">`).join('')}
        <div style="display:flex;gap:10px;margin-top:16px">
          <button class="btn primary" id="save">Salvesta</button>
          <button class="btn" id="reset">Taasta 2026 määrad</button>
        </div>
        <p class="note" id="msg"></p>
      </div>`;

    const $ = (id) => el.querySelector('#' + id);

    $('exp').onclick = () => { exportAll(); $('bmsg').textContent = 'Fail laaditi alla (vaata „Allalaaditud“ kausta).'; };
    $('imp').onclick = () => $('file').click();
    $('file').onchange = async () => {
      const file = $('file').files[0];
      if (!file) return;
      if (!confirm('Taastamine asendab praegused andmed failis olevatega. Jätkan?')) return;
      try {
        const n = await importFile(file);
        alert(`Taastatud. Tööpäevikus on ${n} kirjet.`);
        location.hash = '#/';
      } catch (e) { $('bmsg').textContent = 'Viga: ' + e.message; }
    };

    $('saveF').onclick = () => {
      const nf = {};
      el.querySelectorAll('[data-f]').forEach((i) => (nf[i.dataset.f] = i.value.trim()));
      save('firma', nf);
      $('fmsg').textContent = 'Salvestatud.';
    };

    $('save').onclick = () => {
      const nr = {};
      el.querySelectorAll('[data-k]').forEach((i) => (nr[i.dataset.k] = val(i)));
      save('rates', nr);
      $('msg').textContent = 'Salvestatud.';
    };
    $('reset').onclick = () => {
      save('rates', DEFAULT_RATES);
      el.querySelectorAll('[data-k]').forEach((i) => (i.value = String(DEFAULT_RATES[i.dataset.k]).replace('.', ',')));
      $('msg').textContent = 'Taastatud vaikemäärad.';
    };
  },
};
