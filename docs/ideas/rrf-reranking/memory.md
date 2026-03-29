---
title: RRF reranking for hybrid search
summary: Combine BM25 text search + vector search with reciprocal rank fusion for best results
kind: ideas
tags: [brain, search, bm25, rrf, embeddings]
refs: [docs/ideas/embeddings-search/memory.md]
by: developer
at: 2025-03-28T00:00:00.000Z
---

# Idea: RRF reranking

After embeddings are added, combine:
1. BM25/text search → ranked results
2. Vector/semantic search → ranked results
3. RRF (Reciprocal Rank Fusion) → merged ranking

Had this working in v1 with a small LLM matching query against found content for highlighting.
For v2: start with just embeddings, add BM25 + RRF when search quality needs improvement.
