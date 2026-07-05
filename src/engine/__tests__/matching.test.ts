import { describe, it, expect } from 'vitest'
import { maximumWeightMatching } from '../matching'

type Edge = [number, number, number]

function matchingWeight(edges: Edge[], mate: number[]): { cardinality: number; weight: number } {
  let cardinality = 0
  let weight = 0
  for (const [i, j, w] of edges) {
    if (mate[i] === j) {
      cardinality++
      weight += w
    }
  }
  return { cardinality, weight }
}

// Exhaustive search over all matchings, maximizing (cardinality, weight)
// lexicographically when maxCardinality, otherwise plain weight.
function bruteForce(nvertex: number, edges: Edge[], maxCardinality: boolean): { cardinality: number; weight: number } {
  const incident: [number, number][][] = Array.from({ length: nvertex }, () => [])
  edges.forEach(([i, j, w]) => {
    incident[i].push([j, w])
  })
  const used = new Array(nvertex).fill(false)
  let best = { cardinality: 0, weight: -Infinity }

  const better = (c: number, w: number) =>
    maxCardinality
      ? c > best.cardinality || (c === best.cardinality && w > best.weight)
      : w > best.weight

  const rec = (v: number, cardinality: number, weight: number) => {
    if (v === nvertex) {
      if (better(cardinality, weight)) best = { cardinality, weight }
      return
    }
    if (used[v]) {
      rec(v + 1, cardinality, weight)
      return
    }
    rec(v + 1, cardinality, weight)
    for (const [j, w] of incident[v]) {
      if (j > v && !used[j]) {
        used[j] = true
        rec(v + 1, cardinality + 1, weight + w)
        used[j] = false
      }
    }
  }
  rec(0, 0, 0)
  if (best.weight === -Infinity) best = { cardinality: 0, weight: 0 }
  return best
}

function assertValidMatching(edges: Edge[], mate: number[]) {
  const edgeSet = new Set(edges.map(([i, j]) => `${Math.min(i, j)}|${Math.max(i, j)}`))
  mate.forEach((m, v) => {
    if (m === -1) return
    expect(mate[m]).toBe(v)
    expect(edgeSet.has(`${Math.min(v, m)}|${Math.max(v, m)}`)).toBe(true)
  })
}

describe('maximumWeightMatching — Referenzfälle (mwmatching.py-Testsuite)', () => {
  it('leerer Graph', () => {
    expect(maximumWeightMatching([])).toEqual([])
  })

  it('einzelne Kante', () => {
    expect(maximumWeightMatching([[0, 1, 1]])).toEqual([1, 0])
  })

  it('nimmt die schwerere von zwei Kanten', () => {
    expect(maximumWeightMatching([[1, 2, 10], [2, 3, 11]])).toEqual([-1, -1, 3, 2])
  })

  it('mittlere Kante schlägt zwei leichte', () => {
    expect(maximumWeightMatching([[1, 2, 5], [2, 3, 11], [3, 4, 5]])).toEqual([-1, -1, 3, 2, -1])
  })

  it('maxCardinality erzwingt volles Matching', () => {
    expect(maximumWeightMatching([[1, 2, 5], [2, 3, 11], [3, 4, 5]], true)).toEqual([-1, 2, 1, 4, 3])
  })

  it('negative Gewichte', () => {
    const edges: Edge[] = [[1, 2, 2], [1, 3, -2], [2, 3, 1], [2, 4, -1], [3, 4, -6]]
    expect(maximumWeightMatching(edges)).toEqual([-1, 2, 1, -1, -1])
    expect(maximumWeightMatching(edges, true)).toEqual([-1, 3, 4, 1, 2])
  })

  it('S-Blossom mit Augmentierung', () => {
    expect(maximumWeightMatching([[1, 2, 8], [1, 3, 9], [2, 3, 10], [3, 4, 7]]))
      .toEqual([-1, 2, 1, 4, 3])
    expect(maximumWeightMatching([[1, 2, 8], [1, 3, 9], [2, 3, 10], [3, 4, 7], [1, 6, 5], [4, 5, 6]]))
      .toEqual([-1, 6, 3, 2, 5, 4, 1])
  })

  it('S-Blossom, Umlabelung zu T-Blossom', () => {
    expect(maximumWeightMatching([[1, 2, 9], [1, 3, 8], [2, 3, 10], [1, 4, 5], [4, 5, 4], [1, 6, 3]]))
      .toEqual([-1, 6, 3, 2, 5, 4, 1])
    expect(maximumWeightMatching([[1, 2, 9], [1, 3, 8], [2, 3, 10], [1, 4, 5], [4, 5, 3], [3, 6, 4]]))
      .toEqual([-1, 2, 1, 6, 5, 4, 3])
  })

  it('verschachtelter S-Blossom mit Augmentierung', () => {
    expect(maximumWeightMatching([[1, 2, 9], [1, 3, 9], [2, 3, 10], [2, 4, 8], [3, 5, 8], [4, 5, 10], [5, 6, 6]]))
      .toEqual([-1, 3, 4, 1, 2, 6, 5])
  })
})

describe('maximumWeightMatching — randomisierter Brute-Force-Vergleich', () => {
  it('liefert auf zufälligen Graphen immer das Optimum', () => {
    for (let trial = 0; trial < 300; trial++) {
      const n = 4 + Math.floor(Math.random() * 5) // 4..8 Knoten
      const maxCardinality = trial % 2 === 0
      const edges: Edge[] = []
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (Math.random() < 0.75) {
            edges.push([i, j, Math.floor(Math.random() * 51) - 20]) // -20..30
          }
        }
      }
      if (edges.length === 0) continue

      const mate = maximumWeightMatching(edges, maxCardinality)
      assertValidMatching(edges, mate)

      const got = matchingWeight(edges, mate)
      const want = bruteForce(n, edges, maxCardinality)
      const context = `n=${n}, maxCard=${maxCardinality}, edges=${JSON.stringify(edges)}`
      if (maxCardinality) {
        expect(got.cardinality, context).toBe(want.cardinality)
      }
      expect(got.weight, context).toBe(want.weight)
    }
  })

  it('findet auf vollständigen Graphen mit positiven Gewichten stets ein perfektes Matching', () => {
    for (let trial = 0; trial < 50; trial++) {
      const n = 2 * (2 + Math.floor(Math.random() * 4)) // 4..10, gerade
      const edges: Edge[] = []
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          edges.push([i, j, 1 + Math.floor(Math.random() * 1000)])
        }
      }
      const mate = maximumWeightMatching(edges, true)
      assertValidMatching(edges, mate)
      expect(mate.every(m => m !== -1)).toBe(true)
    }
  })
})
