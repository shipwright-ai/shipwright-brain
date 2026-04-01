/**
 * Local embeddings using @xenova/transformers (all-MiniLM-L6-v2).
 * CoreML on Apple Silicon, CPU fallback elsewhere.
 * Model auto-downloads on first use (~80MB, cached in ~/.cache/huggingface/).
 */

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";
export const DIMENSIONS = 384;

let _pipeline = null;
let _initialized = false;

async function initOnnxRuntime() {
  if (_initialized) return;
  if (process.platform === "darwin") {
    try {
      const { executionProviders } = await import(
        "@xenova/transformers/src/backends/onnx.js"
      );
      if (!executionProviders.includes("coreml")) {
        executionProviders.unshift("coreml");
        console.error("[embeddings] CoreML enabled");
      }
    } catch (e) {
      console.error("[embeddings] CoreML unavailable, using CPU:", e.message);
    }
  }
  _initialized = true;
}

async function getPipeline() {
  if (_pipeline) return _pipeline;
  await initOnnxRuntime();
  const { pipeline } = await import("@xenova/transformers");
  console.error(`[embeddings] Loading ${MODEL_NAME}...`);
  _pipeline = await pipeline("feature-extraction", MODEL_NAME, { quantized: true });
  console.error("[embeddings] Model loaded");
  return _pipeline;
}

export async function embed(text) {
  const pipe = await getPipeline();
  const output = await pipe(text, { pooling: "mean", normalize: true });
  return Array.from(output.data).slice(0, DIMENSIONS);
}

export async function embedBatch(texts) {
  if (!texts.length) return [];
  const pipe = await getPipeline();
  const results = [];
  for (const text of texts) {
    const output = await pipe(text, { pooling: "mean", normalize: true });
    results.push(Array.from(output.data).slice(0, DIMENSIONS));
  }
  return results;
}

/** Pre-download the model so first search isn't slow. */
export async function warmup() {
  await getPipeline();
}

export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
