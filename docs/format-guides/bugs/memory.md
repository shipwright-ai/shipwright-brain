---
title: Bugs format guide
summary: Template for bug memories — categorized investigation checklist
kind: format-guides
tags: [format-guide]
refs: []
by: system
at: "2026-03-29T00:00:00.000Z"
---

Prefix title with severity: Critical: ..., Bug: ..., Minor: ...
Tag with severity (lowercase): critical, bug, minor.
Also tag with area if known: auth, api, ui, data, infra, etc.

Write as a checklist — each fix/investigation step is a checkbox:

> Observed: what's broken
> Expected: what should happen
> Context: how it was discovered, date

- [ ] Reproduce the issue
- [ ] Identify root cause
- [ ] Implement fix
- [ ] Verify fix
