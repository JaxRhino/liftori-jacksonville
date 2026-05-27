# Liftori — City of Jacksonville Demo

Liftori's AI-native citizen engagement + agent-desktop platform for the City of Jacksonville CRM bid.

## What this is

A live demo tenant of the Liftori platform configured for the City of Jacksonville's
citizen-engagement modernization opportunity (Salesforce procurement stalled, internal champion engaged 2026-05-26).

Production URL: **https://jax.liftori.ai**

## Stack

- React 19 + Vite 8 + TypeScript
- Tailwind CSS v4
- Supabase (Postgres + Auth + Realtime + Edge Functions)
- pgvector for semantic case search (Wave C)
- React Router v7
- Lucide Icons
- Deployed on Vercel, DNS via Cloudflare

## Roles

| Role | Route | Who |
|---|---|---|
| `citizen` | `/me` | Residents — submit/track requests, view personalized info |
| `city_employee` | `/work` | CSRs, dispatchers, field supervisors — the agent desktop |
| `super_admin` | `/admin` | Liftori internal — tenant control panel |

## Wave roadmap

| Wave | Status | Scope |
|---|---|---|
| A | ✅ shipped | Infra + scaffold + jax.liftori.ai live |
| B | ⏳ | AgentWeb-killer core — queue dashboard, fuzzy customer search, real-time updates, activity feed |
| C | ⏳ | Team chat in case, video call button, AI response drafts, semantic case search |
| D | ⏳ | Citizen portal polish + AI chat intake |
| E | ⏳ | ArcGIS read from maps.coj.net + embedded map + public transparency |
| F | ⏳ | Holli's login + seed data + walkthrough script |

## Local development

```bash
git clone https://github.com/JaxRhino/liftori-jacksonville.git
cd liftori-jacksonville
npm install
cp .env.example .env.local   # optional — fallbacks are hardcoded for the demo
npm run dev
```

Visit http://localhost:5173

## Environment

Supabase URL and publishable key are hardcoded as fallbacks in `src/lib/supabase.ts`
per Liftori convention (env inlining can fail silently on some bundles).

To override locally, copy `.env.example` to `.env.local`.

## Deploy

Pushes to `main` auto-deploy via Vercel.

## Author

Liftori, LLC (formation in progress) — Ryan March, Mike Lydon. Demo built by Sage, May 2026.
