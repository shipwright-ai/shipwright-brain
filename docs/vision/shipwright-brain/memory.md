---
title: Shipwright Brain
summary: Simple persistent memory for AI agents — markdown files, MCP server, web UI
kind: vision
tags: [brain, mcp, memory, agents]
refs: []
by: developer
at: 2025-03-28T00:00:00.000Z
---

# Shipwright Brain

Memory system for AI agents that's just markdown files in folders.

## What it does

Agents store knowledge as memories — decisions, ideas, personas, features, architecture.
Each memory is a folder with `memory.md` + optional attachments.
Brain provides an MCP server for creating and searching memories, and a web UI for browsing.

## Why it exists

AI agents lose context between sessions. Without persistent memory, every session starts from zero.
Brain gives agents a way to remember what they learned, what was decided, and what matters.

## Core principles

- Memories are just files — human readable, git friendly, no database
- Brain creates files, Claude edits them directly
- Frontmatter is lean: title, summary, kind, tags, refs, by, at
- Search and browse hit an in-memory cache, not the filesystem
- References between memories are bidirectional
- Context is kept lean — summaries for browsing, full content only when needed
- No LLMs in Brain — Claude generates summaries at write time
