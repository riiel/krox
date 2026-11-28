// Lihtne marsruutija: #/ = avaleht, #/<id>/<alamlehed>?<param> = tööriist
import palk from './calc/palk.js';
import km from './calc/km.js';
import pind from './calc/pind.js';
import plaadid from './calc/plaadid.js';
import parkett from './calc/parkett.js';
import varv from './calc/varv.js';
import seaded from './calc/seaded.js';
import { ico } from './icons.js';
import { openLinks, closeLinks } from './lingid.js';
import { initNative, scheduleReminders, checkUpdate } from './native.js';
import { zoomOpen, zoomClose } from './zoom.js';
import paevik from './paevik/paevik.js';
import lahetus from './lahetus/lahetus.js';
import kulud from './kulud/kulud.js';
import kytus from './kytus/kytus.js';
import ostud from './ostud/ostud.js';
import toorist from './toorist/toorist.js';
import kalender, { headerHtml, tulemas } from './kalender/kalender.js';

const tools = [palk, km, pind, plaadid, parkett, varv];
const all = [paevik, kalender, ostud, toorist, kulud, lahetus, kytus, ...tools, seaded];
const app = document.getElementById('app');

const row = (t) => `
  <a class="nav-row" href="#/${t.id}">
    ${ico(t.icon, 'gold')}
    <span class="nr-text"><span class="t">${t.title}</span><span class="d">${t.desc}</span></span>
    ${ico('edasi', 'chev')}
  </a>`;
const chip = (t) => `<a class="nav-chip" href="#/${t.id}">${ico(t.icon, 'gold')}<span>${t.short || t.title}</span></a>`;

function home() {
  app.innerHTML = `
    <div class="nav-list home">${[paevik, kalender, ostud, toorist, kulud, lahetus, kytus].map(row).join('')}</div>
    <h2 class="home-h">Kalkulaatorid</h2>
    <div class="nav-chips">${tools.map(chip).join('')}</div>
    <div id="upd"></div>`;
  checkUpdate().then((u) => {
    const box = document.getElementById('upd');
    if (u && box) box.innerHTML = `<a class="upd" href="${u.url}">${ico('alla', 'gold')}<span><b>Uus versioon saadaval (${u.uus})</b><br>Vajuta, lae alla ja paigalda — andmed jäävad alles.</span></a>`;
  });
}

function route() {
  document.getElementById('hdrNext').innerHTML = headerHtml();
  scheduleReminders(tulemas(60, 200));
  const [path, qs = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const [id, ...rest] = path.split('/').filter(Boolean);
  const q = Object.fromEntries(new URLSearchParams(qs));
  const tool = all.find((t) => t.id === id);
  window.scrollTo(0, 0);
  if (!tool) return home();
  if (rest.length) {
    // alamleht joonistab ise oma pealkirja
    app.innerHTML = '<div id="tool"></div>';
  } else {
    app.innerHTML = `<a class="back" href="#/">← Tagasi</a><h1 class="page-h">${ico(tool.icon, 'gold')}${tool.title}</h1><div id="tool"></div>`;
  }
  tool.render(document.getElementById('tool'), rest, q);
}

window.addEventListener('hashchange', route);
document.getElementById('gearBtn').innerHTML = ico('seaded');
document.getElementById('lnkBtn').innerHTML = ico('link');
document.getElementById('lnkBtn').onclick = openLinks;
initNative({ onBack: () => { if (zoomOpen()) { zoomClose(); return true; } const s = document.querySelector('.sheet-wrap.open'); if (s) { closeLinks(); return true; } return false; } });
route();
