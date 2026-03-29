---
title: Brain creates, Claude edits
summary: Brain handles file creation and structure, Claude reads and edits content directly
kind: decisions
tags: [brain, architecture, separation-of-concerns]
refs: [docs/architecture/brain-architecture/memory.md]
by: developer
at: 2025-03-28T00:00:00.000Z
---

# Decision: Brain creates, Claude edits

## Context

Need clear responsibility split between Brain (MCP server) and Claude (the agent).

## Decision

Brain creates memory scaffolds — folder, frontmatter, initial content, bidirectional refs.
Claude reads and edits memory files directly using its own file tools.
Brain watches for changes and updates cache automatically.

## Why

- Brain controls structure — consistent folder layout, slugified names, ref sync
- Claude controls content — it's better at writing and editing than any tool
- No update/append MCP tools needed — fewer tools, less complexity
- fs.watch picks up Claude's edits — cache stays fresh without explicit calls
- Each does what it's good at, nothing more
