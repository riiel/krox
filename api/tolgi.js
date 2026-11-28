// Nimekirja tõlkimine (Claude API). Vajab Vercelis: ANTHROPIC_API_KEY, APP_PIN
const { checkPin, onlyPost } = require('./_util');

const KEELED = { fi: 'soome', en: 'inglise' };

module.exports = async (req, res) => {
  if (!onlyPost(req, res) || !checkPin(req, res)) return;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY pole Vercelis seadistatud' });
  const { keel, read } = req.body || {};
  if (!KEELED[keel] || !Array.isArray(read) || !read.length || read.length > 200) return res.status(400).json({ error: 'Vale päring' });
  const prompt = `Tõlgi need ehituse ja remondi materjalide/tööriistade nimetused eesti keelest ${KEELED[keel]} keelde.
Kasuta ehituspoodides (Bauhaus, K-Rauta, Stark) tavalisi termineid. Kaubamärgid ja tootekoodid (nt Mapei, Ceresit CM 17, Makita) jäta samaks.
Vasta AINULT JSON-massiiviga, sama järjekord ja sama arv ridu, ilma muu tekstita.
${JSON.stringify(read.map((s) => String(s).slice(0, 200)))}`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: data?.error?.message || 'Tõlkimine ebaõnnestus' });
    const text = (data.content || []).map((c) => c.text || '').join('');
    const arr = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
    if (!Array.isArray(arr) || arr.length !== read.length) throw new Error('vastus ei klapi');
    res.status(200).json({ read: arr.map(String) });
  } catch (e) {
    res.status(500).json({ error: 'Tõlkimine ebaõnnestus: ' + e.message });
  }
};
