[README.md](https://github.com/user-attachments/files/25298862/README.md)
# CardValueLab (Astro + Cloudflare Pages)

Static, ultra-fast credit card calculators with email capture via Brevo and bot protection via Cloudflare Turnstile.

## Local dev
```bash
npm install
npm run dev
```

## Deploy (Cloudflare Pages)
- Connect this repo in Cloudflare Pages
- Build command: `npm run build`
- Output dir: `dist`

## Env vars (Cloudflare Pages)
Server-side:
- BREVO_API_KEY
- BREVO_SENDER_EMAIL
- BREVO_SENDER_NAME
- TURNSTILE_SECRET_KEY
- SITE_URL

Client-side (public):
- PUBLIC_TURNSTILE_SITE_KEY

## Notes
- Turnstile is enforced server-side; if TURNSTILE_SECRET_KEY is not set, verification is skipped (useful for local dev).
- Email sending is server-side via Pages Functions to keep keys secure.
