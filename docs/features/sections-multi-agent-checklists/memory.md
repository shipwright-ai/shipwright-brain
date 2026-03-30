---
title: "Sections: multi-agent checklists per memory"
summary: Any .md file next to memory.md is a section — filename convention {order}_{section}_{agent}.md, zero config, frontmatter optional
kind: features
tags: [brain-core, agents, workflow]
refs: []
by: developer
at: "2026-03-30T00:00:00.000Z"
---

> Why: Real work has phases — someone builds, someone reviews, someone documents. One memory.md can't capture multi-agent workflows.
> What: Extend Brain to treat sibling .md files as sections with progress tracking.
> Who: All agents benefit — each gets their own checklist file.
> How: Filename convention + optional frontmatter, format guide templates auto-copy sections.

## Convention: `{order}_{section}_{agent}.md`

```
docs/ideas/auth-redesign/migrate-tokens/
  memory.md                        <- the work-item (what & why)
  1_execution_developer.md         <- developer does this first
  2_review_reviewer.md             <- reviewer checks after
  3_documentary_documenter.md      <- documenter writes docs last
```

Brain parses the filename — zero config:
- `1` -> order
- `execution` -> section title
- `developer` -> assigned agent

Plain `notes.md` also works — no order, no agent, still a valid section.

## Frontmatter: optional, overrides filename

```yaml
---
title: Implementation & Migration    # overrides "execution"
agent: senior-developer              # overrides "developer"
---
```

Filename = sensible defaults. Frontmatter = override or extend. Brain merges both, frontmatter wins on conflict.

## Format guides as section templates

Extra .md files in a format guide directory get copied into new memories automatically:

```
docs/format-guides/ideas/work-item/
  memory.md                        <- format guide
  1_execution_developer.md         <- copied to every new work-item
  2_review_reviewer.md             <- copied to every new work-item
  3_documentary_documenter.md      <- copied to every new work-item
```

`create_memory(kind: "ideas", tags: ["work-item"])` copies all section templates and returns paths in MCP response.

## Progress

Aggregate progress counts checkboxes from ALL .md files in the directory (memory.md + all sections), not just memory.md. One number rolls up to parent.

## Implementation

- [ ] Parse section filenames: extract order, title, agent from `{order}_{section}_{agent}.md`
- [ ] Store sections in cache entry (separate from attachments)
- [ ] Merge frontmatter over filename-derived fields
- [ ] Aggregate progress from all .md files in directory
- [ ] Copy section templates from format guides on create_memory
- [ ] Return section paths in create_memory MCP response
- [ ] Agent query: find sections by agent name with unchecked items
