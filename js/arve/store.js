// Arvete ja pakkumiste andmed
const KEY = 'krox.arved';
const KLIENDID = 'krox.kliendid';

function read(key, fb) { try { return JSON.parse(localStorage.getItem(key)) ?? fb; } catch { return fb; } }
function write(key, d) { try { localStorage.setItem(key, JSON.stringify(d)); } catch { alert('Salvestamine ebaõnnestus'); } }

export const all = () => read(KEY, []).sort((a, b) => (b.kuupaev + b.nr).localeCompare(a.kuupaev + a.nr));
export const get = (id) => read(KEY, []).find((d) => d.id === id);

export function upsert(doc) {
  const list = read(KEY, []);
  if (!doc.id) doc.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const i = list.findIndex((d) => d.id === doc.id);
  if (i >= 0) list[i] = doc; else list.push(doc);
  write(KEY, list);
  if (doc.klient?.nimi) {
    const k = read(KLIENDID, {});
    k[doc.klient.nimi] = doc.klient;
    write(KLIENDID, k);
  }
  return doc;
}
export const remove = (id) => write(KEY, read(KEY, []).filter((d) => d.id !== id));
export const kliendid = () => read(KLIENDID, {});

// Järgmine number: arve 26-001, pakkumine P26-001
export function nextNr(tyyp, kuupaev) {
  const yy = (kuupaev || new Date().toISOString()).slice(2, 4);
  const pre = (tyyp === 'pakkumine' ? 'P' : '') + yy + '-';
  const max = read(KEY, [])
    .filter((d) => d.tyyp === tyyp && d.nr?.startsWith(pre))
    .reduce((m, d) => Math.max(m, parseInt(d.nr.slice(pre.length)) || 0), 0);
  return pre + String(max + 1).padStart(3, '0');
}

const n = (s) => parseFloat(String(s ?? '').replace(',', '.')) || 0;
const r2 = (x) => Math.round(x * 100) / 100;
export function totals(doc) {
  const read = doc.read.map((r) => ({ ...r, summa: r2(n(r.kogus) * n(r.hind)) }));
  const neto = r2(read.reduce((s, r) => s + r.summa, 0));
  const km = r2(neto * n(doc.km) / 100);
  return { read, neto, km, kokku: r2(neto + km) };
}
export { n };
