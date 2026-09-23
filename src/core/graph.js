// core/graph.js
// Logica pura di normalizzazione dati: nessuna dipendenza da DOM/canvas.
// Riceve il dataset grezzo (nodes/edges) e produce le strutture usate da
// tutto il resto dell'app: lista nodi normalizzata, indice per id, mappa
// di adiacenza e grado di ogni nodo.

export const TYPES = ['group', 'male', 'female', 'person', 'label'];

export const TYPE_LABELS_IT = {
  group: 'Gruppo',
  male: 'Uomo',
  female: 'Donna',
  person: 'Persona',
  label: 'Agenzia',
};

/**
 * Normalizza una stringa per la ricerca: minuscole, senza diacritici,
 * solo lettere/numeri (spazi e punteggiatura rimossi).
 * @param {string} s
 * @returns {string}
 */
export function norm(s) {
  return s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]/gu, '');
}

/**
 * Costruisce le strutture dati principali a partire dal dataset grezzo.
 *
 * @param {{nodes: Array<[number, number, string]>, edges: Array<[number, number]>}} rawData
 *        nodes: array di [id, typeIndex, name]
 *        edges: array di [idA, idB]
 * @returns {{
 *   nodes: Array<{id:number, type:string, name:string, key:string, deg:number}>,
 *   byId: Map<number, object>,
 *   adj: Map<number, number[]>,
 * }}
 */
export function buildGraph(rawData) {
  const nodes = rawData.nodes.map(([id, t, name]) => ({
    id,
    type: TYPES[t],
    name,
    key: norm(name),
  }));

  const byId = new Map(nodes.map(n => [n.id, n]));
  const adj = new Map(nodes.map(n => [n.id, []]));

  for (const [a, b] of rawData.edges) {
    adj.get(a).push(b);
    adj.get(b).push(a);
  }

  for (const n of nodes) n.deg = adj.get(n.id).length;

  return { nodes, byId, adj };
}
