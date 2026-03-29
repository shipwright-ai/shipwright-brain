/**
 * Shipwright Brain — MCP Server
 *
 * memory_file is the universal key everywhere.
 * It's a real file path: "docs/decisions/auth-flow/memory.md"
 *
 * npx shipwright-brain mcp [docs-dir]
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as brain from "./core.js";

const dir = process.env.BRAIN_DOCS_DIR || process.argv[2] || "./docs";
brain.init(dir);

const server = new McpServer({
  name: "brain",
  version: "1.0.0",
});

// Dynamic resource — shows existing kinds, counts, and recent memories
server.resource(
  "brain-overview",
  "brain://overview",
  "Current state of the brain — existing kinds, tags, memory counts. Read this first.",
  async () => {
    const kindsList = brain.getKinds();
    let text = `# Brain Overview\n\n`;

    if (brain.isReady()) {
      const s = brain.stats();
      text += `Total: ${s.total} memories\n\n`;
      const kindEntries = Object.entries(s.kinds).sort((a, b) => a[0].localeCompare(b[0]));
      if (kindEntries.length) {
        text += `Kinds: ${kindEntries.map(([k, n]) => `${k} (${n})`).join(', ')}\n\n`;
      }
      const tags = brain.allTags();
      const tagEntries = Object.entries(tags).sort((a, b) => b[1] - a[1]);
      if (tagEntries.length) {
        text += `Tags: ${tagEntries.map(([t, n]) => `${t} (${n})`).join(', ')}\n`;
      }
    } else {
      // Phase 1 only — just kinds from folder names
      if (kindsList.length) {
        text += `Kinds: ${kindsList.join(', ')}\n\n`;
        text += `(Cache loading — counts and tags available shortly)\n`;
      }
    }

    if (!kindsList.length) {
      text += `Brain is empty. Use create_memory to start.\n`;
      text += `Common kinds: vision, architecture, technology, personas, features, ideas, decisions, work, patterns, bugs, learnings\n`;
      text += `Any string works — new kind = new folder.\n`;
    }

    return {
      contents: [{ uri: "brain://overview", mimeType: "text/markdown", text }],
    };
  }
);

server.tool(
  "create_memory",
  `Create a new memory. Brain creates folder + frontmatter, then YOU write the content.
Without parent: creates at docs/{kind}/{slug}/memory.md.
With parent: nests inside the parent's folder as a sub-memory.
Provide a one-sentence summary for browsing.
Do NOT pass content — the response tells you the file path and format to write directly.`,
  {
    title: z.string().describe("Short descriptive title"),
    summary: z.string().describe("One sentence — what someone needs to know without reading the content"),
    kind: z.string().optional().describe("Top-level folder name. Any string works — new kind = new folder. Common: decisions, ideas, personas, features, patterns, bugs, architecture, learnings. Not needed if parent is set."),
    parent: z.string().optional().describe("Parent memory_file to nest under. Omit for top-level."),
    by: z.string().describe("Who: developer, reviewer, researcher, orchestrator"),
    tags: z.array(z.string()).optional().describe("Tags for filtering"),
    refs: z.array(z.string()).optional().describe('Related memory_file paths'),
  },
  async ({ title, summary, kind, parent, by, tags, refs }) => {
    const existingKinds = new Set(brain.getKinds());
    const existingTags = new Set(Object.keys(brain.allTags()));

    const memFile = brain.create({ title, summary, content: "", kind, parent, tags, refs, by });
    if (!memFile) return { content: [{ type: "text", text: "Failed — parent not found." }] };

    const effectiveKind = kind || (parent ? "sub-memory" : "memories");
    let text = `Created: ${memFile}`;
    const slugKind = kind ? kind.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : null;
    if (slugKind && !existingKinds.has(slugKind)) text += `\nNew kind: ${slugKind}`;
    const newTags = (tags || []).map(t => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")).filter(t => t && !existingTags.has(t));
    if (newTags.length) text += `\nNew tags: ${newTags.join(", ")}`;

    text += `\n\n⚠ NEXT STEPS — do these now before moving on:`;
    text += `\n- [ ] Write content to ${memFile} in this format:\n\n${brain.getFormatGuide(effectiveKind)}`;
    text += `\n\n- [ ] Attach ALL relevant files from this conversation using brain.attach_to_memory (memory_file: "${memFile}") — any file type: images, screenshots, STL, PDF, CSV, code, configs, designs, logs, etc.`;
    text += `\n- [ ] Skip attachments if no assets exist — but check first, don't assume`;
    text += `\n\nIMPORTANT: If you learn new information relevant to this memory during the session, update the file immediately. Memories are living documents.`;

    return { content: [{ type: "text", text }] };
  }
);

server.tool(
  "browse_memories",
  `Browse the memory tree. Three levels, max 20 per call, filterable by tags.
No path: kinds with counts (filtered by tags if provided).
Kind string: memories in that kind.
memory_file: sub-memories of that memory.
Tags filter at every level — only show memories matching any of the given tags.`,
  {
    path: z.string().optional().describe('Kind string (e.g. "decisions") or memory_file. Omit for top-level.'),
    tags: z.array(z.string()).optional().describe("Filter by tags (any match)"),
    limit: z.number().optional().describe("Max results (default 20)"),
    offset: z.number().optional().describe("Skip N results (default 0)"),
  },
  async ({ path: p, tags, limit, offset }) => {
    const r = brain.browse(p, { limit: limit || 20, offset: offset || 0, tags });
    if (!r) return { content: [{ type: "text", text: "Not found." }] };

    if (r.level === "root") {
      if (!r.kinds.length) return { content: [{ type: "text", text: "Brain is empty." }] };
      const text = r.kinds.map((k) => `${k.kind}/${k.count ? ' (' + k.count + ')' : ''}`).join("\n");
      return { content: [{ type: "text", text: `Kinds:\n${text}` }] };
    }

    const items = r.memories || r.children || [];
    if (!items.length) return { content: [{ type: "text", text: `Empty.` }] };

    let text = items.map((m) => {
      let line = `${m.memory_file} — ${m.title}`;
      if (m.progress) line += ` [${m.progress.checked}/${m.progress.total}]`;
      if (m.summary) line += `\n  ${m.summary}`;
      if (m.children) line += ` (+${m.children} sub)`;
      return line;
    }).join("\n\n");

    if (r.total) text = `${r.total} total, showing ${items.length}:\n\n${text}`;
    if (r.hasMore) text += `\n\n... more (offset: ${(offset || 0) + items.length})`;
    return { content: [{ type: "text", text }] };
  }
);

server.tool(
  "search_memories",
  `Search memories. Multiple queries supported — matches if ANY query hits (OR logic).
Searches title, summary, tags, kind, slug from cache. Returns max 20 results per call.
Use offset to paginate. To read full content, open the memory_file directly.
Filter by status to find actionable items: "not-started", "in-progress", or "done".
Status is auto-detected from checkboxes: 0/N = not-started, some = in-progress, all = done.
When the developer asks "what should I do next?" or similar:
  1. Search with status "in-progress" first — finish what's started
  2. Then status "not-started" — pick up new work
  3. Present both lists so the developer can choose`,
  {
    queries: z.array(z.string()).describe('Search queries, e.g. ["auth", "JWT", "login"]'),
    tags: z.array(z.string()).optional().describe("Filter by tags (any match)"),
    kind: z.string().optional().describe("Filter by kind"),
    status: z.enum(["not-started", "in-progress", "done"]).optional().describe("Filter by checkbox status: not-started (0/N), in-progress (some/N), done (N/N)"),
    limit: z.number().optional().describe("Max results (default 20)"),
    offset: z.number().optional().describe("Skip N results for pagination (default 0)"),
  },
  async ({ queries, tags, kind, status, limit, offset }) => {
    const r = brain.search({ queries, tags, kind, status, limit: limit || 20, offset: offset || 0 });
    if (!r.memories.length) return { content: [{ type: "text", text: "No memories found." }] };

    let text = r.memories.map((m) => {
      let line = `${m.memory_file} — ${m.title}`;
      if (m.progress) line += ` [${m.progress.checked}/${m.progress.total}]`;
      if (m.summary) line += `\n  ${m.summary}`;
      return line;
    }).join("\n\n");

    text = `${r.total} total, showing ${r.memories.length}:\n\n${text}`;
    if (r.hasMore) text += `\n\n... more results available (offset: ${(offset || 0) + r.memories.length})`;
    return { content: [{ type: "text", text }] };
  }
);

server.tool(
  "screenshot",
  `Capture a screenshot of a URL using Playwright.
Without memory_file: saves to temp, returns file path.
With memory_file: saves next to that memory and appends image reference to the markdown.
Use clicks to interact with the page before capturing — e.g. open a menu, expand a section, navigate to a specific state.`,
  {
    url: z.string().describe("URL to screenshot"),
    name: z.string().optional().describe("Filename without .png"),
    memory_file: z.string().optional().describe("Attach to this memory. Omit for temp file."),
    clicks: z.array(z.string()).optional().describe('CSS selectors to click in order before capturing. E.g. [".avatar", ".settings-menu"] to open avatar dropdown then click settings.'),
  },
  async ({ url, name, memory_file, clicks }) => {
    try {
      const filePath = await brain.screenshot(url, { name, memoryFile: memory_file, clicks });
      if (filePath === null) return { content: [{ type: "text", text: `Memory not found: ${memory_file}` }] };
      return { content: [{ type: "text", text: filePath }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Screenshot failed: ${e.message}` }] };
    }
  }
);

server.tool(
  "attach_to_memory",
  `Copy a file into a memory's folder and append a reference in the markdown.
Images get ![name](file), other files get [name](file).`,
  {
    file_path: z.string().describe("Path to the file to attach"),
    memory_file: z.string().describe("Target memory file path"),
    name: z.string().optional().describe("Rename the file. Defaults to original filename."),
  },
  async ({ file_path, memory_file, name }) => {
    const result = brain.attach(file_path, memory_file, { name });
    if (!result) return { content: [{ type: "text", text: "Not found or file missing." }] };
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "get_memory_graph",
  `Get the full reference graph. Nodes have memory_file, title, summary. Edges show refs between memories.`,
  {},
  async () => {
    const g = brain.getGraph();
    return { content: [{ type: "text", text: JSON.stringify(g, null, 2) }] };
  }
);

server.tool(
  "recall_agent_memory",
  `Load technical learnings from previous sessions. Call at session start.
First call creates your memory file. Returns learnings + edit instructions.`,
  {
    agent_name: z.string().describe("Your agent name: developer, reviewer, researcher, orchestrator"),
  },
  async ({ agent_name }) => {
    const r = brain.recallAgentMemory(agent_name);
    const lines = r.content.trim().split("\n").filter(l => l.trim().length > 0);

    let text = "";
    if (r.hasContent) {
      if (lines.length > 50) {
        text += `⚠ ${lines.length} learnings — getting large. Review with developer, remove stale ones.\n`;
        text += `Edit: ${r.memFile}\n\n---\n\n`;
      }
      text += `Your learnings (${lines.length}):\n\n${r.content}\n\n---\n`;
    } else {
      text += `No learnings yet.\n\n`;
    }
    text += `To add: append "- " lines to ${r.memFile}`;
    return { content: [{ type: "text", text }] };
  }
);

server.tool(
  "recall_developer_profile",
  `Load the developer's communication profile. Runs whoami to detect the user.
Returns preferences, communication patterns, and how to adapt your style.
First call creates the profile. Update at natural boundaries and before ending session.`,
  {},
  async () => {
    let username;
    try {
      const { execSync } = await import("child_process");
      username = execSync("whoami", { encoding: "utf-8" }).trim();
    } catch { username = "unknown"; }

    const r = brain.recallDeveloperProfile(username);
    const lines = r.content.trim().split("\n").filter(l => l.trim().length > 0);

    let text = `Developer: ${username}\n\n`;
    if (r.hasContent) {
      text += `Profile:\n\n${r.content}\n\n---\n`;
    } else {
      text += `New developer — no profile yet. Observe during this session:\n`;
      text += `- Communication style (terse vs detailed?)\n`;
      text += `- Verbosity preference (minimal / balanced / detailed?)\n`;
      text += `- Work patterns (focused vs jumps between tasks?)\n`;
      text += `- Shorthand translations ("fix it" means what?)\n\n`;
    }
    text += `Update profile at natural pauses and before ending session.\n`;
    text += `Edit: ${r.memFile}\n`;
    text += `Format: free text describing patterns. Keep it useful, not creepy.`;
    return { content: [{ type: "text", text }] };
  }
);

server.tool(
  "delete_memory",
  `Delete a memory, its attachments, and clean up back-refs. Permanent.`,
  {
    memory_file: z.string().describe("Memory file path to delete"),
  },
  async ({ memory_file }) => {
    const ok = brain.remove(memory_file);
    if (!ok) return { content: [{ type: "text", text: `Not found: ${memory_file}` }] };
    return { content: [{ type: "text", text: `Deleted: ${memory_file}` }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`Brain MCP running — docs: ${dir}`);
