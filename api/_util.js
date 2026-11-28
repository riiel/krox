// Ühised abifunktsioonid serveri funktsioonidele (failid, mis algavad "_", ei ole Vercelis avalikud aadressid)
const crypto = require('crypto');

// Lihtne kaitse: äpp saadab PIN-i päises, mis peab klappima Verceli seadistuses oleva APP_PIN-iga
function checkPin(req, res) {
  const pin = String(process.env.APP_PIN || '').trim();
  if (!pin) { res.status(500).json({ error: 'APP_PIN pole Vercelis seadistatud' }); return false; }
  const got = String(req.headers['x-krox-pin'] || '').trim();
  const a = Buffer.from(String(got)), b = Buffer.from(String(pin));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) { res.status(401).json({ error: 'Vale PIN' }); return false; }
  return true;
}

// Android-äpp töötab aadressil https://localhost, seega lubame päringud ka teistelt aadressidelt (kaitse on PIN-iga)
function onlyPost(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-krox-pin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return false; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Ainult POST' }); return false; }
  return true;
}

// Merit Aktiva allkiri: base64(HMAC-SHA256(apiKey, apiId + timestamp + body))
function meritSign(apiId, apiKey, timestamp, body) {
  return crypto.createHmac('sha256', Buffer.from(apiKey, 'ascii')).update(Buffer.from(apiId + timestamp + body, 'utf8')).digest('base64');
}

function utcStamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}

async function meritCall(endpoint, payload, version = 'v1') {
  const apiId = process.env.MERIT_API_ID, apiKey = process.env.MERIT_API_KEY;
  if (!apiId || !apiKey) throw new Error('MERIT_API_ID / MERIT_API_KEY pole Vercelis seadistatud');
  const body = JSON.stringify(payload ?? {});
  const ts = utcStamp();
  const sig = meritSign(apiId, apiKey, ts, body);
  const base = process.env.MERIT_API_URL || 'https://aktiva.merit.ee/api';
  const url = `${base}/${version}/${endpoint}?ApiId=${encodeURIComponent(apiId)}&timestamp=${ts}&signature=${encodeURIComponent(sig)}`;
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!r.ok) throw new Error(`Merit vastas ${r.status}: ${typeof data === 'string' ? data.slice(0, 300) : JSON.stringify(data).slice(0, 300)}`);
  return data;
}

module.exports = { checkPin, onlyPost, meritSign, utcStamp, meritCall };
