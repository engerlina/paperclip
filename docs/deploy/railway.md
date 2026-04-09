---
title: Railway
summary: One-click deploy to Railway
---

Deploy Paperclip to Railway with a Postgres database.

## Template Setup

When creating or editing the Railway template, configure two services:

### 1. Paperclip Service (from this repo)

**Variables with defaults (pre-fill these so users don't have to):**

| Variable | Default | Notes |
|----------|---------|-------|
| `HOST` | `0.0.0.0` | Already set in Dockerfile |
| `PORT` | `3100` | Already set in Dockerfile |
| `NODE_ENV` | `production` | Already set in Dockerfile |
| `SERVE_UI` | `true` | Already set in Dockerfile |
| `PAPERCLIP_HOME` | `/paperclip` | Already set in Dockerfile |
| `PAPERCLIP_DEPLOYMENT_MODE` | `authenticated` | Already set in Dockerfile |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Reference variable — auto-populated by Railway |
| `PAPERCLIP_PUBLIC_URL` | _(leave empty)_ | Auto-detected from `RAILWAY_PUBLIC_DOMAIN` |
| `BETTER_AUTH_SECRET` | `${{ secret(64) }}` | Auto-generated per deployment |

**Variables users must provide:**

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Optional | Only needed for OpenAI/Codex adapters. Get one at platform.openai.com |
| `ANTHROPIC_API_KEY` | Optional | Only needed for Claude adapter. Get one at console.anthropic.com |

### 2. Postgres Service (Railway plugin)

Use Railway's built-in Postgres plugin. All PG variables (PGDATA, PGPORT, etc.) are auto-configured.

## What Users See

With the template configured correctly, deployers only need to:

1. Click "Deploy on Railway"
2. Optionally paste their OpenAI / Anthropic API key(s)
3. Click "Save Config"

Everything else is auto-configured.

## After Deployment

1. Railway assigns a public domain — Paperclip auto-detects it via `RAILWAY_PUBLIC_DOMAIN`
2. Open the URL, create your first account (this becomes the admin)
3. Add API keys later through the Paperclip UI if you skipped them during deploy
