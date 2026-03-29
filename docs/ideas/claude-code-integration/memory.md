---
title: Claude Code native integration
summary: Use .claude/rules/ instead of CLAUDE.md gates, autoMemoryDirectory is local-only, accept separate concerns
kind: ideas
tags: [brain, claude-code, rules, auto-memory, integration]
refs: [docs/ideas/rules-refactor/memory.md, docs/ideas/auto-memory-bridge/memory.md]
by: developer
at: 2025-03-28T00:00:00.000Z
---

# Claude Code Native Integration

## Key findings

- autoMemoryDirectory NOT accepted from project settings — only user/local
- Auto memory is Claude's scratch pad, Brain is shared knowledge — don't merge
- .claude/rules/ loads with same priority as CLAUDE.md, can be path-scoped
- ~150 instruction budget, system prompt uses ~50, CLAUDE.md gets ~100
- Hooks are deterministic, rules are advisory

## Phase 1 should create

```
.claude/
  settings.json         — MCP (Brain), permissions
  rules/
    brain.md            — promote decisions to Brain, auto memory for quick notes
    quality.md          — make lint/test before commit
    shipwright.md       — skill refs, session start: recall_developer_profile()
  CLAUDE.md             — 5 lines only: project, stack, make commands
```

## Auto memory stays local

Developer can optionally set autoMemoryDirectory in local settings.
Brain doesn't try to control it. Two systems, separate concerns.
