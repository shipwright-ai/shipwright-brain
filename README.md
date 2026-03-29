# Shipwright Brain

Simple memory for AI agents. Markdown files with frontmatter. No database.

## What It Is

An MCP server that stores memories as folders with `memory.md` and optional attachments.
Kind determines the folder: `docs/decisions/`, `docs/personas/`, `docs/ideas/`, etc.
Memories link to each other with bidirectional refs. The graph builds itself.

Three files, one core:

```
src/core.js   <- brain logic (pure functions)
src/mcp.js    <- MCP layer for Claude Code (imports core)
src/http.js   <- HTTP + UI layer for humans (imports core)
```

## Structure

```
docs/
  decisions/
    auth-flow/
      memory.md
      whiteboard.png
  ideas/
    ssr-migration/
      memory.md
  format-guides/       <- templates that teach Claude how to write each kind
    ideas/memory.md
    bugs/memory.md
    features/memory.md
    work/memory.md
```

Each `memory.md`:

```markdown
---
title: Auth flow decision
kind: decisions
tags: [auth, security]
refs: [docs/ideas/token-refresh/memory.md]
by: developer
at: 2025-03-28T10:00:00.000Z
---

> Why: session tokens don't meet compliance requirements
> What: switch to JWT with refresh tokens
> Who: all authenticated users
> How: implement token rotation, update API docs

- [x] Research refresh token best practices
- [x] Replace long-lived session tokens
- [ ] Add token rotation on refresh
- [ ] Update API docs
```

## Setup

```bash
cd your-project
npx shipwright-brain init
```

Creates `docs/` and adds the MCP config to `.mcp.json`. Next time you open Claude Code, it has memory tools.

### Browse memories

```bash
npx shipwright-brain ui
```

Open http://localhost:3111 -- list view with progress badges, auto-refreshes.

### Manual MCP config

```json
{
  "mcpServers": {
    "brain": {
      "command": "npx",
      "args": ["shipwright-brain", "mcp", "--dir", "./docs"]
    }
  }
}
```

## MCP Tools

Brain creates and manages. Claude reads and edits files directly.

| Tool | What it does |
|------|-------------|
| `create_memory` | Create memory with duplicate detection + auto-refs + format guide |
| `browse_memories` | Navigate tree -- kinds, memories, sub-memories. Filter by tags and status |
| `search_memories` | Multi-query keyword search with tag, kind, and status filters |
| `semantic_search` | Meaning-based search using embeddings -- finds related even without keyword match |
| `screenshot` | Capture URL via Playwright with optional click sequence |
| `attach_to_memory` | Copy any file to memory folder + add markdown reference |
| `get_memory_graph` | Full node/edge connection map |
| `recall_agent_memory` | Load agent learnings from previous sessions |
| `recall_developer_profile` | Load developer communication preferences |
| `delete_memory` | Remove + cleanup back-refs |

Claude edits memory content directly at `docs/{kind}/{slug}/memory.md`.
Brain watches for changes and updates its cache automatically.

## Key Features

### Checkbox Progress Tracking

Memories use `- [ ]` / `- [x]` checkboxes. Brain auto-derives status:
- **0/N checked** = not started
- **some/N** = in progress
- **N/N** = done

Status is filterable in search and browse. No manual status fields needed.

### Aggregate Progress

Sub-memories contribute checkbox counts to their parent. A parent idea with
3 sub-ideas shows the combined progress across the whole tree.

### Format Guides

Stored as memories in `docs/format-guides/{kind}/memory.md`. They teach Claude
how to write content for each kind (checklists for ideas/bugs/features, prose
for knowledge). Editable by the team -- no code changes needed.

### 5W Context Framework

Every memory gets structured context: Why, What, Who, How (universal).
Format guides add When where it fits. Developers remove what doesn't apply.

### Faceted Search

First page of browse/search results includes facets: tag counts and status
breakdown for the filtered result set. Enables UI filter chips without
client-side filtering.

### Semantic Search and Embeddings

Local embeddings via Xenova/all-MiniLM-L6-v2 (CoreML on Mac, CPU elsewhere).
Model downloads once (~80MB), embeddings computed async and cached to disk.
`semantic_search` finds memories by meaning -- "how do we handle auth?" matches
memories about tokens, sessions, and login even without the word "auth".

### Duplicate Detection

`create_memory` automatically checks for similar existing memories:
- **90%+ similar**: blocks creation, suggests merging with existing memory
- **60-89% similar**: creates the memory, auto-adds related as refs, suggests as potential parents
- Claude decides the relationship -- Brain just surfaces the connections

Use `confirm_create: true` to bypass duplicate check.

### Auto-Cleanup on Reorganization

When creating a memory with the same slug as an existing one (e.g. moving
to a different parent), Brain auto-deletes the old one if it was created
< 1 hour ago and never edited. Handles reorganization without manual cleanup.

### Bidirectional Refs

Refs sync automatically in both directions. Add a ref in frontmatter or
link to a `memory.md` in content -- Brain adds the back-ref on the target.
Remove a ref -- Brain cleans up the other side. The graph stays consistent.

### Disk Cache

JSONL cache in `.cache/` for instant MCP startup. Cache restored synchronously,
verification deferred to background. Embeddings persisted in cache -- computed
once, reused across restarts.

### Screenshot with Interaction

The screenshot tool accepts a `clicks` param -- a list of CSS selectors
clicked in sequence before capture. Enables capturing open menus, modals,
or specific UI states.

## Kinds

Kinds are just folder names. Use whatever makes sense:

`decisions`, `ideas`, `bugs`, `patterns`, `learnings`, `features`, `personas`, `architecture`, `work`

Or invent your own. The system doesn't care -- it's just folders.

## API

All endpoints return JSON with CORS headers.

| Endpoint | Params | Description |
|----------|--------|-------------|
| `GET /api/browse` | `path`, `tags`, `status`, `limit`, `offset` | Browse memory tree |
| `GET /api/search` | `q`, `tags`, `kind`, `status`, `limit`, `offset` | Keyword search |
| `GET /api/semantic-search` | `q`, `tags`, `kind`, `status`, `limit`, `offset` | Semantic search |
| `GET /api/memory` | `f` (memory_file) | Full detail with rich refs and children |
| `GET /api/graph` | -- | Full reference graph |
| `GET /api/overview` | -- | Stats, kinds, tags |
| `GET /file` | `p` (file path) | Serve attachments |

Browse and search return pagination metadata (`total`, `limit`, `offset`, `hasMore`)
and facets on the first page (`tags` with counts, `status` breakdown).
