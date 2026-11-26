// Varukoopia: kõik KROX-i andmed ühte faili ja tagasi
const PREFIX = 'krox.';
const LAST = 'krox.meta.lastBackup';

export function lastBackup() {
  try { return localStorage.getItem(LAST); } catch { return null; }
}

export function exportAll() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith(PREFIX) && k !== LAST) data[k] = localStorage.getItem(k);
  }
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const file = { app: 'krox', version: 1, created: d.toISOString(), data };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(file, null, 1)], { type: 'application/json' }));
  a.download = `krox-varukoopia-${stamp}.json`;
  a.click();
  try { localStorage.setItem(LAST, stamp); } catch { /* ignore */ }
}

// Loeb faili; tagastab kirjete arvu tööpäevikus
export async function importFile(file) {
  const json = JSON.parse(await file.text());
  if (json.app !== 'krox' || typeof json.data !== 'object') throw new Error('See pole KROX-i varukoopia fail');
  Object.entries(json.data).forEach(([k, v]) => {
    if (k.startsWith(PREFIX)) localStorage.setItem(k, v);
  });
  try { return JSON.parse(json.data['krox.paevik'] || '[]').length; } catch { return 0; }
}
