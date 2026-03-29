---
title: Refactor to .claude/rules/ structure
summary: Move gates and behavioral instructions from CLAUDE.md to path-scoped .claude/rules/ files
kind: ideas
tags: [shipwright, claude-code, rules, optimization]
refs: [docs/decisions/lean-frontmatter/memory.md]
by: developer
at: 2025-03-28T00:00:00.000Z
---

# Idea: .claude/rules/ refactor

Based on Claude Code best practices research, Phase 1 should create `.claude/rules/` instead of cramming everything into CLAUDE.md.

## Structure

```
.claude/
  settings.json          — MCP config
  rules/
    brain.md             — when to use Brain vs auto memory
    quality.md           — make lint/test, path-scoped
    shipwright.md        — skill references, session start behavior
    conventions.md       — project-specific patterns (path-scoped)
  commands/
    setup.md             — /project:setup for re-running shipwright
  hooks/
    pre-commit.sh        — actual hook script, not just a skill doc
```

## Key insight

- Rules load with same priority as CLAUDE.md but can be path-scoped
- `paths: src/api/**/*.ts` means API rules only load when working on API files
- CLAUDE.md budget is ~100 instructions (system prompt uses ~50 of 150)
- Hooks are deterministic, CLAUDE.md/rules are advisory
- Auto memory + Brain complement each other — rule tells Claude when to promote

## CLAUDE.md becomes 5 lines

Just project name, stack, make commands. Everything else in rules.

## When

After testing current setup. This is a Phase 1 refactor, not a redesign.
