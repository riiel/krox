// Saadab tšeki e-kirjaga CostPocketi aadressile (Gmail SMTP, ilma lisateekideta).
// Vajab Vercelis: APP_PIN, GMAIL_USER, GMAIL_APP_PASSWORD, COSTPOCKET_EMAIL
const { checkPin, onlyPost } = require('./_util');
const { smtpSend, buildMail } = require('./_mail');

module.exports = async (req, res) => {
  if (!onlyPost(req, res) || !checkPin(req, res)) return;
  const user = (process.env.GMAIL_USER || '').trim(), pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s/g, '');
  const to = (process.env.COSTPOCKET_EMAIL || '').trim();
  if (!user || !pass) return res.status(500).json({ error: 'GMAIL_USER / GMAIL_APP_PASSWORD pole Vercelis seadistatud' });
  if (!to) return res.status(500).json({ error: 'COSTPOCKET_EMAIL pole Vercelis seadistatud' });
  const { failinimi, base64, tyyp, kirjeldus } = req.body || {};
  if (!base64) return res.status(400).json({ error: 'Fail puudub' });
  try {
    const raw = buildMail({
      from: user, to,
      subject: failinimi || 'Tšekk',
      text: kirjeldus || 'Tšekk KROX äpist.',
      file: { name: failinimi || 'tsekk.jpg', type: tyyp || 'image/jpeg', base64 },
    });
    await smtpSend({ host: process.env.SMTP_HOST || 'smtp.gmail.com', port: +(process.env.SMTP_PORT || 465), user, pass, from: user, to, raw });
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
};

module.exports.buildMail = buildMail;
