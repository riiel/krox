// Vaterpass telefoni kiirendusanduriga: lamedalt (kaks telge) või serval (üks nurk)
import { num, load, save } from '../util.js';

const DEG = 180 / Math.PI;
let stop = null;

export default {
  id: 'vaterpass',
  icon: 'vaterpass',
  short: 'Vaterpass',
  title: 'Vaterpass',
  desc: 'Telefon pinnale: kraadid, %, mm/m',
  render(el) {
    if (stop) stop();
    const st = load('vaterpass', { mode: 'serv', off: { x: 0, y: 0, a: 0 } });
    el.innerHTML = `
      <div class="seg" id="mode"><button data-v="serv">Serval</button><button data-v="lame">Lamedalt</button></div>
      <div class="vp-box">
        <div class="vp-tube" id="tube"><div class="vp-mark"></div><div class="vp-bub" id="bub1"></div></div>
        <div class="vp-disc" id="disc"><div class="vp-ring"></div><div class="vp-bub" id="bub2"></div></div>
        <div class="vp-deg" id="deg">—</div>
        <div class="vp-sub" id="sub">Pane telefon pinnale</div>
      </div>
      <div class="actions">
        <button class="btn" id="nulli">Nulli siin</button>
        <button class="btn" id="lukk">Lukusta</button>
      </div>
      <p class="note" id="msg">„Serval“: pane telefon pika või lühikese servaga vastu pinda (nagu vaterpass). „Lamedalt“: telefon selili pinnal. Täpsuse kontroll: mõõda, pööra telefon 180° ja mõõda uuesti – kui näidud erinevad, vajuta „Nulli siin“ tasasel pinnal.</p>`;
    const $ = (id) => el.querySelector('#' + id);
    let g = null, lukus = false, last = { x: 0, y: 0, a: 0 }, sai = false;

    const setMode = () => {
      el.querySelectorAll('#mode button').forEach((b) => b.classList.toggle('on', b.dataset.v === st.mode));
      $('tube').style.display = st.mode === 'serv' ? '' : 'none';
      $('disc').style.display = st.mode === 'lame' ? '' : 'none';
    };
    el.querySelectorAll('#mode button').forEach((b) => (b.onclick = () => { st.mode = b.dataset.v; save('vaterpass', st); setMode(); }));
    setMode();

    const fmt = (d) => {
      const r = Math.tan(Math.abs(d) / DEG);
      return `${num(r * 100, 1)} % · ${num(r * 1000, 1)} mm/m`;
    };
    const draw = () => {
      if (st.mode === 'serv') {
        const a = last.a;
        const ok = Math.abs(a) < 0.15;
        $('deg').textContent = `${num(Math.abs(a), 1)}°`;
        $('deg').classList.toggle('ok', ok);
        $('sub').textContent = ok ? 'Loodis ✓' : fmt(a);
        $('bub1').style.transform = `translateX(${Math.max(-1, Math.min(1, a / 5)) * 120}px)`;
        $('bub1').classList.toggle('ok', ok);
      } else {
        const { x, y } = last;
        const t = Math.hypot(x, y);
        const ok = t < 0.2;
        $('deg').textContent = `${num(t, 1)}°`;
        $('deg').classList.toggle('ok', ok);
        $('sub').textContent = ok ? 'Loodis ✓' : `↔ ${num(Math.abs(x), 1)}°  ↕ ${num(Math.abs(y), 1)}°`;
        const k = 90 / 6;
        $('bub2').style.transform = `translate(${Math.max(-90, Math.min(90, -x * k))}px, ${Math.max(-90, Math.min(90, y * k))}px)`;
        $('bub2').classList.toggle('ok', ok);
      }
    };

    const onMotion = (e) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null) return;
      sai = true;
      const k = 0.15;
      g = g ? { x: g.x + (a.x - g.x) * k, y: g.y + (a.y - g.y) * k, z: g.z + (a.z - g.z) * k } : { x: a.x, y: a.y, z: a.z };
      if (lukus) return;
      // serval: raskusjõu suund ekraani tasandis, kõrvalekalle lähimast 90° sammust
      let ang = Math.atan2(g.x, g.y) * DEG;
      ang = ((ang % 90) + 90) % 90; if (ang > 45) ang -= 90;
      const raw = { x: Math.atan2(g.x, Math.abs(g.z)) * DEG, y: Math.atan2(g.y, Math.abs(g.z)) * DEG, a: ang };
      last = { x: raw.x - st.off.x, y: raw.y - st.off.y, a: raw.a - st.off.a, raw };
      draw();
    };
    window.addEventListener('devicemotion', onMotion);
    stop = () => { window.removeEventListener('devicemotion', onMotion); stop = null; };
    const onHash = () => { if (!location.hash.startsWith('#/vaterpass')) { stop && stop(); window.removeEventListener('hashchange', onHash); } };
    window.addEventListener('hashchange', onHash);
    setTimeout(() => { if (!sai) $('sub').textContent = 'Andurit ei leitud (töötab telefonis).'; }, 1500);

    $('nulli').onclick = () => {
      if (!last.raw) return;
      if (st.mode === 'serv') st.off.a = last.raw.a; else { st.off.x = last.raw.x; st.off.y = last.raw.y; }
      save('vaterpass', st); $('msg').textContent = 'Nullitud. „Nulli“ uuesti tasasel pinnal, kui vaja.';
    };
    $('lukk').onclick = () => { lukus = !lukus; $('lukk').textContent = lukus ? 'Vabasta' : 'Lukusta'; $('lukk').classList.toggle('primary', lukus); };
  },
};
