import matter from "gray-matter";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import os from "os";
import { embed, cosineSimilarity } from "./embeddings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let DOCS_DIR, PROJECT_ROOT, CACHE_FILE;
const cache = new Map();
let cacheReady = false;
const knownKinds = new Set();

export function init(docsDir, projectRoot) {
  DOCS_DIR = path.resolve(docsDir);
  PROJECT_ROOT = projectRoot || path.resolve(".");

  // Cache file lives in brain's own dir, keyed by project path hash
  const hash = crypto.createHash("md5").update(DOCS_DIR).digest("hex").slice(0, 12);
  const cacheDir = path.join(__dirname, "..", ".cache");
  fs.mkdirSync(cacheDir, { recursive: true });
  CACHE_FILE = path.join(cacheDir, `${hash}.jsonl`);

  fs.mkdirSync(DOCS_DIR, { recursive: true });
  scanKinds();

  // Fast path: restore from disk cache synchronously (instant MCP startup)
  const disk = loadDiskCache();
  if (disk && disk.entries.length > 0) {
    for (const entry of disk.entries) {
      cache.set(entry.memory_file, entry);
      if (entry.kind) knownKinds.add(entry.kind);
    }
    cacheReady = true;
    console.error(`[brain] Fast restore: ${disk.entries.length} entries from cache`);
    // Defer verification + new file scan to background
    setImmediate(() => { verifyCacheInBackground(disk.meta.lastUpdate); startWatcher(); });
  } else {
    // No cache — full scan (first run only)
    setImmediate(() => { rebuildCache(); startWatcher(); });
  }
}

export function getDocsDir() { return DOCS_DIR; }
export function isReady() { return cacheReady; }

function scanKinds() {
  if (!fs.existsSync(DOCS_DIR)) return;
  for (const e of fs.readdirSync(DOCS_DIR)) {
    if (!e.startsWith(".") && fs.statSync(path.join(DOCS_DIR, e)).isDirectory()) knownKinds.add(e);
  }
}

function embeddingText(entry, content) {
  return `${entry.title} ${entry.summary} ${(entry.tags || []).join(" ")} ${content || ""}`.trim();
}

// Queue for async embedding computation — doesn't block loadEntry
const embeddingQueue = [];
let embeddingRunning = false;

async function processEmbeddingQueue() {
  if (embeddingRunning) return;
  embeddingRunning = true;
  while (embeddingQueue.length > 0) {
    const { memFile, text } = embeddingQueue.shift();
    try {
      const entry = cache.get(memFile);
      if (entry) {
        entry.embedding = await embed(text);
        saveDiskCache();
      }
    } catch (e) { console.error("[embeddings] Error:", e.message); }
  }
  embeddingRunning = false;
}

function queueEmbedding(memFile, text) {
  embeddingQueue.push({ memFile, text });
  processEmbeddingQueue();
}

function parseCheckboxes(content) {
  const checked = (content.match(/- \[x\]/gi) || []).length;
  const unchecked = (content.match(/- \[ \]/g) || []).length;
  const total = checked + unchecked;
  if (total === 0) return null;
  return { checked, total, status: checked === total ? "done" : checked === 0 ? "not-started" : "in-progress" };
}

function parseSectionFilename(filename) {
  const base = filename.replace(/\.md$/, "");
  const match = base.match(/^(\d+)_([^_]+)(?:_(.+))?$/);
  if (!match) return { order: null, section: base, agent: null };
  return { order: parseInt(match[1]), section: match[2], agent: match[3] || null };
}

