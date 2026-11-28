// Tšeki pildi automaatne lugemine (Claude API). Vajab Vercelis: ANTHROPIC_API_KEY, APP_PIN
const { checkPin, onlyPost } = require('./_util');

const PROMPT = `Sa loed Eesti (või Soome) poe kassatšekki või arvet. Vasta AINULT JSON-objektiga, ilma muu tekstita:
{
  "myyja": "poe/firma juriidiline nimi, nt Bauhof Group AS",
  "regkood": "müüja registrikood või tühi",
  "kmkr": "müüja KMKR nr (nt EE100...) või tühi",
  "kuupaev": "YYYY-MM-DD",
  "tsekiNr": "tšeki/arve number või tühi",
  "kokku": 0.00,
  "km": [ { "maar": 24, "kokku": 0.00, "km": 0.00 } ],
  "kirjeldus": "lühike kirjeldus ostetust eesti keeles, nt Plaatimisliim, krunt",
  "riik": "EE"
}
"kokku" on makstud summa koos käibemaksuga. "km" on käibemaksu jaotus määrade kaupa (kokku = selle määra summa koos KM-ga).
Kui käibemaksu pole näha, pane "km": []. Arvud punktiga, mitte komaga. Kui midagi pole kindel, jäta tühjaks.`;

module.exports = async (req, res) => {
  if (!onlyPost(req, res) || !checkPin(req, res)) return;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY pole Vercelis seadistatud' });
  const { image, images } = req.body || {};
  const pildid = (Array.isArray(images) ? images : [image]).filter((x) => typeof x === 'string' && x).slice(0, 6);
  if (!pildid.length) return res.status(400).json({ error: 'Pilt puudub' });
  const content = [
    ...pildid.map((data) => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } })),
    { type: 'text', text: (pildid.length > 1 ? `Pikk tšekk on lõigatud ${pildid.length} osaks ülevalt alla (osad kattuvad veidi).\n\n` : '') + PROMPT },
  ];
  const kysi = async () => {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5', max_tokens: 1500, messages: [{ role: 'user', content }] }),
    });
    const data = await r.json();
    if (!r.ok) { const e = new Error(data?.error?.message || 'Tšeki lugemine ebaõnnestus'); e.api = true; throw e; }
    const text = (data.content || []).map((c) => c.text || '').join('');
    const a = text.indexOf('{'), b = text.lastIndexOf('}');
    if (a < 0 || b < a) throw new Error('AI ei andnud andmeid (' + (text.slice(0, 80) || data.stop_reason) + ')');
    return JSON.parse(text.slice(a, b + 1));
  };
  try {
    let o;
    try { o = await kysi(); } catch (e) { if (e.api) throw e; o = await kysi(); } // üks kordus
    return res.status(200).json(o);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

};
