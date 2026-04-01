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

// Pass config to imported modules via env
process.env.BRAIN_DOCS_DIR = path.resolve(docsDir);
process.env.BRAIN_PORT = port;

if (command === "init") {
  // --- INIT ---
  const absDocsDir = path.resolve(docsDir);
  fs.mkdirSync(absDocsDir, { recursive: true });
  console.log(`✓ Created docs directory: ${absDocsDir}`);

  // Add MCP config to .mcp.json (project-scoped MCP servers)
  const mcpPath = path.resolve(".mcp.json");

  let mcpConfig = {};
  if (fs.existsSync(mcpPath)) {
    try {
      mcpConfig = JSON.parse(fs.readFileSync(mcpPath, "utf-8"));
    } catch {
      console.log("⚠ Could not parse .mcp.json — creating new");
    }
  }

  if (!mcpConfig.mcpServers) mcpConfig.mcpServers = {};

  mcpConfig.mcpServers["brain"] = {
    command: "npx",
    args: ["github:shipwright-ai/shipwright-brain", "mcp", "--dir", docsDir],
  };

  fs.writeFileSync(mcpPath, JSON.stringify(mcpConfig, null, 2), "utf-8");
  console.log(`✓ Added MCP server to .mcp.json`);

  // Install Playwright Chromium for screenshot tool
  console.log(`  Installing Playwright Chromium (for screenshots)...`);
  const { execSync } = await import("child_process");
  try {
    execSync("npx playwright install chromium", { stdio: "inherit" });
    console.log(`✓ Playwright Chromium installed`);
  } catch {
    console.log(`⚠ Playwright install failed — screenshot tool won't work until you run: npx playwright install chromium`);
  }

  console.log(`
Shipwright Brain is ready.

  Docs:  ${absDocsDir}
  MCP:   auto-starts when Claude Code needs memory tools
  UI:    npx github:shipwright-ai/shipwright-brain ui

Memories organize by kind:
  ${absDocsDir}/decisions/  ${absDocsDir}/ideas/
  ${absDocsDir}/features/   ${absDocsDir}/personas/
  ... any kind you want
`);

} else if (command === "mcp") {
  // --- MCP SERVER (Claude Code launches this) ---
  await import("./src/mcp.js");

} else if (command === "ui") {
  // --- WEB UI (developer launches this) ---
  await import("./src/http.js");

} else {
  // --- HELP ---
  console.log(`
Shipwright Brain — memory for AI agents

Commands:
  npx github:shipwright-ai/shipwright-brain init [--dir docs]              Set up brain in current project
  npx github:shipwright-ai/shipwright-brain ui [--dir docs] [--port 3111]  Browse memories in the browser
  npx github:shipwright-ai/shipwright-brain mcp [--dir docs]               Run MCP server (Claude Code does this)

Quick start:
  npx github:shipwright-ai/shipwright-brain init
  npx github:shipwright-ai/shipwright-brain ui
`);
}
