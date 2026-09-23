// ui/detail-panel.js
// Pannello di dettaglio del nodo selezionato: nome, tipo, grado, vicini nel
// grafico visualizzato, chi lo raggiunge (se non è un seed), azioni rapide
// (parti da qui / sfavorisci). Si iscrive allo store per stato.selected;
// usa getViewNode/getViewNeighbors del renderer per i dati "nel grafico
// attuale" (che vivono nel renderer, non nello store).

import { h, swatch, typeLabel } from './dom-helpers.js';

/**
 * @param {object} opts
 * @param {object} opts.store
 * @param {Map<number, object>} opts.byId
 * @param {HTMLElement} opts.box   contenitore #detail (assoluto, hidden by default)
 * @param {(id:number) => object|undefined} opts.getViewNode
 * @param {(id:number) => Set<number>} opts.getViewNeighbors
 * @param {(id:number) => void} opts.onCenterOn
 */
export function createDetailPanel({ store, byId, box, getViewNode, getViewNeighbors, onCenterOn }) {
  function render() {
    const id = store.state.selected;
    const n = id != null ? getViewNode(id) : null;
    if (!n) { box.hidden = true; return; }

    const near = [...getViewNeighbors(id)].map(v => getViewNode(v)).filter(Boolean).sort((a, b) => b.deg - a.deg);
    const isSeed = store.state.seeds.has(id);
    const seedNames = n.by.filter(s => s !== id).map(s => byId.get(s).name);

    box.replaceChildren(...[
      h('button', { class: 'close', text: '×', 'aria-label': 'Chiudi', onclick: () => store.select(null) }),
      h('h3', { text: n.name }),
      h('p', { class: 'sub' }, swatch(n.type), `${typeLabel(n.type)}, id ${n.id}`),
      h('p', { text: `${n.deg} collegamenti in totale, ${near.length} in questo grafico.` }),
      h('p', { text: isSeed ? 'È un nodo di partenza.' : `A ${n.hop} ${n.hop === 1 ? 'passo' : 'passi'} da una partenza.` }),
      !isSeed && seedNames.length
        ? h('p', { text: 'Raggiunto da: ' + seedNames.slice(0, 4).join(', ') + (seedNames.length > 4 ? ` e altri ${seedNames.length - 4}` : '') + '.' })
        : null,
      near.length
        ? h('div', {},
            h('p', { class: 'lbl', text: 'Collegato a' }),
            h('div', { class: 'nbrs' }, near.slice(0, 10).map(v => h('button', {
              text: v.name, title: v.name,
              onclick: () => { store.select(v.id); onCenterOn(v.id); },
            }))))
        : null,
      h('div', { class: 'btnrow' },
        h('button', { class: 'btn primary', text: isSeed ? 'Togli dalle partenze' : 'Parti da qui', onclick: () => store.toggleSeed(id) }),
        h('button', { class: 'btn', text: 'Sfavorisci', onclick: () => store.addBlocked(id) })),
    ].filter(Boolean));
    box.hidden = false;
  }

  const unsubscribe = store.subscribe(render);
  render();

  return { destroy: unsubscribe };
}
