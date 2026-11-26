// Abifunktsioonid: vormindamine, salvestus, seaded

export const eur = (n) =>
  (isFinite(n) ? n : 0).toLocaleString('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export const num = (n, d = 2) =>
  (isFinite(n) ? n : 0).toLocaleString('et-EE', { minimumFractionDigits: 0, maximumFractionDigits: d });

// Loeb sisendist arvu; lubab ka koma ("12,5")
export const val = (el) => {
  const v = parseFloat(String(el.value).replace(',', '.').replace(/\s/g, ''));
  return isFinite(v) ? v : 0;
};

export const round2 = (n) => Math.round(n * 100) / 100;

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem('krox.' + key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : { ...fallback };
  } catch { return { ...fallback }; }
}
export function save(key, data) {
  try { localStorage.setItem('krox.' + key, JSON.stringify(data)); } catch { /* ignore */ }
}

// Maksumäärad (Eesti 2026). Muudetavad seadete lehel.
export const DEFAULT_RATES = {
  tulumaks: 22,          // %
  maksuvaba: 700,        // € kuus
  tkTootaja: 1.6,        // töötuskindlustus, töötaja %
  tkTooandja: 0.8,       // töötuskindlustus, tööandja %
  sotsiaalmaks: 33,      // %
  km: 24,                // käibemaks %
};
export const rates = () => load('rates', DEFAULT_RATES);

// Väike abi HTML-i loomiseks
export const h = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content;
};

// Rida tulemuste kastis
export const line = (label, value, big = false) =>
  `<div class="line${big ? ' big' : ''}"><span>${label}</span><b>${value}</b></div>`;

// Segmentnupud: [{v, t}] -> seob klikid
export function seg(container, onChange) {
  container.querySelectorAll('button').forEach((b) =>
    b.addEventListener('click', () => {
      container.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      onChange(b.dataset.v);
    })
  );
}
