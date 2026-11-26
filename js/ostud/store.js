// Ostunimekirjad objektide kaupa
const KEY = 'krox.ostud';
const load = () => { try { return { listid: [], aktiivne: '', ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return { listid: [], aktiivne: '' }; } };
const save = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { alert('Salvestamine ebaõnnestus'); } };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const n = (s) => parseFloat(String(s ?? '').replace(',', '.')) || 0;

export { load, save, uid, n };

export function getList(d, nimi) {
  nimi = (nimi || 'Üldine').trim();
  let l = d.listid.find((x) => x.nimi.toLowerCase() === nimi.toLowerCase());
  if (!l) { l = { id: uid(), nimi, items: [] }; d.listid.push(l); }
  return l;
}

// Lisa asi; kui sama nimi ja ühik juba ostmata kujul olemas, liida kogus juurde
export function addItem(l, { nimi, kogus = '', yhik = '', kust = 'pood' }) {
  nimi = nimi.trim();
  if (!nimi) return;
  const same = l.items.find((i) => !i.ostetud && i.nimi.toLowerCase() === nimi.toLowerCase() && (i.yhik || '') === (yhik || '') && (i.kust || 'pood') === kust);
  if (same && kogus !== '' && same.kogus !== '') same.kogus = String(Math.round((n(same.kogus) + n(kogus)) * 100) / 100).replace('.', ',');
  else if (!same) l.items.push({ id: uid(), nimi, kogus: String(kogus).replace('.', ','), yhik, kust, ostetud: false });
}

// Kasutatakse kalkulaatoritest: lisa mitu asja objekti nimekirja
export function addMany(objekt, items) {
  const d = load();
  const l = getList(d, objekt);
  items.forEach((i) => addItem(l, i));
  d.aktiivne = l.id;
  save(d);
  return l;
}

// Kõik varem kasutatud asjade nimed (soovitusteks)
export const tuntud = (d) => [...new Set(d.listid.flatMap((l) => l.items.map((i) => i.nimi)))];
