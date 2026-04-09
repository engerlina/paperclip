# Deploy and Host Paperclip on Railway

Paperclip is a self-hosted platform for building and running AI-powered companies. Create hierarchical organizations of autonomous agents — CEOs, engineers, designers — that collaborate on tasks, delegate work, and ship real output using Claude, GPT, Codex, and other LLMs. Think of it as an operating system for AI teams.

## About Hosting Paperclip

Paperclip runs as a single Node.js server backed by PostgreSQL. The server handles the web UI, agent orchestration, task management, and all API endpoints. Agents run as child processes inside the container using pre-installed CLI tools (Claude Code, Codex, OpenCode). Hosting requires a persistent volume for agent workspaces and data, plus a Postgres database. This Railway template bundles both services — the Paperclip server and a Postgres instance — with sensible defaults. The only configuration needed is your LLM API keys, which can be added during deployment or later through the UI.

## Common Use Cases

- **AI dev teams** — Stand up an engineering organization with a CTO, senior engineers, and junior devs that autonomously build, review, and ship code
- **Content & marketing agencies** — Create agent teams that research, write, edit, and publish content with human-in-the-loop approval workflows
- **Research & analysis** — Deploy analyst agents that investigate topics, synthesize findings, and produce structured reports with governance controls

## Dependencies for Paperclip Hosting

- **PostgreSQL** — Stores companies, agents, tasks, and all application state (included in this template)
- **LLM API key** — At least one of: Anthropic API key (for Claude adapter) or OpenAI API key (for Codex/GPT adapter)

### Deployment Dependencies

- [Anthropic API Console](https://console.anthropic.com/) — Get an API key for the Claude adapter
- [OpenAI API Platform](https://platform.openai.com/) — Get an API key for the Codex/GPT adapter
- [Paperclip Documentation](https://paperclip.ing) — Setup guides and configuration reference
- [Paperclip GitHub](https://github.com/paperclipai/paperclip) — Source code and issue tracker

## Post-Deployment Setup

After deployment completes, visit your Railway-provided URL. You'll see an "Instance setup required" screen — this is expected on first boot.

To create the first admin account, open a terminal and run:

```sh
railway ssh -s paperclip-server -- "yes | pnpm paperclipai auth bootstrap-ceo"
```

This generates a one-time invite URL. Open it in your browser to register the admin account.

> **Note:** You need the [Railway CLI](https://docs.railway.com/develop/cli) installed and linked to your project (`railway login && railway link`).

## Why Deploy Paperclip on Railway?

Railway is a singular platform to deploy your infrastructure stack. Railway will host your infrastructure so you don't have to deal with configuration, while allowing you to vertically and horizontally scale it.

By deploying Paperclip on Railway, you are one step closer to supporting a complete full-stack application with minimal burden. Host your servers, databases, AI agents, and more on Railway.
