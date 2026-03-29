---
title: Embeddings search with Xenova on Neural Engine
summary: Add vector search using cached summaries — 7 seconds for 800 files on Mac Neural Engine
kind: ideas
tags: [brain, search, embeddings, neural-engine, performance]
refs: [docs/decisions/no-database/memory.md, docs/architecture/brain-architecture/memory.md]
by: developer
at: 2025-03-28T00:00:00.000Z
---

# Idea: Embeddings search

Cache is already in memory. Add embeddings array next to each entry.
On boot, embed all summaries using Xenova transforms on Mac Neural Engine (~7 sec for 800 files).
Watcher triggers re-embed on change.

Search becomes: vector similarity on summaries first, fallback to text match.

Architecture is already ready — one function change in core.js.
MCP search_memories tool doesn't change, just gets smarter results.

## Implementation notes from v1

- Xenova transforms can be forced to use Mac Neural Engine (super fast)
- Had three LLMs: embeddings, summary, another for RRF matching
- For Brain v2: just embeddings on summaries is enough to start
- Summary text is clean and focused — ideal for embedding