function loadSections(absDir) {
  const files = fs.readdirSync(absDir).filter(f => f !== "memory.md" && f.endsWith(".md") && !fs.statSync(path.join(absDir, f)).isDirectory());
  return files.map(f => {
    const raw = fs.readFileSync(path.join(absDir, f), "utf-8");
    const { data: fm, content } = matter(raw);
    const parsed = parseSectionFilename(f);
    const progress = parseCheckboxes(content);
    return {
      file: f,
      path: rel(path.join(absDir, f)),
      order: fm.order ?? parsed.order,
      title: fm.title || parsed.section,
      agent: fm.agent || parsed.agent,
      progress,
    };
  }).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

function computeAggregateProgress(memFile, visited = new Set()) {
  if (visited.has(memFile)) return null;
  visited.add(memFile);
  const e = cache.get(memFile);
  if (!e) return null;
  let checked = e.progress ? e.progress.checked : 0;
  let total = e.progress ? e.progress.total : 0;
  for (const cf of e.children) {
    const child = computeAggregateProgress(cf, visited);
    if (child) { checked += child.checked; total += child.total; }
  }
  if (total === 0) { e.aggregateProgress = null; return null; }
  e.aggregateProgress = { checked, total, status: checked === total ? "done" : checked === 0 ? "not-started" : "in-progress" };
  return e.aggregateProgress;
}

function recomputeAggregateChain(memFile) {
  const e = cache.get(memFile);
  if (!e) return;
  computeAggregateProgress(memFile);
  if (e.parent) recomputeAggregateChain(e.parent);
}

function recomputeAllAggregates() {
  for (const e of cache.values()) {
    if (!e.parent) computeAggregateProgress(e.memory_file);
  }
}

// --- Cache persistence (JSONL) ---

function loadDiskCache() {
  if (!fs.existsSync(CACHE_FILE)) return null;
  try {
    const lines = fs.readFileSync(CACHE_FILE, "utf-8").trim().split("\n");
    if (!lines.length) return null;
    const meta = JSON.parse(lines[0]);
    if (!meta._meta) return null;
    const entries = [];
    for (let i = 1; i < lines.length; i++) {
      try { entries.push(JSON.parse(lines[i])); } catch {}
    }
    return { meta, entries };
  } catch { return null; }
}

function saveDiskCache() {
  const meta = { _meta: true, lastUpdate: new Date().toISOString(), docsDir: DOCS_DIR };
  const lines = [JSON.stringify(meta)];
  for (const e of cache.values()) {
    lines.push(JSON.stringify(e));
  }
  fs.writeFileSync(CACHE_FILE, lines.join("\n") + "\n", "utf-8");
}

function updateDiskCacheEntry(memFile) {
  // Rewrite the full file — JSONL doesn't support in-place line updates efficiently
  // For typical project sizes (<1000 memories) this is fine
  saveDiskCache();
}

function verifyCacheInBackground(lastUpdate) {
  let stale = 0, missing = 0, added = 0;

  // Verify existing entries
  for (const [memFile, entry] of [...cache.entries()]) {
    const absFile = abs(memFile);
    if (!fs.existsSync(absFile)) {
      cache.delete(memFile);
      missing++;
      continue;
    }
    const mtime = fs.statSync(absFile).mtime.toISOString();
    if (mtime > lastUpdate) {
      loadEntry(path.dirname(absFile));
      stale++;
    }
  }

  // Scan for new files
  const newFiles = [];
  if (fs.existsSync(DOCS_DIR)) findNewFiles(DOCS_DIR, newFiles);
  for (const absDir of newFiles) { loadEntry(absDir); added++; }

  recomputeAllAggregates();
  if (stale || missing || added) {
    saveDiskCache();
    console.error(`[brain] Background verify: ${stale} updated, ${missing} removed, ${added} new`);
  } else {
    console.error(`[brain] Background verify: all clean`);
  }
}

function rebuildCache() {
  cache.clear();
  if (fs.existsSync(DOCS_DIR)) walkDir(DOCS_DIR);
  recomputeAllAggregates();
  saveDiskCache();
  cacheReady = true;
  console.error(`[brain] Full scan: ${cache.size} entries loaded`);
}

function findNewFiles(dir, results) {
  for (const e of fs.readdirSync(dir)) {
    if (e.startsWith(".")) continue;
    const full = path.join(dir, e);
    if (!fs.statSync(full).isDirectory()) continue;
    if (fs.existsSync(path.join(full, "memory.md"))) {
      const memFile = rel(path.join(full, "memory.md"));
      if (!cache.has(memFile)) results.push(full);
    }
    findNewFiles(full, results);
  }
}

function walkDir(dir) {
  for (const e of fs.readdirSync(dir)) {
    if (e.startsWith(".")) continue;
    const full = path.join(dir, e);
    if (!fs.statSync(full).isDirectory()) continue;
    if (fs.existsSync(path.join(full, "memory.md"))) loadEntry(full);
    walkDir(full);
  }
}

function parseContentLinks(content, memFile) {
  // Find markdown links pointing to memory.md files in content
  const memDir = path.dirname(memFile);
  const links = [];
  const re = /\[([^\]]*)\]\(([^)]*memory\.md)\)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const target = m[2];
    if (target.startsWith("http")) continue;
    // Resolve relative paths against the memory's directory
    const resolved = target.startsWith("docs/") ? target : path.join(memDir, target);
    if (resolved !== memFile) links.push(resolved);
  }
  return links;
}

