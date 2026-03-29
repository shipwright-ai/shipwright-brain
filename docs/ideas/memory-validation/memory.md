---
title: Memory validation on create
summary: Reject memories with empty summary — the whole lazy-loading pattern depends on good summaries
kind: ideas
tags: [brain, quality, validation]
refs: [docs/decisions/lean-frontmatter/memory.md]
by: developer
at: 2025-03-28T00:00:00.000Z
---

# Idea: Validate on create

If Claude forgets to include a summary, browse results show empty lines.
The whole lazy-loading pattern breaks.

## Validation rules

- summary must not be empty
- title must not be empty
- kind must not be empty (unless parent is set)
- summary should be one sentence (warn if over 200 chars?)

## Implementation

Simple check in core.create() — return error instead of creating the file.
MCP tool returns clear error message so Claude knows what's missing.
