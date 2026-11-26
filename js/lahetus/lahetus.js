// Lähetused: nimekiri, vorm, korraldus (PDF allkirjastamiseks) ja raamatupidamise fail
import * as c from './calc.js';
import { docx, shareFile } from '../docx.js';

const KEY = 'krox.lahetused';
const SEADED = 'krox.lahetus.seaded';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const read = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { alert('Salvestamine ebaõnnestus'); } };
const all = () => read(KEY, []).sort((a, b) => (b.kuupaev + b.nr).localeCompare(a.kuupaev + a.nr));
const get = (id) => read(KEY, []).find((x) => x.id === id);
const seaded = () => read(SEADED, { firma: 'KROX OÜ', lahetatav: '', sihtkoht: 'Soome', eesmark: 'Ehitusteenuse osutamine partnerile.', korge: 75, madal: 40, viimaneNr: '2026/08' });

function upsert(x) {
  const list = read(KEY, []);
  if (!x.id) x.id = Date.now().toString(36);
  const i = list.findIndex((y) => y.id === x.id);
  if (i >= 0) list[i] = x; else list.push(x);
  write(KEY, list);
  const s = seaded();
  write(SEADED, { ...s, lahetatav: x.lahetatav, sihtkoht: x.sihtkoht, eesmark: x.eesmark, korge: x.korge, madal: x.madal, firma: x.firma });
}

// Eelmise kuu viimane päev: 2026-10-12 -> 2026-09-30
function prevMonthEnd(isoDate) {
  const [y, m] = isoDate.split('-').map(Number);
  return c.iso(new Date(y, m - 1, 0));
}

function nextNr() {
  const y = String(new Date().getFullYear());
  const nums = [seaded().viimaneNr, ...read(KEY, []).map((x) => x.nr)]
    .filter((n) => n?.startsWith(y + '/')).map((n) => parseInt(n.split('/')[1]) || 0);
  return `${y}/${String(Math.max(0, ...nums) + 1).padStart(2, '0')}`;
}

// Sama kuu varasemate lähetuste 75 € päevad (kuupiirang 15 päeva)
function used75(self) {
  const used = {};
  read(KEY, []).filter((x) => x.id !== self.id && (x.kuupaev + x.nr) < (self.kuupaev + self.nr)).forEach((x) => {
    const r = c.arvuta(x.perioodid, x.korge, x.madal);
    r.list.forEach((d) => { if (d.maar === +x.korge && x.korge !== x.madal) { const m = d.d.slice(0, 7); used[m] = (used[m] || 0) + 1; } });
  });
  return used;
}
const calc = (x) => c.arvuta(x.perioodid, +x.korge, +x.madal, used75(x));

// ---------- nimekiri ----------
function list(el) {
  const items = all();
  el.innerHTML = `
    <a class="btn primary" href="#/lahetus/uus" style="display:block;text-align:center;padding:14px">+ Uus lähetus</a>
    <h2>Lähetused</h2>
    ${items.length ? items.map((x) => {
      const r = calc(x);
      return `<a class="entry" href="#/lahetus/vaade/${x.id}">
        <div class="entry-top"><b>Nr ${esc(x.nr)} · ${esc(x.sihtkoht)}</b><span>${c.kp(x.kuupaev)}</span></div>
        <div class="entry-sub">${esc(c.vahemikud(x.perioodid))}</div>
        <div class="entry-top" style="margin-top:6px"><span>${r.paevi} päeva</span><b style="color:var(--accent)">${r.kokku} €</b></div>
      </a>`;
    }).join('') : '<p class="note">Lähetusi pole veel. Vajuta „Uus lähetus“.</p>'}`;
}