function diffRefs(oldRefs, newRefs, memFile) {
  const oldSet = new Set(oldRefs || []);
  const newSet = new Set(newRefs || []);
  const added = [...newSet].filter(r => !oldSet.has(r));
  const removed = [...oldSet].filter(r => !newSet.has(r));

  // Add back-refs for new refs
  for (const tf of added) {
    const t = cache.get(tf);
    if (!t || t.refs.includes(memFile)) continue;
    const af = abs(tf);
    if (!fs.existsSync(af)) continue;
    const { data: fm, content } = matter(fs.readFileSync(af, "utf-8"));
    fm.refs = [...(fm.refs || []), memFile];
    fs.writeFileSync(af, matter.stringify(content, fm), "utf-8");
  }

  // Remove back-refs for removed refs
  for (const tf of removed) {
    const t = cache.get(tf);
    if (!t) continue;
    const af = abs(tf);
    if (!fs.existsSync(af)) continue;
    const { data: fm, content } = matter(fs.readFileSync(af, "utf-8"));
    const cleaned = (fm.refs || []).filter(x => x !== memFile);
    if (cleaned.length !== (fm.refs || []).length) {
      fm.refs = cleaned;
      fs.writeFileSync(af, matter.stringify(content, fm), "utf-8");
    }
  }
}

function loadEntry(absDir) {
  const absFile = path.join(absDir, "memory.md");
  const memFile = rel(absFile);
  if (!fs.existsSync(absFile)) { cache.delete(memFile); return; }
  try {
    const raw = fs.readFileSync(absFile, "utf-8");
    const { data: fm, content } = matter(raw);

    // Merge frontmatter refs with inline content links
    const contentLinks = parseContentLinks(content, memFile);
    const allRefs = [...new Set([...(fm.refs || []), ...contentLinks])];

    // Diff refs and sync back-refs if entry already existed
    const oldEntry = cache.get(memFile);
    if (oldEntry) diffRefs(oldEntry.refs, allRefs, memFile);

    const sections = loadSections(absDir);
    const attachments = fs.readdirSync(absDir)
      .filter(f => f !== "memory.md" && !f.endsWith(".md") && !fs.statSync(path.join(absDir, f)).isDirectory())
      .map(f => {
        const s = fs.statSync(path.join(absDir, f));
        return { file: rel(path.join(absDir, f)), created: s.birthtime.toISOString(), modified: s.mtime.toISOString() };
      });
    const children = fs.readdirSync(absDir)
      .filter(f => { const s = path.join(absDir, f); return fs.statSync(s).isDirectory() && fs.existsSync(path.join(s, "memory.md")); })
      .map(f => rel(path.join(absDir, f, "memory.md")));
    const parentDir = path.dirname(absDir);
    const parent = fs.existsSync(path.join(parentDir, "memory.md")) ? rel(path.join(parentDir, "memory.md")) : null;
    const parts = path.relative(DOCS_DIR, absDir).split(path.sep);
    // Merge checkboxes from memory.md + all sections
    const memProgress = parseCheckboxes(content);
    let totalChecked = memProgress ? memProgress.checked : 0;
    let totalTotal = memProgress ? memProgress.total : 0;
    for (const s of sections) {
      if (s.progress) { totalChecked += s.progress.checked; totalTotal += s.progress.total; }
    }
    const progress = totalTotal > 0 ? { checked: totalChecked, total: totalTotal, status: totalChecked === totalTotal ? "done" : totalChecked === 0 ? "not-started" : "in-progress" } : null;
    const fileStat = fs.statSync(absFile);
    // Preserve embedding from old entry or disk cache if content unchanged
    const oldEmbedding = oldEntry ? oldEntry.embedding : null;
    const entry = {
      memory_file: memFile, title: fm.title || parts[parts.length - 1],
      summary: fm.summary || "", kind: parts[0], slug: parts[parts.length - 1],
      depth: parts.length, parent, children, attachments, sections, progress,
      tags: fm.tags || [], refs: allRefs, by: fm.by || "unknown",
      at: fm.at || "", modified: fileStat.mtime.toISOString(),
      embedding: oldEmbedding || null,
    };
    cache.set(memFile, entry);
    knownKinds.add(parts[0]);

    // Queue embedding if missing or content changed
    const text = embeddingText(entry, content);
    if (!entry.embedding) {
      queueEmbedding(memFile, text);
    }
  } catch (e) { console.error("Cache error:", e.message); }
}

