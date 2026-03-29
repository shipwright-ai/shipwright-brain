# Shipwright Brain

Simple memory for AI agents. Markdown files with frontmatter. No database.

## What It Is

An MCP server that stores memories as folders with `memory.md` and optional attachments.
Kind determines the folder: `docs/decisions/`, `docs/personas/`, `docs/ideas/`, etc.
Memories link to each other with bidirectional refs. The graph builds itself.

Three files, one core:

```
src/core.js   ← brain logic (pure functions)
src/mcp.js    ← MCP layer for Claude Code (imports core)
src/http.js   ← HTTP + UI layer for humans (imports core)
```

## Structure

```
docs/
  decisions/
    auth-flow/
      memory.md
      whiteboard.png
  personas/
    power-user/
      memory.md
  ideas/
    ssr-migration/
      memory.md
      sketch.svg
  features/
    profile-export/
      memory.md
```

Each `memory.md`:

```markdown
---
title: Auth flow decision
kind: decisions
type: decision
tags: [auth, security]
refs: [power-user, api-design]
created: 2025-03-28T10:00:00.000Z
updated: 2025-03-28T10:00:00.000Z
---

We chose JWT with refresh tokens because...
```

## Setup

```bash
cd your-project
npx shipwright-brain init
```

That's it. This creates `docs/` and adds the MCP config to `.claude/settings.json`.

Next time you open Claude Code, it has memory tools.

### Browse memories

```bash
npx shipwright-brain ui
```

Open http://localhost:3111 — list view + graph view, auto-refreshes.

### Manual MCP config (if you prefer)

```json
{
  "mcpServers": {
    "brain": {
      "command": "npx",
      "args": ["shipwright-brain", "mcp", "./docs"]
    }
  }
}
```

## MCP Tools

Brain creates and manages. Claude reads and edits files directly.

| Tool | What it does |
|------|-------------|
| `brain.create_memory` | Create memory with content, returns file path |
| `brain.browse_memories` | Navigate tree — kinds → summaries |
| `brain.search_memories` | Multi-query search, returns summaries |
| `brain.screenshot` | Capture URL via Playwright, optionally attach to memory |
| `brain.attach_to_memory` | Copy file to memory folder + add markdown reference |
| `brain.get_memory_graph` | Full node/edge connection map |
| `brain.delete_memory` | Remove + cleanup back-refs |

Claude edits memory content directly at `docs/{kind}/{slug}/memory.md`.
Brain watches for changes and updates its cache automatically.

## Kinds

Kinds are just folder names. Use whatever makes sense:

`decisions`, `ideas`, `bugs`, `patterns`, `learnings`, `features`, `personas`, `architecture`, `memories`

Or invent your own. The system doesn't care — it's just folders.
