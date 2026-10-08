# Email + OTP — Open-Source / Reliable Stack Recommendation

## Background

The user asked for **open-source OTP and email service with high hit rates and rarely down**. Three layers:

1. **OTP generation + verification** — already open-source (TOTP, RFC 6238) via `otplib`. Authenticator apps (Google Authenticator, Authy, Aegis) are the de facto reliable channel — **fully offline, zero delivery failure**. Already wired in `auth.service.ts` + `EmployeeTotpService`.
2. **Email transport** — pluggable. Three tiers:
   - **Local catch-all (dev only)**: Mailpit — already wireable, captures every send to `http://localhost:8025`.
   - **Free tier production**: Resend (3000/mo), Brevo / Sendinblue (300/day), Mailgun (free trial 5000), Amazon SES (62000/mo if running on EC2 — practically free).
   - **Self-hosted SMTP**: Postal (open source, needs Docker + DNS), Mailcow (heavier, full mail server), Postfix relay (most basic).
3. **Push / browser notifications** — Web Push API (open standard, open-source serverless). Use `web-push` npm. Free, browser-native.

## Recommended stack (most reliable + cheapest)

### Production
| Layer | Choice | Why |
|---|---|---|
| 2FA | **TOTP via Google Authenticator** | RFC standard, offline, zero dependency on email/SMS |
| Email transport | **Resend** primary + **Brevo** fallback | Two providers; auto-failover already coded in `email.provider.ts` |
| Backup | Console log when both fail | Dev never gets locked out; check API stdout for OTP |

### Dev / local
- Mailpit container — `docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit`
- Set:
  ```
  MAIL_PROVIDER=smtp
  SMTP_HOST=localhost
  SMTP_PORT=1025
  SMTP_USER=
  SMTP_PASS=
  SMTP_FROM="Canteen <noreply@localhost>"
  ```
- Open `http://localhost:8025` — every email captured.

### Configuration today

`.env` already wires:

```
MAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxx  # ← REPLACE WITH REAL KEY
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Canteen Secure Gateway <onboarding@resend.dev>"
```

When `RESEND_API_KEY` is the placeholder, `email.provider.ts` falls through to SMTP, then to console (logs OTP to API stdout). Until a real key is set, OTP delivery WILL fail in browser but you can read the OTP from API logs.

## Setup steps (for real Resend key)

1. https://resend.com → sign up (no credit card)
2. Verify your email
3. API Keys → Create → copy `re_...`
4. Paste into `.env`: `RESEND_API_KEY=re_paste_here`
5. Restart API (preview server)
6. Test: trigger any email-OTP path (legacy admin/vendor flows return 410 now since TOTP refactor; only useful for password-reset emails or future transactional emails)

## Why TOTP > Email OTP

The post-refactor system uses **TOTP authenticator** for admin / vendor / superadmin login. This means:
- No email needed during login → email service downtime can't lock anyone out
- Codes generated offline on user's phone → works on planes / offline / weak networks
- Standardized (Google Authenticator, Authy, Microsoft Authenticator, 1Password, Bitwarden — all interoperable)
- Email is reserved for low-frequency transactional only (welcome emails, password reset, feedback acknowledgement, audit summaries)

## Self-hosted route (if cloud providers banned)

For air-gapped / fully self-hosted:

```bash
docker run -d -p 25:25 -p 587:587 \
  -e POSTAL_HOST=mail.canteen.local \
  ghcr.io/postalserver/postal
```

Then:
```
MAIL_PROVIDER=smtp
SMTP_HOST=mail.canteen.local
SMTP_PORT=587
```

Postal handles bounce processing, DKIM, SPF, etc.

## Hit rate notes

- **TOTP**: 100% (no network)
- **Resend**: ~99% deliverability when sender domain is DNS-verified; ~70% from `onboarding@resend.dev` due to spam filters on free shared sender
- **Brevo**: 95%+ verified domain
- **SMTP relay (own domain + DKIM)**: 99%+ but requires DNS work
- **Mailpit**: 100% local (captures, doesn't actually send)

The answer to "high hit rate + open source + rarely down": **TOTP for auth + verified-domain SMTP relay (Brevo / Postal / Mailgun)** for transactional. We've already shipped TOTP. For real email, the user must register a domain + add DKIM/SPF records once.
