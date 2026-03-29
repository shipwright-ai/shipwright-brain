---
title: Brain architecture
summary: Four files — core logic, MCP layer, HTTP+UI layer, CLI entry point
kind: architecture
tags: [brain, mcp, node, cache]
refs: [docs/vision/shipwright-brain/memory.md, docs/decisions/memory-file-as-id/memory.md]
by: developer
at: 2025-03-28T00:00:00.000Z
---

# Architecture

## Files

```
src/core.js   — all brain logic, pure functions, no transport
src/mcp.js    — MCP layer, imports core, 8 tools
src/http.js   — HTTP API + simple UI, imports core
bin.js        — CLI: init, mcp, ui commands
```

## Data structure

```
docs/{kind}/{slug}/memory.md     — the memory
docs/{kind}/{slug}/*.png         — attachments
docs/{kind}/{slug}/{sub}/memory.md — sub-memories (recursive)
```

## Cache

All frontmatter loaded into memory on boot (two-phase: instant kinds, async full parse).
fs.watch keeps cache fresh when Claude edits files.
Search and browse hit cache only. Full content read from filesystem on demand.

## Memory file as universal key

`docs/decisions/auth-flow/memory.md` is the ID, the path, and the reference format.
One string everywhere. No abstraction layer.

## MCP tools (8)

- create_memory — Brain creates scaffold + content
- browse_memories — lazy tree navigation from cache
- search_memories — multi-query OR search from cache
- recall_agent_memory — get/create agent learning file
- screenshot — Playwright capture, optionally attached
- attach_to_memory — copy file + add markdown reference
- get_memory_graph — node/edge connections
- delete_memory — remove + cleanup refs

## Bidirectional refs

When memory A refs memory B, Brain automatically adds A to B's refs.
Delete cleans up back-refs. The graph builds itself.
