---
title: Two-phase boot
summary: Instant kinds from folder scan, async cache population in background
kind: decisions
tags: [brain, performance, cache]
refs: [docs/architecture/brain-architecture/memory.md]
by: developer
at: 2025-03-28T00:00:00.000Z
---

# Decision: Two-phase boot

## Context

With hundreds of files, parsing all frontmatter on boot blocks MCP connection.
Claude Code needs tool schemas immediately.

## Decision

Phase 1 (instant): ls docs dir for kind folder names. Brain is ready for browse at kind level.
Phase 2 (background): parse all memory.md frontmatter into cache via setImmediate.
Search becomes available as entries load.

## Why

- MCP connects instantly, tool schemas available
- By the time agent actually calls search, cache is populated
- Graceful degradation — overview shows kinds even before cache is ready
