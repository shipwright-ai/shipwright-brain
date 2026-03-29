---
title: Brain UI as SvelteKit app
summary: Proper frontend for browsing memories — graph view, tree drilldown, rich detail rendering
kind: ideas
tags: [brain-ui, sveltekit, frontend]
refs: [docs/architecture/brain-architecture/memory.md]
by: developer
at: 2025-03-28T00:00:00.000Z
---

# Idea: Brain UI (SvelteKit)

Separate project: shipwright-ui. SvelteKit app consuming Brain's HTTP API.

## Features planned

- Tree browser with drilldown (kinds → memories → sub-memories)
- Breadcrumb navigation
- Rich markdown rendering with inline images
- Tag filtering and search
- Force-directed graph view of memory connections
- Memory creation form (pre-populated kinds/tags from overview)
- Responsive, dark theme, JetBrains Mono

## Architecture

- Consumes /api/* endpoints from Brain's http.js
- Separate deployment — can run anywhere
- Brain's current simple HTML is the placeholder until this ships

## First real test

Build brain-ui USING shipwright + brain. Dogfood the whole system.
The product IS the test.
