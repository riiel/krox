// Otselingid: päise nupp avab alt poole ekraani ploki; lingid on muudetavad
import { ico } from './icons.js';

const KEY = 'krox.lingid';
const DEFAULT = [
  { nimi: 'Google Drive', url: 'https://drive.google.com' },
  { nimi: 'Merit Aktiva', url: 'https://aktiva.merit.ee' },
  { nimi: 'Circle K', url: 'https://www.circlek.ee' },
  { nimi: 'e-MTA', url: 'https://www.emta.ee' },
  { nimi: 'eesti.ee', url: 'https://www.eesti.ee' },
];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || DEFAULT.map((x) => ({ ...x })); } catch { return DEFAULT.map((x) => ({ ...x })); } };
const save = (l) => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* */ } };
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const fixUrl = (u) => (u && !/^[a-z]+:/i.test(u) ? 'https://' + u : u);

let sheet, edit = false;

function draw() {
  const l = load();
  sheet.querySelector('.sheet-body').innerHTML = edit ? `
    ${l.map((x, i) => `
      <div class="lnk-edit" data-i="${i}">
        <input data-f="nimi" value="${esc(x.nimi)}" placeholder="Nimi">
        <input data-f="url" value="${esc(x.url)}" placeholder="https://…" inputmode="url">
        <div class="lnk-btns">
          <button class="btn small" data-mv="-1" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button class="btn small" data-mv="1" ${i === l.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="btn small danger" data-del>${ico('prugi')}</button>
        </div>
      </div>`).join('')}
    <button class="btn" id="lnkAdd" style="width:100%;margin-top:8px">${ico('lisa')}Lisa link</button>
    <p class="note">Vihje: ava leht brauseris, kopeeri aadress ülevalt ja kleebi siia.</p>`
    : `<a class="lnk firma-lnk" href="#/firma"><span class="lnk-m">${ico('firma')}</span><span class="lnk-t"><b>Firma andmed</b><small>Reg.kood, KMKR, IBAN, aadress</small></span>${ico('edasi')}</a>` + (l.length ? `<div class="lnk-grid">${l.map((x) => `
      <a class="lnk" href="${esc(fixUrl(x.url))}" target="_blank" rel="noopener">
        <span class="lnk-m">${esc((x.nimi || '?').trim().slice(0, 1).toUpperCase())}</span>
        <span class="lnk-t"><b>${esc(x.nimi)}</b><small>${esc(host(fixUrl(x.url)))}</small></span>
        ${ico('valja')}
      </a>`).join('')}</div>` : '<p class="note">Linke pole. Vajuta „Muuda“, et lisada.</p>');
  sheet.querySelector('#lnkEdit').textContent = edit ? 'Valmis' : 'Muuda';

  if (!edit) return;
  sheet.querySelectorAll('.lnk-edit').forEach((row) => {
    const i = +row.dataset.i;
    row.querySelectorAll('[data-f]').forEach((inp) => inp.addEventListener('change', () => {
      const l2 = load(); l2[i][inp.dataset.f] = inp.dataset.f === 'url' ? fixUrl(inp.value.trim()) : inp.value.trim(); save(l2);
    }));
    row.querySelectorAll('[data-mv]').forEach((b) => (b.onclick = () => {
      const l2 = load(); const j = i + +b.dataset.mv; [l2[i], l2[j]] = [l2[j], l2[i]]; save(l2); draw();
    }));
    row.querySelector('[data-del]').onclick = () => { const l2 = load(); l2.splice(i, 1); save(l2); draw(); };
  });
  sheet.querySelector('#lnkAdd').onclick = () => {
    const l2 = load(); l2.push({ nimi: '', url: '' }); save(l2); draw();
    sheet.querySelector('.lnk-edit:last-of-type [data-f=nimi]').focus();
  };
}

export function openLinks() {
  if (!sheet) {
    sheet = document.createElement('div');
    sheet.className = 'sheet-wrap';
    sheet.innerHTML = `
      <div class="sheet-bg"></div>
      <div class="sheet" role="dialog" aria-label="Otselingid">
        <div class="sheet-grip"></div>
        <div class="sheet-head"><b>${ico('link')} Otselingid</b><button class="btn small" id="lnkEdit">Muuda</button></div>
        <div class="sheet-body"></div>
      </div>`;
    document.body.appendChild(sheet);
    sheet.querySelector('.sheet-bg').onclick = closeLinks;
    sheet.querySelector('#lnkEdit').onclick = () => {
      if (edit) sheet.querySelectorAll('.lnk-edit [data-f]').forEach((i) => i.dispatchEvent(new Event('change')));
      const l = load().filter((x) => x.nimi || x.url); save(l);
      edit = !edit; draw();
    };
    // alla tõmbamisega sulgemine
    let y0 = null;
    const s = sheet.querySelector('.sheet');
    s.addEventListener('touchstart', (e) => { if (s.scrollTop <= 0) y0 = e.touches[0].clientY; }, { passive: true });
    s.addEventListener('touchmove', (e) => { if (y0 != null && e.touches[0].clientY - y0 > 70) { y0 = null; closeLinks(); } }, { passive: true });
    window.addEventListener('hashchange', closeLinks);
  }
  edit = false;
  draw();
  requestAnimationFrame(() => sheet.classList.add('open'));
}
export function closeLinks() {
  if (!sheet) return;
  if (edit) { sheet.querySelectorAll('.lnk-edit [data-f]').forEach((i) => i.dispatchEvent(new Event('change'))); save(load().filter((x) => x.nimi || x.url)); edit = false; }
  sheet.classList.remove('open');
}
