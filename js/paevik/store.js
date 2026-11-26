// Tööpäeviku andmed (praegu telefoni brauseris, hiljem saab vahetada andmebaasi vastu)
const KEY = 'krox.paevik';
const TOOD = 'krox.paevik.tood';

function read(key, fb) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fb; } catch { return fb; }
}
function write(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { alert('Salvestamine ebaõnnestus'); }
}

export const all = () => read(KEY, []);
export const get = (id) => all().find((e) => e.id === id);
export const byDate = (d) => all().filter((e) => e.date === d);
export const byMonth = (ym) => all().filter((e) => e.date.startsWith(ym)).sort((a, b) => a.date.localeCompare(b.date));

export function upsert(entry) {
  const list = all();
  if (!entry.id) entry.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const i = list.findIndex((e) => e.id === entry.id);
  if (i >= 0) list[i] = entry; else list.push(entry);
  write(KEY, list);
  // jäta meelde tööde hinnad ja ühikud
  const tood = read(TOOD, {});
  entry.read.forEach((r) => { if (r.too) tood[r.too] = { yhik: r.yhik, hind: r.hind }; });
  write(TOOD, tood);
  return entry;
}
export function remove(id) { write(KEY, all().filter((e) => e.id !== id)); }

export const tood = () => read(TOOD, {});
export const objektid = () => [...new Set(all().map((e) => e.objekt).filter(Boolean))];

// Arvutused
const n = (s) => parseFloat(String(s ?? '').replace(',', '.')) || 0;
export const tukkSumma = (e) => e.read.reduce((s, r) => s + n(r.kogus) * n(r.hind), 0);
export const tunnid = (e) => n(e.tunnid);
export const summa = (e) => tunnid(e) * n(e.tunnihind) + tukkSumma(e);
export { n };

// Kuupäevad (kohalik aeg, mitte UTC)
export const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = () => iso(new Date());
