// Automaatne varukoopia: KROX äpi andmed e-kirjaga firma Gmaili (vaikimisi GMAIL_USER ise).
// Vajab Vercelis: APP_PIN, GMAIL_USER, GMAIL_APP_PASSWORD; soovi korral BACKUP_EMAIL
const { checkPin, onlyPost } = require('./_util');
const { smtpSend, buildMail, gmailConf } = require('./_mail');

module.exports = async (req, res) => {
  if (!onlyPost(req, res) || !checkPin(req, res)) return;
  const c = gmailConf();
  if (!c.user || !c.pass) return res.status(500).json({ error: 'GMAIL_USER / GMAIL_APP_PASSWORD pole Vercelis seadistatud' });
  const to = (process.env.BACKUP_EMAIL || c.user).trim();
  const { failinimi, base64, osa, osi, kokkuvote } = req.body || {};
  if (!base64 || !failinimi) return res.status(400).json({ error: 'Fail puudub' });
  try {
    const raw = buildMail({
      from: c.user, to,
      subject: `KROX varukoopia ${String(failinimi).replace(/^krox-varukoopia-|\.json$/g, '')}${osi > 1 ? ` (${osa}/${osi})` : ''}`,
      text: `KROX äpi automaatne varukoopia.\n\n${kokkuvote || ''}\n\nUues telefonis: lae manus alla ja vali äpis Seaded → Taasta failist${osi > 1 ? ' (vali kõik osad korraga)' : ''}.`,
      file: { name: failinimi, type: 'application/json', base64 },
    });
    await smtpSend({ ...c, from: c.user, to, raw });
    res.status(200).json({ ok: true, to });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
};
