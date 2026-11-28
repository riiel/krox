// Hinnapakkumise PDF (eesti / soome / inglise)
import { Pdf } from '../pdf.js';
import { firma } from '../firma.js';

export const T = {
  et: { title: 'HINNAPAKKUMINE', nr: 'Nr', kp: 'Kuupäev', kehtib: 'Kehtib kuni', klient: 'Klient', objekt: 'Objekt', kmkr: 'KMKR', reg: 'Reg.kood', tel: 'Tel', kirj: 'Kirjeldus', kogus: 'Kogus', yk: 'Ühik', hind: 'Ühikuhind', summa: 'Summa', too: 'Tööd', mat: 'Materjalid', vahe: 'Vahesumma', ilmaKm: 'Kokku ilma KM-ta', km: (m) => `Käibemaks ${m}%`, kokku: 'KOKKU', kokkuKm: 'KOKKU (koos KM-ga)', poord: 'Pöördmaksustamine (KMS § 41¹)', tingimused: 'Tingimused', lp: 'Lugupidamisega', iban: 'IBAN', lk: 'Lk', loc: 'et-EE' },
  fi: { title: 'TARJOUS', nr: 'Nro', kp: 'Päivämäärä', kehtib: 'Voimassa', klient: 'Asiakas', objekt: 'Kohde', kmkr: 'ALV-nro', reg: 'Rek.nro', tel: 'Puh', kirj: 'Kuvaus', kogus: 'Määrä', yk: 'Yks.', hind: 'À-hinta', summa: 'Yhteensä', too: 'Työt', mat: 'Materiaalit', vahe: 'Välisumma', ilmaKm: 'Yhteensä (veroton)', km: (m) => `ALV ${String(m).replace('.', ',')} %`, kokku: 'YHTEENSÄ', kokkuKm: 'YHTEENSÄ (sis. ALV)', poord: 'Käännetty verovelvollisuus (AVL 8 c §)', tingimused: 'Ehdot', lp: 'Ystävällisin terveisin', iban: 'IBAN', lk: 'Sivu', loc: 'fi-FI' },
  en: { title: 'QUOTATION', nr: 'No.', kp: 'Date', kehtib: 'Valid until', klient: 'Client', objekt: 'Site', kmkr: 'VAT no.', reg: 'Reg. no.', tel: 'Tel', kirj: 'Description', kogus: 'Qty', yk: 'Unit', hind: 'Unit price', summa: 'Amount', too: 'Labour', mat: 'Materials', vahe: 'Subtotal', ilmaKm: 'Total excl. VAT', km: (m) => `VAT ${m}%`, kokku: 'TOTAL', kokkuKm: 'TOTAL incl. VAT', poord: 'Reverse charge – VAT to be accounted for by the customer', tingimused: 'Terms', lp: 'Kind regards', iban: 'IBAN', lk: 'Page', loc: 'en-IE' },
};
export const YK_T = {
  fi: { tk: 'kpl', h: 'h', kmpl: 'sarja', 'päev': 'pv', jm: 'jm', 'm²': 'm²', l: 'l', kg: 'kg', ''  : '' },
  en: { tk: 'pcs', h: 'h', kmpl: 'set', 'päev': 'day', jm: 'lm', 'm²': 'm²', l: 'l', kg: 'kg', '': '' },
};

export const summad = (p) => {
  const rida = (r) => (parseFloat(String(r.kogus).replace(',', '.')) || 0) * (parseFloat(String(r.hind).replace(',', '.')) || 0);
  const too = p.read.filter((r) => r.tyyp !== 'mat').reduce((a, r) => a + rida(r), 0);
  const mat = p.read.filter((r) => r.tyyp === 'mat').reduce((a, r) => a + rida(r), 0);
  const neto = Math.round((too + mat) * 100) / 100;
  const maar = typeof p.km === 'number' ? p.km : 0;
  const km = Math.round(neto * maar) / 100;
  return { rida, too, mat, neto, maar, km, kokku: Math.round((neto + km) * 100) / 100 };
};

