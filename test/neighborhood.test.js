// test/neighborhood.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { computeNeighborhood, pathsToTargets } from '../src/core/neighborhood.js';

// Grafo di controllo usato in gran parte dei test:
//
//   1 --- 2(label) --- 3 --- 4
//   |
//   5
//
// tipi: 1=person, 2=label, 3=person, 4=person, 5=person
const TYPE = { 1: 'person', 2: 'label', 3: 'person', 4: 'person', 5: 'person' };
const typeOf = id => TYPE[id];

function makeAdj(pairs) {
  const adj = new Map();
  const ensure = id => { if (!adj.has(id)) adj.set(id, []); };
  for (const [a, b] of pairs) {
    ensure(a); ensure(b);
    adj.get(a).push(b);
    adj.get(b).push(a);
  }
  return adj;
}

const adj = makeAdj([[1, 2], [2, 3], [3, 4], [1, 5]]);

describe('computeNeighborhood() - raggio', () => {
  test('raggio 1 da nodo 1 raggiunge solo i vicini diretti', () => {
    const res = computeNeighborhood({
      adj, typeOf, seeds: [1], blocked: new Set(), radius: 1, labelMode: 'through',
    });
    assert.deepEqual(new Set(res.hop.keys()), new Set([1, 2, 5]));
    assert.equal(res.hop.get(1), 0);
    assert.equal(res.hop.get(2), 1);
    assert.equal(res.hop.get(5), 1);
  });

  test('raggio 2 da nodo 1 raggiunge anche il nodo a due passi', () => {
    const res = computeNeighborhood({
      adj, typeOf, seeds: [1], blocked: new Set(), radius: 2, labelMode: 'through',
    });
    assert.deepEqual(new Set(res.hop.keys()), new Set([1, 2, 5, 3]));
    assert.equal(res.hop.get(3), 2);
  });

  test('raggio 0 raggiunge solo il seed stesso', () => {
    const res = computeNeighborhood({
      adj, typeOf, seeds: [1], blocked: new Set(), radius: 0, labelMode: 'through',
    });
    assert.deepEqual(new Set(res.hop.keys()), new Set([1]));
  });

  test('raggio molto grande non causa errori, si ferma quando la frontiera è vuota', () => {
    const res = computeNeighborhood({
      adj, typeOf, seeds: [1], blocked: new Set(), radius: 100, labelMode: 'through',
    });
    assert.deepEqual(new Set(res.hop.keys()), new Set([1, 2, 3, 4, 5]));
    assert.equal(res.hop.get(4), 3);
  });
});

describe('computeNeighborhood() - nodi bloccati', () => {
  test('un nodo bloccato non viene mai incluso', () => {
    const res = computeNeighborhood({
      adj, typeOf, seeds: [1], blocked: new Set([2]), radius: 3, labelMode: 'through',
    });
    assert.ok(!res.hop.has(2));
  });

  test('bloccare un nodo taglia ogni cammino che passa da lì', () => {
    // bloccando 2, il ramo 3-4 (raggiungibile solo passando da 2) resta escluso
    const res = computeNeighborhood({
      adj, typeOf, seeds: [1], blocked: new Set([2]), radius: 5, labelMode: 'through',
    });
    assert.deepEqual(new Set(res.hop.keys()), new Set([1, 5]));
    assert.ok(!res.hop.has(3));
    assert.ok(!res.hop.has(4));
  });
});

describe('computeNeighborhood() - labelMode', () => {
  test("'through': le label si attraversano normalmente", () => {
    const res = computeNeighborhood({
      adj, typeOf, seeds: [1], blocked: new Set(), radius: 3, labelMode: 'through',
    });
    // 1 -> 2(label) -> 3 -> 4, tutti raggiunti in successione
    assert.deepEqual(new Set(res.hop.keys()), new Set([1, 2, 3, 4, 5]));
    assert.equal(res.hop.get(4), 3);
  });

  test("'endpoint': la label compare ma non si espande oltre", () => {
    const res = computeNeighborhood({
      adj, typeOf, seeds: [1], blocked: new Set(), radius: 3, labelMode: 'endpoint',
    });
    // 2 è raggiunta (endpoint) ma da lì non si prosegue verso 3/4
    assert.deepEqual(new Set(res.hop.keys()), new Set([1, 2, 5]));
    assert.ok(!res.hop.has(3));
    assert.ok(!res.hop.has(4));
  });

  test("'hide': la label non compare e non si attraversa", () => {
    const res = computeNeighborhood({
      adj, typeOf, seeds: [1], blocked: new Set(), radius: 3, labelMode: 'hide',
    });
    assert.deepEqual(new Set(res.hop.keys()), new Set([1, 5]));
    assert.ok(!res.hop.has(2));
    assert.ok(!res.hop.has(3));
  });

  test("'endpoint': se il seed stesso è una label, si espande normalmente da lì", () => {
    // la regola "non expand" si applica solo se u !== s
    const res = computeNeighborhood({
      adj, typeOf, seeds: [2], blocked: new Set(), radius: 2, labelMode: 'endpoint',
    });
    assert.deepEqual(new Set(res.hop.keys()), new Set([2, 1, 3, 5, 4]));
  });
});

