---
title: Shipwright Workflows
summary: Planning, execution, review cycles with agent roles, task templates, and orchestration
kind: ideas
tags: [shipwright, workflows, agents, orchestration]
refs: [docs/vision/shipwright-brain/memory.md]
by: developer
at: 2025-03-28T00:00:00.000Z
---

# Idea: Shipwright Workflows

Separate project: shipwright-workflows. Adds structured execution on top of
shipwright (practices) and brain (memory).

## What it adds

- Planning workflows — break vision into epics, tasks, sub-tasks
- Execution workflows — implement, test, review cycle per task
- God mode — live editing where developer and agent code together, docs update retrospectively
- Agent roles — planner, developer, reviewer, documentation agent
- Task templates — repeatable checklists per task type
- Orchestration — which agents run in what order

## Why it's separate

- Shipwright = how we work (practices)
- Brain = what we know (memory)
- Workflows = what we do (execution)

Each works independently. Together they're the full system.

## When to build

After shipwright + brain are proven on real projects. Week 2-3.
The workflows will emerge from real usage patterns, not theory.