function startWatcher() {
  try {
    fs.watch(DOCS_DIR, { recursive: true }, (_, filename) => {
      if (!filename || !filename.endsWith(".md")) return;
      const parts = filename.split(path.sep);
      if (parts.length < 2) return;
      // For section files, reload the parent memory directory
      const absDir = filename.endsWith("memory.md")
        ? path.join(DOCS_DIR, ...parts.slice(0, -1))
        : path.join(DOCS_DIR, ...parts.slice(0, -1));
      if (fs.existsSync(path.join(absDir, "memory.md"))) {
        const memFile = rel(path.join(absDir, "memory.md"));
        loadEntry(absDir);
        const pd = path.dirname(absDir);
        if (fs.existsSync(path.join(pd, "memory.md"))) loadEntry(pd);
        recomputeAggregateChain(memFile);
        updateDiskCacheEntry(memFile);
      } else {
        cache.delete(rel(path.join(absDir, "memory.md")));
        updateDiskCacheEntry(null);
      }
    });
  } catch {}
}

function rel(p) { return path.relative(PROJECT_ROOT, p); }
function abs(p) { return path.resolve(PROJECT_ROOT, p); }
export function slugify(t) { return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60); }

function syncRefs(sourceFile, refs) {
  if (!refs || !refs.length) return;
  for (const tf of refs) {
    const t = cache.get(tf);
    if (!t || t.refs.includes(sourceFile)) continue;
    const af = abs(tf);
    const { data: fm, content } = matter(fs.readFileSync(af, "utf-8"));
    fm.refs = [...(fm.refs || []), sourceFile];
    fs.writeFileSync(af, matter.stringify(content, fm), "utf-8");
    loadEntry(path.dirname(af));
  }
}

function cleanRefs(memFile) {
  const entry = cache.get(memFile);
  if (!entry) return;
  for (const rf of entry.refs) {
    const r = cache.get(rf);
    if (!r) continue;
    const af = abs(rf);
    if (!fs.existsSync(af)) continue;
    const { data: fm, content } = matter(fs.readFileSync(af, "utf-8"));
    const cleaned = (fm.refs || []).filter(x => x !== memFile);
    if (cleaned.length !== (fm.refs || []).length) {
      fm.refs = cleaned;
      fs.writeFileSync(af, matter.stringify(content, fm), "utf-8");
      loadEntry(path.dirname(af));
    }
  }
}

function cleanupAbandonedDuplicate(slug, newMemFile) {
  const ONE_HOUR = 60 * 60 * 1000;
  const now = Date.now();
  for (const e of cache.values()) {
    if (e.slug !== slug || e.memory_file === newMemFile) continue;
    // Must be created within the last hour
    if (!e.at || now - new Date(e.at).getTime() > ONE_HOUR) continue;
    // Must never have been edited (created ≈ modified, within 5 seconds)
    if (e.modified && Math.abs(new Date(e.modified).getTime() - new Date(e.at).getTime()) > 5000) continue;
    // Must have no children
    if (e.children && e.children.length > 0) continue;
    // Abandoned skeleton — remove it
    console.error(`[brain] Auto-cleanup abandoned memory: ${e.memory_file}`);
    remove(e.memory_file);
    return e.memory_file;
  }
  return null;
}

export function create({ title, summary, content, kind, parent, tags, refs, by }) {
  const slug = slugify(title);
  let targetDir;
  if (parent) {
    const pe = cache.get(parent);
    if (!pe) return null;
    targetDir = path.join(path.dirname(abs(parent)), slug);
  } else {
    kind = slugify(kind || "memories");
    targetDir = path.join(DOCS_DIR, kind, slug);
  }
  let finalDir = targetDir, c = 2;
  while (fs.existsSync(finalDir)) { finalDir = `${targetDir}-${c++}`; }
  const absFile = path.join(finalDir, "memory.md");
  const memFile = rel(absFile);
  fs.mkdirSync(finalDir, { recursive: true });
  const actualKind = path.relative(DOCS_DIR, finalDir).split(path.sep)[0];
  const cleanTags = (tags || []).map(t => slugify(t)).filter(Boolean);
  const fm = { title, summary: summary || "", kind: actualKind, tags: cleanTags, refs: refs || [], by: by || "unknown", at: new Date().toISOString() };
  fs.writeFileSync(absFile, matter.stringify(content || "", fm), "utf-8");
  // Copy section templates from format guide
  const copiedSections = copySectionTemplates(actualKind, cleanTags, finalDir);
  loadEntry(finalDir);
  syncRefs(memFile, refs);
  if (parent) { const pd = path.dirname(abs(parent)); if (fs.existsSync(path.join(pd, "memory.md"))) loadEntry(pd); }

  // Clean up abandoned same-slug memories (reorganization)
  const cleaned = cleanupAbandonedDuplicate(slug, memFile);

  saveDiskCache();
  return { memFile, sections: copiedSections };
}

