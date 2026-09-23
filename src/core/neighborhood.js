// core/neighborhood.js
// BFS multi-seed sul grafo: calcola l'intorno raggiungibile da uno o più
// nodi di partenza entro un raggio massimo, rispettando nodi bloccati e
// la modalità di attraversamento delle "label" (agenzie).
//
// Funzione pura: nessuna dipendenza da DOM/canvas/stato applicativo.

/**
 * @param {object} opts
 * @param {Map<number, number[]>} opts.adj       mappa id -> vicini
 * @param {(id:number)=>string} opts.typeOf      restituisce il tipo del nodo
 * @param {Iterable<number>} opts.seeds          nodi di partenza
 * @param {Set<number>} opts.blocked             nodi da non attraversare/mostrare
 * @param {number} opts.radius                   distanza massima (in passi)
 * @param {'through'|'endpoint'|'hide'} opts.labelMode
 *        'through'  le label si attraversano come qualsiasi altro nodo
 *        'endpoint' le label compaiono ma non si espandono oltre
 *        'hide'     le label non compaiono e non si attraversano
 *
 * @returns {{
 *   hop: Map<number, number>,              id -> distanza minima da una partenza
 *   reachedBy: Map<number, number[]>,      id -> lista delle partenze che lo raggiungono
 *   edges: Array<[number, number]>,        sottografo indotto sui nodi trovati
 * }}
 */
export function computeNeighborhood({ adj, typeOf, seeds, blocked, radius, labelMode }) {
  const isLabel = id => typeOf(id) === 'label';
  const hop = new Map();
  const reachedBy = new Map();

  for (const s of seeds) {
    const dist = new Map([[s, 0]]);
    let frontier = [s];
    for (let d = 1; d <= radius && frontier.length; d++) {
      const next = [];
      for (const u of frontier) {
        if (labelMode === 'endpoint' && u !== s && isLabel(u)) continue;
        for (const v of adj.get(u)) {
          if (dist.has(v) || blocked.has(v)) continue;
          if (labelMode === 'hide' && isLabel(v)) continue;
          dist.set(v, d);
          next.push(v);
        }
      }
      frontier = next;
    }
    for (const [v, d] of dist) {
      if (!hop.has(v) || d < hop.get(v)) hop.set(v, d);
      if (!reachedBy.has(v)) reachedBy.set(v, []);
      reachedBy.get(v).push(s);
    }
  }

  const edges = [];
  for (const u of hop.keys())
    for (const v of adj.get(u))
      if (u < v && hop.has(v)) edges.push([u, v]);

  return { hop, reachedBy, edges };
}

/**
 * Calcola l'unione dei cammini minimi da `from` a ciascun nodo in `targets`,
 * muovendosi solo sugli archi di `adj` (tipicamente il sottografo già
 * visualizzato, non l'intero grafo). Utile per evidenziare "come si arriva"
 * da un nodo di partenza ai nodi in comune (bridge).
 *
 * Funzione pura: nessuna dipendenza da DOM/canvas.
 *
 * @param {Map<number, Iterable<number>>} adj  adiacenza (es. viewAdj del renderer)
 * @param {number} from                        nodo di partenza (es. un seed)
 * @param {Iterable<number>} targets           nodi da raggiungere (es. i bridge)
 * @returns {Set<number>} unione di tutti i nodi che compaiono in almeno un
 *          cammino minimo da `from` a un target raggiungibile (`from` e i
 *          target raggiunti sono sempre incluvi; target irraggiungibili
 *          vengono semplicemente ignorati)
 */
export function pathsToTargets(adj, from, targets) {
  if (!adj.has(from)) return new Set([from]);

  const targetSet = targets instanceof Set ? targets : new Set(targets);
  const prev = new Map([[from, null]]);
  const dist = new Map([[from, 0]]);
  let frontier = [from];

  while (frontier.length) {
    const next = [];
    for (const u of frontier) {
      for (const v of adj.get(u) ?? []) {
        if (dist.has(v)) continue;
        dist.set(v, dist.get(u) + 1);
        prev.set(v, u);
        next.push(v);
      }
    }
    frontier = next;
  }

  const result = new Set([from]);
  for (const t of targetSet) {
    if (!dist.has(t)) continue; // irraggiungibile nel sottografo, si ignora
    let cur = t;
    while (cur != null && !result.has(cur)) {
      result.add(cur);
      cur = prev.get(cur);
    }
  }
  return result;
}
