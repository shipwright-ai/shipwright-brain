---
name: setup
description: Set up Shipwright Brain — persistent memory for Claude Code
---

Quick setup. One question at a time. Suggest defaults, let user override.

## Steps

1. **Docs directory** — where memories are stored.
   Default: `./docs`
   Ask: "Where should Brain store memories? (default: ./docs)"
   Create the directory if it doesn't exist.

2. **Port** — for the HTTP API (Brain UI connects here).
   Default: `3111`
   Ask: "Which port for the Brain HTTP API? (default: 3111)"

3. **Update MCP config** — write or update `.mcp.json` in the project root.
   If installed as plugin: the plugin.json handles MCP. Check if `.mcp.json` already has a `brain` server — if so, update args to match chosen dir/port. If not, skip (plugin handles it).
   If NOT installed as plugin (no `${CLAUDE_PLUGIN_ROOT}`): add brain to `.mcp.json`:
   ```json
   {
     "mcpServers": {
       "brain": {
         "command": "npx",
         "args": ["github:shipwright-ai/shipwright-brain", "mcp", "--dir", "<docs-dir>", "--port", "<port>"]
       }
     }
   }
   ```

4. **Done** — tell the user:
   - Memories will be stored in `<docs-dir>`
   - HTTP API at `http://localhost:<port>`
   - Browse memories: `npx github:shipwright-ai/shipwright-brain ui --port <port>` or `npx github:shipwright-ai/shipwright-ui`
   - Brain tools available as `brain.create_memory`, `brain.browse_memories`, etc.
   - Restart Claude Code for MCP changes to take effect
