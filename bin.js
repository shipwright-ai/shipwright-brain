#!/usr/bin/env node

/**
 * Shipwright Brain CLI
 *
 * npx shipwright-brain init [docs-dir]   — set up brain in a project
 * npx shipwright-brain mcp [docs-dir]    — run MCP server (Claude Code manages this)
 * npx shipwright-brain ui [docs-dir]     — run the web UI (developer runs this)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const command = args[0];
const docsDir = args[1] || "./docs";

// Pass docs dir to imported modules via env
process.env.BRAIN_DOCS_DIR = path.resolve(docsDir);

if (command === "init") {
  // --- INIT ---
  const absDocsDir = path.resolve(docsDir);
  fs.mkdirSync(absDocsDir, { recursive: true });
  console.log(`✓ Created docs directory: ${absDocsDir}`);

  // Add MCP config to .claude/settings.json
  const claudeDir = path.resolve(".claude");
  const settingsPath = path.join(claudeDir, "settings.json");
  fs.mkdirSync(claudeDir, { recursive: true });

  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
    } catch {
      console.log("⚠ Could not parse .claude/settings.json — creating new");
    }
  }

  if (!settings.mcpServers) settings.mcpServers = {};

  settings.mcpServers["brain"] = {
    command: "npx",
    args: ["shipwright-brain", "mcp", docsDir],
  };

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
  console.log(`✓ Added MCP server to .claude/settings.json`);

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
  UI:    npx shipwright-brain ui

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
  npx shipwright-brain init [docs-dir]   Set up brain in current project
  npx shipwright-brain ui [docs-dir]     Browse memories in the browser
  npx shipwright-brain mcp [docs-dir]    Run MCP server (Claude Code does this)

Quick start:
  npx shipwright-brain init
  npx shipwright-brain ui
`);
}
