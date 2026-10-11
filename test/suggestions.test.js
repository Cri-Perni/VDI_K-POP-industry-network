// test/suggestions.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeSuggestedNodes } from '../src/core/suggestions.js';

describe('computeSuggestedNodes() - requisiti base', () => {
  it('nessun seed o meno di 2 seed restituisce lista vuota', () => {
    const adj = new Map([[1, [2]], [2, [1]]]);
    const byId = new Map([
      [1, { id: 1, name: 'A', type: 'male', deg: 1 }],
      [2, { id: 2, name: 'B', type: 'female', deg: 1 }],
    ]);

    // 0 seed
    assert.deepEqual(
      computeSuggestedNodes({ adj, byId, seeds: [], reachedBy: new Map() }),
      []
    );

    // 1 seed
    const reachedBy = new Map([[2, [1]]]);
    assert.deepEqual(
      computeSuggestedNodes({ adj, byId, seeds: [1], reachedBy }),
      []
    );
  });

  it('un nodo raggiunto da una sola partenza non viene suggerito', () => {
    // Grafo: S1 - X, S2 - Y, S1 - C, S2 - C
    // X è raggiunto solo da S1 -> escluso
    // C è raggiunto da S1 e S2 -> incluso
    const adj = new Map([
      [10, [1, 3]], // S1 collegato a X e C
      [20, [2, 3]], // S2 collegato a Y e C
      [1, [10]],    // X
      [2, [20]],    // Y
      [3, [10, 20]] // C
    ]);
    const byId = new Map([
      [10, { id: 10, name: 'Seed1', type: 'group', deg: 2 }],
      [20, { id: 20, name: 'Seed2', type: 'group', deg: 2 }],
      [1, { id: 1, name: 'X', type: 'male', deg: 1 }],
      [2, { id: 2, name: 'Y', type: 'male', deg: 1 }],
      [3, { id: 3, name: 'C', type: 'female', deg: 2 }],
    ]);
    const seeds = [10, 20];
    const reachedBy = new Map([
      [1, [10]],
      [2, [20]],
      [3, [10, 20]],
    ]);

    const res = computeSuggestedNodes({ adj, byId, seeds, reachedBy });
    assert.equal(res.length, 1);
    assert.equal(res[0].id, 3);
    assert.equal(res[0].name, 'C');
    assert.equal(res[0].seedCount, 2);
  });

  it('i nodi di partenza stessi non compaiono tra i suggeriti', () => {
    // S1 collegato a S2
    const adj = new Map([
      [1, [2]],
      [2, [1]]
    ]);
    const byId = new Map([
      [1, { id: 1, name: 'S1', type: 'group', deg: 1 }],
      [2, { id: 2, name: 'S2', type: 'group', deg: 1 }],
    ]);
    const seeds = [1, 2];
    const reachedBy = new Map([
      [1, [1, 2]],
      [2, [1, 2]],
    ]);

    const res = computeSuggestedNodes({ adj, byId, seeds, reachedBy });
    assert.equal(res.length, 0);
  });
});

