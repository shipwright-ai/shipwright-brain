# Shipwright Brain

Persistent memory for Claude Code. Markdown files, no database.

## How it works

Brain gives you MCP tools to create, search, and browse memories stored as markdown files in `./docs/`.
Memories persist across sessions — decisions, architecture, features, bugs, learnings, anything.

## Available tools

- **create_memory** — Create a memory. Brain scaffolds the file, you write the content.
- **browse_memories** — Navigate the memory tree by kind, then drill into specific memories.
- **search_memories** — Hybrid keyword + semantic search across all memories.
- **attach_to_memory** — Attach files (screenshots, diagrams) to a memory.
- **move_memory** — Move a memory to a new parent, auto-updates refs.
- **get_memory_graph** — See how memories connect.
- **delete_memory** — Remove a memory and clean up refs.
- **screenshot** — Capture a URL at multiple viewport widths, optionally attach to a memory.
- **recall_agent_memory** — Load learnings from previous sessions for a specific agent role.
- **recall_developer_profile** — Load developer communication preferences.

## Quick start

1. Read brain://overview to see what's in the brain (or if it's empty).
2. Create memories as you work — decisions made, architecture chosen, features planned.
3. Search before creating to avoid duplicates.
4. Use kinds to organize: `decisions`, `features`, `architecture`, `bugs`, `learnings`, `ideas`, `patterns` — or any string.

## Memory structure

```
docs/{kind}/{slug}/memory.md      ← the memory
docs/{kind}/{slug}/*.png           ← attachments
docs/{kind}/{slug}/{sub}/memory.md ← sub-memories
```

## Best practices

- Start every session by reading brain://overview
- Before making a decision, search for related memories
- After completing work, update relevant memories (check off items, add context)
- Use tags consistently — check existing tags in overview before creating new ones
- Write summaries that are useful without reading the full content