function computeFacets(items) {
  const tagCounts = {};
  const statusCounts = { "not-started": 0, "in-progress": 0, "done": 0, "no-progress": 0 };
  for (const m of items) {
    const tags = m.tags || [];
    for (const t of tags) tagCounts[t] = (tagCounts[t] || 0) + 1;
    const p = m.aggregateProgress || m.progress;
    if (p) statusCounts[p.status]++;
    else statusCounts["no-progress"]++;
  }
  return {
    tags: Object.entries(tagCounts).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count),
    status: statusCounts,
  };
}

function matchesAgent(entry, agent) {
  if (!agent) return true;
  if (!entry.sections || !entry.sections.length) return false;
  return entry.sections.some(s => s.agent === agent);
}

function matchesStatus(entry, status) {
  if (!status) return true;
  const effective = entry.aggregateProgress || entry.progress;
  if (status === "no-progress") return !effective;
  if (!effective) return false;
  return effective.status === status;
}

function sortItems(items, sort) {
  const [field, dir] = (sort || "modified:desc").split(":");
  const asc = dir === "asc" ? 1 : -1;
  if (field === "title") return items.sort((a, b) => asc * (a.title || "").localeCompare(b.title || ""));
  if (field === "created") return items.sort((a, b) => asc * String(a.at || "").localeCompare(String(b.at || "")));
  // default: modified
  return items.sort((a, b) => asc * String(a.modified || a.at || "").localeCompare(String(b.modified || b.at || "")));
}

export function browse(pathOrKind, { limit = 20, offset = 0, tags: filterTags, status, agent, sort } = {}) {
  if (!pathOrKind) {
    if (!cacheReady) return { level: "root", kinds: [...knownKinds].sort().map(k => ({ kind: k })) };
    const directCounts = {};
    const totalCounts = {};
    const kindProgress = {};
    for (const e of cache.values()) {
      if (filterTags && filterTags.length && !filterTags.some(t => e.tags.includes(t))) continue;
      if (!matchesStatus(e, status)) continue;
      totalCounts[e.kind] = (totalCounts[e.kind] || 0) + 1;
      if (e.depth === 2) directCounts[e.kind] = (directCounts[e.kind] || 0) + 1;
      const p = e.aggregateProgress || e.progress;
      if (p) {
        if (!kindProgress[e.kind]) kindProgress[e.kind] = { checked: 0, total: 0 };
        kindProgress[e.kind].checked += p.checked;
        kindProgress[e.kind].total += p.total;
      }
    }
    return { level: "root", kinds: Object.entries(totalCounts).map(([k, n]) => {
      const p = kindProgress[k];
      const progress = p ? { checked: p.checked, total: p.total, status: p.checked === p.total ? "done" : p.checked === 0 ? "not-started" : "in-progress" } : null;
      return { kind: k, count: directCounts[k] || 0, totalCount: n, progress };
    }).sort((a, b) => a.kind.localeCompare(b.kind)) };
  }
  if (pathOrKind.endsWith("memory.md")) {
    const entry = cache.get(pathOrKind);
    if (!entry) return null;
    let items = entry.children.map(cf => { const c = cache.get(cf); return c ? { memory_file: c.memory_file, title: c.title, summary: c.summary, tags: c.tags, progress: c.progress, aggregateProgress: c.aggregateProgress, children: c.children.length, at: c.at, modified: c.modified } : null; }).filter(Boolean);
    if (filterTags && filterTags.length) items = items.filter(m => filterTags.some(t => m.tags.includes(t)));
    if (status) items = items.filter(m => matchesStatus(m, status));
    if (agent) items = items.filter(m => { const e = cache.get(m.memory_file); return e && matchesAgent(e, agent); });
    sortItems(items, sort);
    const total = items.length;
    const result = { level: "memory", memory_file: pathOrKind, title: entry.title, children: items.slice(offset, offset + limit), total, limit, offset, hasMore: offset + limit < total };
    if (offset === 0) result.facets = computeFacets(items);
    return result;
  }
  let items = [];
  for (const e of cache.values()) {
    if (e.kind !== pathOrKind || e.depth !== 2) continue;
    items.push({ memory_file: e.memory_file, title: e.title, summary: e.summary, tags: e.tags, progress: e.progress, aggregateProgress: e.aggregateProgress, children: e.children.length, at: e.at, modified: e.modified });
  }
  if (filterTags && filterTags.length) items = items.filter(m => filterTags.some(t => m.tags.includes(t)));
  if (status) items = items.filter(m => matchesStatus(m, status));
  sortItems(items, sort);
  const total = items.length;
  const result = { level: "kind", kind: pathOrKind, memories: items.slice(offset, offset + limit), total, limit, offset, hasMore: offset + limit < total };
  if (offset === 0) result.facets = computeFacets(items);
  return result;
}

