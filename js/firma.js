// Firma andmed: alati käepärast, puudutus kopeerib, „Jaga kõik“ saadab tervikuna
import { ico } from './icons.js';
import { shareText } from './native.js';

const KEY = 'krox.firma';
const VALJAD = [
  ['nimi', 'Nimi'],
  ['regkood', 'Registrikood'],
  ['kmkr', 'KMKR nr'],
  ['aadress', 'Aadress'],
  ['iban', 'Arvelduskonto (IBAN)'],
  ['pank', 'Pank'],
  ['juhatus', 'Juhatuse liige'],
  ['telefon', 'Telefon'],
  ['email', 'E-post'],
  ['veeb', 'Koduleht'],
];
const DEFAULT = {
  nimi: 'KROX OÜ', regkood: '17404836', kmkr: 'EE102941724', aadress: 'Metsa tn 15a-65, 80024 Pärnu',
  iban: 'EE827700771012527693', pank: 'LHV Pank (BIC LHVBEE22)', juhatus: 'Karmo Riiel', telefon: '', email: 'krox.ou@gmail.com', veeb: '',
};
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const firma = () => { try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return { ...DEFAULT }; } };
const iban4 = (s) => String(s).replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
const naita = (k, v) => (k === 'iban' ? iban4(v) : v);

async function kopeeri(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

let muuda = false;
function render(el) {
  const f = firma();
  el.innerHTML = muuda ? `
    <div class="card">
      ${VALJAD.map(([k, n]) => `<label>${n}</label><input data-k="${k}" value="${esc(f[k])}" ${k === 'email' ? 'inputmode="email"' : k === 'telefon' ? 'inputmode="tel"' : ''}>`).join('')}
    </div>
    <div class="actions" style="margin-top:12px"><button class="btn primary" id="salv">${ico('salvesta')}Salvesta</button><button class="btn" id="loobu">Loobu</button></div>`
    : `
    <p class="note" style="margin-top:0">Puuduta rida, et kopeerida.</p>
    <div class="card firma-list">
      ${VALJAD.filter(([k]) => f[k]).map(([k, n]) => `
        <button class="firma-row" data-k="${k}">
          <span><small>${n}</small><b>${esc(naita(k, f[k]))}</b></span>
          <span class="firma-c">${ico('kopeeri')}</span>
        </button>`).join('')}
    </div>
    <div class="actions" style="margin-top:12px">
      <button class="btn primary" id="jaga">${ico('jaga')}Jaga kõik</button>
      <button class="btn" id="muuda">${ico('pliiats')}Muuda</button>
    </div>
    <p class="note" id="fmsg"></p>`;
  const $ = (q) => el.querySelector(q);
  if (muuda) {
    $('#salv').onclick = () => {
      const n = {}; el.querySelectorAll('[data-k]').forEach((i) => (n[i.dataset.k] = i.value.trim()));
      localStorage.setItem(KEY, JSON.stringify(n)); muuda = false; render(el);
    };
    $('#loobu').onclick = () => { muuda = false; render(el); };
    return;
  }
  el.querySelectorAll('.firma-row').forEach((b) => (b.onclick = async () => {
    const k = b.dataset.k;
    const v = k === 'iban' ? f.iban.replace(/\s/g, '') : f[k];
    if (await kopeeri(v)) {
      el.querySelectorAll('.firma-row.ok').forEach((x) => x.classList.remove('ok'));
      b.classList.add('ok'); b.querySelector('.firma-c').innerHTML = '✓';
      setTimeout(() => { b.classList.remove('ok'); b.querySelector('.firma-c').innerHTML = ico('kopeeri'); }, 1500);
    } else $('#fmsg').textContent = v;
  }));
  $('#jaga').onclick = async () => {
    const text = VALJAD.filter(([k]) => f[k]).map(([k, n]) => (k === 'nimi' ? f[k] : `${n}: ${naita(k, f[k])}`)).join('\n');
    const r = await shareText(text);
    if (r === 'copied') $('#fmsg').textContent = 'Kopeeritud, saad kuhu iganes kleepida.';
  };
  $('#muuda').onclick = () => { muuda = true; render(el); };
}

export default { id: 'firma', icon: 'firma', title: 'Firma andmed', desc: '', render };
