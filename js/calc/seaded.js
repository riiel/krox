// Seaded: varukoopia, maksumäärad
import { ico } from '../icons.js';
import { val, rates, save, DEFAULT_RATES } from '../util.js';
import { exportAll, importFile, lastBackup, autoBackup, autoInfo } from '../backup.js';
import { pin, setPin, api } from '../kulud/store.js';
import { isNative, VERSION } from '../native.js';

const fields = [
  ['tulumaks', 'Tulumaks (%)'],
  ['maksuvaba', 'Maksuvaba tulu (€ kuus)'],
  ['tkTootaja', 'Töötuskindlustus, töötaja (%)'],
  ['tkTooandja', 'Töötuskindlustus, tööandja (%)'],
  ['sotsiaalmaks', 'Sotsiaalmaks (%)'],
  ['km', 'Käibemaks (%)'],
];

export default {
  id: 'seaded',
  icon: 'seaded',
  title: 'Seaded',
  desc: '',
  render(el) {
    const r = rates();
    const lb = lastBackup();
    const autoTxt = () => { const a = autoInfo(); return a?.kp ? `Viimane: <b>${a.kp.split('-').reverse().join('.')}</b> → ${a.to || 'Gmail'}` : (pin() ? 'Esimene varukoopia läheb teele järgmisel avamisel.' : 'Automaatseks varukoopiaks lisa ülal PIN.'); };
    el.innerHTML = `
      <h2>Tšekid</h2>
      <div class="card">
        <label>Kuhu tšekid saata</label>
        <div class="seg" id="siht"><button data-v="costpocket">CostPocket (e-post)</button><button data-v="merit">Merit (vajab Pro)</button></div>
        <p class="note">CostPocket: tšekk läheb e-kirjaga sinu CostPocketi aadressile ja sealt Meritisse. Merit otse vajab Merit Aktiva Pro või Premium paketti.</p>
      </div>

      <h2>Ühendused</h2>
      <div class="card">
        <label>PIN (sama mis Vercelis APP_PIN)</label>
        <input id="pin" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" value="${pin() ? '••••' : ''}">
        <div class="actions" style="margin-top:10px">
          <button class="btn primary" id="savePin">Salvesta PIN</button>
          <button class="btn" id="test">Kontrolli ühendust</button>
        </div>
        <p class="note" id="pmsg"></p>
      </div>

      <h2>Varukoopia</h2>
      <div class="card">
        ${isNative ? `<p class="note" style="margin-top:0">${ico('kell', 'gold')} <b>Automaatne:</b> kui andmed muutuvad, saadab äpp kord päevas varukoopia (koos tööriistade piltidega) firma Gmaili. Uues telefonis lae kiri „KROX varukoopia“ manus alla ja vajuta siin <b>Taasta failist</b>.</p>
        <p class="note" id="auto">${autoTxt()}</p>` : `<p class="note" style="margin-top:0">Andmed on ainult selles seadmes. Äpis tehakse varukoopia automaatselt.</p>`}
        <div class="actions" style="margin-top:8px">
          ${isNative ? `<button class="btn primary" id="autoNow">${ico('yles')}Saada kohe</button>` : ''}
          <button class="btn${isNative ? '' : ' primary'}" id="exp">${ico('alla')}Salvesta fail</button>
          <button class="btn" id="imp">${ico('yles')}Taasta failist</button>
        </div>
        <input type="file" id="file" multiple hidden>
        <p class="note" id="bmsg"></p>
      </div>

      ${isNative ? `<p class="note">KROX äpp, versioon ${VERSION || '?'}</p>` : ''}

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

    $('pin').onfocus = () => { if ($('pin').value === '••••') $('pin').value = ''; };
    $('savePin').onclick = () => { const v = $('pin').value.trim(); if (v && v !== '••••') { setPin(v); $('pmsg').textContent = 'PIN salvestatud.'; } };
    const sihtNow = () => { try { return localStorage.getItem('krox.tsekid.siht') || 'costpocket'; } catch { return 'costpocket'; } };
    el.querySelectorAll('#siht button').forEach((b) => {
      b.classList.toggle('on', b.dataset.v === sihtNow());
      b.onclick = () => { try { localStorage.setItem('krox.tsekid.siht', b.dataset.v); } catch { /* */ } el.querySelectorAll('#siht button').forEach((x) => x.classList.toggle('on', x === b)); };
    });
    $('test').onclick = async () => {
      $('pmsg').textContent = 'Kontrollin…';
      if (sihtNow() === 'costpocket') {
        try { await api('costpocket', { failinimi: 'test.txt', base64: btoa('KROX test'), tyyp: 'text/plain', kirjeldus: 'Test KROX äpist – võib kustutada.' }); $('pmsg').textContent = '✓ Testkiri saadetud CostPocketisse.'; }
        catch (e) { $('pmsg').textContent = '✗ ' + e.message; }
        return;
      }
      try {
        const r = await api('merit', { action: 'taxes' });
        const pcts = r.taxes.map((t) => t.pct).filter((p) => p != null);
        $('pmsg').textContent = `✓ Merit töötab. Leitud käibemaksumäärad: ${[...new Set(pcts)].sort((a, b) => b - a).join('%, ')}%`;
      } catch (e) { $('pmsg').textContent = '✗ ' + e.message; }
    };
    $('exp').onclick = async () => {
      const r = await exportAll();
      $('bmsg').textContent = r === 'downloaded' ? 'Fail laaditi alla (vaata „Allalaaditud“ kausta).' : r === 'shared' ? '✓ Fail jagatud.' : '';
    };
    if ($('autoNow')) $('autoNow').onclick = async () => {
      $('bmsg').textContent = 'Saadan…';
      try { const r = await autoBackup(true); $('bmsg').textContent = `✓ Varukoopia saadetud: ${r.to}`; $('auto').innerHTML = autoTxt(); }
      catch (e) { $('bmsg').textContent = '✗ ' + e.message; }
    };
    $('imp').onclick = () => $('file').click();
    $('file').onchange = async () => {
      const files = $('file').files;
      if (!files.length) return;
      if (!confirm('Taastamine asendab praegused andmed failis olevatega. Jätkan?')) return;
      try {
        const r = await importFile(files);
        alert(`Taastatud.${r.andmed ? ` Tööpäevikus on ${r.paevik} kirjet.` : ''}${r.pilte ? ` Pilte: ${r.pilte}.` : ''}`);
        location.hash = '#/';
      } catch (e) { $('bmsg').textContent = 'Viga: ' + e.message; }
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
