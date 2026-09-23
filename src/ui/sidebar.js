// ui/sidebar.js
// Colonna laterale: campo di ricerca + risultati, chip di partenze/sfavoriti,
// statistiche/legenda/nodi-in-comune, classifica hub. Si iscrive allo store
// e ridisegna le proprie sezioni quando lo stato cambia; le azioni (clic su
// "Parti"/"Evita"/rimuovi chip) delegano tutto allo store.

import { TYPES, TYPE_LABELS_IT } from '../core/graph.js';
import { search as searchNodes } from '../core/search.js';
import { h, swatch, typeLabel } from './dom-helpers.js';

/**
 * @param {object} opts
 * @param {object} opts.store
 * @param {Array} opts.nodes
 * @param {Map<number, object>} opts.byId
 * @param {(id:number)=>void} opts.onCenterOn  richiamata quando l'utente clicca
 *        su un nodo già presente nel grafico visualizzato (es. una chip),
 *        per centrare la vista canvas su di esso
 * @param {{
 *   q: HTMLInputElement, results: HTMLElement,
 *   seeds: HTMLElement, blocked: HTMLElement,
 *   nSeeds: HTMLElement, nBlocked: HTMLElement, rOut: HTMLElement,
 *   stats: HTMLElement, legend: HTMLElement,
 *   commonsBox: HTMLElement, commons: HTMLElement, hubs: HTMLElement,
 * }} opts.els  riferimenti agli elementi DOM della sidebar
 * @param {() => Set<number>} opts.isInView  ritorna l'insieme di id attualmente
 *        visualizzati nel grafico (per decidere se una chip è cliccabile)
 */
