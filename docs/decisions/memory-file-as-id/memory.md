---
title: memory_file as universal ID
summary: File path is the identity — no separate ID concept, no abstraction
kind: decisions
tags: [brain, architecture, simplicity]
refs: [docs/architecture/brain-architecture/memory.md]
by: developer
at: 2025-03-28T00:00:00.000Z
---

# Decision: memory_file as universal ID

## Context

Needed a way to identify memories across all tools — create, browse, search, attach, delete, refs.

## Alternatives considered

- Random IDs (e.g. m_a3f8b2c1) — requires lookup, not human readable
- kind/slug composite — almost a path but not quite, still needs convention
- File path — it's already unique, already exists, Claude can read it directly

## Decision

Use the relative file path as the ID everywhere: `docs/decisions/auth-flow/memory.md`

## Why

- One string, one concept — no mapping between ID and path
- Claude can read the file directly without resolving anything
- Refs in frontmatter are real paths that work with grep, find, ls
- No abstraction to maintain or explain
