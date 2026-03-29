---
title: Features format guide
summary: Template for feature memories — categorized deliverables checklist
kind: format-guides
tags: [format-guide]
refs: []
by: system
at: "2026-03-29T00:00:00.000Z"
---

Prefix title with scope: Feature: ..., Epic: ..., Enhancement: ...
Tag with scope (lowercase): feature, epic, enhancement.
Also tag with area if known: auth, api, ui, data, infra, etc.

Write as a checklist — each deliverable is a checkbox:

> Context: why this feature, who needs it, date

- [ ] First deliverable
- [ ] Second deliverable
- [ ] Tests / validation

Epics are features with sub-memories — create the parent feature, then nest deliverables under it using parent param.
