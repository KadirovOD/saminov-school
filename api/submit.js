// Vercel Serverless Function: /api/submit
// Receives enrollment form data and:
//   1) Creates a lead in Mizon CRM via POST https://mizon-crm.uz/api/public/leads
//   2) Optionally sends a Telegram notification
//
// Env vars (Vercel Project Settings → Environment Variables):
//   MIZON_COMPANY_SLUG  — Mizon CRM dagi kompaniya slug'i (majburiy CRM integratsiya uchun)
//                         Default: "saminov-school"
//   MIZON_CRM_URL       — Mizon CRM bazaviy URL (default: https://mizon-crm.uz)
//   TG_BOT_TOKEN        — Telegram bot token (ixtiyoriy, qo'shimcha xabarnoma)
//   TG_CHAT_ID          — Telegram chat ID (ixtiyoriy)
//
// Agar CRM yetib bormasa ariza baribir muvaffaqiyatli qabul qilinadi va
// Vercel log'ga yoziladi (foydalanuvchini xafa qilmaslik uchun).

const MIZON_CRM_URL = process.env.MIZON_CRM_URL || 'https://mizon-crm.uz';
const MIZON_COMPANY_SLUG = process.env.MIZON_COMPANY_SLUG || 'saminov-school';

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

  // ── 1) Send to Mizon CRM ────────────────────────────────────────────────────
  let crmLeadId = null;
  let crmError = null;
  try {
    const crmPayload = {
      company_slug: MIZON_COMPANY_SLUG,
      // Lead nomi: CRM ro'yxatida darrov ko'rinishi uchun ota-ona ismi + sinf
      name: `${parentName} — ${grade}-sinf`,
      phone,
      region: 'Veb-sayt (Saminov School)',
      source: source || 'saminov-school-website',
      extra: `Ota-ona: ${parentName} | Farzandi: ${grade}-sinf | Tel: ${phone}`,
      // Lid kartochkasida ushbu maydonlar custom_data sifatida ko'rinadi
      custom_data: {
        'Ota-ona ismi': parentName,
        'Sinf': `${grade}-sinf`,
        'Telefon': phone,
        'Manba': 'saminov-school.vercel.app',
      },
    };

    const crmRes = await fetch(`${MIZON_CRM_URL}/api/public/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(crmPayload),
    });

    const crmJson = await crmRes.json().catch(() => ({}));
    if (crmRes.ok && crmJson.success) {
      crmLeadId = crmJson.id;
      console.log(`[CRM] Lead yaratildi: id=${crmLeadId}`);
    } else {
      crmError = crmJson.error || `HTTP ${crmRes.status}`;
      console.error('[CRM] Lead yaratilmadi:', crmRes.status, crmJson);
    }
  } catch (err) {
    crmError = err.message || String(err);
    console.error('[CRM] Network error:', crmError);
  }

  // ── 2) Optional Telegram notification ──────────────────────────────────────
  const tgToken = process.env.TG_BOT_TOKEN;
  const tgChatId = process.env.TG_CHAT_ID;

  if (tgToken && tgChatId) {
    const crmLine = crmLeadId
      ? `✅ *CRM:* lead \\#${escapeMd(String(crmLeadId))} yaratildi`
      : crmError
        ? `⚠️ *CRM:* xato — ${escapeMd(crmError)}`
        : '';
    const text =
      `🎓 *Saminov School — Yangi ariza*\n\n` +
      `👤 *Ota-ona:* ${escapeMd(parentName)}\n` +
      `🏫 *Sinf:* ${escapeMd(grade)}-sinf\n` +
      `📞 *Telefon:* ${escapeMd(phone)}\n` +
      `🌐 *Manba:* ${escapeMd(source || 'website')}\n` +
      `🕐 *Vaqt:* ${escapeMd(new Date(submittedAt).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' }))}` +
      (crmLine ? `\n${crmLine}` : '');

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
  return res.status(200).json({ ok: true, submittedAt, crmLeadId, crmError });
}

function escapeMd(s) {
  return String(s).replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}
