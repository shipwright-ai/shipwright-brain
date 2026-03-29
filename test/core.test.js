import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as brain from "../src/core.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DOCS = path.join(__dirname, ".test-docs");
const TEST_ROOT = __dirname;

function cleanup() {
  if (fs.existsSync(TEST_DOCS)) fs.rmSync(TEST_DOCS, { recursive: true });
  // Clean up cache files
  const cacheDir = path.join(__dirname, "..", ".cache");
  if (fs.existsSync(cacheDir)) {
    for (const f of fs.readdirSync(cacheDir)) {
      if (f.endsWith(".jsonl")) fs.rmSync(path.join(cacheDir, f));
    }
  }
}

describe("Brain core", () => {
  before(() => {
    cleanup();
    brain.init(TEST_DOCS, TEST_ROOT);
    // Wait for async init
    return new Promise(r => setTimeout(r, 500));
  });

  after(() => cleanup());

  describe("create and retrieve", () => {
    it("creates a memory and returns memFile", () => {
      const mf = brain.create({ title: "Test idea", summary: "A test", content: "- [ ] step one\n- [ ] step two", kind: "ideas", by: "test" });
      assert.ok(mf);
      assert.ok(mf.endsWith("memory.md"));
    });

    it("retrieves created memory from cache", () => {
      const r = brain.search({ queries: ["Test idea"] });
      assert.strictEqual(r.total, 1);
      assert.strictEqual(r.memories[0].title, "Test idea");
    });

    it("reads content back", () => {
      const r = brain.search({ queries: ["Test idea"] });
      const content = brain.readContent(r.memories[0].memory_file);
      assert.ok(content.includes("step one"));
    });
  });

  describe("checkbox progress", () => {
    it("detects not-started progress", () => {
      const r = brain.search({ queries: ["Test idea"] });
      assert.ok(r.memories[0].progress);
      assert.strictEqual(r.memories[0].progress.checked, 0);
      assert.strictEqual(r.memories[0].progress.total, 2);
      assert.strictEqual(r.memories[0].progress.status, "not-started");
    });

    it("filters by status", () => {
      const r = brain.search({ queries: ["Test idea"], status: "not-started" });
      assert.strictEqual(r.total, 1);
      const r2 = brain.search({ queries: ["Test idea"], status: "done" });
      assert.strictEqual(r2.total, 0);
    });

    it("updates progress when content changes", () => {
      const r = brain.search({ queries: ["Test idea"] });
      const mf = r.memories[0].memory_file;
      const absFile = path.resolve(TEST_ROOT, mf);
      const raw = fs.readFileSync(absFile, "utf-8");
      fs.writeFileSync(absFile, raw.replace("- [ ] step one", "- [x] step one"), "utf-8");
      // Trigger reload
      const absDir = path.dirname(absFile);
      // Re-init to pick up change
      brain.init(TEST_DOCS, TEST_ROOT);
      return new Promise(r2 => setTimeout(() => {
        const entry = brain.getEntry(mf);
        assert.strictEqual(entry.progress.checked, 1);
        assert.strictEqual(entry.progress.status, "in-progress");
        r2();
      }, 500));
    });
  });

  describe("browse", () => {
    it("lists kinds at root level", () => {
      const r = brain.browse(null);
      assert.strictEqual(r.level, "root");
      assert.ok(r.kinds.length > 0);
    });

    it("lists memories in a kind", () => {
      const r = brain.browse("ideas");
      assert.strictEqual(r.level, "kind");
      assert.ok(r.total > 0);
    });

    it("returns pagination metadata", () => {
      const r = brain.browse("ideas");
      assert.ok("total" in r);
      assert.ok("limit" in r);
      assert.ok("offset" in r);
      assert.ok("hasMore" in r);
    });

    it("returns facets on first page", () => {
      const r = brain.browse("ideas");
      assert.ok(r.facets);
      assert.ok(r.facets.tags);
      assert.ok(r.facets.status);
    });
  });

  describe("tags", () => {
    it("creates memory with tags", () => {
      brain.create({ title: "Tagged memory", summary: "Has tags", content: "", kind: "ideas", tags: ["auth", "urgent"], by: "test" });
      const r = brain.search({ tags: ["auth"] });
      assert.strictEqual(r.total, 1);
      assert.strictEqual(r.memories[0].title, "Tagged memory");
    });

    it("allTags returns tag counts", () => {
      const tags = brain.allTags();
      assert.ok(tags.auth >= 1);
      assert.ok(tags.urgent >= 1);
    });
  });

  describe("refs", () => {
    it("creates bidirectional refs", () => {
      const mf1 = brain.create({ title: "Ref source", summary: "Links to target", content: "", kind: "ideas", by: "test" });
      const mf2 = brain.create({ title: "Ref target", summary: "Linked from source", content: "", kind: "ideas", refs: [mf1], by: "test" });

      // Wait for sync
      return new Promise(r => setTimeout(() => {
        const e1 = brain.getEntry(mf1);
        const e2 = brain.getEntry(mf2);
        assert.ok(e2.refs.includes(mf1), "target should ref source");
        assert.ok(e1.refs.includes(mf2), "source should have back-ref to target");
        r();
      }, 200));
    });
  });

  describe("sub-memories and aggregate progress", () => {
    it("creates parent with children and aggregates progress", () => {
      const parent = brain.create({ title: "Epic task", summary: "Parent", content: "- [ ] overview", kind: "work", by: "test" });
      brain.create({ title: "Sub task 1", summary: "Child 1", content: "- [x] done thing", parent, by: "test" });
      brain.create({ title: "Sub task 2", summary: "Child 2", content: "- [ ] pending thing", parent, by: "test" });

      return new Promise(r => setTimeout(() => {
        const entry = brain.getEntry(parent);
        assert.ok(entry.children.length >= 2);
        // Aggregate should include parent (1 unchecked) + child1 (1 checked) + child2 (1 unchecked)
        assert.ok(entry.aggregateProgress);
        assert.strictEqual(entry.aggregateProgress.checked, 1);
        assert.strictEqual(entry.aggregateProgress.total, 3);
        assert.strictEqual(entry.aggregateProgress.status, "in-progress");
        r();
      }, 300));
    });
  });

  describe("delete", () => {
    it("deletes a memory and cleans up", () => {
      const mf = brain.create({ title: "To delete", summary: "Will be removed", content: "", kind: "ideas", by: "test" });
      const before = brain.stats().total;
      const ok = brain.remove(mf);
      assert.ok(ok);
      assert.strictEqual(brain.stats().total, before - 1);
      assert.strictEqual(brain.getEntry(mf), null);
    });
  });

  describe("disk cache", () => {
    it("cache file exists after operations", () => {
      const cacheDir = path.join(__dirname, "..", ".cache");
      const files = fs.readdirSync(cacheDir).filter(f => f.endsWith(".jsonl"));
      assert.ok(files.length > 0, "should have at least one cache file");
    });

    it("cache file has correct structure", () => {
      const cacheDir = path.join(__dirname, "..", ".cache");
      const files = fs.readdirSync(cacheDir).filter(f => f.endsWith(".jsonl"));
      const content = fs.readFileSync(path.join(cacheDir, files[0]), "utf-8");
      const lines = content.trim().split("\n");
      const meta = JSON.parse(lines[0]);
      assert.ok(meta._meta);
      assert.ok(meta.lastUpdate);
      assert.ok(lines.length > 1, "should have cached entries");
    });
  });

  describe("format guides", () => {
    it("returns default format for unknown kind", () => {
      const guide = brain.getFormatGuide("unknown-kind-xyz");
      assert.ok(guide.includes("Why:"));
      assert.ok(guide.includes("What:"));
    });
  });

  describe("duplicate detection", () => {
    it("detects near-identical memories as duplicates", async () => {
      // Create the first memory
      brain.create({
        title: "MemoryCard compact layout for narrow containers via container queries",
        summary: "Cards in board columns and dashboard are too wide — use CSS container queries to switch to compact layout (stacked, smaller text) when container is narrow",
        content: "",
        kind: "ideas",
        tags: ["brain-ui", "ux", "improvement"],
        by: "test",
      });

      // Wait for embedding to compute
      await new Promise(r => setTimeout(r, 3000));

      // Check if second similar memory is detected
      const { duplicates, related } = await brain.findSimilar(
        "Dashboard and board layout improvements",
        "Homepage dashboard and kanban board need better layout — cards too wide, mobile responsiveness, consider horizontal scroll for board columns"
      );

      // Should be detected as either duplicate or related
      const found = [...duplicates, ...related];
      assert.ok(found.length > 0, "Should find similar existing memory");

      const match = found[0];
      assert.ok(match.title.includes("MemoryCard") || match.title.includes("compact"), "Should match the compact layout memory");
      assert.ok(match.score >= 0.6, `Score ${match.score} should be >= 0.6 for clearly related memories`);

      console.log(`  Similarity score: ${match.score} (${match.score >= 0.9 ? "duplicate" : "related"})`);
    });

    it("does not flag unrelated memories as duplicates", async () => {
      const { duplicates, related } = await brain.findSimilar(
        "Database migration strategy",
        "Plan for migrating from SQLite to PostgreSQL with zero downtime"
      );

      // The compact layout memory should NOT appear as duplicate
      assert.strictEqual(duplicates.length, 0, "Unrelated memory should not be a duplicate");
    });
  });

  describe("semantic search", () => {
    it("finds memories by meaning not just keywords", async () => {
      // "narrow cards" should find the compact layout memory even though
      // the exact phrase doesn't appear
      const r = await brain.semanticSearch({ query: "narrow cards", limit: 5 });
      const titles = r.memories.map(m => m.title);
      const found = titles.some(t => t.includes("MemoryCard") || t.includes("compact"));
      assert.ok(found, `Should find compact layout memory via semantic search. Got: ${titles.join(", ")}`);
    });
  });
});
