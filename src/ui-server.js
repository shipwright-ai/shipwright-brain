/**
 * Downloads pre-built brain-ui from GitHub releases and serves it.
 * Brain API runs on --port (default 3111), UI on --ui-port (default 5173).
 *
 * First run downloads ~2MB tarball, cached in ~/.shipwright/brain-ui/
 */

import fs from "fs";
import path from "path";
import os from "os";
import { execSync, spawn } from "child_process";
import http from "http";

const REPO = "shipwright-ai/shipwright-ui";
const CACHE_DIR = path.join(os.homedir(), ".shipwright", "brain-ui");
const BUILD_DIR = path.join(CACHE_DIR, "build");
const VERSION_FILE = path.join(CACHE_DIR, "version");

async function getLatestRelease() {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/releases/latest`,
    { headers: { Accept: "application/vnd.github.v3+json" } }
  );
  if (!res.ok) throw new Error(`GitHub API: ${res.status}`);
  return res.json();
}

function currentVersion() {
  try {
    return fs.readFileSync(VERSION_FILE, "utf-8").trim();
  } catch {
    return null;
  }
}

async function downloadUI() {
  console.log("Checking for brain-ui updates...");

  let release;
  try {
    release = await getLatestRelease();
  } catch (e) {
    if (fs.existsSync(BUILD_DIR)) {
      console.log("GitHub unreachable, using cached build.");
      return;
    }
    throw new Error(`Cannot download brain-ui: ${e.message}`);
  }

  const tag = release.tag_name;
  if (currentVersion() === tag && fs.existsSync(BUILD_DIR)) {
    console.log(`brain-ui ${tag} (cached)`);
    return;
  }

  const asset = release.assets.find((a) => a.name === "brain-ui.tar.gz");
  if (!asset) throw new Error("No brain-ui.tar.gz in latest release");

  console.log(`Downloading brain-ui ${tag}...`);
  const tarball = path.join(CACHE_DIR, "brain-ui.tar.gz");
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const res = await fetch(asset.browser_download_url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(tarball, buf);

  // Extract
  if (fs.existsSync(BUILD_DIR))
    fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  fs.mkdirSync(BUILD_DIR, { recursive: true });
  execSync(`tar -xzf ${tarball} -C ${BUILD_DIR}`);
  fs.unlinkSync(tarball);
  fs.writeFileSync(VERSION_FILE, tag);
  console.log(`brain-ui ${tag} installed.`);
}

export async function startUI({ brainPort = 3111, uiPort = 5173 } = {}) {
  await downloadUI();

  const handler = path.join(BUILD_DIR, "handler.js");
  if (!fs.existsSync(handler)) {
    // Fallback: try index.js (adapter-node output varies)
    const index = path.join(BUILD_DIR, "index.js");
    if (!fs.existsSync(index)) {
      throw new Error(
        `brain-ui build missing handler. Contents: ${fs.readdirSync(BUILD_DIR).join(", ")}`
      );
    }
  }

  // SvelteKit adapter-node produces a standalone server
  const child = spawn("node", [BUILD_DIR], {
    env: {
      ...process.env,
      PORT: String(uiPort),
      HOST: "0.0.0.0",
      ORIGIN: `http://localhost:${uiPort}`,
      PUBLIC_BRAIN_URL: `http://localhost:${brainPort}`,
    },
    stdio: "inherit",
  });

  child.on("error", (e) => console.error("brain-ui error:", e.message));
  return child;
}
