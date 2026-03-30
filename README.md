# Shipwright Brain

Persistent memory for Claude Code. Markdown files, no database. Brain remembers ideas, decisions, bugs, and progress across sessions so Claude doesn't start from zero every time.

## Setup (2 minutes)

```bash
cd your-project
npx shipwright-brain init
```

Done. Brain creates a `docs/` folder and wires itself into Claude Code via `.mcp.json`. Next session, Claude has memory.

### Browse your memories

```bash
npx shipwright-brain ui
```

Opens http://localhost:3111 -- see all memories, filter by tags and status, track progress.

### Manual setup (if you prefer)

Add to `.mcp.json` in your project root:

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

## How It Works

Claude creates memories as markdown files with frontmatter. Brain handles everything else.

```
docs/
  ideas/
    auth-improvements/
      memory.md          <- the idea + checklist
      oauth/
        memory.md        <- sub-idea (nested)
  decisions/
    jwt-tokens/
      memory.md
      whiteboard.png     <- attached files live next to the memory
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

Brain reads the checkboxes and knows this is 2/4 = in progress. No status fields to maintain.

## What Brain Does for Claude

### Guides the workflow

When Claude creates a memory, Brain returns:
- The file path and format guide for that kind of memory
- A checklist: write content, attach files, keep it updated
- Similar existing memories (so Claude doesn't create duplicates)
- Related memories auto-linked as refs

Claude follows the instructions. Brain teaches the format.

### Prevents duplicates

Before creating, Brain checks for similar existing memories using embeddings:
- **90%+ similar** -- blocks creation, suggests merging
- **60-89% similar** -- creates it, auto-links as related, suggests as potential parent
- Claude decides the relationship

### Tracks progress

Checkboxes in content are the progress system:
- `- [ ]` unchecked, `- [x]` checked
- Brain derives status: not-started / in-progress / done
- Sub-memories roll up into parent progress
- "What should I do next?" finds in-progress then not-started work

### Searches by meaning

Hybrid search: keyword matching + semantic embeddings. "How do we handle authentication?" finds memories about tokens, sessions, and login even without the word "auth". Local model (all-MiniLM-L6-v2), no API calls, CoreML on Mac.

### Keeps the graph consistent

Refs are always bidirectional. Link A to B and B automatically links back to A. Write a markdown link to another memory in content -- Brain detects it and adds the ref. Delete a memory -- back-refs clean up.

### Remembers across restarts

JSONL disk cache for instant startup. Cache restores synchronously (MCP ready immediately), verification runs in background. Embeddings computed once and cached.

## Format Guides

Stored as memories in `docs/format-guides/{kind}/memory.md`. They tell Claude how to write each kind of memory. Auto-created for new kinds.

Edit them to change how your team writes memories -- no code changes needed. Brain appends the 5W context framework (Why, What, Who, How) to every format.

## MCP Tools

| Tool | What it does |
|------|-------------|
| `create_memory` | Create memory with duplicate check, auto-refs, format guide |
| `browse_memories` | Navigate tree by kind, filter by tags/status, sort, paginate |
| `search_memories` | Hybrid keyword + semantic search with filters |
| `screenshot` | Capture URL with optional click sequence before capture |
| `attach_to_memory` | Attach any file type to a memory |
| `get_memory_graph` | Full connection graph |
| `recall_agent_memory` | Load agent learnings from previous sessions |
| `recall_developer_profile` | Load developer preferences |
| `delete_memory` | Remove + cleanup refs |

## API

All endpoints return JSON with CORS headers.

| Endpoint | Params | Description |
|----------|--------|-------------|
| `GET /api/browse` | `path`, `tags`, `status`, `sort`, `limit`, `offset` | Browse memory tree |
| `GET /api/search` | `q`, `tags`, `kind`, `status`, `sort`, `limit`, `offset` | Hybrid search |
| `GET /api/memory` | `f` (memory_file) | Full detail with rich refs/children |
| `GET /api/graph` | -- | Full reference graph |
| `GET /api/overview` | -- | Stats, kinds, tags |
| `GET /file` | `p` (file path) | Serve attachments |

First page includes facets (tag counts + status breakdown) and pagination metadata.

Sort: `?sort=modified:desc` (default), `modified:asc`, `title:asc`, `title:desc`, `created:asc`, `created:desc`.
