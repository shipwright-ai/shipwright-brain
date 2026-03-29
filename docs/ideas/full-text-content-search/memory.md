---
title: Full-text content search
summary: Search memory content too, not just frontmatter — needed when summaries aren't enough
kind: ideas
tags: [brain, search, performance]
refs: [docs/ideas/embeddings-search/memory.md]
by: developer
at: 2025-03-28T00:00:00.000Z
---

# Idea: Full-text content search

Currently search only hits cached frontmatter (title, summary, tags, kind, slug).
For deep search, the full content needs to be searchable too.

## Options

1. Load content into cache too — memory heavy at scale
2. Grep on demand — slow but no memory cost
3. Build a text index (BM25) alongside the cache — best balance

## When needed

When summaries aren't specific enough to find what you need.
Probably after 200+ memories where you can't find things by title/tags alone.
