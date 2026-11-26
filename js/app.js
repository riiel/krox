// Lihtne marsruutija: #/ = avaleht, #/<id>/<alamlehed>?<param> = tööriist
import palk from './calc/palk.js';
import km from './calc/km.js';
import pind from './calc/pind.js';
import plaadid from './calc/plaadid.js';
import parkett from './calc/parkett.js';
import seaded from './calc/seaded.js';
import paevik from './paevik/paevik.js';
import lahetus from './lahetus/lahetus.js';

const tools = [palk, km, pind, plaadid, parkett];
const all = [paevik, lahetus, ...tools, seaded];
const app = document.getElementById('app');

const tile = (t, wide = false) => `
  <a class="tile${wide ? ' wide' : ''}" href="#/${t.id}">
    <span class="ico">${t.icon}</span>
    <span class="t">${t.title}</span>
    <span class="d">${t.desc}</span>
  </a>`;

function home() {
  app.innerHTML = `
    <div class="grid">${tile(paevik, true)}${tile(lahetus, true)}</div>
    <h2>Kalkulaatorid</h2>
    <div class="grid">${tools.map((t) => tile(t)).join('')}</div>`;
}

function route() {
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
    app.innerHTML = `<a class="back" href="#/">← Tagasi</a><h1>${tool.icon} ${tool.title}</h1><div id="tool"></div>`;
  }
  tool.render(document.getElementById('tool'), rest, q);
}

window.addEventListener('hashchange', route);
route();
