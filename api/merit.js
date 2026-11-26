// Merit Aktiva: käibemaksumäärad ja tšeki saatmine kinnitamist ootama (sendpurchorder)
// Vajab Vercelis: MERIT_API_ID, MERIT_API_KEY, APP_PIN
const { checkPin, onlyPost, meritCall } = require('./_util');

// Leia käibemaksu määra protsent Meriti vastusest (väljade nimed võivad erineda)
function taxPct(t) {
  for (const k of ['TaxPct', 'Pct', 'Rate', 'VatPct', 'Percent']) if (t[k] != null && !isNaN(+t[k])) return +t[k];
  const m = String(t.Code || t.Name || '').match(/(\d+(?:[.,]\d+)?)\s*%/);
  return m ? +m[1].replace(',', '.') : null;
}

async function taxes() {
  const list = await meritCall('gettaxes', {});
  return (Array.isArray(list) ? list : []).map((t) => ({ id: t.Id, code: t.Code, name: t.Name, pct: taxPct(t) }));
}

const r2 = (x) => Math.round(x * 100) / 100;
const ymd = (s) => String(s || '').replace(/-/g, '').slice(0, 8);

module.exports = async (req, res) => {
  if (!onlyPost(req, res) || !checkPin(req, res)) return;
  const { action, kulu, pdf } = req.body || {};
  try {
    if (action === 'taxes') return res.status(200).json({ ok: true, taxes: await taxes() });

    if (action === 'send') {
      if (!kulu || !pdf) return res.status(400).json({ error: 'Andmed puudu' });
      const tx = await taxes();
      const findTax = (pct) => {
        const hit = tx.find((t) => t.pct === +pct);
        if (!hit) throw new Error(`Meritis ei leitud ${pct}% käibemaksu määra`);
        return hit.id;
      };

      // read käibemaksu määrade kaupa; summad koos KM-ga -> ilma KM-ta
      const rows = (kulu.read?.length ? kulu.read : [{ maar: 0, kokku: kulu.kokku }]).map((r) => {
        const kokku = +r.kokku || 0, maar = +r.maar || 0;
        const km = r.km != null && r.km !== '' ? +r.km : r2(kokku * maar / (100 + maar));
        return { taxId: findTax(maar), neto: r2(kokku - km), km: r2(km), maar };
      });
      const kmByTax = {};
      rows.forEach((r) => { kmByTax[r.taxId] = r2((kmByTax[r.taxId] || 0) + r.km); });

      const vendor = {
        Name: (kulu.myyja || 'Tundmatu müüja').slice(0, 150),
        VatAccountable: !!kulu.kmkr,
        CountryCode: (kulu.riik || 'EE').slice(0, 2).toUpperCase(),
      };
      if (kulu.regkood) vendor.RegNo = String(kulu.regkood).slice(0, 30);
      if (kulu.kmkr) vendor.VatRegNo = String(kulu.kmkr).slice(0, 30);

      const itemCode = (process.env.MERIT_ITEM_CODE || 'KULU').slice(0, 20);
      const payload = {
        Vendor: vendor,
        ExpenseClaim: kulu.makseviis === 'isiklik',
        DocDate: ymd(kulu.kuupaev),
        DueDate: ymd(kulu.kuupaev),
        BillNo: String(kulu.tsekiNr || `T${ymd(kulu.kuupaev)}-${String(kulu.id || '').slice(-4)}`).slice(0, 35),
        InvoiceRow: rows.map((r) => ({
          Item: { Code: itemCode, Description: (kulu.kirjeldus || kulu.myyja || 'Kulu').slice(0, 100), Type: 2 },
          Quantity: 1,
          Price: r.neto,
          TaxId: r.taxId,
        })),
        TaxAmount: Object.entries(kmByTax).map(([TaxId, Amount]) => ({ TaxId, Amount })),
        TotalAmount: r2(rows.reduce((s, r) => s + r.neto, 0)),
        Hcomment: [
          kulu.objekt && `Objekt: ${kulu.objekt}`,
          kulu.makseviis === 'isiklik' ? 'Makstud isiklike vahenditega (kuluaruanne)' : 'Makstud firma kaardiga',
          kulu.markus,
        ].filter(Boolean).join('. ').slice(0, 4000),
        Attachment: { FileName: (kulu.failinimi || 'tsekk.pdf').replace(/[^\w.,\- ]/g, '_'), FileContent: pdf },
      };
      const result = await meritCall('sendpurchorder', payload);
      return res.status(200).json({ ok: true, result });
    }

    res.status(400).json({ error: 'Tundmatu tegevus' });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
};

module.exports.taxPct = taxPct;
