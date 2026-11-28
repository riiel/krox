import { shareFile } from './docx.js';
import { api, pin } from './kulud/store.js';
import { isNative } from './native.js';
// Varukoopia: kõik KROX-i andmed (ja tööriistade pildid) ühte faili ja tagasi.
// Äpis saadetakse varukoopia ise e-kirjaga firma Gmaili, kui andmed on muutunud.
const PREFIX = 'krox.';
const META = 'krox.meta.';
const LAST = 'krox.meta.lastBackup';
const AUTO = 'krox.meta.autoBackup';
const MAX_OSA = 3_000_000; // baiti JSON-it ühe kirja kohta (serveri piir ~4,5 MB base64-na)

const stampOf = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const getJ = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };

export function lastBackup() {
  try { return localStorage.getItem(LAST); } catch { return null; }
}
export const autoInfo = () => getJ(AUTO);

// ---- pildid (tööriistad) ----
function pildiDb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('krox-pildid', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('pildid');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function koikPildid() {
  const db = await pildiDb();
  return new Promise((res, rej) => {
    const out = [];
    const t = db.transaction('pildid', 'readonly');
    const c = t.objectStore('pildid').openCursor();
    c.onsuccess = () => { const cur = c.result; if (cur) { out.push([cur.key, cur.value]); cur.continue(); } };
    t.oncomplete = () => res(out); t.onerror = () => rej(t.error);
  });
}
async function panePilt(id, blob) {
  const db = await pildiDb();
  return new Promise((res, rej) => {
    const t = db.transaction('pildid', 'readwrite');
    t.objectStore('pildid').put(blob, id);
    t.oncomplete = res; t.onerror = () => rej(t.error);
  });
}
async function vahenda(blob, max = 900) {
  try {
    const bmp = await createImageBitmap(blob);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.75));
  } catch { return blob; }
}
const b64 = (blob) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.readAsDataURL(blob); });

function koikAndmed() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith(PREFIX) && !k.startsWith(META)) data[k] = localStorage.getItem(k);
  }
  return data;
}
const hashStr = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };

// Varukoopia failid (tavaliselt üks; palju pilte → mitu osa)
async function koosta() {
  const created = new Date().toISOString();
  const data = koikAndmed();
  const pildid = await koikPildid().catch(() => []);
  const failid = [{ app: 'krox', version: 2, created, data, pildid: {} }];
  let suurus = JSON.stringify(data).length;
  for (const [id, blob] of pildid) {
    const s = await b64(await vahenda(blob));
    if (suurus + s.length > MAX_OSA) { failid.push({ app: 'krox', version: 2, created, pildid: {} }); suurus = 0; }
    failid[failid.length - 1].pildid[id] = s;
    suurus += s.length;
  }
  const pildiHash = pildid.map(([id, b]) => id + ':' + (b?.size || 0)).join(',');
  return { failid, hash: hashStr(JSON.stringify(data) + pildiHash), pilte: pildid.length };
}
const failiNimi = (stamp, i, n) => `krox-varukoopia-${stamp}${n > 1 ? `-osa${i + 1}` : ''}.json`;

export async function exportAll() {
  const { failid } = await koosta();
  const stamp = stampOf();
  let res;
  for (let i = 0; i < failid.length; i++) {
    res = await shareFile(new Blob([JSON.stringify(failid[i])], { type: 'application/json' }), failiNimi(stamp, i, failid.length));
    if (res === 'cancel') return res;
  }
  try { localStorage.setItem(LAST, stamp); } catch { /* ignore */ }
  return res;
}

// Automaatne varukoopia e-postiga (ainult äpis). force = saada kohe.
let kaib = false;
export async function autoBackup(force = false) {
  if (kaib || (!isNative && !force) || !pin() || !navigator.onLine) return null;
  const info = getJ(AUTO) || {};
  if (!force && info.t && Date.now() - info.t < 20 * 3600e3) return null; // kõige rohkem kord päevas
  kaib = true;
  try {
    const { failid, hash, pilte } = await koosta();
    if (!force && hash === info.hash) return null; // midagi pole muutunud
    const stamp = stampOf();
    const d = failid[0].data;
    const n = (k) => { try { return JSON.parse(d[k] || '[]').length; } catch { return 0; } };
    const kokkuvote = `Tööpäeviku kirjeid: ${n('krox.paevik')}, tööriistu: ${n('krox.tooriistad')}, tööriistade pilte: ${pilte}.`;
    let to = '';
    for (let i = 0; i < failid.length; i++) {
      const r = await api('varukoopia', { failinimi: failiNimi(stamp, i, failid.length), base64: await b64(new Blob([JSON.stringify(failid[i])])), osa: i + 1, osi: failid.length, kokkuvote });
      to = r.to;
    }
    const uus = { t: Date.now(), hash, to, kp: stamp };
    localStorage.setItem(AUTO, JSON.stringify(uus));
    localStorage.setItem(LAST, stamp);
    return uus;
  } catch (e) {
    if (force) throw e;
    console.warn('Automaatne varukoopia', e);
    return null;
  } finally { kaib = false; }
}

// Loeb faili(d); tagastab kirjete arvu tööpäevikus ja taastatud pildid
export async function importFile(files) {
  const list = files instanceof FileList || Array.isArray(files) ? [...files] : [files];
  let paevik = 0, pilte = 0, andmed = false;
  for (const file of list) {
    const json = JSON.parse(await file.text());
    if (json.app !== 'krox') throw new Error(`${file.name} pole KROX-i varukoopia fail`);
    if (json.data && typeof json.data === 'object') {
      andmed = true;
      Object.entries(json.data).forEach(([k, v]) => { if (k.startsWith(PREFIX) && !k.startsWith(META)) localStorage.setItem(k, v); });
      try { paevik = JSON.parse(json.data['krox.paevik'] || '[]').length; } catch { /* */ }
    }
    for (const [id, s] of Object.entries(json.pildid || {})) {
      const bin = atob(s); const u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      await panePilt(id, new Blob([u], { type: 'image/jpeg' }));
      pilte++;
    }
  }
  return { paevik, pilte, andmed };
}
