# Shipwright Brain

Persistent memory for Claude Code. Markdown files, no database. Brain remembers ideas, decisions, features, and progress across sessions so Claude doesn't start from zero every time.

Part of the [Shipwright](https://github.com/shipwright-ai/shipwright) a la carte toolkit.

## Install

### Plugin (recommended)

In Claude Code:
```
/plugin install shipwright-brain
/shipwright-brain:setup
```

Setup asks for docs directory (default `./docs`) and port (default `3111`). That's it — Brain tools are available as `brain.create_memory`, `brain.browse_memories`, etc.

### Via Shipwright

If you're using [Shipwright](https://github.com/shipwright-ai/shipwright), Brain is set up during Layer 2 of `/shipwright:setup`.

### npx (no plugin)

```bash
cd your-project
npx github:shipwright-ai/shipwright-brain init
```

Creates `docs/` and wires Brain into `.mcp.json`. Restart Claude Code for MCP to pick it up.

### Manual

Add to `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "brain": {
      "command": "npx",
      "args": ["github:shipwright-ai/shipwright-brain", "mcp", "--dir", "./docs"]
    }
  }
}
```

## Browse Your Memories

Use [Shipwright UI](https://github.com/shipwright-ai/shipwright-ui) to see what Claude sees:

```bash
npx github:shipwright-ai/shipwright-ui
```

Opens http://localhost:3111 — browse memories, filter by tags and status, track progress.

Or add a Makefile target (Shipwright setup does this automatically):

```makefile
brain-ui:
	npx github:shipwright-ai/shipwright-ui
```

## What Makes Brain Different

### Dynamic kinds and tags

No predefined taxonomy. Create any kind — ideas, decisions, features, bugs, epics, sessions — whatever fits your project. Tags are freeform: `area/auth`, `priority/high`, `persona/admin`. Organize however makes sense.

### Format guides per kind

Each kind has its own template in `docs/format-guides/{kind}/memory.md`. Brain uses it when creating memories — Claude gets the right structure automatically.

**Tag-aware sub-templates:** `brain.create_memory({ kind: "ideas", tags: ["plan"] })` looks for `docs/format-guides/ideas/plan/memory.md` first. Different tags get different formats from the same kind.

### Sections — sibling .md files

Any `.md` file next to `memory.md` is a section. Brain parses them (frontmatter, checkboxes, progress).

Naming convention: `{order}_{section}_{agent}.md`

```
docs/ideas/auth-redesign/plan/task-1/
  memory.md                        <- the work-item
  1_execution_developer.md         <- developer checklist
  2_review_reviewer.md             <- reviewer checklist
  3_documentary_documenter.md      <- doc-writer checklist
```

Format guides can include section templates — they get copied automatically on `create_memory`.

### Progress from checkboxes

No status field. Brain counts `- [ ]` and `- [x]` and derives: not-started / in-progress / done. Section checkboxes aggregate into memory progress. Child memories roll up into parent progress.

### MCP responses steer Claude

This is the enforcement mechanism. Every Brain tool response includes:
- **NEXT STEPS** — checklist of what Claude must do after creating a memory
- **CLAUDE_REMINDER** — appended to every search/browse result ("update memories if scope changed")
- **Duplicate blocking** — 90%+ similar memory blocks creation, presents two forced choices
- **Related memories** — auto-linked as refs, suggested as parents

Claude follows these because they arrive fresh with every tool call — unlike CLAUDE.md rules that get compacted away.

### Agent recall

Agents remember across sessions:
- `brain.recall_agent_memory({ agent_name: "developer" })` — returns learnings, auto-creates file if first time
- `brain.recall_developer_profile({})` — returns communication preferences, auto-detects user

### Screenshots

Capture UI state at any breakpoint:
```
brain.screenshot({ url: "http://localhost:5173/profiles", memory_file: "docs/features/profiles/memory.md", width: 375 })
```

Width: 375 (mobile), 768 (tablet), omit for desktop (1280). Full page capture. Click sequences supported.

## How It Works

Claude creates memories as markdown files with frontmatter. Brain handles everything else.

```
docs/
  ideas/
    auth-improvements/
      memory.md              <- the idea + checklist
      auth-plan/
        memory.md            <- plan (sub-memory)
        migrate-tokens/
          memory.md          <- work-item (sub-memory of plan)
          1_execution_developer.md  <- section
  decisions/
    jwt-tokens/
      memory.md
      whiteboard.png         <- attached files live next to the memory
  features/
    auth/
      memory.md              <- living feature doc
      login/
        memory.md            <- sub-feature
```

A memory looks like this:

```markdown
---
title: Auth improvements
kind: ideas
tags: [auth, security, urgent]
refs: [docs/decisions/jwt-tokens/memory.md]
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

Brain reads the checkboxes and knows this is 2/4 = in progress.

## MCP Tools

| Tool | What it does |
|------|-------------|
| `create_memory` | Create memory with duplicate check, auto-refs, format guide, section templates |
| `browse_memories` | Navigate tree by kind, filter by tags/status, sort, paginate |
| `search_memories` | Hybrid keyword + semantic search with filters |
| `screenshot` | Capture URL at any viewport width with optional click sequence |
| `attach_to_memory` | Attach any file type to a memory |
| `move_memory` | Move memory to new parent, auto-update all refs |
| `get_memory_graph` | Full connection graph |
| `recall_agent_memory` | Load agent learnings from previous sessions |
| `recall_developer_profile` | Load developer preferences |
| `delete_memory` | Remove + cleanup refs |

## HTTP API

All endpoints return JSON with CORS headers.

| Endpoint | Params | Description |
|----------|--------|-------------|
| `GET /api/browse` | `path`, `tags`, `status`, `sort`, `limit`, `offset` | Browse memory tree |
| `GET /api/search` | `q`, `tags`, `kind`, `status`, `sort`, `limit`, `offset` | Hybrid search |
| `GET /api/memory` | `f` (memory_file) | Full detail with rich refs/children |
| `GET /api/graph` | -- | Full reference graph |
| `GET /api/overview` | -- | Stats, kinds, tags |
| `GET /file` | `p` (file path) | Serve attachments |

## Related Projects

- [Shipwright](https://github.com/shipwright-ai/shipwright) — a la carte toolkit for Claude Code (methodology + orchestration)
- [Shipwright UI](https://github.com/shipwright-ai/shipwright-ui) — web UI for browsing Brain memories

## License

MIT
