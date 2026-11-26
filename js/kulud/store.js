// Kulud: andmed + pildid IndexedDB-s (pildid on liiga suured localStorage jaoks)
const DB = 'krox', STORE = 'kulud';

function open() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx(mode, fn) {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => res(out?.result ?? out);
    t.onerror = () => rej(t.error);
  });
}

export const all = async () => (await tx('readonly', (s) => s.getAll())).sort((a, b) => (b.kuupaev + b.id).localeCompare(a.kuupaev + a.id));
export const get = (id) => tx('readonly', (s) => s.get(id));
export const put = (k) => { if (!k.id) k.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6); return tx('readwrite', (s) => s.put(k)).then(() => k); };
export const remove = (id) => tx('readwrite', (s) => s.delete(id));

// PIN serveri funktsioonide jaoks
export const pin = () => { try { return localStorage.getItem('krox.pin') || ''; } catch { return ''; } };
export const setPin = (p) => { try { localStorage.setItem('krox.pin', p); } catch { /* */ } };

export async function api(path, body) {
  const r = await fetch('/api/' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-krox-pin': pin() },
    body: JSON.stringify(body),
  });
  let data; try { data = await r.json(); } catch { data = { error: `Server vastas ${r.status}` }; }
  if (!r.ok) throw new Error(data.error || `Viga ${r.status}`);
  return data;
}

// Summad
const n = (s) => parseFloat(String(s ?? '').replace(',', '.')) || 0;
export { n };
export const r2 = (x) => Math.round(x * 100) / 100;
export const kmOf = (row) => (row.km !== '' && row.km != null ? n(row.km) : r2(n(row.kokku) * n(row.maar) / (100 + n(row.maar))));
export const total = (k) => r2(k.read.reduce((s, r) => s + n(r.kokku), 0));
export const kmTotal = (k) => r2(k.read.reduce((s, r) => s + kmOf(r), 0));

export function failinimi(k, ext) {
  const s = `${k.kuupaev} ${(k.myyja || 'tsekk').replace(/\b(AS|OÜ|OU|Oy|Ab|SIA|UAB)\b/g, '').trim()} ${total(k).toFixed(2).replace('.', ',')}`;
  return s.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim() + '.' + ext;
}