const kp = (iso) => (iso ? iso.split('-').reverse().join('.') : '');
const lisaPaevi = (iso, n) => { const d = new Date(iso + 'T12:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

async function logo() {
  try {
    const r = await fetch('img/logo-pdf.jpg');
    const data = new Uint8Array(await r.arrayBuffer());
    const bmp = await createImageBitmap(new Blob([data]));
    return { data, w: bmp.width, h: bmp.height };
  } catch { return null; }
}

export async function pakkumisePdf(p) {
  const L = T[p.keel] || T.et;
  const tx = (r) => (p.keel !== 'et' && r.tolge ? r.tolge : r.kirjeldus);
  const yk = (u) => (p.keel === 'et' ? u : YK_T[p.keel]?.[u] ?? u);
  const nf = new Intl.NumberFormat(L.loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const eur = (n) => nf.format(n) + ' €';
  const qty = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? new Intl.NumberFormat(L.loc, { maximumFractionDigits: 2 }).format(n) : String(v || ''); };
  const F = firma();
  const S = summad(p);
  const doc = new Pdf();
  const X0 = 42, X1 = 553, GOLD = '#a8894a', GREY = '#666', LINE = '#d8d8d8';
  const C = { kirj: X0 + 4, kogus: 352, yk: 358, hind: 465, summa: X1 - 4 };
  let y = 0;
  const lg = await logo();

  const footer = (n, kokku) => {
    doc.line(X0, 800, X1, 800, { w: 0.5, color: LINE });
    const t = [F.nimi, F.regkood && `${L.reg} ${F.regkood}`, F.kmkr && `${L.kmkr} ${F.kmkr}`, F.iban && `${L.iban} ${F.iban.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim()}`, F.pank].filter(Boolean).join('  ·  ');
    doc.text(X0, 813, t, { size: 7.5, color: GREY });
    doc.text(X1, 826, `${L.lk} ${n}/${kokku}`, { size: 7.5, color: GREY, align: 'right' });
  };
  const tabeliPais = () => {
    doc.rect(X0, y, X1 - X0, 20, { fill: '#f1ede4' });
    const yy = y + 13.5;
    doc.text(C.kirj, yy, L.kirj, { size: 8.5, bold: true });
    doc.text(C.kogus, yy, L.kogus, { size: 8.5, bold: true, align: 'right' });
    doc.text(C.yk, yy, L.yk, { size: 8.5, bold: true });
    doc.text(C.hind, yy, L.hind, { size: 8.5, bold: true, align: 'right' });
    doc.text(C.summa, yy, L.summa, { size: 8.5, bold: true, align: 'right' });
    y += 26;
  };
  const uusLeht = (tabel) => { doc.page(); y = 50; if (tabel) tabeliPais(); };
  const ruumi = (h, tabel = false) => { if (y + h > 785) uusLeht(tabel); };

  // ---- päis ----
  doc.page();
  if (lg) { const h = 40, w = lg.w * h / lg.h; doc.image(lg.data, lg.w, lg.h, X0, 40, w, h); }
  else doc.text(X0, 70, F.nimi, { size: 20, bold: true, color: GOLD });
  doc.text(X1, 58, L.title, { size: 20, bold: true, align: 'right' });
  const meta = [[L.nr, p.nr], [L.kp, kp(p.kuupaev)], [L.kehtib, kp(lisaPaevi(p.kuupaev, +p.kehtib || 14))]];
  meta.forEach(([a, b], i) => {
    doc.text(X1 - 78, 78 + i * 13, a, { size: 9, color: GREY, align: 'right' });
    doc.text(X1, 78 + i * 13, b, { size: 9, bold: true, align: 'right' });
  });

  // firma ja klient
  y = 132;
  const fRead = [F.aadress, F.regkood && `${L.reg} ${F.regkood}`, F.kmkr && `${L.kmkr} ${F.kmkr}`, F.telefon && `${L.tel} ${F.telefon}`, F.email].filter(Boolean);
  doc.text(X0, y, F.nimi, { size: 10.5, bold: true });
  fRead.forEach((t, i) => doc.text(X0, y + 14 + i * 12, t, { size: 9, color: '#333' }));
  const kx = 320;
  doc.text(kx, y - 14, L.klient.toUpperCase(), { size: 7.5, bold: true, color: GOLD });
  const k = p.klient || {};
  doc.text(kx, y, k.nimi || '—', { size: 10.5, bold: true });
  const kRead = [...doc.wrap(k.aadress, X1 - kx, 9), k.kmkr && `${L.kmkr} ${k.kmkr}`, k.kontakt].filter(Boolean);
  kRead.forEach((t, i) => doc.text(kx, y + 14 + i * 12, t, { size: 9, color: '#333' }));
  y += 14 + Math.max(fRead.length, kRead.length) * 12 + 10;
  if (p.objekt) {
    doc.text(X0, y, L.objekt + ':', { size: 9, color: GREY });
    doc.text(X0 + doc.width(L.objekt + ': ', 9), y, p.objekt, { size: 9, bold: true });
    y += 18;
  }
  y += 6;

  // ---- read ----
  tabeliPais();
  const grupid = [['too', p.read.filter((r) => r.tyyp !== 'mat'), S.too], ['mat', p.read.filter((r) => r.tyyp === 'mat'), S.mat]].filter(([, r]) => r.length);
  const pealkirjad = grupid.length > 1;
  grupid.forEach(([g, read, vahe]) => {
    if (pealkirjad) { ruumi(40, true); doc.text(C.kirj, y + 4, L[g], { size: 9.5, bold: true, color: GOLD }); y += 18; }
    read.forEach((r) => {
      const lines = doc.wrap(tx(r), C.kogus - 50 - C.kirj, 9.5);
      const h = lines.length * 12 + 8;
      ruumi(h, true);
      lines.forEach((t, i) => doc.text(C.kirj, y + 4 + i * 12, t, { size: 9.5 }));
      const yy = y + 4;
      doc.text(C.kogus, yy, qty(r.kogus), { size: 9.5, align: 'right' });
      const u = yk(r.yhik);
      if (u.endsWith('²')) { const b = u.slice(0, -1); doc.text(C.yk, yy, b, { size: 9.5 }); doc.text(C.yk + doc.width(b, 9.5) + 0.5, yy - 3.6, '2', { size: 6 }); }
      else doc.text(C.yk, yy, u, { size: 9.5 });
      doc.text(C.hind, yy, r.hind !== '' && r.hind != null ? eur(parseFloat(String(r.hind).replace(',', '.')) || 0) : '', { size: 9.5, align: 'right' });
      doc.text(C.summa, yy, eur(S.rida(r)), { size: 9.5, align: 'right' });
      y += h;
      doc.line(X0, y - 4, X1, y - 4, { w: 0.4, color: LINE });
    });
    if (pealkirjad) {
      ruumi(20, true);
      doc.text(C.hind, y + 6, `${L.vahe} (${L[g].toLowerCase()})`, { size: 9, color: GREY, align: 'right' });
      doc.text(C.summa, y + 6, eur(vahe), { size: 9, bold: true, align: 'right' });
      y += 22;
    }
  });

  // ---- kokkuvõte ----
  ruumi(90);
  y += 8;
  const rida = (a, b, bold = false, size = 10) => { doc.text(C.hind, y, a, { size, bold, align: 'right' }); doc.text(C.summa, y, b, { size, bold, align: 'right' }); y += size + 6; };
  if (p.km === 'poord' || p.km > 0) rida(L.ilmaKm, eur(S.neto));
  if (p.km > 0) rida(L.km(p.km), eur(S.km));
  doc.line(330, y - 6, X1, y - 6, { w: 0.8, color: '#000' });
  y += 6;
  rida(p.km > 0 ? L.kokkuKm : L.kokku, eur(S.kokku), true, 12.5);
  if (p.km === 'poord') { y += 2; doc.text(C.summa, y, L.poord, { size: 8.5, color: GREY, align: 'right' }); y += 14; }

  // ---- tingimused ----
  const mark = p.keel !== 'et' && p.markusTolge ? p.markusTolge : p.markus;
  if (mark && mark.trim()) {
    const lines = doc.wrap(mark, X1 - X0, 9);
    ruumi(30 + Math.min(lines.length, 6) * 12);
    y += 14;
    doc.text(X0, y, L.tingimused.toUpperCase(), { size: 7.5, bold: true, color: GOLD });
    y += 14;
    lines.forEach((t) => { ruumi(12); doc.text(X0, y, t, { size: 9, color: '#222' }); y += 12.5; });
  }

  // ---- allkiri ----
  ruumi(60);
  y += 22;
  doc.text(X0, y, L.lp + ',', { size: 9.5 });
  [F.juhatus, F.nimi, F.telefon, F.email].filter(Boolean).forEach((t, i) => doc.text(X0, y + 16 + i * 12, t, { size: 9.5, bold: i === 0 }));

  const n = doc.pages.length;
  doc.pages.forEach((pg, i) => { doc.cur = pg; footer(i + 1, n); });
  return doc.blob();
}