// ---------- vorm ----------
function vorm(el, id) {
  const old = id ? get(id) : null;
  const s = seaded();
  const x = old ? structuredClone(old) : {
    nr: nextNr(), kuupaev: prevMonthEnd(c.iso(new Date())), firma: s.firma, lahetatav: s.lahetatav, sihtkoht: s.sihtkoht,
    eesmark: s.eesmark, korge: s.korge, madal: s.madal, perioodid: [{ algus: '', lopp: '' }],
    lisad: 'Majutus ja transport sihtkohas on tagatud vastuvõtva poole poolt.\nMuud ettenägematud kulud hüvitatakse kuludokumentide alusel.',
  };

  el.innerHTML = `
    <a class="back" href="#/lahetus">← Lähetused</a>
    <h1>${old ? 'Muuda lähetust' : 'Uus lähetus'}</h1>
    <div class="card">
      <div class="row">
        <div><label>Korralduse nr</label><input id="nr" value="${esc(x.nr)}"></div>
        <div><label>Kuupäev</label><input type="date" id="kuupaev" value="${x.kuupaev}"></div>
      </div>
      <label>Lähetatav</label><input id="lahetatav" placeholder="Ees- ja perekonnanimi" value="${esc(x.lahetatav)}">
      <label>Sihtkoht</label><input id="sihtkoht" value="${esc(x.sihtkoht)}">
      <label>Eesmärk</label><input id="eesmark" value="${esc(x.eesmark)}">
    </div>

    <h2>Lähetuse päevad</h2>
    <div class="card">
      <div id="per"></div>
      <button class="btn small" id="addPer">+ Lisa periood</button>
      <p class="note">Lisa iga Soomes oldud vahemik eraldi (nt 01.10–07.10, 12.10–23.10).</p>
    </div>

    <div class="result" id="out"></div>

    <h2>Päevaraha määrad</h2>
    <div class="card">
      <div class="row">
        <div><label>Esimesed 15 päeva (€)</label><input id="korge" inputmode="decimal" value="${x.korge}"></div>
        <div><label>Järgnevad päevad (€)</label><input id="madal" inputmode="decimal" value="${x.madal}"></div>
      </div>
      <p class="note">Maksuvaba piirmäär: 75 € lähetuse esimese 15 päeva eest (kuni 15 päeva kalendrikuus), edasi 40 €.</p>
      <label>Muud tingimused (iga rida eraldi punktina)</label>
      <textarea id="lisad" rows="3">${esc(x.lisad)}</textarea>
      <label>Ettevõte</label><input id="firma" value="${esc(x.firma)}">
    </div>

    <div class="actions">
      <button class="btn primary" id="save">Salvesta</button>
      ${old ? '<button class="btn danger" id="del">Kustuta</button>' : ''}
    </div>`;

  const $ = (q) => el.querySelector('#' + q);
  // korralduse kuupäev = esimesele lähetuspäevale eelneva kuu viimane päev (kui pole käsitsi muudetud)
  let dateTouched = false;
  const autoDate = () => {
    if (dateTouched) return;
    const first = c.days(x.perioodid)[0];
    if (first) $('kuupaev').value = prevMonthEnd(first);
  };
  // vana korraldus, mille kuupäev on pärast lähetuse algust -> paranda
  if (old && c.days(x.perioodid)[0] && x.kuupaev >= c.days(x.perioodid)[0]) autoDate();
  $('kuupaev').addEventListener('input', () => { dateTouched = true; });
  const drawPer = () => {
    $('per').innerHTML = x.perioodid.map((p, i) => `
      <div class="per" data-i="${i}">
        <div><label>Alates</label><input type="date" data-f="algus" value="${p.algus}"></div>
        <div><label>Kuni</label><input type="date" data-f="lopp" value="${p.lopp}"></div>
        <button class="btn x" data-del="${i}" aria-label="Eemalda">✕</button>
      </div>`).join('');
    $('per').querySelectorAll('input').forEach((inp) => inp.addEventListener('change', () => {
      const p = x.perioodid[inp.closest('.per').dataset.i];
      p[inp.dataset.f] = inp.value;
      if (inp.dataset.f === 'algus' && (!p.lopp || p.lopp < p.algus)) { p.lopp = p.algus; drawPer(); }
      autoDate();
      upd();
    }));
    $('per').querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { x.perioodid.splice(+b.dataset.del, 1); drawPer(); upd(); }));
  };
  const collect = () => {
    ['nr', 'kuupaev', 'lahetatav', 'sihtkoht', 'eesmark', 'lisad', 'firma'].forEach((k) => (x[k] = $(k).value.trim()));
    x.korge = parseFloat($('korge').value.replace(',', '.')) || 0;
    x.madal = parseFloat($('madal').value.replace(',', '.')) || 0;
  };
  const upd = () => {
    collect();
    const r = calc(x);
    if (!r.paevi) { $('out').innerHTML = '<div class="line"><span>Lisa lähetuse kuupäevad</span><b>—</b></div>'; return; }
    $('out').innerHTML = `
      <div class="line"><span>Päevi kokku</span><b>${r.paevi}</b></div>
      ${r.segs.map((sg) => `<div class="line"><span>${c.kp(sg.algus).slice(0, 5)}–${c.kp(sg.lopp).slice(0, 5)} (${sg.paevi} p)</span><b>${sg.maar} €/p</b></div>`).join('')}
      <div class="line big"><span>Päevaraha kokku</span><b>${r.kokku} €</b></div>`;
  };

  $('addPer').onclick = () => {
    const last = x.perioodid[x.perioodid.length - 1];
    x.perioodid.push({ algus: '', lopp: '' });
    drawPer();
    if (last?.lopp) el.querySelector('.per:last-child [data-f=algus]').min = last.lopp;
  };
  ['korge', 'madal', 'kuupaev', 'nr'].forEach((k) => $(k).addEventListener('input', upd));
  $('save').onclick = () => {
    collect();
    x.perioodid = x.perioodid.filter((p) => p.algus);
    if (!x.perioodid.length) return alert('Lisa vähemalt üks periood');
    if (!x.lahetatav) return alert('Lisa lähetatava nimi');
    upsert(x);
    location.hash = '#/lahetus/vaade/' + x.id;
  };
  if (old) $('del').onclick = () => { if (confirm('Kustutan selle lähetuse?')) { write(KEY, read(KEY, []).filter((y) => y.id !== x.id)); location.hash = '#/lahetus'; } };
  drawPer();
  upd();
}

