// ui/state.js
// Store centrale dell'applicazione: possiede tutto lo stato mutabile
// (partenze, sfavoriti, parametri di visualizzazione, selezione) e le
// azioni che lo modificano. Non conosce DOM/canvas: dopo ogni modifica
// notifica semplicemente gli iscritti tramite subscribe(), passando lo
// stato aggiornato e l'ultimo risultato del calcolo dell'intorno.
//
// Questo rimpiazza il "commit()" dell'originale, che chiamava a mano
// renderChips/renderResults/rebuild/showMsg: qui l'aggiornamento della UI
// è responsabilità di chi si iscrive, non dello store.

import { computeNeighborhood } from '../core/neighborhood.js';

export const MAX_NODES = 1500;

export const PRESETS = {
  a: { seeds: [152, 404], blocked: [], radius: 2, labelMode: 'through' },
  b: { seeds: [152, 404], blocked: [4563, 231], radius: 2, labelMode: 'through' },
  // Doo-Joon (BEAST), Ji Hyun (4minute), Ga-In (Brown Eyed Girls), SeungRi (BIGBANG)
  c: { seeds: [2071, 1595, 1477, 1700], blocked: [], radius: 3, labelMode: 'endpoint' },
  d: { seeds: [2071, 1595, 1477, 1700], blocked: [1782], radius: 3, labelMode: 'endpoint' },        // + Shinsadong Tiger
  e: { seeds: [2071, 1595, 1477, 1700], blocked: [1782, 1855], radius: 3, labelMode: 'endpoint' },  // + Hyuna
  reset: { seeds: [], blocked: [], radius: 2, labelMode: 'endpoint' },
};

/**
 * Crea un nuovo store. Ogni chiamata produce un'istanza indipendente
 * (utile anche per i test), legata a uno specifico grafo (adj/byId).
 *
 * @param {object} graph
 * @param {Map<number, number[]>} graph.adj
 * @param {Map<number, object>} graph.byId    ogni nodo deve avere .type
 * @returns {object} store con stato, azioni e subscribe()
 */
export function createStore({ adj, byId }) {
  const state = {
    seeds: new Set(),
    blocked: new Set(),
    radius: 2,
    labelMode: 'endpoint',
    showBridges: true,
    commonMode: 'all',
    showNames: false,
    selected: null,
    hover: null,
  };

  // ultimo risultato calcolato: null se nessun seed, altrimenti { res, base }
  // dove `base` è la dimensione dell'intorno senza sfavoriti (per il conteggio
  // "nodi tolti dagli sfavoriti" nelle statistiche)
  let last = { res: null, base: 0 };
  let overflow = null; // dimensione dell'intorno quando supera MAX_NODES, altrimenti null
  let pendingFit = false; // l'ultima commit() richiedeva un fit-to-view dopo il ricalcolo?

  const listeners = new Set();

  function notify() {
    for (const fn of listeners) fn({ state, last, overflow, doFit: pendingFit });
  }

  /**
   * Ricalcola l'intorno in base allo stato corrente e notifica gli iscritti.
   * @param {boolean} doFit  se true, suggerisce agli iscritti (renderer) di
   *        adattare la vista dopo il ricalcolo (es. non per un drag manuale)
   */
  function commit(doFit = true) {
    pendingFit = doFit;
    if (!state.seeds.size) {
      last = { res: null, base: 0 };
      overflow = null;
      notify();
      return { doFit, empty: true };
    }
    const opts = {
      adj, typeOf: id => byId.get(id).type,
      seeds: [...state.seeds], blocked: state.blocked,
      radius: state.radius, labelMode: state.labelMode,
    };
    const res = computeNeighborhood(opts);
    const base = state.blocked.size
      ? computeNeighborhood({ ...opts, blocked: new Set() }).hop.size
      : res.hop.size;
    last = { res, base };

    if (res.hop.size > MAX_NODES) {
      overflow = res.hop.size;
      notify();
      return { doFit, overflow: res.hop.size };
    }
    overflow = null;
    notify();
    return { doFit, res };
  }

  function addSeed(id, doFit = true) {
    if (state.seeds.has(id)) return commit(doFit);
    state.blocked.delete(id);
    state.seeds.add(id);
    return commit(doFit);
  }

  function addBlocked(id, doFit = true) {
    state.seeds.delete(id);
    state.blocked.add(id);
    if (state.selected === id) state.selected = null;
    return commit(doFit);
  }

  function removeSeed(id) {
    state.seeds.delete(id);
    return commit(true);
  }

  function removeBlocked(id) {
    state.blocked.delete(id);
    return commit(true);
  }

  function toggleSeed(id) {
    return state.seeds.has(id) ? removeSeed(id) : addSeed(id);
  }

  function toggleBlocked(id) {
    return state.blocked.has(id) ? removeBlocked(id) : addBlocked(id);
  }

  function select(id) {
    state.selected = id;
    notify();
  }

  function setHover(id) {
    if (id === state.hover) return;
    state.hover = id;
    notify();
  }

  function setRadius(r) {
    state.radius = r;
    return commit(true);
  }

  function setLabelMode(mode) {
    state.labelMode = mode;
    return commit(true);
  }

  function setShowBridges(v) {
    state.showBridges = v;
    notify();
  }

  function setShowNames(v) {
    state.showNames = v;
    notify();
  }

  function setCommonMode(mode) {
    state.commonMode = mode;
    notify();
  }

  /**
   * Applica un preset predefinito (vedi PRESETS). Ritorna il preset applicato
   * così chi chiama può, ad esempio, sincronizzare i controlli del form.
   */
  function applyPreset(name) {
    const p = PRESETS[name];
    if (!p) throw new Error(`preset sconosciuto: ${name}`);
    state.seeds = new Set(p.seeds);
    state.blocked = new Set(p.blocked);
    state.radius = p.radius;
    state.labelMode = p.labelMode;
    state.selected = null;
    commit(true);
    return p;
  }

  /**
   * Un nodo è "in comune" se lo raggiungono tutte le partenze (commonMode
   * 'all') o almeno due (commonMode 'two'). Non ha senso con un solo seed.
   */
  function isCommon(seed, reachedByList) {
    if (state.seeds.size <= 1 || seed) return false;
    const need = state.commonMode === 'all' ? state.seeds.size : 2;
    return reachedByList.length >= need;
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return {
    state,
    subscribe,
    commit,
    addSeed, addBlocked, removeSeed, removeBlocked, toggleSeed, toggleBlocked,
    select, setHover,
    setRadius, setLabelMode, setShowBridges, setShowNames, setCommonMode,
    applyPreset,
    isCommon,
    getLast: () => last,
    getOverflow: () => overflow,
  };
}