export async function search({ query, tags, kind, status, agent, sort, limit = 20, offset = 0 }) {
  const hasQuery = query && query.trim().length > 0;
  const queryLower = hasQuery ? query.toLowerCase() : "";
  const scored = new Map();

  // Keyword pass (sync, instant)
  for (const e of cache.values()) {
    if (kind && e.kind !== kind) continue;
    if (tags && tags.length && !tags.some(t => e.tags.includes(t))) continue;
    if (!matchesStatus(e, status)) continue;
    if (!matchesAgent(e, agent)) continue;
    if (hasQuery) {
      const hay = `${e.title} ${e.summary} ${e.tags.join(" ")} ${e.kind} ${e.slug}`.toLowerCase();
      if (!hay.includes(queryLower)) continue;
    }
    const item = { memory_file: e.memory_file, title: e.title, summary: e.summary, kind: e.kind, tags: e.tags, progress: e.progress, aggregateProgress: e.aggregateProgress, at: e.at, modified: e.modified };
    scored.set(e.memory_file, { item, keyword: hasQuery ? 0.5 : 0, semantic: 0 });
  }

  // Semantic pass (async, may fail on cold start)
  if (hasQuery) {
    try {
      const queryEmbedding = await embed(query);
      for (const e of cache.values()) {
        if (kind && e.kind !== kind) continue;
        if (tags && tags.length && !tags.some(t => e.tags.includes(t))) continue;
        if (!matchesStatus(e, status)) continue;
        if (!matchesAgent(e, agent)) continue;
        const sim = e.embedding ? cosineSimilarity(queryEmbedding, e.embedding) : 0;
        if (sim <= 0.1) continue;
        const existing = scored.get(e.memory_file);
        if (existing) {
          existing.semantic = sim;
        } else {
          const item = { memory_file: e.memory_file, title: e.title, summary: e.summary, kind: e.kind, tags: e.tags, progress: e.progress, aggregateProgress: e.aggregateProgress, at: e.at, modified: e.modified };
          scored.set(e.memory_file, { item, keyword: 0, semantic: sim });
        }
      }
    } catch { /* embeddings not ready — keyword results still returned */ }
  }

  // Merge scores: max(keyword, semantic) + 0.1 boost if both matched
  const results = [];
  for (const { item, keyword, semantic } of scored.values()) {
    const both = keyword > 0 && semantic > 0 ? 0.1 : 0;
    const score = Math.max(keyword, semantic) + both;
    item.score = hasQuery ? Math.round(score * 1000) / 1000 : undefined;
    results.push(item);
  }

  if (hasQuery) {
    results.sort((a, b) => b.score - a.score);
  } else {
    sortItems(results, sort);
  }

  const total = results.length;
  const result = { memories: results.slice(offset, offset + limit), total, limit, offset, hasMore: offset + limit < total };
  if (offset === 0) result.facets = computeFacets(results);
  return result;
}

export async function findSimilar(title, summary, { limit = 3 } = {}) {
  const text = `${title} ${summary || ""}`.trim();
  const queryEmbedding = await embed(text);
  const duplicates = [];
  const related = [];
  for (const e of cache.values()) {
    if (!e.embedding) continue;
    const score = cosineSimilarity(queryEmbedding, e.embedding);
    const entry = { memory_file: e.memory_file, title: e.title, summary: e.summary, tags: e.tags, score: Math.round(score * 1000) / 1000 };
    if (score >= 0.9) duplicates.push(entry);
    else if (score >= 0.6) related.push(entry);
  }
  duplicates.sort((a, b) => b.score - a.score);
  related.sort((a, b) => b.score - a.score);
  return { duplicates: duplicates.slice(0, limit), related: related.slice(0, limit) };
}

