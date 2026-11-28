// Gmail SMTP (TLS 465) ilma lisateekideta: tšekid CostPocketisse ja varukoopiad
const tls = require('tls');

// Minimaalne SMTP klient (TLS port 465)
function smtpSend({ host, port, user, pass, from, to, raw }) {
  return new Promise((resolve, reject) => {
    const sock = tls.connect({ host, port, servername: host, rejectUnauthorized: process.env.SMTP_INSECURE !== '1' });
    sock.setEncoding('utf8');
    sock.setTimeout(20000, () => { sock.destroy(); reject(new Error('SMTP aegus')); });
    let buf = '';
    const steps = [
      [220, () => `EHLO krox.vercel.app`],
      [250, () => 'AUTH LOGIN'],
      [334, () => Buffer.from(user).toString('base64')],
      [334, () => Buffer.from(pass).toString('base64')],
      [235, () => `MAIL FROM:<${from}>`],
      [250, () => `RCPT TO:<${to}>`],
      [250, () => 'DATA'],
      [354, () => raw.replace(/\r?\n\./g, '\r\n..') + '\r\n.'],
      [250, () => 'QUIT'],
    ];
    let i = 0;
    sock.on('data', (chunk) => {
      buf += chunk;
      // vastus on valmis, kui viimane rida on "NNN tekst"
      const lines = buf.split('\r\n').filter(Boolean);
      const last = lines[lines.length - 1];
      if (!last || !/^\d{3} /.test(last) || !buf.endsWith('\r\n')) return;
      const code = +last.slice(0, 3);
      buf = '';
      if (i >= steps.length) { sock.end(); return resolve(); }
      const [expect, next] = steps[i];
      if (code !== expect) {
        sock.destroy();
        const msg = code === 535 ? 'Gmail ei lubanud sisse logida (kontrolli rakenduse parooli)' : `SMTP viga ${code}: ${last.slice(4, 200)}`;
        return reject(new Error(msg));
      }
      i++;
      sock.write(next() + '\r\n');
      if (i === steps.length) { sock.end(); resolve(); }
    });
    sock.on('error', (e) => reject(new Error('SMTP ühendus ebaõnnestus: ' + e.message)));
  });
}

const enc = (s) => '=?UTF-8?B?' + Buffer.from(String(s), 'utf8').toString('base64') + '?=';
const wrap76 = (b64) => b64.replace(/.{1,76}/g, '$&\r\n').trimEnd();

function buildMail({ from, to, subject, text, file }) {
  const b = 'krox' + Date.now().toString(36);
  return [
    `From: KROX OÜ <${from}>`,
    `To: <${to}>`,
    `Subject: ${enc(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@krox>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${b}"`,
    '',
    `--${b}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(Buffer.from(text, 'utf8').toString('base64')),
    `--${b}`,
    `Content-Type: ${file.type}; name="${enc(file.name)}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${enc(file.name)}"`,
    '',
    wrap76(file.base64),
    `--${b}--`,
    '',
  ].join('\r\n');
}

function gmailConf() {
  const user = (process.env.GMAIL_USER || '').trim(), pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s/g, '');
  return { host: process.env.SMTP_HOST || 'smtp.gmail.com', port: +(process.env.SMTP_PORT || 465), user, pass };
}

module.exports = { smtpSend, buildMail, gmailConf };
