// core/suggestions.js
// Algoritmo di raccomandazione e ranking per i nodi suggeriti.
//
// Requisiti:
// 1. Un nodo candidato è eleggibile se raggiunto da almeno 2 partenze (seeds).
// 2. Più partenze raggiungono un determinato nodo, più alto è il suo punteggio base.
// 3. I cammini che passano per nodi intermedi a basso grado hanno un peso maggiore
//    (connessioni specifiche/rare), mentre quelli che passano per nodi ad alto grado
//    (hub o grandi agenzie) ricevono un peso minore (Resource Allocation Index).
//
// Funzione pura: nessuna dipendenza da DOM o canvas.

/**
 * Calcola i nodi suggeriti con relativo punteggio e dettaglio delle connessioni.
 *
 * @param {object} opts
 * @param {Map<number, number[]>} opts.adj          mappa di adiacenza del grafo
 * @param {Map<number, object>} opts.byId           lookup nodo per id (contiene deg, type, name)
 * @param {Set<number>|number[]} opts.seeds         nodi di partenza
 * @param {Map<number, number[]>} opts.reachedBy    id -> lista di partenze che lo raggiungono
 * @param {Map<number, number>} [opts.hop]          id -> distanza minima da un seed
 * @param {Set<number>} [opts.blocked]              nodi bloccati/sfavoriti (da escludere)
 * @param {number} [opts.minSeeds=2]                numero minimo di partenze per essere suggerito
 *
 * @returns {Array<{
 *   id: number,
 *   name: string,
 *   type: string,
 *   deg: number,
 *   score: number,
 *   seedCount: number,
 *   reachingSeeds: number[],
 *   intermediaries: Array<{
 *     seedId: number,
 *     seedName: string,
 *     viaId: number|null,
 *     viaName: string|null,
 *     viaDeg: number|null,
 *     weight: number
 *   }>
 * }>}
 */
export function computeSuggestedNodes({
  adj,
  byId,
  seeds,
  reachedBy,
  hop = null,
  blocked = new Set(),
  minSeeds = 2,
}) {
  const seedSet = seeds instanceof Set ? seeds : new Set(seeds);
  const suggestions = [];

  if (!reachedBy || seedSet.size < minSeeds) {
    return suggestions;
  }

  for (const [candidateId, reaching] of reachedBy.entries()) {
    // Non suggerire i nodi che sono già partenze o bloccati
    if (seedSet.has(candidateId) || blocked.has(candidateId)) continue;

    // Filtra solo le partenze valide che raggiungono questo nodo
    const validSeeds = reaching.filter(s => seedSet.has(s));
    if (validSeeds.length < minSeeds) continue;

    const candNode = byId.get(candidateId);
    if (!candNode) continue;

    const candAdj = new Set(adj.get(candidateId) ?? []);
    let pathScore = 0;
    const intermediaries = [];

    for (const seedId of validSeeds) {
      const seedNode = byId.get(seedId);
      const seedName = seedNode ? seedNode.name : `Seed ${seedId}`;

      // Caso 1: Connessione diretta tra seed e candidato (distanza 1)
      if (candAdj.has(seedId)) {
        const weight = 1.0;
        pathScore += weight;
        intermediaries.push({
          seedId,
          seedName,
          viaId: null,
          viaName: null,
          viaDeg: null,
          weight,
        });
        continue;
      }

      // Caso 2: Connessione a 2 passi (s -> u -> candidato)
      // Troviamo i nodi intermedi comuni (u in vicini(s) e vicini(candidato))
      const seedNeighbors = adj.get(seedId) ?? [];
      const commonIntermediaries = [];

      for (const u of seedNeighbors) {
        if (candAdj.has(u) && !blocked.has(u) && !seedSet.has(u)) {
          commonIntermediaries.push(u);
        }
      }

      if (commonIntermediaries.length > 0) {
        // Resource Allocation: somma di 1 / deg(u) per ciascun intermediario
        for (const u of commonIntermediaries) {
          const uNode = byId.get(u);
          const uDeg = uNode?.deg ?? (adj.get(u)?.length || 1);
          // Se u ha grado 1 (caso limite), consideriamo peso 1
          const weight = uDeg > 0 ? Number((1 / uDeg).toFixed(4)) : 1.0;
          pathScore += weight;
          intermediaries.push({
            seedId,
            seedName,
            viaId: u,
            viaName: uNode ? uNode.name : `Nodo ${u}`,
            viaDeg: uDeg,
            weight,
          });
        }
      } else {
        // Caso 3: Connessione a distanza >= 3 (passa per più nodi)
        // Se non è diretta (d=1) e non ha intermediari comuni a 2 passi (d=2),
        // il cammino da questa specifica partenza è necessariamente ad almeno 3 passi.
        const weight = 0.15; // contributo ridotto per cammino lungo
        pathScore += weight;
        intermediaries.push({
          seedId,
          seedName,
          viaId: null,
          viaName: 'Cammino lungo (≥3 passi)',
          viaDeg: null,
          weight,
        });
      }
    }

    // Punteggio base: 1 punto per ogni partenza che raggiunge il nodo
    const baseScore = validSeeds.length * 1.0;
    const totalScore = Number((baseScore + pathScore).toFixed(3));

    suggestions.push({
      id: candidateId,
      name: candNode.name,
      type: candNode.type,
      deg: candNode.deg,
      score: totalScore,
      baseScore,
      pathScore: Number(pathScore.toFixed(3)),
      seedCount: validSeeds.length,
      reachingSeeds: validSeeds,
      intermediaries,
    });
  }

  // Ordina per punteggio decrescente, e a parità di punteggio per seedCount, poi per grado
  suggestions.sort((a, b) => b.score - a.score || b.seedCount - a.seedCount || b.deg - a.deg);

  return suggestions;
}