export async function screenshot(url, { name, memoryFile, clicks, width } = {}) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const viewport = width ? { width, height: 800 } : undefined;
  const page = await browser.newPage({ ...(viewport && { viewport }) });
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  if (clicks && clicks.length) {
    for (const selector of clicks) {
      await page.click(selector);
      await page.waitForTimeout(500);
    }
  }
  const filename = (name || `screenshot-${Date.now()}`).replace(/[^a-z0-9_-]/gi, "-") + ".png";
  let savePath;
  if (memoryFile) {
    if (!cache.get(memoryFile)) { await browser.close(); return null; }
    savePath = path.join(path.dirname(abs(memoryFile)), filename);
  } else {
    const tmp = path.join(os.tmpdir(), "shipwright-brain"); fs.mkdirSync(tmp, { recursive: true });
    savePath = path.join(tmp, filename);
  }
  await page.screenshot({ path: savePath, fullPage: true });
  await browser.close();
  if (memoryFile) appendRef(memoryFile, filename, true);
  return rel(savePath);
}

export function attach(filePath, memoryFile, { name } = {}) {
  const e = cache.get(memoryFile);
  if (!e) return null;
  const src = path.resolve(filePath);
  if (!fs.existsSync(src)) return null;
  const filename = name || path.basename(src);
  const dest = path.join(path.dirname(abs(memoryFile)), filename);
  fs.copyFileSync(src, dest);
  appendRef(memoryFile, filename, isImg(filename));
  loadEntry(path.dirname(abs(memoryFile)));
  return rel(dest);
}

function appendRef(memFile, filename, img) {
  const af = abs(memFile);
  const { data: fm, content } = matter(fs.readFileSync(af, "utf-8"));
  const ref = img ? `![${filename}](${filename})` : `[${filename}](${filename})`;
  fs.writeFileSync(af, matter.stringify(content.trim() + "\n\n" + ref, fm), "utf-8");
  loadEntry(path.dirname(af));
}

function isImg(f) { return /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(f); }

export function getGraph() {
  const nodes = [], edges = [], seen = new Set();
  for (const e of cache.values()) {
    nodes.push({ memory_file: e.memory_file, kind: e.kind, title: e.title, summary: e.summary, tags: e.tags });
    for (const ref of e.refs) { const k = [e.memory_file, ref].sort().join("|"); if (!seen.has(k)) { seen.add(k); edges.push({ from: e.memory_file, to: ref }); } }
    for (const child of e.children) { edges.push({ from: e.memory_file, to: child, type: "contains" }); }
  }
  return { nodes, edges };
}

export function remove(memFile) {
  const entry = cache.get(memFile);
  if (!entry || entry.children.length > 0) return false;
  cleanRefs(memFile);
  fs.rmSync(path.dirname(abs(memFile)), { recursive: true });
  cache.delete(memFile);
  if (entry.parent) loadEntry(path.dirname(path.dirname(abs(memFile))));
  const kindDir = path.join(DOCS_DIR, entry.kind);
  if (fs.existsSync(kindDir) && fs.readdirSync(kindDir).length === 0) fs.rmdirSync(kindDir);
  saveDiskCache();
  return true;
}

const DEFAULT_FORMAT = `Write as a knowledge document — prose with structure:

## Background
Why this matters, context.

## Key Points
The actual knowledge — decisions, reasoning, details.

## References
Links, related memories, sources.`;

const CONTEXT_5W = `
Always structure context using this framework:
> Why: what problem does this solve, what motivated it
> What: concrete scope, deliverable, or outcome
> Who: who needs it, who is affected, who is doing it
> How: approach, constraints, or dependencies`;

