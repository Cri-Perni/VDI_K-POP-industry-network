// test/graph.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { norm, buildGraph, TYPES, TYPE_LABELS_IT } from '../src/core/graph.js';

describe('norm()', () => {
  test('minuscolizza', () => {
    assert.equal(norm('EXO'), 'exo');
  });

  test('rimuove diacritici', () => {
    assert.equal(norm('José'), 'jose');
  });

  test('rimuove spazi e punteggiatura', () => {
    assert.equal(norm('Brown Eyed Girls'), 'browneyedgirls');
  });

  test('gestisce script non latini (hangul) senza crash', () => {
    // NFKD scompone i sillabogrammi hangul precomposti nei singoli jamo:
    // stesso aspetto visivo, ma sequenza di codepoint diversa. È il
    // comportamento della funzione originale: qui verifichiamo solo che
    // non lanci errori, che il risultato non sia vuoto, e che ricomponendo
    // (NFKC) si torni alla stringa di partenza.
    const input = '도경수';
    const result = norm(input);
    assert.ok(result.length > 0);
    assert.equal(result.normalize('NFKC'), input);
  });

  test('stringa vuota resta vuota', () => {
    assert.equal(norm(''), '');
  });
});

describe('buildGraph()', () => {
  // Dataset di controllo, piccolo e verificabile a mano:
  //   0 --- 1
  //   |     |
  //   2 --- 3
  //
  //   4 (isolato, nessun arco)
  const raw = {
    nodes: [
      [0, 0, 'Gruppo A'],   // type 0 -> group
      [1, 1, 'Uomo B'],     // type 1 -> male
      [2, 2, 'Donna C'],    // type 2 -> female
      [3, 3, 'Persona D'],  // type 3 -> person
      [4, 4, 'Agenzia E'],  // type 4 -> label, isolato
    ],
    edges: [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
    ],
  };

  test('produce il numero corretto di nodi', () => {
    const { nodes } = buildGraph(raw);
    assert.equal(nodes.length, 5);
  });

  test('mappa correttamente typeIndex -> nome tipo', () => {
    const { nodes } = buildGraph(raw);
    assert.equal(nodes[0].type, 'group');
    assert.equal(nodes[1].type, 'male');
    assert.equal(nodes[2].type, 'female');
    assert.equal(nodes[3].type, 'person');
    assert.equal(nodes[4].type, 'label');
  });

  test('byId permette lookup diretto per id', () => {
    const { byId } = buildGraph(raw);
    assert.equal(byId.get(0).name, 'Gruppo A');
    assert.equal(byId.get(4).name, 'Agenzia E');
    assert.equal(byId.get(999), undefined);
  });

  test('adj contiene entrambe le direzioni per ogni arco', () => {
    const { adj } = buildGraph(raw);
    assert.deepEqual(new Set(adj.get(0)), new Set([1, 2]));
    assert.deepEqual(new Set(adj.get(1)), new Set([0, 3]));
    assert.deepEqual(new Set(adj.get(3)), new Set([1, 2]));
  });

  test('nodo isolato ha adiacenza vuota', () => {
    const { adj } = buildGraph(raw);
    assert.deepEqual(adj.get(4), []);
  });

  test('grado (deg) corrisponde al numero di vicini', () => {
    const { nodes, byId } = buildGraph(raw);
    assert.equal(byId.get(0).deg, 2); // vicino a 1 e 2
    assert.equal(byId.get(1).deg, 2); // vicino a 0 e 3
    assert.equal(byId.get(4).deg, 0); // isolato
    // deg è impostato sull'oggetto referenziato sia in nodes che in byId
    assert.equal(nodes.find(n => n.id === 0).deg, 2);
  });

  test('key è la versione normalizzata del nome, per la ricerca', () => {
    const { byId } = buildGraph(raw);
    assert.equal(byId.get(0).key, 'gruppoa');
  });

  test('dataset vuoto non genera errori', () => {
    const { nodes, byId, adj } = buildGraph({ nodes: [], edges: [] });
    assert.equal(nodes.length, 0);
    assert.equal(byId.size, 0);
    assert.equal(adj.size, 0);
  });

  test('TYPES e TYPE_LABELS_IT coprono le stesse 5 categorie', () => {
    assert.equal(TYPES.length, 5);
    for (const t of TYPES) assert.ok(t in TYPE_LABELS_IT, `manca etichetta IT per tipo "${t}"`);
  });
});