export function createSidebar({ store, nodes, byId, els, onCenterOn, isInView }) {
  const { q, results, seeds, blocked, nSeeds, nBlocked, rOut, stats, legend, commonsBox, commons, hubs } = els;

  function renderResults() {
    const { list, total } = searchNodes(nodes, byId, q.value);
    results.replaceChildren();
    if (!q.value.trim()) return;
    if (!list.length) {
      results.append(h('li', { class: 'none', text: "Nessun risultato. Prova con meno lettere o con l'id." }));
      return;
    }
    for (const n of list) {
      const isSeed = store.state.seeds.has(n.id), isBlk = store.state.blocked.has(n.id);
      results.append(h('li', {},
        swatch(n.type),
        h('span', { class: 'who' },
          h('span', { class: 'nm', text: n.name, title: n.name }),
          h('span', { class: 'meta', text: `${typeLabel(n.type)}, id ${n.id}, ${n.deg} collegamenti` })),
        h('span', { class: 'acts' },
          h('button', {
            class: 'mini go' + (isSeed ? ' on' : ''), text: isSeed ? 'Togli' : 'Parti',
            'aria-label': `${isSeed ? 'Togli dalle partenze' : 'Parti da'} ${n.name}`,
            onclick: () => store.toggleSeed(n.id),
          }),
          h('button', {
            class: 'mini no' + (isBlk ? ' on' : ''), text: isBlk ? 'Riammetti' : 'Evita',
            'aria-label': `${isBlk ? 'Riammetti' : 'Evita'} ${n.name}`,
            onclick: () => store.toggleBlocked(n.id),
          }))));
    }
    if (total > list.length) {
      results.append(h('li', { class: 'more', text: `Altri ${total - list.length} risultati: scrivi di più per restringere.` }));
    }
  }

  function chip(id, kind) {
    const n = byId.get(id);
    const remove = kind === 'seed' ? store.removeSeed : store.removeBlocked;
    return h('span', { class: 'chip' + (kind === 'blocked' ? ' avoid' : '') },
      h('button', {
        class: 'nm', text: n.name, title: `${n.name} (${typeLabel(n.type)}, id ${id})`,
        onclick: () => { if (isInView().has(id)) { store.select(id); onCenterOn(id); } },
      }),
      h('button', { class: 'x', text: '×', 'aria-label': `Rimuovi ${n.name}`, onclick: () => remove(id) }));
  }

  function renderChips() {
    seeds.replaceChildren(...(store.state.seeds.size
      ? [...store.state.seeds].map(id => chip(id, 'seed'))
      : [h('p', { class: 'empty', text: 'Nessuno. Cerca e premi Parti.' })]));
    blocked.replaceChildren(...(store.state.blocked.size
      ? [...store.state.blocked].map(id => chip(id, 'blocked'))
      : [h('p', { class: 'empty', text: 'Nessuno. I cammini che passano da un nodo sfavorito vengono tagliati.' })]));
    nSeeds.textContent = store.state.seeds.size || '';
    nBlocked.textContent = store.state.blocked.size || '';
    rOut.textContent = store.state.radius + (store.state.radius === 1 ? ' passo' : ' passi');
  }

  const isArtist = n => n.type === 'male' || n.type === 'female' || n.type === 'person';

  function renderStats(res, base) {
    stats.replaceChildren();
    legend.replaceChildren();
    const row = (k, v) => stats.append(h('dt', { text: k }), h('dd', { text: v }));
    const counts = Object.fromEntries(TYPES.map(t => [t, 0]));
    const commonsList = [];
    if (res) for (const [id, by] of res.reachedBy) {
      counts[byId.get(id).type]++;
      if (store.isCommon(store.state.seeds.has(id), by)) commonsList.push(byId.get(id));
    }
    const nArt = commonsList.filter(isArtist).length;

    row("Nodi nell'intorno", res ? res.hop.size : '–');
    row('Collegamenti tra loro', res ? res.edges.length : '–');
    if (store.state.seeds.size > 1) {
      row('Artisti in comune', res ? nArt : '–');
      row('Gruppi e agenzie in comune', res ? commonsList.length - nArt : '–');
    }
    if (res && store.state.blocked.size) {
      row('Nodi tolti dagli sfavoriti', Math.max(0, base - res.hop.size));
    }
    for (const t of TYPES) legend.append(h('li', {}, swatch(t), TYPE_LABELS_IT[t], h('span', { class: 'n', text: counts[t] })));

    commonsBox.hidden = !(res && store.state.seeds.size > 1);
    commons.replaceChildren();
    if (!commonsBox.hidden) {
      const rank = n => isArtist(n) ? 0 : n.type === 'group' ? 1 : 2;
      commonsList.sort((a, b) => rank(a) - rank(b) || b.deg - a.deg);
      if (!commonsList.length) {
        commons.append(h('p', { class: 'empty', text: 'Nessun nodo è raggiunto da tutte le partenze. Aumenta la distanza o riammetti qualche sfavorito.' }));
      }
      for (const n of commonsList.slice(0, 16)) {
        commons.append(h('button', {
          class: 'plain', title: `${n.name} (${typeLabel(n.type)})`,
          onclick: () => { if (isInView().has(n.id)) { store.select(n.id); onCenterOn(n.id); } },
        }, swatch(n.type), n.name));
      }
      if (commonsList.length > 16) {
        commons.append(h('p', { class: 'empty', text: `e altri ${commonsList.length - 16}` }));
      }
    }

    hubs.replaceChildren();
    if (!res) return;
    const top = [...res.hop.keys()].filter(id => !store.state.seeds.has(id)).map(id => byId.get(id))
      .sort((a, b) => b.deg - a.deg).slice(0, 5);
    for (const n of top) {
      hubs.append(h('li', {},
        swatch(n.type),
        h('span', { class: 'who' },
          h('span', { class: 'nm', text: n.name, title: n.name }),
          h('span', { class: 'meta', text: `${typeLabel(n.type)}, ${n.deg} collegamenti` })),
        h('span', { class: 'acts' },
          h('button', { class: 'mini no', text: 'Evita', 'aria-label': `Evita ${n.name}`, onclick: () => store.addBlocked(n.id) }))));
    }
  }

  q.addEventListener('input', renderResults);

  const unsubscribe = store.subscribe(({ last }) => {
    renderChips();
    renderResults();
    renderStats(last.res, last.base);
  });

  // primo render con stato iniziale (nessun seed)
  renderChips();
  renderResults();
  renderStats(null, 0);

  return {
    destroy: () => { unsubscribe(); q.removeEventListener('input', renderResults); },
  };
}
