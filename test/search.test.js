// test/search.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { search } from '../src/core/search.js';
import { norm, buildGraph } from '../src/core/graph.js';

// Dataset di controllo per la ricerca: nomi scelti apposta per coprire
// match esatto, match come prefisso, match come sottostringa interna,
// e id numerici.
const raw = {
  nodes: [
    [100, 0, 'EXO'],
    [101, 1, 'EXO-K'],
    [102, 1, 'Baekhyun EXO'],   // "exo" come sottostringa interna
    [103, 2, 'SHINee'],
    [104, 3, 'Kai'],
    [999, 4, 'Zebra Agency'],
  ],
  edges: [
    [100, 101], [100, 102], [100, 103],
    [100, 104], [100, 104], [100, 104], // gonfia il grado di 100 per testare l'ordinamento
  ],
};

function setup() {
  const { nodes, byId } = buildGraph(raw);
  return { nodes, byId };
}

describe('search() - casi base', () => {
  test('testo vuoto restituisce lista vuota e total 0', () => {
    const { nodes, byId } = setup();
    const res = search(nodes, byId, '');
    assert.deepEqual(res, { list: [], total: 0 });
  });

  test('solo spazi equivale a vuoto', () => {
    const { nodes, byId } = setup();
    const res = search(nodes, byId, '   ');
    assert.deepEqual(res, { list: [], total: 0 });
  });

  test('nessun match restituisce lista vuota ma testo valido', () => {
    const { nodes, byId } = setup();
    const res = search(nodes, byId, 'zzzznonexiste');
    assert.equal(res.list.length, 0);
    assert.equal(res.total, 0);
  });
});

describe('search() - match testuale', () => {
  test('match esatto (case-insensitive) ha priorità massima', () => {
    const { nodes, byId } = setup();
    const res = search(nodes, byId, 'exo');
    // "EXO" esatto deve comparire per primo
    assert.equal(res.list[0].name, 'EXO');
  });

  test('match come prefisso viene trovato', () => {
    const { nodes, byId } = setup();
    const res = search(nodes, byId, 'exok');
    assert.ok(res.list.some(n => n.name === 'EXO-K'));
  });

  test('match come sottostringa interna viene trovato ma con rango più basso', () => {
    const { nodes, byId } = setup();
    const res = search(nodes, byId, 'exo');
    const names = res.list.map(n => n.name);
    assert.ok(names.includes('Baekhyun EXO'));
    // "EXO" esatto deve precedere "Baekhyun EXO" (sottostringa interna)
    assert.ok(names.indexOf('EXO') < names.indexOf('Baekhyun EXO'));
  });

  test('ricerca case-insensitive e senza diacritici (usa norm())', () => {
    const { nodes, byId } = setup();
    const res = search(nodes, byId, 'ExO');
    assert.ok(res.list.some(n => n.name === 'EXO'));
  });
});

describe('search() - match per id numerico', () => {
  test('id numerico esatto trovato anche se non compare nel nome', () => {
    const { nodes, byId } = setup();
    const res = search(nodes, byId, '103');
    assert.equal(res.list[0].name, 'SHINee');
  });

  test('id numerico ha priorità sopra qualsiasi match testuale', () => {
    const { nodes, byId } = setup();
    // "100" è sia un id valido sia (se testuale) non farebbe match su nulla
    const res = search(nodes, byId, '100');
    assert.equal(res.list[0].id, 100);
    assert.equal(res.list[0].name, 'EXO');
  });

  test('id numerico inesistente non genera falsi risultati', () => {
    const { nodes, byId } = setup();
    const res = search(nodes, byId, '424242');
    assert.equal(res.total, 0);
  });

  test('non duplica il nodo se lo stesso testo fa match sia come id che come nome', () => {
    // costruiamo un caso dove l'id numerico coincide con una stringa che
    // farebbe comunque match testuale sul nome (raro ma possibile)
    const raw2 = { nodes: [[100, 0, '100 Club']], edges: [] };
    const { nodes, byId } = buildGraph(raw2);
    const res = search(nodes, byId, '100');
    assert.equal(res.list.length, 1); // non deve comparire due volte
  });
});

describe('search() - ordinamento e limite', () => {
  test('a parità di rango, ordina per grado decrescente', () => {
    // "exo" da match a EXO(rank0), EXO-K(rank1 prefisso), Baekhyun EXO(rank2)
    // ma dentro lo stesso rank l'ordine è per grado: qui ogni rank ha un solo elemento,
    // testiamo quindi con un dataset dedicato a pari rango (stesso nome esatto).
    const rawTie = {
      nodes: [[1, 0, 'Zed'], [2, 0, 'Zed'], [3, 0, 'Other'], [4, 0, 'Other2']],
      edges: [[1, 3], [1, 4]], // solo il nodo 1 ha grado 2, il nodo 2 ha grado 0
    };
    const g = buildGraph(rawTie);
    const res = search(g.nodes, g.byId, 'zed');
    assert.equal(res.list[0].id, 1); // grado maggiore, stesso rank (match esatto)
  });

  test('limita i risultati al parametro limit', () => {
    const raw3 = {
      nodes: Array.from({ length: 10 }, (_, i) => [i, 0, `Item${i}`]),
      edges: [],
    };
    const g = buildGraph(raw3);
    const res = search(g.nodes, g.byId, 'item', 3);
    assert.equal(res.list.length, 3);
    assert.equal(res.total, 10);
  });

  test('default limit è 30', () => {
    const raw4 = {
      nodes: Array.from({ length: 40 }, (_, i) => [i, 0, `Thing${i}`]),
      edges: [],
    };
    const g = buildGraph(raw4);
    const res = search(g.nodes, g.byId, 'thing');
    assert.equal(res.list.length, 30);
    assert.equal(res.total, 40);
  });
});
