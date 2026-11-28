// Hinnapakkumised: read (töö / materjal), hinnad jäävad meelde, PDF eesti / soome / inglise keeles
import { ico } from '../icons.js';
import { shareFile } from '../docx.js';
import { api, pin } from '../kulud/store.js';
import { pakkumisePdf, summad } from './pdf.js';

const KEY = 'krox.pakkumised';
const SKEY = 'krox.pakkumine.seaded';
const YHIKUD = ['m²', 'jm', 'tk', 'h', 'kmpl', 'päev', 'l', 'kg'];
const KM = [[24, '24% (Eesti)'], [25.5, '25,5% (Soome)'], ['poord', 'Pöördmaksustamine'], [0, 'KM-ta']];
const STAATUS = { koost: 'Koostamisel', saadetud: 'Saadetud', kinnitatud: 'Kinnitatud', loobutud: 'Loobutud' };
const MARKUS = 'Hinnad on eurodes. Materjalid arveldatakse tegeliku kulu järgi. Lisatööd kokkuleppel. Tööde algus kokkuleppel.';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const store = (l) => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { alert('Salvestamine ebaõnnestus'); } };
const seaded = () => { try { return { hinnad: {}, markus: MARKUS, ...JSON.parse(localStorage.getItem(SKEY)) }; } catch { return { hinnad: {}, markus: MARKUS }; } };
const saveSeaded = (s) => { try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch { /* */ } };
const eur = (n) => new Intl.NumberFormat('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' €';
const nextNr = (l) => {
  const y = new Date().getFullYear();
  const max = l.filter((p) => String(p.nr).startsWith(y + '-')).reduce((m, p) => Math.max(m, parseInt(String(p.nr).split('-')[1]) || 0), 0);
  return `${y}-${String(max + 1).padStart(3, '0')}`;
};

// ---------- nimekiri ----------
function list(el) {
  const all = load().sort((a, b) => String(b.nr).localeCompare(String(a.nr), 'et', { numeric: true }));
  el.innerHTML = `
    <a class="btn primary" href="#/pakkumine/uus" style="display:block;text-align:center;padding:14px">${ico('lisa')}Uus hinnapakkumine</a>
    <div style="margin-top:12px">
      ${all.length ? all.map((p) => `
        <a class="entry" href="#/pakkumine/p/${p.id}">
          <div style="flex:1;min-width:0">
            <div class="entry-top"><b>${esc(p.klient?.nimi) || 'Klient määramata'}</b><span>${eur(summad(p).kokku)}</span></div>
            <div class="entry-sub">${esc(p.nr)} · ${p.kuupaev.split('-').reverse().join('.')}${p.objekt ? ' · ' + esc(p.objekt) : ''} · ${p.keel.toUpperCase()}</div>
            <div style="margin-top:6px"><span class="tag st-${p.staatus}">${STAATUS[p.staatus] || ''}</span></div>
          </div>
        </a>`).join('') : '<p class="note">Pakkumisi pole veel. Hinnad, mida sisestad, jäävad meelde ja pakutakse järgmisel korral ise.</p>'}
    </div>`;
}

// ---------- vorm ----------
function vorm(el, id) {
  const all = load();
  const S = seaded();
  let p = all.find((x) => x.id === id);
  if (!p) {
    p = { id: uid(), nr: nextNr(all), kuupaev: today(), kehtib: 14, keel: 'et', klient: { nimi: '', aadress: '', kmkr: '', kontakt: '' }, objekt: '', read: [], km: 24, markus: S.markus, markusTolge: '', staatus: 'koost' };
    p.read.push({ id: uid(), tyyp: 'too', kirjeldus: '', kogus: '', yhik: 'm²', hind: '' });
    all.push(p); store(all);
    history.replaceState(null, '', `#/pakkumine/p/${p.id}`);
  }
  const salvesta = () => {
    const l = load(); const i = l.findIndex((x) => x.id === p.id);
    if (i >= 0) l[i] = p; else l.push(p);
    store(l);
    // hinnad meelde
    const s = seaded();
    p.read.forEach((r) => { if (r.kirjeldus.trim() && r.hind !== '') s.hinnad[r.kirjeldus.trim()] = { hind: r.hind, yhik: r.yhik, tyyp: r.tyyp }; });
    s.markus = p.markus;
    saveSeaded(s);
  };
  const hinnad = Object.keys(S.hinnad).sort((a, b) => a.localeCompare(b, 'et'));

  const rowHtml = (r, i) => `
    <div class="hp-row" data-i="${i}">
      <div class="hp-r1">
        <div class="seg hp-t"><button data-t="too" class="${r.tyyp !== 'mat' ? 'on' : ''}">Töö</button><button data-t="mat" class="${r.tyyp === 'mat' ? 'on' : ''}">Mat.</button></div>
        <input data-f="kirjeldus" list="hpHinnad" value="${esc(r.kirjeldus)}" placeholder="nt Põranda plaatimine">
      </div>
      ${p.keel !== 'et' ? `<input data-f="tolge" class="hp-tolge" value="${esc(r.tolge)}" placeholder="${p.keel === 'fi' ? 'Soome keeles' : 'Inglise keeles'} (vajuta „Tõlgi“)">` : ''}
      <div class="hp-r2">
        <input data-f="kogus" inputmode="decimal" value="${esc(r.kogus)}" placeholder="Kogus">
        <select data-f="yhik">${YHIKUD.map((u) => `<option ${u === r.yhik ? 'selected' : ''}>${u}</option>`).join('')}</select>
        <input data-f="hind" inputmode="decimal" value="${esc(r.hind)}" placeholder="€ / ühik">
        <b class="hp-sum">${eur(summad(p).rida(r))}</b>
        <button class="btn small" data-del aria-label="Kustuta">${ico('prugi')}</button>
      </div>
    </div>`;

  const draw = () => {
    const s = summad(p);
    el.innerHTML = `
      <a class="back" href="#/pakkumine">← Hinnapakkumised</a>
      <h1>Pakkumine ${esc(p.nr)}</h1>
      <datalist id="hpHinnad">${hinnad.map((h) => `<option value="${esc(h)}">`).join('')}</datalist>

      <div class="card">
        <label style="margin-top:0">Keel</label>
        <div class="seg" id="keel"><button data-v="et">Eesti</button><button data-v="fi">Suomi</button><button data-v="en">English</button></div>
        <label>Klient</label>
        <input id="kNimi" value="${esc(p.klient.nimi)}" placeholder="Nimi või firma">
        <input id="kAadress" value="${esc(p.klient.aadress)}" placeholder="Aadress" style="margin-top:8px">
        <div class="row" style="margin-top:8px">
          <input id="kKmkr" value="${esc(p.klient.kmkr)}" placeholder="KMKR / Y-tunnus">
          <input id="kKontakt" value="${esc(p.klient.kontakt)}" placeholder="Tel või e-post">
        </div>
        <label>Objekt</label>
        <input id="objekt" value="${esc(p.objekt)}" placeholder="nt Vannitoa remont, Rüütli 5">
        <div class="row">
          <div><label>Kuupäev</label><input id="kp" type="date" value="${p.kuupaev}"></div>
          <div><label>Kehtib (päeva)</label><input id="kehtib" inputmode="numeric" value="${esc(p.kehtib)}"></div>
        </div>
      </div>

      <h2>Read</h2>
      <div id="read">${p.read.map(rowHtml).join('')}</div>
      <div class="actions" style="margin-top:8px">
        <button class="btn" id="lisaRida">${ico('lisa')}Lisa rida</button>
        <button class="btn" id="pinnad">${ico('joonlaud')}Pinnad kalkulaatorist</button>
      </div>

      <h2>Käibemaks</h2>
      <div class="card">
        <select id="km">${KM.map(([v, n]) => `<option value="${v}" ${String(v) === String(p.km) ? 'selected' : ''}>${n}</option>`).join('')}</select>
      </div>
      <div class="card result" style="margin-top:8px">
        <div class="line"><span>Tööd</span><b>${eur(s.too)}</b></div>
        <div class="line"><span>Materjalid</span><b>${eur(s.mat)}</b></div>
        ${p.km > 0 ? `<div class="line"><span>Käibemaks ${String(p.km).replace('.', ',')}%</span><b>${eur(s.km)}</b></div>` : ''}
        <div class="line big"><span>Kokku</span><b>${eur(s.kokku)}</b></div>
      </div>

      <h2>Tingimused</h2>
      <div class="card">
        <textarea id="markus" rows="4">${esc(p.markus)}</textarea>
        ${p.keel !== 'et' ? `<label>${p.keel === 'fi' ? 'Soome keeles' : 'Inglise keeles'}</label><textarea id="markusTolge" rows="4" placeholder="Vajuta „Tõlgi“">${esc(p.markusTolge)}</textarea>` : ''}
      </div>
      ${p.keel !== 'et' ? `<button class="btn" id="tolgi" style="width:100%;margin-top:12px">${ico('otsi')}Tõlgi read ja tingimused</button>` : ''}

      <div class="actions" style="margin-top:12px">
        <button class="btn primary" id="pdf">${ico('fail')}PDF ja saada</button>
      </div>
      <label>Olek</label>
      <div class="seg" id="staatus">${Object.entries(STAATUS).map(([k, v]) => `<button data-v="${k}" class="${p.staatus === k ? 'on' : ''}">${v}</button>`).join('')}</div>
      <p class="note" id="msg"></p>
      <div class="actions" style="margin-top:8px">
        <button class="btn" id="kopeeri">${ico('kopeeri')}Tee koopia</button>
        <button class="btn danger" id="kustuta">${ico('prugi')}Kustuta</button>
      </div>`;
    bind();
  };

  const $ = (q) => el.querySelector('#' + q);
  const msg = (t) => { $('msg').textContent = t; };
  const updSum = () => {
    const s = summad(p);
    el.querySelectorAll('.hp-row').forEach((row) => { row.querySelector('.hp-sum').textContent = eur(s.rida(p.read[+row.dataset.i])); });
    const lines = el.querySelectorAll('.result .line b');
    const v = [s.too, s.mat, ...(p.km > 0 ? [s.km] : []), s.kokku];
    lines.forEach((b, i) => { if (v[i] != null) b.textContent = eur(v[i]); });
  };

  function bind() {
    el.querySelectorAll('#keel button').forEach((b) => { b.classList.toggle('on', b.dataset.v === p.keel); b.onclick = () => { p.keel = b.dataset.v; salvesta(); draw(); }; });
    const kl = { kNimi: 'nimi', kAadress: 'aadress', kKmkr: 'kmkr', kKontakt: 'kontakt' };
    Object.entries(kl).forEach(([idv, f]) => ($(idv).oninput = () => { p.klient[f] = $(idv).value; salvesta(); }));
    $('objekt').oninput = () => { p.objekt = $('objekt').value; salvesta(); };
    $('kp').onchange = () => { p.kuupaev = $('kp').value || today(); salvesta(); };
    $('kehtib').oninput = () => { p.kehtib = $('kehtib').value; salvesta(); };
    $('markus').oninput = () => { p.markus = $('markus').value; salvesta(); };
    if ($('markusTolge')) $('markusTolge').oninput = () => { p.markusTolge = $('markusTolge').value; salvesta(); };
    $('km').onchange = () => { const v = $('km').value; p.km = v === 'poord' ? 'poord' : +v; salvesta(); draw(); };

    el.querySelectorAll('.hp-row').forEach((row) => {
      const r = p.read[+row.dataset.i];
      row.querySelectorAll('[data-f]').forEach((inp) => {
        const ev = inp.tagName === 'SELECT' ? 'change' : 'input';
        inp.addEventListener(ev, () => {
          r[inp.dataset.f] = inp.value;
          if (inp.dataset.f === 'kirjeldus') {
            const h = seaded().hinnad[inp.value.trim()];
            if (h) {
              if (r.hind === '') { r.hind = h.hind; row.querySelector('[data-f=hind]').value = h.hind; }
              r.yhik = h.yhik || r.yhik; row.querySelector('[data-f=yhik]').value = r.yhik;
              if (h.tyyp && h.tyyp !== r.tyyp) { r.tyyp = h.tyyp; row.querySelectorAll('.hp-t button').forEach((b) => b.classList.toggle('on', b.dataset.t === r.tyyp)); }
            }
            if (r.tolge) { r.tolge = ''; const t = row.querySelector('[data-f=tolge]'); if (t) t.value = ''; }
          }
          salvesta(); updSum();
        });
      });
      row.querySelectorAll('.hp-t button').forEach((b) => (b.onclick = () => { r.tyyp = b.dataset.t; salvesta(); draw(); }));
      row.querySelector('[data-del]').onclick = () => { p.read.splice(+row.dataset.i, 1); salvesta(); draw(); };
    });

    $('lisaRida').onclick = () => {
      const eel = p.read[p.read.length - 1];
      p.read.push({ id: uid(), tyyp: eel?.tyyp || 'too', kirjeldus: '', kogus: '', yhik: 'm²', hind: '' });
      salvesta(); draw();
      el.querySelector(`.hp-row[data-i="${p.read.length - 1}"] [data-f=kirjeldus]`)?.focus();
    };
    $('pinnad').onclick = () => {
      let pind = {}; try { pind = JSON.parse(localStorage.getItem('krox.pind')) || {}; } catch { /* */ }
      const lisa = [];
      const h = seaded().hinnad;
      const tee = (kirjeldus, kogus) => { if (!(kogus > 0)) return; const m = h[kirjeldus] || {}; lisa.push({ id: uid(), tyyp: 'too', kirjeldus, kogus: String(Math.round(kogus * 100) / 100).replace('.', ','), yhik: 'm²', hind: m.hind ?? '' }); };
      tee('Põranda plaatimine', pind.porand);
      tee('Seinte plaatimine', pind.seinad);
      if (pind.porand > 0 || pind.seinad > 0) tee('Hüdroisolatsioon', (+pind.porand || 0));
      if (!lisa.length) { msg('Pindade kalkulaatoris pole veel mõõte. Arvuta pinnad seal ja tule tagasi.'); return; }
      p.read = p.read.filter((r) => r.kirjeldus.trim() || r.kogus || r.hind);
      p.read.push(...lisa); salvesta(); draw();
      msg(`Lisatud ${lisa.length} rida. Kontrolli kogused ja hinnad üle.`);
    };
    if ($('tolgi')) $('tolgi').onclick = async () => {
      if (!pin()) { msg('Tõlkimiseks lisa Seadetes PIN.'); return; }
      const read = p.read.filter((r) => r.kirjeldus.trim());
      const tekstid = [...read.map((r) => r.kirjeldus.trim()), ...(p.markus.trim() ? [p.markus.trim()] : [])];
      if (!tekstid.length) return;
      msg('Tõlgin…');
      try {
        const res = await api('tolgi', { keel: p.keel, read: tekstid });
        read.forEach((r, i) => { r.tolge = res.read[i]; });
        if (p.markus.trim()) p.markusTolge = res.read[read.length];
        salvesta(); draw(); msg('Tõlgitud. Vaata üle ja paranda vajadusel.');
      } catch (e) { msg('Tõlkimine ei õnnestunud: ' + e.message); }
    };
    $('pdf').onclick = async () => {
      if (p.keel !== 'et' && p.read.some((r) => r.kirjeldus.trim() && !r.tolge) && !confirm('Mõni rida on tõlkimata ja jääb eesti keelde. Jätkan?')) return;
      msg('Koostan PDF-i…');
      try {
        const blob = await pakkumisePdf(p);
        const nimi = `${p.keel === 'fi' ? 'Tarjous' : p.keel === 'en' ? 'Quotation' : 'Hinnapakkumine'} ${p.nr}${p.klient.nimi ? ' ' + p.klient.nimi : ''}.pdf`;
        const r = await shareFile(blob, nimi);
        if (r !== 'cancel' && p.staatus === 'koost') { p.staatus = 'saadetud'; salvesta(); el.querySelectorAll('#staatus button').forEach((b) => b.classList.toggle('on', b.dataset.v === p.staatus)); }
        msg(r === 'downloaded' ? 'PDF laaditi alla.' : '');
      } catch (e) { msg('PDF-i koostamine ebaõnnestus: ' + e.message); }
    };
    el.querySelectorAll('#staatus button').forEach((b) => (b.onclick = () => { p.staatus = b.dataset.v; salvesta(); el.querySelectorAll('#staatus button').forEach((x) => x.classList.toggle('on', x === b)); }));
    $('kopeeri').onclick = () => {
      const l = load();
      const c = { ...JSON.parse(JSON.stringify(p)), id: uid(), nr: nextNr(l), kuupaev: today(), staatus: 'koost' };
      c.read.forEach((r) => (r.id = uid()));
      l.push(c); store(l); location.hash = `#/pakkumine/p/${c.id}`;
    };
    $('kustuta').onclick = () => { if (!confirm(`Kustutan pakkumise ${p.nr}?`)) return; store(load().filter((x) => x.id !== p.id)); location.hash = '#/pakkumine'; };
  }
  draw();
}

export default {
  id: 'pakkumine',
  icon: 'fail',
  title: 'Hinnapakkumised',
  desc: 'Töö ja materjal, PDF eesti/soome/inglise k.',
  render(el, rest) {
    if (rest[0] === 'uus') return vorm(el, null);
    if (rest[0] === 'p' && rest[1]) return vorm(el, rest[1]);
    list(el);
  },
};
