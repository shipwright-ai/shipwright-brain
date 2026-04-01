#!/usr/bin/env node

/**
 * Shipwright Brain CLI
 *
 * npx github:shipwright-ai/shipwright-brain init [--dir docs]         — set up brain in a project
 * npx github:shipwright-ai/shipwright-brain mcp [--dir docs]          — run MCP server (Claude Code manages this)
 * npx github:shipwright-ai/shipwright-brain ui [--dir docs] [--port 3111] — run the web UI
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const command = args[0];

function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const docsDir = flag("dir", "./docs");
const port = flag("port", "3111");
const uiPort = flag("ui-port", "5173");

// Pass config to imported modules via env
process.env.BRAIN_DOCS_DIR = path.resolve(docsDir);
process.env.BRAIN_PORT = port;

if (command === "init") {
  // --- INIT ---
  const absDocsDir = path.resolve(docsDir);
  fs.mkdirSync(absDocsDir, { recursive: true });
  console.log(`✓ Created docs directory: ${absDocsDir}`);

  // Add MCP config to .claude/mcp.json (project-scoped MCP servers)
  const claudeDir = path.resolve(".claude");
  fs.mkdirSync(claudeDir, { recursive: true });
  const mcpPath = path.resolve(".claude/mcp.json");

  let mcpConfig = {};
  if (fs.existsSync(mcpPath)) {
    try {
      mcpConfig = JSON.parse(fs.readFileSync(mcpPath, "utf-8"));
    } catch {
      console.log("⚠ Could not parse .claude/mcp.json — creating new");
    }
  }

  if (!mcpConfig.mcpServers) mcpConfig.mcpServers = {};

  mcpConfig.mcpServers["brain"] = {
    command: "npx",
    args: ["github:shipwright-ai/shipwright-brain", "mcp", "--dir", docsDir],
  };

  fs.writeFileSync(mcpPath, JSON.stringify(mcpConfig, null, 2), "utf-8");
  console.log(`✓ Added MCP server to .claude/mcp.json`);

  // Install Playwright Chromium for screenshot tool
  console.log(`  Installing Playwright Chromium (for screenshots)...`);
  const { execSync } = await import("child_process");
  try {
    execSync("npx playwright install chromium", { stdio: "inherit" });
    console.log(`✓ Playwright Chromium installed`);
  } catch {
    console.log(`⚠ Playwright install failed — screenshot tool won't work until you run: npx playwright install chromium`);
  }

  // Pre-download embedding model so first search isn't slow
  console.log(`  Downloading embedding model (for semantic search)...`);
  try {
    const { warmup } = await import("./src/embeddings.js");
    await warmup();
    console.log(`✓ Embedding model ready`);
  } catch {
    console.log(`⚠ Embedding model download failed — semantic search will download on first use`);
  }

  console.log(`
Shipwright Brain is ready.

  Docs:  ${absDocsDir}
  MCP:   auto-starts when Claude Code needs memory tools
  UI:    npx github:shipwright-ai/shipwright-brain ui

Next: restart Claude Code, then brain tools are available.
Browse memories: npx github:shipwright-ai/shipwright-brain ui
`);

} else if (command === "mcp") {
  // --- MCP SERVER (Claude Code launches this) ---
  await import("./src/mcp.js");

} else if (command === "ui") {
  // --- WEB UI: Brain API + pre-built SvelteKit UI ---
  // Start Brain HTTP API first
  await import("./src/http.js");
  // Download and start the pre-built brain-ui
  const { startUI } = await import("./src/ui-server.js");
  await startUI({ brainPort: parseInt(port), uiPort: parseInt(uiPort) });

} else if (command === "api") {
  // --- API only (no UI) ---
  await import("./src/http.js");

} else {
  // --- HELP ---
  console.log(`
Shipwright Brain — memory for AI agents

Commands:
  init [--dir docs]                         Set up brain in current project
  ui [--dir docs] [--port 3111]             Brain API + web UI
  api [--dir docs] [--port 3111]            Brain API only (no UI)
  mcp [--dir docs]                          MCP server (Claude Code does this)

Quick start:
  npx github:shipwright-ai/shipwright-brain init
  npx github:shipwright-ai/shipwright-brain ui
`);
}
