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
  const { image } = req.body || {};
  if (!image || typeof image !== 'string') return res.status(400).json({ error: 'Pilt puudub' });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
            { type: 'text', text: PROMPT },
          ],
        }],
      }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: data?.error?.message || 'Tšeki lugemine ebaõnnestus' });
    const text = (data.content || []).map((c) => c.text || '').join('');
    const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
    res.status(200).json(JSON.parse(json));
  } catch (e) {
    res.status(500).json({ error: 'Tšeki lugemine ebaõnnestus: ' + e.message });
  }
};
