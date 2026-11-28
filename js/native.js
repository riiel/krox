// Android-äpi (Capacitor) sillad. Veebibrauseris ei tee midagi.
const C = window.Capacitor;
export const isNative = !!C?.isNativePlatform?.();
export const VERSION = window.KROX_VERSION || '';
// Äpis on lehed telefonis (https://localhost), serveri funktsioonid jäävad Vercelisse
export const API_BASE = isNative ? 'https://krox-one.vercel.app' : '';

const cache = {};
const plugin = (n) => {
  if (!isNative) return null;
  return (cache[n] ||= C.Plugins?.[n] || C.registerPlugin?.(n));
};

const blobToB64 = (blob) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).split(',')[1]);
  r.onerror = rej;
  r.readAsDataURL(blob);
});

// Fail telefoni vahemällu ja jagamise menüü (Drive, Gmail, WhatsApp jne)
export async function shareNative(blob, name) {
  const safe = name.replace(/[\/\\:*?"<>|]/g, '_');
  const { uri } = await plugin('Filesystem').writeFile({ path: safe, data: await blobToB64(blob), directory: 'CACHE' });
  try {
    await plugin('Share').share({ title: safe, files: [uri], dialogTitle: 'Saada / salvesta' });
    return 'shared';
  } catch (e) {
    if (/cancel/i.test(String(e?.message || e))) return 'cancel';
    throw e;
  }
}

// ---------- meeldetuletused ----------
const hash = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) % 2000000000; };
let timer = null, permOk = null;
export function scheduleReminders(events) {
  if (!isNative) return;
  clearTimeout(timer);
  timer = setTimeout(async () => {
    try {
      const LN = plugin('LocalNotifications');
      if (permOk === null) {
        let p = await LN.checkPermissions();
        if (p.display !== 'granted') p = await LN.requestPermissions();
        permOk = p.display === 'granted';
      }
      if (!permOk) return;
      const now = Date.now();
      const list = [];
      const add = (id, at, title, body, hashUrl) => { if (at.getTime() > now + 30000) list.push({ id: hash(id), title, body, schedule: { at, allowWhileIdle: true }, smallIcon: 'ic_stat_krox', iconColor: '#c4a96b', extra: { hash: hashUrl } }); };
      events.forEach((e) => {
        const url = `#/kalender/e/${e.id}`;
        const [y, m, d] = e.kuupaev.split('-').map(Number);
        if (e.tyyp === 'maks') {
          add(e.id + ':-2', new Date(y, m - 1, d - 2, 9, 0), 'Tähtaeg ülehomme', e.pealkiri, url);
          add(e.id + ':0', new Date(y, m - 1, d, 9, 0), 'Täna tähtaeg', e.pealkiri, url);
        } else if (e.aeg) {
          const [hh, mm] = e.aeg.split(':').map(Number);
          add(e.id + ':t', new Date(y, m - 1, d, hh, mm - 60), `Tunni pärast (${e.aeg})`, e.pealkiri || 'Sündmus', url);
        } else {
          add(e.id + ':d', new Date(y, m - 1, d, 8, 0), 'Täna', e.pealkiri || 'Sündmus', url);
        }
      });
      const pending = await LN.getPending();
      if (pending.notifications?.length) await LN.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
      if (list.length) await LN.schedule({ notifications: list.slice(0, 60) });
    } catch (e) { console.warn('Meeldetuletused', e); }
  }, 1500);
}

// ---------- uuendused ----------
const UKEY = 'krox.meta.update';
export async function checkUpdate() {
  if (!isNative || !VERSION) return null;
  try {
    const last = JSON.parse(localStorage.getItem(UKEY) || 'null');
    if (last && Date.now() - last.t < 6 * 3600e3) return last.uus > Number(VERSION) ? last : null;
    const r = await fetch('https://api.github.com/repos/riiel/krox/releases/latest');
    if (!r.ok) return null;
    const j = await r.json();
    const asset = (j.assets || []).find((a) => a.name.endsWith('.apk'));
    const info = { t: Date.now(), uus: Number(String(j.tag_name).replace(/\D/g, '')), url: asset?.browser_download_url || j.html_url };
    localStorage.setItem(UKEY, JSON.stringify(info));
    return info.uus > Number(VERSION) ? info : null;
  } catch { return null; }
}
// ---------- käivitamine ----------
export function initNative({ onBack }) {
  if (!isNative) return;
  document.documentElement.classList.add('native');
  try {
    const SB = plugin('StatusBar');
    SB.setStyle({ style: 'DARK' }).catch(() => {});
    SB.setBackgroundColor({ color: '#0b0b0b' }).catch(() => {});
  } catch { /* ignore */ }
  try {
    plugin('App').addListener('backButton', () => {
      if (onBack && onBack()) return;
      if (document.querySelector('.scan-wrap')) return; // skanner lõpetatakse nupuga
      if (location.hash && location.hash !== '#/' && location.hash !== '#') history.back();
      else plugin('App').exitApp();
    });
    plugin('LocalNotifications').addListener('localNotificationActionPerformed', (a) => {
      const h = a?.notification?.extra?.hash;
      if (h) location.hash = h;
    });
  } catch (e) { console.warn(e); }
}
