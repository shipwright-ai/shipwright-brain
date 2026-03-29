---
title: Bridge Claude auto memory with Brain
summary: Claude promotes important auto-memory notes to Brain via a rule — two systems, one knowledge base
kind: ideas
tags: [brain, claude-code, auto-memory, integration]
refs: [docs/ideas/rules-refactor/memory.md]
by: developer
at: 2025-03-28T00:00:00.000Z
---

# Idea: Auto memory → Brain bridge

Claude Code has built-in auto memory (v2.1.59+). Short notes, per-project.
Not structured, not searchable by other agents, not in Brain.

## Bridge approach

A `.claude/rules/brain.md` tells Claude:
"When you save something to auto memory that's a decision, architecture choice,
or important learning — also store it in Brain with create_memory."

Auto memory = quick notes for Claude.
Brain = shared project knowledge for all agents.

Claude decides what's worth promoting. No filesystem hacking.

## Alternative: Brain reads auto memory

Brain could watch `~/.claude/projects/{path}/memory/` and index those notes.
But this couples to Claude's internal storage format — fragile.

## Decision

Use the rule approach. Simpler, decoupled, Claude controls the flow.
