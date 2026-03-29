---
title: Pagination on all list endpoints
summary: Max 20 results per call with offset — no endpoint dumps everything
kind: decisions
tags: [brain, context, performance]
refs: [docs/architecture/brain-architecture/memory.md]
by: developer
at: 2025-03-28T00:00:00.000Z
---

# Decision: Pagination everywhere

## Context

With hundreds of memories, returning all results would flood agent context window.

## Decision

All list endpoints (browse, search) return max 20 results with offset pagination.
Response includes total count and hasMore flag.
Agent refines query or paginates.

## Why

- Context window protection — never dump 500 summaries
- Agent learns to search precisely instead of browsing everything
- hasMore tells agent there's more without loading it
