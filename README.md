# Song Review App

A collaborative music review app for Coris and Al (Polite Rebels). Upload song versions, leave timestamped waveform comments, track action items, and review music together.

**Live:** https://song-review-app.vercel.app  
**GitHub:** https://github.com/corisleachman/song-review-app

---

## Stack

- **Next.js 14** + TypeScript + CSS Modules
- **Supabase** — PostgreSQL database + file storage
- **WaveSurfer.js v7** — interactive audio waveform
- **Resend** — email notifications
- **Vercel** — hosting (auto-deploy on push to `main`)

---

## Features

- Password-protected login (`further_forever`), identity picker (Coris / Al)
- Song library with cover art, grid and list view, delete
- Upload audio versions with labels; version picker modal
- Waveform player with 3-state colour (grey / hover pink / played hot pink)
- Click waveform → floating comment box at click point
- Timestamped comment threads (iMessage-style bubbles)
- Reply threads, email notifications, deep-link sharing
- Action items (created from comments, tracked on dashboard)
- Per-song task list with drag-and-drop reorder
- Per-user colour themes
- Responsive — desktop (3-column) and mobile (tabbed)

---

## Quick Start

```bash
npm install
cp .env.local.example .env.local
# Fill in Supabase + Resend keys
npm run dev
```

Open http://localhost:3000, password: `further_forever`

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://xouiiaknskivrjvapdma.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_i7F041QP5ThRwpPS1FMH6w_lF4B0Opp
SUPABASE_SERVICE_ROLE_KEY=sb_secret_1D_yVORe591IB3zcNACSAQ_lDMOJrW1
SHARED_PASSWORD=further_forever
CORIS_EMAIL=corisleachman@googlemail.com
AL_EMAIL=furthertcb@gmail.com
RESEND_API_KEY=re_PcJq6dm4_HQAFqdmJS7u9nQ1BsLnLcYry
NEXT_PUBLIC_APP_URL=https://song-review-app.vercel.app
```

---

## Documentation

| File | Purpose |
|---|---|
| [CONTEXT_HANDOFF.md](./CONTEXT_HANDOFF.md) | Full context for AI development sessions |
| [DATABASE.md](./DATABASE.md) | Schema, SQL, relationships |
| [API.md](./API.md) | All API endpoints |
| [FEATURES.md](./FEATURES.md) | User flows |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deployment guide |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common issues |
