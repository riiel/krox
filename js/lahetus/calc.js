// Välislähetuse päevaraha arvutus (TuMS § 13 lg 3 p 1):
// kõrgem määr lähetuse esimese 15 päeva eest, kuid kõige rohkem 15 päeva kalendrikuus; ülejäänud päevad madalam määr.

const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const kp = (s) => (s ? s.split('-').reverse().join('.') : '');
const next = (s) => { const d = new Date(s + 'T12:00'); d.setDate(d.getDate() + 1); return iso(d); };

// Perioodid -> sorteeritud unikaalsed päevad
export function days(perioodid) {
  const set = new Set();
  perioodid.forEach(({ algus, lopp }) => {
    if (!algus) return;
    const end = lopp && lopp >= algus ? lopp : algus;
    for (let d = algus; d <= end; d = next(d)) set.add(d);
  });
  return [...set].sort();
}

// used75: { 'YYYY-MM': päevade arv kõrgema määraga juba samas kuus (varasemad lähetused) }
export function arvuta(perioodid, kõrge = 75, madal = 40, used75 = {}) {
  const used = { ...used75 };
  const list = days(perioodid).map((d, i) => {
    const m = d.slice(0, 7);
    const high = i < 15 && (used[m] || 0) < 15;
    if (high) used[m] = (used[m] || 0) + 1;
    return { d, maar: high ? kõrge : madal };
  });
  // järjestikused sama määraga päevad lõikudeks
  const segs = [];
  list.forEach((x) => {
    const last = segs[segs.length - 1];
    if (last && last.maar === x.maar && next(last.lopp) === x.d) { last.lopp = x.d; last.paevi++; }
    else segs.push({ algus: x.d, lopp: x.d, paevi: 1, maar: x.maar });
  });
  const kokku = list.reduce((s, x) => s + x.maar, 0);
  const korge = list.filter((x) => x.maar === kõrge && kõrge !== madal).length;
  return { list, segs, paevi: list.length, korge, madal: list.length - korge, kokku, perMonth75: used };
}

// Raamatupidajale kopeeritav tekst (sama kuju nagu senine „Raamatupidamine“ dokument)
export function raamatupidamine(r, kõrge, madal) {
  const out = [];
  const groups = [[kõrge, r.segs.filter((s) => s.maar === kõrge)], [madal, r.segs.filter((s) => s.maar === madal)]];
  groups.forEach(([maar, segs], gi) => {
    if (!segs.length || (gi === 1 && kõrge === madal)) return;
    const n = segs.reduce((s, x) => s + x.paevi, 0);
    const allHighFirst = r.list.findIndex((x) => x.maar !== kõrge) === -1 || r.list.findIndex((x) => x.maar !== kõrge) === r.korge;
    const kirjeldus = allHighFirst ? (gi === 0 ? `esimesed ${n} päeva` : `järgnevad ${n} päeva`) : `${n} päeva`;
    out.push(`${maar} € / päev (${kirjeldus}, kokku ${n * maar} €)`, '');
    segs.forEach((s) => out.push(`${kp(s.algus)} – ${kp(s.lopp)} (${s.paevi} ${s.paevi === 1 ? 'päev' : 'päeva'})`));
    out.push('');
  });
  out.push(`Kokku teeb see ${r.paevi} päeva ja ${r.kokku} €.`);
  return out.join('\n');
}

// Lühike ajavahemiku kirjeldus korralduse jaoks: 01.10–07.10; 12.10–23.10
export function vahemikud(perioodid) {
  const d = days(perioodid);
  const parts = [];
  d.forEach((x) => {
    const last = parts[parts.length - 1];
    if (last && next(last[1]) === x) last[1] = x; else parts.push([x, x]);
  });
  const sameYear = d.length && d[0].slice(0, 4) === d[d.length - 1].slice(0, 4);
  const f = (s) => (sameYear ? kp(s).slice(0, 5) : kp(s));
  return parts.map(([a, b]) => (a === b ? f(a) : `${f(a)}–${f(b)}`)).join('; ');
}
