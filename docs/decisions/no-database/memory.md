---
title: No database — markdown files only
summary: Memories are markdown files in folders, no Postgres, no SQLite, no database
kind: decisions
tags: [brain, architecture, simplicity]
refs: [docs/architecture/brain-architecture/memory.md]
by: developer
at: 2025-03-28T00:00:00.000Z
---

# Decision: No database

## Context

Previous version (v1) used Postgres with pgvector. Installation was painful,
onboarding required Docker, and the database became a single point of failure.

## Alternatives considered

- Postgres — powerful but heavy, requires running a server
- SQLite — lighter but still a binary format, not human readable
- Markdown files — just folders and files, zero infrastructure

## Decision

Markdown files with frontmatter. Cache in memory for fast search.

## Why

- Zero install — it's just files
- Human readable — browse in VS Code, grep in terminal, read on GitHub
- Git friendly — version history for free, works with PRs
- Survives Brain being offline — files are still there
- Claude can read and edit directly — no intermediary
- Cache makes search fast enough for hundreds of files

## Tradeoffs

- No full-text search across content (only frontmatter cached) — mitigated by summaries
- No vector search — can add embeddings later as enhancement
- fs.watch is flaky on Linux — fallback to polling if needed
