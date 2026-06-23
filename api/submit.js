// Vercel Serverless Function: /api/submit
// Receives enrollment form data and forwards to Telegram (optional).
// Required env vars (set in Vercel Project Settings → Environment Variables):
//   TG_BOT_TOKEN  — Telegram bot token (e.g. 1234:ABC...)
//   TG_CHAT_ID    — Chat ID to send notifications to (e.g. -1001234567890)
// If env vars are missing, the request still returns success and logs to console
// (so the form works in development / before Telegram is configured).

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const parentName = String(body.parentName || '').trim().slice(0, 120);
  const grade = String(body.grade || '').trim().slice(0, 4);
  const phone = String(body.phone || '').trim().slice(0, 40);
  const source = String(body.source || '').trim().slice(0, 80);

  if (!parentName || parentName.length < 2) {
    return res.status(400).json({ ok: false, error: 'parentName_invalid' });
  }
  if (!grade) {
    return res.status(400).json({ ok: false, error: 'grade_invalid' });
  }
  const phoneDigits = phone.replace(/\D/g, '');
  if (phoneDigits.length !== 12 || !phoneDigits.startsWith('998')) {
    return res.status(400).json({ ok: false, error: 'phone_invalid' });
  }

  const submittedAt = new Date().toISOString();
  const record = { parentName, grade, phone, source, submittedAt };

  // Always log for Vercel logs visibility
  console.log('[ENROLL]', JSON.stringify(record));

  const tgToken = process.env.TG_BOT_TOKEN;
  const tgChatId = process.env.TG_CHAT_ID;

  if (tgToken && tgChatId) {
    const text =
      `🎓 *Saminov School — Yangi ariza*\n\n` +
      `👤 *Ota-ona:* ${escapeMd(parentName)}\n` +
      `🏫 *Sinf:* ${escapeMd(grade)}-sinf\n` +
      `📞 *Telefon:* ${escapeMd(phone)}\n` +
      `🌐 *Manba:* ${escapeMd(source || 'website')}\n` +
      `🕐 *Vaqt:* ${escapeMd(new Date(submittedAt).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' }))}`;

    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: tgChatId,
          text,
          parse_mode: 'MarkdownV2',
          disable_web_page_preview: true,
        }),
      });
      if (!tgRes.ok) {
        const errTxt = await tgRes.text().catch(() => '');
        console.error('Telegram send failed:', tgRes.status, errTxt);
      }
    } catch (err) {
      console.error('Telegram fetch error:', err);
    }
  } else {
    console.warn('TG_BOT_TOKEN / TG_CHAT_ID not configured — skipping Telegram notification.');
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json({ ok: true, submittedAt });
}

function escapeMd(s) {
  return String(s).replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}