describe('computeSuggestedNodes() - calcolo del punteggio', () => {
  it('più partenze raggiungono il nodo, più alto è il punteggio base', () => {
    // Nodi candidati C2 (raggiunto da 2 partenze) e C3 (raggiunto da 3 partenze)
    // Entrambi collegati direttamente
    const adj = new Map([
      [1, [100, 200]],
      [2, [100, 200]],
      [3, [200]],
      [100, [1, 2]],
      [200, [1, 2, 3]],
    ]);
    const byId = new Map([
      [1, { id: 1, name: 'S1', type: 'group', deg: 2 }],
      [2, { id: 2, name: 'S2', type: 'group', deg: 2 }],
      [3, { id: 3, name: 'S3', type: 'group', deg: 1 }],
      [100, { id: 100, name: 'C2', type: 'male', deg: 2 }],
      [200, { id: 200, name: 'C3', type: 'female', deg: 3 }],
    ]);
    const seeds = [1, 2, 3];
    const reachedBy = new Map([
      [100, [1, 2]],
      [200, [1, 2, 3]],
    ]);

    const res = computeSuggestedNodes({ adj, byId, seeds, reachedBy });
    assert.equal(res.length, 2);
    // C3 deve essere in cima alla classifica
    assert.equal(res[0].id, 200);
    assert.equal(res[0].seedCount, 3);
    assert.equal(res[1].id, 100);
    assert.equal(res[1].seedCount, 2);
    assert.ok(res[0].score > res[1].score);
  });

  it('un cammino tramite intermediario a basso grado vale più di uno tramite un hub (alto grado)', () => {
    // S1 e S2 raggiungono:
    // - Nodo LowDegCand tramite IntermediarioSpecifico (grado 2)
    // - Nodo HighDegCand tramite HubIntermediario (grado 50)
    const adj = new Map([
      [1, [10, 20]],
      [2, [10, 20]],
      [10, [1, 2, 100]], // deg = 3 (specifico)
      [20, [1, 2, 200, ...Array.from({ length: 47 }, (_, i) => 300 + i)]], // deg = 50 (hub)
      [100, [10]], // candidato via nodo specifico
      [200, [20]], // candidato via hub
    ]);
    // aggiungiamo le connessioni fittizie per l'hub
    for (let i = 0; i < 47; i++) {
      adj.set(300 + i, [20]);
    }

    const byId = new Map([
      [1, { id: 1, name: 'S1', type: 'group', deg: 2 }],
      [2, { id: 2, name: 'S2', type: 'group', deg: 2 }],
      [10, { id: 10, name: 'IntermediarioSpecifico', type: 'person', deg: 3 }],
      [20, { id: 20, name: 'HubAgenzia', type: 'label', deg: 50 }],
      [100, { id: 100, name: 'LowDegCand', type: 'male', deg: 1 }],
      [200, { id: 200, name: 'HighDegCand', type: 'female', deg: 1 }],
    ]);

    const seeds = [1, 2];
    const reachedBy = new Map([
      [100, [1, 2]],
      [200, [1, 2]],
    ]);

    const res = computeSuggestedNodes({ adj, byId, seeds, reachedBy });
    assert.equal(res.length, 2);
    // LowDegCand ha punteggio maggiore di HighDegCand
    assert.equal(res[0].id, 100);
    assert.equal(res[1].id, 200);
    assert.ok(res[0].score > res[1].score, 'LowDegCand deve battere HighDegCand');

    // Controlliamo il peso assegnato all'intermediario specifico vs hub
    const lowWeight = res[0].intermediaries[0].weight;
    const highWeight = res[1].intermediaries[0].weight;
    assert.ok(lowWeight > highWeight, `Peso nodo specifico (${lowWeight}) deve essere maggiore di peso hub (${highWeight})`);
  });

  it('un nodo sfavorito (bloccato) non viene suggerito e non fa da intermediario', () => {
    const adj = new Map([
      [1, [10]],
      [2, [10]],
      [10, [1, 2, 100]],
      [100, [10]],
    ]);
    const byId = new Map([
      [1, { id: 1, name: 'S1', type: 'group', deg: 1 }],
      [2, { id: 2, name: 'S2', type: 'group', deg: 1 }],
      [10, { id: 10, name: 'Intermediario', type: 'label', deg: 3 }],
      [100, { id: 100, name: 'Candidato', type: 'male', deg: 1 }],
    ]);

    const seeds = [1, 2];
    const reachedBy = new Map([[100, [1, 2]]]);

    // Caso A: il candidato stesso è bloccato
    const resA = computeSuggestedNodes({
      adj, byId, seeds, reachedBy, blocked: new Set([100])
    });
    assert.equal(resA.length, 0);

    // Caso B: l'intermediario è bloccato
    const resB = computeSuggestedNodes({
      adj, byId, seeds, reachedBy, blocked: new Set([10])
    });
    // Se l'intermediario è bloccato, il cammino non passa per u
    assert.equal(resB[0].intermediaries.filter(i => i.viaId === 10).length, 0);
  });
});
