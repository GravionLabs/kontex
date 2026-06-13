export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function topK(
  queryVec: number[],
  items: Array<{ sourceId: number; vector: number[] }>,
  k: number,
): Array<{ sourceId: number; score: number }> {
  const scored = items
    .map((item) => ({ sourceId: item.sourceId, score: cosineSimilarity(queryVec, item.vector) }))
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}