describe('computeNeighborhood() - multi-seed e reachedBy', () => {
  test('due partenze: reachedBy elenca entrambe per un nodo in comune', () => {
    // grafo a stella: seed A=1 e seed B=4, si incontrano al centro (nodo 3 via 2)
    const res = computeNeighborhood({
      adj, typeOf, seeds: [1, 4], blocked: new Set(), radius: 3, labelMode: 'through',
    });
    // nodo 2 raggiunto da entrambi i seed (1 via diretto, 4 via 3->2)
    assert.deepEqual(new Set(res.reachedBy.get(2)), new Set([1, 4]));
  });

  test('hop riporta la distanza minima quando più partenze raggiungono lo stesso nodo', () => {
    const res = computeNeighborhood({
      adj, typeOf, seeds: [1, 3], blocked: new Set(), radius: 3, labelMode: 'through',
    });
    // nodo 2: da seed 1 dista 1, da seed 3 dista 1 -> min = 1
    assert.equal(res.hop.get(2), 1);
  });

  test('un seed isolato dal resto compare comunque con hop 0', () => {
    const soloAdj = makeAdj([[1, 2]]);
    soloAdj.set(99, []); // nodo isolato, presente nel grafo ma senza archi
    const res = computeNeighborhood({
      adj: soloAdj, typeOf: () => 'person', seeds: [1, 99], blocked: new Set(), radius: 2, labelMode: 'through',
    });
    assert.equal(res.hop.get(99), 0);
    assert.deepEqual(res.reachedBy.get(99), [99]);
  });

  test('nessun seed produce intorno vuoto', () => {
    const res = computeNeighborhood({
      adj, typeOf, seeds: [], blocked: new Set(), radius: 3, labelMode: 'through',
    });
    assert.equal(res.hop.size, 0);
    assert.equal(res.edges.length, 0);
  });
});

describe('computeNeighborhood() - edges (sottografo indotto)', () => {
  test('include solo gli archi tra nodi entrambi presenti nell\'intorno', () => {
    const res = computeNeighborhood({
      adj, typeOf, seeds: [1], blocked: new Set(), radius: 1, labelMode: 'through',
    });
    // intorno = {1,2,5}; l'arco 2-3 non deve apparire perché 3 non è nell'intorno
    const edgeSet = res.edges.map(([a, b]) => `${a}-${b}`);
    assert.ok(edgeSet.includes('1-2'));
    assert.ok(edgeSet.includes('1-5'));
    assert.ok(!edgeSet.some(e => e.includes('3')));
  });

  test('ogni arco appare una sola volta (u < v, niente duplicati)', () => {
    const res = computeNeighborhood({
      adj, typeOf, seeds: [1], blocked: new Set(), radius: 5, labelMode: 'through',
    });
    for (const [a, b] of res.edges) assert.ok(a < b, `arco (${a},${b}) non normalizzato`);
    const seen = new Set(res.edges.map(([a, b]) => `${a}-${b}`));
    assert.equal(seen.size, res.edges.length);
  });
});

describe('pathsToTargets()', () => {
  // grafo lineare: 1 - 2 - 3 - 4 - 5, più un ramo 3 - 6
  const line = makeAdj([[1, 2], [2, 3], [3, 4], [4, 5], [3, 6]]);

  test('un solo target: ritorna esattamente il cammino minimo', () => {
    const res = pathsToTargets(line, 1, [5]);
    assert.deepEqual(res, new Set([1, 2, 3, 4, 5]));
  });

  test('target = nodo di partenza: ritorna solo quel nodo', () => {
    const res = pathsToTargets(line, 1, [1]);
    assert.deepEqual(res, new Set([1]));
  });

  test('più target: unione dei rispettivi cammini minimi', () => {
    const res = pathsToTargets(line, 1, [5, 6]);
    // 1->5 passa da 2,3,4; 1->6 passa da 2,3; l'unione è tutto tranne rami non toccati
    assert.deepEqual(res, new Set([1, 2, 3, 4, 5, 6]));
  });

  test('target irraggiungibile viene ignorato senza errori', () => {
    const res = pathsToTargets(line, 1, [5, 999]);
    assert.deepEqual(res, new Set([1, 2, 3, 4, 5]));
  });

  test('nessun target: ritorna solo il nodo di partenza', () => {
    const res = pathsToTargets(line, 1, []);
    assert.deepEqual(res, new Set([1]));
  });

  test('nodo di partenza non presente in adj: ritorna solo se stesso', () => {
    const res = pathsToTargets(line, 999, [1, 2]);
    assert.deepEqual(res, new Set([999]));
  });

  test('cammini che condividono un tratto non duplicano nodi (è un Set)', () => {
    // 1->4 e 1->6 condividono il tratto 1-2-3
    const res = pathsToTargets(line, 1, [4, 6]);
    assert.deepEqual(res, new Set([1, 2, 3, 4, 6]));
  });

  test('grafo con ciclo: il cammino minimo resta corretto', () => {
    // 1-2-3-4-1 (ciclo) più 4-5: il minimo da 1 a 5 passa da 4 nel senso più corto
    const cyc = makeAdj([[1, 2], [2, 3], [3, 4], [4, 1], [4, 5]]);
    const res = pathsToTargets(cyc, 1, [5]);
    // da 1 a 5 il cammino minimo è 1-4-5 (2 passi) non 1-2-3-4-5 (4 passi)
    assert.deepEqual(res, new Set([1, 4, 5]));
  });
});
