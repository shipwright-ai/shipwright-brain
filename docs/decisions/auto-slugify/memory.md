---
title: Auto-slugify kinds and tags
summary: Brain normalizes kind and tag inputs — no spaces, lowercase, consistent
kind: decisions
tags: [brain, consistency]
refs: [docs/decisions/lean-frontmatter/memory.md]
by: developer
at: 2025-03-28T00:00:00.000Z
---

# Decision: Auto-slugify inputs

## Context

Agents might pass "Architecture Decisions" or "UI Design" as kind or tag.
This creates folders with spaces and inconsistent naming.

## Decision

Brain slugifies kinds and tags on input. "Architecture Decisions" → "architecture-decisions".

## Why

- Filesystem-safe folder names
- Consistent naming without relying on agent discipline
- Prevents duplicate kinds from capitalization differences
