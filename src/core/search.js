// core/search.js
// Ricerca testuale sui nodi: match per id numerico esatto, o per
// sottostringa nel nome normalizzato. Funzione pura: riceve la lista
// nodi e l'indice per id come parametri espliciti (nessuna variabile
// globale), così è testabile in isolamento e riusabile.

import { norm } from './graph.js';

/**
 * @param {Array<{id:number, key:string, deg:number}>} nodes  lista nodi (con key già normalizzata)
 * @param {Map<number, object>} byId                          indice id -> nodo
 * @param {string} text                                       testo digitato dall'utente
 * @param {number} [limit=30]                                 massimo numero di risultati restituiti
 *
 * @returns {{list: object[], total: number}}
 *          list: i risultati (al massimo `limit`), ordinati per rilevanza poi grado decrescente
 *          total: numero totale di corrispondenze trovate (anche oltre il limite)
 */
export function search(nodes, byId, text, limit = 30) {
  text = text.trim();
  if (!text) return { list: [], total: 0 };

  const k = norm(text);
  const hits = [];

  if (/^\d+$/.test(text) && byId.has(+text)) {
    hits.push({ n: byId.get(+text), rank: -1 });
  }

  if (k) {
    for (const n of nodes) {
      if (hits.length && hits[0].n === n) continue;
      const i = n.key.indexOf(k);
      if (i >= 0) hits.push({ n, rank: n.key === k ? 0 : i === 0 ? 1 : 2 });
    }
  }

  hits.sort((a, b) => a.rank - b.rank || b.n.deg - a.n.deg);

  return { list: hits.slice(0, limit).map(x => x.n), total: hits.length };
}