export function getFormatGuide(kind, tags) {
  let guide = DEFAULT_FORMAT;
  let newGuideCreated = null;
  if (kind) {
    const k = slugify(kind);
    const guideDir = path.join(DOCS_DIR, "format-guides", k);
    const guideFile = path.join(guideDir, "memory.md");

    // Check sub-format-guides by tag (first match wins)
    let subGuideFound = false;
    if (tags && tags.length) {
      for (const tag of tags) {
        const t = slugify(tag);
        const subGuideFile = path.join(guideDir, t, "memory.md");
        if (fs.existsSync(subGuideFile)) {
          const content = matter(fs.readFileSync(subGuideFile, "utf-8")).content.trim();
          if (content) { guide = content; subGuideFound = true; break; }
        }
      }
    }

    if (!subGuideFound) {
      if (fs.existsSync(guideFile)) {
        const content = matter(fs.readFileSync(guideFile, "utf-8")).content.trim();
        if (content) guide = content;
      } else {
        fs.mkdirSync(guideDir, { recursive: true });
        const fm = {
          title: `${k} format guide`,
          summary: `Auto-generated format template for ${k} memories — customize this file`,
          kind: "format-guides",
          tags: ["format-guide"],
          refs: [],
          by: "system",
          at: new Date().toISOString(),
        };
        fs.writeFileSync(guideFile, matter.stringify(DEFAULT_FORMAT, fm), "utf-8");
        loadEntry(guideDir);
        newGuideCreated = rel(guideFile);
      }
    }
  }
  return { text: guide + "\n" + CONTEXT_5W, newGuideCreated };
}

function findFormatGuideDir(kind, tags) {
  if (!kind) return null;
  const k = slugify(kind);
  const guideDir = path.join(DOCS_DIR, "format-guides", k);
  // Check sub-format-guide by tag first
  if (tags && tags.length) {
    for (const tag of tags) {
      const t = slugify(tag);
      const subDir = path.join(guideDir, t);
      if (fs.existsSync(path.join(subDir, "memory.md"))) return subDir;
    }
  }
  if (fs.existsSync(path.join(guideDir, "memory.md"))) return guideDir;
  return null;
}

function copySectionTemplates(kind, tags, targetDir) {
  const guideDir = findFormatGuideDir(kind, tags);
  if (!guideDir) return [];
  const sectionFiles = fs.readdirSync(guideDir).filter(f => f !== "memory.md" && f.endsWith(".md") && !fs.statSync(path.join(guideDir, f)).isDirectory());
  return sectionFiles.map(f => {
    const src = path.join(guideDir, f);
    const dest = path.join(targetDir, f);
    fs.copyFileSync(src, dest);
    return { file: f, path: rel(dest), ...parseSectionFilename(f) };
  });
}

export function getKinds() {
  if (cacheReady) { const k = new Set(); for (const e of cache.values()) k.add(e.kind); return [...k].sort(); }
  return [...knownKinds].sort();
}

export function stats() {
  const counts = {};
  for (const e of cache.values()) counts[e.kind] = (counts[e.kind] || 0) + 1;
  return { total: cache.size, kinds: counts };
}

export function allTags() {
  const tc = {};
  for (const e of cache.values()) for (const t of e.tags) tc[t] = (tc[t] || 0) + 1;
  return tc;
}

export function getEntry(memFile) { return cache.get(memFile) || null; }

export function readContent(memFile) {
  const af = abs(memFile);
  if (!fs.existsSync(af)) return null;
  return matter(fs.readFileSync(af, "utf-8")).content.trim();
}

export function recallAgentMemory(agentName) {
  const slug = slugify(agentName);
  const absDir = path.join(DOCS_DIR, "agent-memories", slug);
  const absFile = path.join(absDir, "memory.md");
  const memFile = rel(absFile);
  if (!fs.existsSync(absFile)) {
    fs.mkdirSync(absDir, { recursive: true });
    fs.writeFileSync(absFile, matter.stringify("", {
      title: `${agentName} learnings`, summary: `Technical learnings for ${agentName}`,
      kind: "agent-memories", tags: ["agent", slug], refs: [], by: agentName, at: new Date().toISOString(),
    }), "utf-8");
    loadEntry(absDir);
  }
  const content = readContent(memFile) || "";
  return { content, hasContent: content.trim().length > 0, memFile, type: "agent" };
}

export function recallDeveloperProfile(username) {
  const slug = slugify(username);
  const absDir = path.join(DOCS_DIR, "developer-profiles", slug);
  const absFile = path.join(absDir, "memory.md");
  const memFile = rel(absFile);
  if (!fs.existsSync(absFile)) {
    fs.mkdirSync(absDir, { recursive: true });
    fs.writeFileSync(absFile, matter.stringify("", {
      title: `${username} profile`, summary: `Communication patterns and preferences for ${username}`,
      kind: "developer-profiles", tags: ["developer", slug], refs: [], by: username, at: new Date().toISOString(),
    }), "utf-8");
    loadEntry(absDir);
  }
  const content = readContent(memFile) || "";
  return { content, hasContent: content.trim().length > 0, memFile, type: "developer" };
}
