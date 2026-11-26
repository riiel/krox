// Lihtne marsruutija: #/ = avaleht, #/<id> = tööriist
import palk from './calc/palk.js';
import km from './calc/km.js';
import pind from './calc/pind.js';
import plaadid from './calc/plaadid.js';
import seaded from './calc/seaded.js';

const tools = [palk, km, pind, plaadid];
const all = [...tools, seaded];
const app = document.getElementById('app');

function home() {
  app.innerHTML = `
    <h1>Kalkulaatorid</h1>
    <div class="grid">
      ${tools.map((t) => `
        <a class="tile" href="#/${t.id}">
          <span class="ico">${t.icon}</span>
          <span class="t">${t.title}</span>
          <span class="d">${t.desc}</span>
        </a>`).join('')}
    </div>`;
}

function route() {
  const id = location.hash.replace(/^#\/?/, '');
  const tool = all.find((t) => t.id === id);
  window.scrollTo(0, 0);
  if (!tool) return home();
  app.innerHTML = `<a class="back" href="#/">← Tagasi</a><h1>${tool.icon} ${tool.title}</h1><div id="tool"></div>`;
  tool.render(document.getElementById('tool'));
}

window.addEventListener('hashchange', route);
route();
