// Maximum-weight matching in general graphs via the blossom algorithm
// (Galil 1986, O(V³)), ported from the classic mwmatching.py reference
// implementation. Vertices are 0-based integers; edges are [i, j, weight]
// triples with i !== j. Returns mate[v] = matched partner of v, or -1.
//
// With maxCardinality = true the result is a maximum-cardinality matching
// of maximum weight, which on a complete graph with an even vertex count
// is always a perfect matching — this is what Swiss pairing relies on.
export function maximumWeightMatching(
  edges: ReadonlyArray<readonly [number, number, number]>,
  maxCardinality = false
): number[] {
  if (edges.length === 0) return []

  const nedge = edges.length
  let nvertex = 0
  for (const [i, j] of edges) {
    if (i >= nvertex) nvertex = i + 1
    if (j >= nvertex) nvertex = j + 1
  }

  // endpoint[p] is the vertex at endpoint p; edge k owns endpoints 2k and 2k+1.
  const endpoint: number[] = []
  for (const [i, j] of edges) endpoint.push(i, j)

  // neighbend[v] lists the remote endpoints of all edges incident to v.
  const neighbend: number[][] = Array.from({ length: nvertex }, () => [])
  edges.forEach(([i, j], k) => {
    neighbend[i].push(2 * k + 1)
    neighbend[j].push(2 * k)
  })

  let maxweight = 0
  for (const [, , w] of edges) if (w > maxweight) maxweight = w

  // mate[v] = endpoint of the matched edge at v, or -1.
  const mate: number[] = new Array(nvertex).fill(-1)

  // Indices 0..nvertex-1 are vertices, nvertex..2*nvertex-1 are blossoms.
  // label: 0 = free, 1 = S, 2 = T (5 marks "visited" during scanBlossom).
  const label: number[] = new Array(2 * nvertex).fill(0)
  const labelend: number[] = new Array(2 * nvertex).fill(-1)
  const inblossom: number[] = Array.from({ length: nvertex }, (_, i) => i)
  const blossomparent: number[] = new Array(2 * nvertex).fill(-1)
  const blossomchilds: (number[] | null)[] = new Array(2 * nvertex).fill(null)
  const blossombase: number[] = new Array(2 * nvertex).fill(-1)
  for (let i = 0; i < nvertex; i++) blossombase[i] = i
  const blossomendps: (number[] | null)[] = new Array(2 * nvertex).fill(null)
  const bestedge: number[] = new Array(2 * nvertex).fill(-1)
  const blossombestedges: (number[] | null)[] = new Array(2 * nvertex).fill(null)
  const unusedblossoms: number[] = []
  for (let i = nvertex; i < 2 * nvertex; i++) unusedblossoms.push(i)
  const dualvar: number[] = new Array(2 * nvertex).fill(0)
  for (let i = 0; i < nvertex; i++) dualvar[i] = maxweight
  const allowedge: boolean[] = new Array(nedge).fill(false)
  const queue: number[] = []

  const slack = (k: number) =>
    dualvar[edges[k][0]] + dualvar[edges[k][1]] - 2 * edges[k][2]

  // Python-style negative indexing used by the blossom rotation loops.
  const at = <T>(arr: T[], idx: number): T => arr[idx < 0 ? idx + arr.length : idx]

  function* blossomLeaves(b: number): Generator<number> {
    if (b < nvertex) {
      yield b
    } else {
      for (const t of blossomchilds[b]!) {
        if (t < nvertex) yield t
        else yield* blossomLeaves(t)
      }
    }
  }

  function assignLabel(w: number, t: number, p: number): void {
    const b = inblossom[w]
    label[w] = t
    label[b] = t
    labelend[w] = p
    labelend[b] = p
    bestedge[w] = -1
    bestedge[b] = -1
    if (t === 1) {
      for (const leaf of blossomLeaves(b)) queue.push(leaf)
    } else if (t === 2) {
      const base = blossombase[b]
      assignLabel(endpoint[mate[base]], 1, mate[base] ^ 1)
    }
  }

  // Trace back from both ends of edge (v, w); returns the base of the first
  // common ancestor blossom, or -1 if the paths reach two different roots
  // (meaning the edge closes an augmenting path).
  function scanBlossom(v: number, w: number): number {
    const path: number[] = []
    let base = -1
    while (v !== -1 || w !== -1) {
      let b = inblossom[v]
      if (label[b] & 4) {
        base = blossombase[b]
        break
      }
      path.push(b)
      label[b] = 5
      if (labelend[b] === -1) {
        v = -1
      } else {
        v = endpoint[labelend[b]]
        b = inblossom[v]
        v = endpoint[labelend[b]]
      }
      if (w !== -1) {
        const tmp = v
        v = w
        w = tmp
      }
    }
    for (const b of path) label[b] = 1
    return base
  }

  function addBlossom(base: number, k: number): void {
    let [v, w] = edges[k]
    const bb = inblossom[base]
    let bv = inblossom[v]
    let bw = inblossom[w]
    const b = unusedblossoms.pop()!
    blossombase[b] = base
    blossomparent[b] = -1
    blossomparent[bb] = b

    const path: number[] = []
    const endps: number[] = []
    while (bv !== bb) {
      blossomparent[bv] = b
      path.push(bv)
      endps.push(labelend[bv])
      v = endpoint[labelend[bv]]
      bv = inblossom[v]
    }
    path.push(bb)
    path.reverse()
    endps.reverse()
    endps.push(2 * k)
    while (bw !== bb) {
      blossomparent[bw] = b
      path.push(bw)
      endps.push(labelend[bw] ^ 1)
      w = endpoint[labelend[bw]]
      bw = inblossom[w]
    }

    blossomchilds[b] = path
    blossomendps[b] = endps
    label[b] = 1
    labelend[b] = labelend[bb]
    dualvar[b] = 0
    for (const leaf of blossomLeaves(b)) {
      if (label[inblossom[leaf]] === 2) queue.push(leaf)
      inblossom[leaf] = b
    }

    const bestedgeto: number[] = new Array(2 * nvertex).fill(-1)
    for (const child of path) {
      const nblists: number[][] =
        blossombestedges[child] === null
          ? [...blossomLeaves(child)].map(leaf => neighbend[leaf].map(p => p >> 1))
          : [blossombestedges[child]!]
      for (const nblist of nblists) {
        for (const edgeK of nblist) {
          const [ei, ej] = edges[edgeK]
          const j = inblossom[ej] === b ? ei : ej
          const bj = inblossom[j]
          if (
            bj !== b &&
            label[bj] === 1 &&
            (bestedgeto[bj] === -1 || slack(edgeK) < slack(bestedgeto[bj]))
          ) {
            bestedgeto[bj] = edgeK
          }
        }
      }
      blossombestedges[child] = null
      bestedge[child] = -1
    }
    blossombestedges[b] = bestedgeto.filter(e => e !== -1)
    bestedge[b] = -1
    for (const edgeK of blossombestedges[b]!) {
      if (bestedge[b] === -1 || slack(edgeK) < slack(bestedge[b])) bestedge[b] = edgeK
    }
  }

  function expandBlossom(b: number, endstage: boolean): void {
    for (const s of blossomchilds[b]!) {
      blossomparent[s] = -1
      if (s < nvertex) {
        inblossom[s] = s
      } else if (endstage && dualvar[s] === 0) {
        expandBlossom(s, endstage)
      } else {
        for (const leaf of blossomLeaves(s)) inblossom[leaf] = s
      }
    }

    if (!endstage && label[b] === 2) {
      // The expanded T-blossom's sub-blossoms on the path from the entry
      // child to the base must be relabeled to keep the alternating tree.
      const entrychild = inblossom[endpoint[labelend[b] ^ 1]]
      const childs = blossomchilds[b]!
      const endps = blossomendps[b]!
      let j = childs.indexOf(entrychild)
      let jstep: number
      let endptrick: number
      if (j & 1) {
        j -= childs.length
        jstep = 1
        endptrick = 0
      } else {
        jstep = -1
        endptrick = 1
      }
      let p = labelend[b]
      while (j !== 0) {
        label[endpoint[p ^ 1]] = 0
        label[endpoint[at(endps, j - endptrick) ^ endptrick ^ 1]] = 0
        assignLabel(endpoint[p ^ 1], 2, p)
        allowedge[at(endps, j - endptrick) >> 1] = true
        j += jstep
        p = at(endps, j - endptrick) ^ endptrick
        allowedge[p >> 1] = true
        j += jstep
      }
      const bv = at(childs, j)
      label[endpoint[p ^ 1]] = 2
      label[bv] = 2
      labelend[endpoint[p ^ 1]] = p
      labelend[bv] = p
      bestedge[bv] = -1
      j += jstep
      while (at(childs, j) !== entrychild) {
        const bw = at(childs, j)
        if (label[bw] === 1) {
          j += jstep
          continue
        }
        let labeledLeaf = -1
        for (const leaf of blossomLeaves(bw)) {
          if (label[leaf] !== 0) {
            labeledLeaf = leaf
            break
          }
        }
        if (labeledLeaf !== -1) {
          label[labeledLeaf] = 0
          label[endpoint[mate[blossombase[bw]]]] = 0
          assignLabel(labeledLeaf, 2, labelend[labeledLeaf])
        }
        j += jstep
      }
    }

    label[b] = -1
    labelend[b] = -1
    blossomchilds[b] = null
    blossomendps[b] = null
    blossombase[b] = -1
    blossombestedges[b] = null
    bestedge[b] = -1
    unusedblossoms.push(b)
  }

  // Swap matched/unmatched edges inside blossom b so that vertex v becomes
  // the base, propagating recursively into sub-blossoms.
  function augmentBlossom(b: number, v: number): void {
    let t = v
    while (blossomparent[t] !== b) t = blossomparent[t]
    if (t >= nvertex) augmentBlossom(t, v)

    const childs = blossomchilds[b]!
    const endps = blossomendps[b]!
    const i = childs.indexOf(t)
    let j = i
    let jstep: number
    let endptrick: number
    if (i & 1) {
      j -= childs.length
      jstep = 1
      endptrick = 0
    } else {
      jstep = -1
      endptrick = 1
    }
    while (j !== 0) {
      j += jstep
      let tt = at(childs, j)
      const p = at(endps, j - endptrick) ^ endptrick
      if (tt >= nvertex) augmentBlossom(tt, endpoint[p])
      j += jstep
      tt = at(childs, j)
      if (tt >= nvertex) augmentBlossom(tt, endpoint[p ^ 1])
      mate[endpoint[p]] = p ^ 1
      mate[endpoint[p ^ 1]] = p
    }
    blossomchilds[b] = childs.slice(i).concat(childs.slice(0, i))
    blossomendps[b] = endps.slice(i).concat(endps.slice(0, i))
    blossombase[b] = blossombase[blossomchilds[b]![0]]
  }

  // Flip the matching along the augmenting path through edge k.
  function augmentMatching(k: number): void {
    const [v, w] = edges[k]
    const starts: [number, number][] = [
      [v, 2 * k + 1],
      [w, 2 * k],
    ]
    for (const [sInit, pInit] of starts) {
      let s = sInit
      let p = pInit
      for (;;) {
        const bs = inblossom[s]
        if (bs >= nvertex) augmentBlossom(bs, s)
        mate[s] = p
        if (labelend[bs] === -1) break
        const t = endpoint[labelend[bs]]
        const bt = inblossom[t]
        s = endpoint[labelend[bt]]
        const j = endpoint[labelend[bt] ^ 1]
        if (bt >= nvertex) augmentBlossom(bt, j)
        mate[j] = labelend[bt]
        p = labelend[bt] ^ 1
      }
    }
  }

  // Each stage augments the matching by one edge (or proves it maximal).
  for (let stage = 0; stage < nvertex; stage++) {
    label.fill(0)
    bestedge.fill(-1)
    blossombestedges.fill(null)
    allowedge.fill(false)
    queue.length = 0

    for (let v = 0; v < nvertex; v++) {
      if (mate[v] === -1 && label[inblossom[v]] === 0) assignLabel(v, 1, -1)
    }

    let augmented = false
    for (;;) {
      while (queue.length > 0 && !augmented) {
        const v = queue.pop()!
        for (const p of neighbend[v]) {
          const k = p >> 1
          const w = endpoint[p]
          if (inblossom[v] === inblossom[w]) continue
          let kslack = 0
          if (!allowedge[k]) {
            kslack = slack(k)
            if (kslack <= 0) allowedge[k] = true
          }
          if (allowedge[k]) {
            if (label[inblossom[w]] === 0) {
              assignLabel(w, 2, p ^ 1)
            } else if (label[inblossom[w]] === 1) {
              const base = scanBlossom(v, w)
              if (base >= 0) {
                addBlossom(base, k)
              } else {
                augmentMatching(k)
                augmented = true
                break
              }
            } else if (label[w] === 0) {
              label[w] = 2
              labelend[w] = p ^ 1
            }
          } else if (label[inblossom[w]] === 1) {
            const b = inblossom[v]
            if (bestedge[b] === -1 || kslack < slack(bestedge[b])) bestedge[b] = k
          } else if (label[w] === 0) {
            if (bestedge[w] === -1 || kslack < slack(bestedge[w])) bestedge[w] = k
          }
        }
      }
      if (augmented) break

      // No augmenting path via allowed edges: compute the dual adjustment.
      let deltatype = -1
      let delta = 0
      let deltaedge = -1
      let deltablossom = -1

      if (!maxCardinality) {
        deltatype = 1
        delta = Math.max(0, Math.min(...dualvar.slice(0, nvertex)))
      }

      for (let v = 0; v < nvertex; v++) {
        if (label[inblossom[v]] === 0 && bestedge[v] !== -1) {
          const d = slack(bestedge[v])
          if (deltatype === -1 || d < delta) {
            delta = d
            deltatype = 2
            deltaedge = bestedge[v]
          }
        }
      }
      for (let b = 0; b < 2 * nvertex; b++) {
        if (blossomparent[b] === -1 && label[b] === 1 && bestedge[b] !== -1) {
          const d = slack(bestedge[b]) / 2
          if (deltatype === -1 || d < delta) {
            delta = d
            deltatype = 3
            deltaedge = bestedge[b]
          }
        }
      }
      for (let b = nvertex; b < 2 * nvertex; b++) {
        if (
          blossombase[b] >= 0 &&
          blossomparent[b] === -1 &&
          label[b] === 2 &&
          (deltatype === -1 || dualvar[b] < delta)
        ) {
          delta = dualvar[b]
          deltatype = 4
          deltablossom = b
        }
      }
      if (deltatype === -1) {
        // Only reachable with maxCardinality: matching is already maximal.
        deltatype = 1
        delta = Math.max(0, Math.min(...dualvar.slice(0, nvertex)))
      }

      for (let v = 0; v < nvertex; v++) {
        const lbl = label[inblossom[v]]
        if (lbl === 1) dualvar[v] -= delta
        else if (lbl === 2) dualvar[v] += delta
      }
      for (let b = nvertex; b < 2 * nvertex; b++) {
        if (blossombase[b] >= 0 && blossomparent[b] === -1) {
          if (label[b] === 1) dualvar[b] += delta
          else if (label[b] === 2) dualvar[b] -= delta
        }
      }

      if (deltatype === 1) {
        break
      } else if (deltatype === 2) {
        allowedge[deltaedge] = true
        let [i] = edges[deltaedge]
        if (label[inblossom[i]] === 0) i = edges[deltaedge][1]
        queue.push(i)
      } else if (deltatype === 3) {
        allowedge[deltaedge] = true
        queue.push(edges[deltaedge][0])
      } else {
        expandBlossom(deltablossom, false)
      }
    }

    if (!augmented) break

    for (let b = nvertex; b < 2 * nvertex; b++) {
      if (
        blossomparent[b] === -1 &&
        blossombase[b] >= 0 &&
        label[b] === 1 &&
        dualvar[b] === 0
      ) {
        expandBlossom(b, true)
      }
    }
  }

  const result: number[] = new Array(nvertex).fill(-1)
  for (let v = 0; v < nvertex; v++) {
    if (mate[v] >= 0) result[v] = endpoint[mate[v]]
  }
  return result
}