// Kas brauser lubab Word-faili otse jagada (Chrome/Samsung veebis tavaliselt mitte, Android-äpis jah)
function canShareDocx() {
  try { return !!navigator.canShare?.({ files: [new File(['x'], 'a.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })] }); }
  catch { return false; }
}

// ---------- vaade: korraldus + raamatupidamine ----------
function vaade(el, id) {
  const x = get(id);
  if (!x) { el.innerHTML = '<p class="note">Lähetust ei leitud.</p>'; return; }
  const r = calc(x);
  const rp = c.raamatupidamine(r, +x.korge, +x.madal);
  const fname = (t) => `${x.firma} ${t} nr ${x.nr}`.replace(/[\\/:*?"<>|]/g, '_');
  const korgePaevi = r.list.filter((d) => d.maar === +x.korge).length;
  const madalPaevi = r.paevi - korgePaevi;

  el.innerHTML = `
    <div class="no-print">
      <a class="back" href="#/lahetus">← Lähetused</a>
      <h2 style="margin-top:6px">1. Korraldus (allkirjastamiseks)</h2>
      <div class="actions" style="margin-top:0">
        <button class="btn primary" id="word">${canShareDocx() ? '📄 Jaga Word-failina' : '📄 Salvesta Word-fail'}</button>
        <button class="btn" id="pdf">🖨 PDF</button>
      </div>
      <div class="actions" style="margin-top:8px"><a class="btn" href="#/lahetus/muuda/${x.id}">✎ Muuda</a></div>
      <p class="note" id="wmsg">${canShareDocx()
        ? 'Avaneb jagamise menüü: vali <b>Drive</b> ja kaust.'
        : 'Fail salvestub kausta „Allalaaditud“. Drive\'i panekuks: Drive → <b>+</b> → <b>Laadi üles</b> → Allalaaditud → vali fail.'}</p>

      <h2>2. Raamatupidajale</h2>
      <pre class="rp" id="rp">${esc(rp)}</pre>
      <div class="actions" style="margin-top:8px">
        <button class="btn primary" id="copy">📋 Kopeeri</button>
        <button class="btn" id="share">📤 Jaga / Drive</button>
      </div>
      <p class="note" id="msg"></p>
      <h2>Korralduse eelvaade</h2>
    </div>

    <div class="paber">
      <h3>${esc(x.firma).toUpperCase()} LÄHETUSE KORRALDUS nr ${esc(x.nr)}</h3>
      <table class="kv">
        <tr><th>Kuupäev:</th><td>${c.kp(x.kuupaev)}</td></tr>
        <tr><th>Lähetatav:</th><td>${esc(x.lahetatav)}</td></tr>
        <tr><th>Sihtkoht:</th><td>${esc(x.sihtkoht)}</td></tr>
        <tr><th>Ajavahemik:</th><td>${esc(c.vahemikud(x.perioodid))}</td></tr>
        <tr><th>Lähetuse kestus:</th><td>${r.paevi} päeva</td></tr>
      </table>
      <p><b>Eesmärk:</b> ${esc(x.eesmark)}</p>
      <p><b>Kulude hüvitamine:</b></p>
      <ul>
        <li>Maksta välislähetuse päevaraha vastavalt seadusega lubatud piirmääradele:
          <ul>
            ${korgePaevi && x.korge !== x.madal ? `<li>${madalPaevi ? 'Esimesed ' : ''}${korgePaevi} päeva: ${x.korge} €/päev</li>` : ''}
            ${madalPaevi ? `<li>${korgePaevi ? 'Järgnevad ' : ''}${madalPaevi} päeva: ${x.madal} €/päev</li>` : ''}
          </ul>
        </li>
        <li><b>Päevaraha kokku: ${r.kokku} €</b></li>
        ${x.lisad.split('\n').filter((l) => l.trim()).map((l) => `<li>${esc(l.trim())}</li>`).join('')}
      </ul>
      <div class="allkiri">
        <div>${esc(x.firma)} juhatuse liige</div>
        <div class="muted">/allkirjastatud digitaalselt/</div>
      </div>
    </div>`;

  const $ = (q) => el.querySelector('#' + q);
  const msg = (t) => ($('msg').textContent = t);
  $('pdf').onclick = () => {
    const old = document.title;
    document.title = fname('LÄHETUSE KORRALDUS');
    window.print();
    setTimeout(() => (document.title = old), 1000);
  };
  $('word').onclick = async () => {
    const vah = [];
    if (korgePaevi && x.korge !== x.madal) vah.push({ type: 'sub', runs: `${madalPaevi ? 'Esimesed ' : ''}${korgePaevi} päeva: ${x.korge} €/päev` });
    if (madalPaevi) vah.push({ type: 'sub', runs: `${korgePaevi ? 'Järgnevad ' : ''}${madalPaevi} päeva: ${x.madal} €/päev` });
    const kv = (k, v) => ({ type: 'bullet', runs: [{ t: k + ' ', b: true }, { t: v }] });
    const blob = docx([
      { type: 'bullet', runs: [{ t: `${x.firma.toUpperCase()} LÄHETUSE KORRALDUS nr ${x.nr}`, b: true }] },
      kv('Kuupäev:', c.kp(x.kuupaev)),
      kv('Lähetatav:', x.lahetatav),
      kv('Sihtkoht:', x.sihtkoht),
      kv('Ajavahemik:', c.vahemikud(x.perioodid)),
      kv('Lähetuse kestus:', `${r.paevi} päeva`),
      { type: 'gap' },
      { type: 'p', runs: [{ t: 'Eesmärk: ', b: true }, { t: x.eesmark }] },
      { type: 'p', runs: [{ t: 'Kulude hüvitamine:', b: true }] },
      { type: 'bullet', runs: 'Maksta välislähetuse päevaraha vastavalt seadusega lubatud piirmääradele:' },
      ...vah,
      { type: 'bullet', runs: [{ t: `Päevaraha kokku: ${r.kokku} €`, b: true }] },
      ...x.lisad.split('\n').filter((l) => l.trim()).map((l) => ({ type: 'bullet', runs: l.trim() })),
    ]);
    const res = await shareFile(blob, fname('LÄHETUSE KORRALDUS') + '.docx');
    if (res === 'downloaded') $('wmsg').innerHTML = '✓ Salvestatud kausta „Allalaaditud“. Drive\'i panekuks: Drive → <b>+</b> → <b>Laadi üles</b> → vali fail.';
  };
  $('copy').onclick = async () => {
    try { await navigator.clipboard.writeText(rp); msg('Kopeeritud. Kleebi raamatupidamise dokumenti.'); }
    catch { const t = document.createRange(); t.selectNodeContents($('rp')); getSelection().removeAllRanges(); getSelection().addRange(t); msg('Tekst on valitud, vajuta „Kopeeri“.'); }
  };
  $('share').onclick = async () => {
    const res = await shareFile(new Blob([rp], { type: 'text/plain' }), fname('Raamatupidamine') + '.txt');
    if (res === 'downloaded') msg('Fail laaditi alla. Lae see Drive\'i.');
  };
}

export default {
  id: 'lahetus',
  icon: '✈️',
  title: 'Lähetused',
  desc: 'Päevaraha, korraldus, raamatupidamine',
  render(el, rest = []) {
    if (rest[0] === 'uus') return vorm(el, null);
    if (rest[0] === 'muuda') return vorm(el, rest[1]);
    if (rest[0] === 'vaade') return vaade(el, rest[1]);
    list(el);
  },
};
