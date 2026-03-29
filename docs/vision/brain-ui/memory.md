---
title: Brain UI
summary: SvelteKit app to browse, search, and visualize shipwright-brain memories with tree drilldown and graph view
kind: vision
tags: [brain-ui, sveltekit, frontend]
refs: [docs/vision/shipwright-brain/memory.md, docs/ideas/brain-ui-sveltekit/memory.md]
by: developer
at: 2025-03-28T00:00:00.000Z
---

# Brain UI

SvelteKit app that consumes Brain's HTTP API to visualize the memory graph.

## What it does

- Browse memories as a tree: kinds → memories → sub-memories
- Search with instant results from cached summaries
- View memory detail: rendered markdown, inline images, tags, refs as links, attachments
- Breadcrumb navigation for drilldown
- Graph view showing memory connections (future)

## Who it's for

- Developers using Shipwright who want to see their knowledge base visually
- Anyone debugging Brain — see what's stored, what's connected, what's missing

## Stack

- SvelteKit
- TypeScript
- Tailwind CSS
- Consumes Brain HTTP API at localhost:3111

## API endpoints it consumes

- GET /api/browse?path=&tags=&limit=&offset=
- GET /api/search?q=&tags=&kind=&limit=&offset=
- GET /api/memory?f={memory_file}
- GET /api/graph
- GET /api/overview
- GET /file?p={path} (attachment serving)

## MVP features

1. Landing page with kind cards (counts from /api/browse)
2. Kind view — list memories with summaries
3. Memory detail — rendered markdown, images, tags, refs, sub-memories
4. Search bar with instant results
5. Breadcrumb navigation

## Not in MVP

- Graph visualization
- Memory creation form
- Editing memories from UI
- Authentication
