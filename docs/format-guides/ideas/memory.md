---
title: Ideas format guide
summary: Template for idea memories — categorized checklist with checkboxes
kind: format-guides
tags: [format-guide]
refs: []
by: system
at: "2026-03-29T00:00:00.000Z"
---

Tag with a category and area. Check brain://overview for existing tags first — reuse when they fit, create new ones when they don't.

Write as a checklist — each step is a checkbox:

> Why: what problem does this solve
> What: the idea in concrete terms
> Who: who benefits, who implements
> When: urgency or timeline
> How: approach or constraints

- [ ] First concrete step
- [ ] Second step
- [ ] Third step

3-6 checkboxes. Don't over-plan. Check boxes off as work progresses.

## Nesting: ideas → plans → work-items

Ideas can grow into structured work using tags and sub-memories:

1. **Idea** (top-level) — the concept. Tags: area/category.
2. **Plan** (sub-memory of idea) — how to execute. Tag: `plan`. Contains high-level phases.
3. **Work-item** (sub-memory of plan) — individual task. Tag: `work-item`. Has checkboxes.

Example:
  idea: "Auth redesign" (kind: ideas)
    └── plan: "Migration plan" (parent: the idea, tags: [plan])
         └── work-item: "Migrate session tokens" (parent: the plan, tags: [work-item])

Progress rolls up: work-item checkboxes → plan aggregate → idea aggregate.
