# Saminov School — Qabul sayti

Quva tumanidagi Saminov School xususiy maktabining qabul sayti. 0–11 sinflarga ariza qabul qilish formasi.

## Stack
- Static HTML / CSS / Vanilla JS
- Vercel Serverless Function (`api/submit.js`)
- Telegram bot bilan xabarnoma (ixtiyoriy)

## Lokalda ishga tushirish

```bash
npm i -g vercel
vercel dev
```

Sayt `http://localhost:3000` da ishlaydi.

## Forma maydonlari
- **Ota-ona ismi** (parentName)
- **Farzandingiz sinfi** (grade, 0–11)
- **Bog'lanish raqami** (phone, +998 formatda)

## Telegram bot sozlash (Vercel)

Vercel project settings → Environment Variables:

| Key | Value |
| --- | --- |
| `TG_BOT_TOKEN` | Telegram bot tokeni (BotFather'dan) |
| `TG_CHAT_ID` | Xabarnoma yuboriladigan chat ID |

Token va chat ID kiritilmagan bo'lsa, ariza Vercel log'larida ko'rinadi (`console.log` orqali), forma esa baribir muvaffaqiyatli javob qaytaradi.

## Deploy

```bash
vercel --prod
```

Yoki main branch'ga push qiling — Vercel avtomatik deploy qiladi.
