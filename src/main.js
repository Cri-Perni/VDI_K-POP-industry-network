// main.js
// Bootstrap dell'applicazione: carica i dati, costruisce il grafo, crea lo
// store e i tre moduli UI (canvas, sidebar, detail-panel), e collega i
// controlli del form (raggio, modalità label, checkbox, preset, bottone fit).
// Nessuna logica applicativa qui: solo wiring.

import { buildGraph } from './core/graph.js';
import { createStore } from './ui/state.js';
import { readPalette, watchPalette } from './ui/palette.js';
import { createCanvasRenderer } from './ui/canvas-renderer.js';
import { createSidebar } from './ui/sidebar.js';
import { createDetailPanel } from './ui/detail-panel.js';
import { h } from './ui/dom-helpers.js';

const $ = id => document.getElementById(id);

async function main() {
  const rawData = await fetch('src/data/data.json').then(r => {
    if (!r.ok) throw new Error(`Impossibile caricare i dati (${r.status})`);
    return r.json();
  });
  const { nodes, byId, adj } = buildGraph(rawData);

  const store = createStore({ adj, byId });

  const stage = $('stage'), cv = $('cv'), tip = $('tip'), msg = $('msg');

  const renderer = createCanvasRenderer({
    stage, cv, tip, store, adj, byId, getPalette: readPalette,
  });
  watchPalette(palette => renderer.setPalette(palette));

  const sidebar = createSidebar({
    store, nodes, byId,
    els: {
      q: $('q'), results: $('results'),
      seeds: $('seeds'), blocked: $('blocked'),
      nSeeds: $('n-seeds'), nBlocked: $('n-blocked'), rOut: $('r-out'),
      stats: $('stats'), legend: $('legend'),
      commonsBox: $('commonsBox'), commons: $('commons'), hubs: $('hubs'),
    },
    onCenterOn: id => renderer.centerOn(id),
    isInView: () => renderer.getViewIds(),
  });

  const detailPanel = createDetailPanel({
    store, byId, box: $('detail'),
    getViewNode: id => renderer.getViewNode(id),
    getViewNeighbors: id => renderer.getViewNeighbors(id),
    onCenterOn: id => renderer.centerOn(id),
  });

  /* --- messaggio vuoto / intorno troppo grande --- */
  function showEmptyMessage() {
    msg.hidden = false;
    msg.replaceChildren(h('div', { class: 'card' },
      h('h3', { text: 'Scegli da dove partire' }),
      h('p', { text: "Cerca un artista, un gruppo o un'agenzia nella colonna a sinistra e premi Parti. Con più partenze vedrai chi le collega." }),
      h('div', { class: 'btnrow' },
        h('button', { class: 'btn primary', 'data-preset': 'a', text: 'Prova con EXO e SHINee' }))));
  }
  function showOverflowMessage(count) {
    msg.hidden = false;
    msg.replaceChildren(h('div', { class: 'card' },
      h('h3', { text: `Intorno troppo grande: ${count} nodi` }),
      h('p', { text: 'Sono troppi da disegnare. Riduci la distanza, nascondi le agenzie oppure sfavorisci gli hub che portano ovunque.' })));
  }
  store.subscribe(({ last, overflow }) => {
    if (overflow != null) { showOverflowMessage(overflow); return; }
    msg.hidden = !!last.res; // se c'è un risultato, nascondi il messaggio
    if (!last.res) showEmptyMessage();
  });

  /* --- controlli del form --- */
  const radiusInput = $('radius'), labelModeSelect = $('labelMode'), commonModeSelect = $('commonMode');
  const showBridgesCheck = $('showBridges'), showNamesCheck = $('showNames');

  radiusInput.addEventListener('input', e => store.setRadius(+e.target.value));
  labelModeSelect.addEventListener('change', e => store.setLabelMode(e.target.value));
  showBridgesCheck.addEventListener('change', e => store.setShowBridges(e.target.checked));
  showNamesCheck.addEventListener('change', e => store.setShowNames(e.target.checked));
  commonModeSelect.addEventListener('change', e => store.setCommonMode(e.target.value));

  /* --- preset (delegazione su tutto il documento: i pulsanti sono sia nella
     sidebar sia nel messaggio "scegli da dove partire") --- */
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-preset]');
    if (!b) return;
    const applied = store.applyPreset(b.dataset.preset);
    radiusInput.value = applied.radius;
    labelModeSelect.value = applied.labelMode;
    commonModeSelect.value = store.state.commonMode;
    $('q').value = '';
  });

  /* --- bottone "adatta alla vista" --- */
  $('fit').addEventListener('click', () => renderer.fit(true));

  /* --- dimensionamento iniziale del canvas --- */
  renderer.resize();

  /* --- stato iniziale: nessun seed, mostra il messaggio di benvenuto --- */
  store.commit(false);

  // esposto per debug da console, comodo per provare senza passare dalla UI
  window.kpop = { store, byId, adj, renderer, sidebar, detailPanel };
}

main().catch(err => {
  console.error(err);
  document.body.innerHTML = `<p style="padding:24px;font:16px system-ui">Errore nel caricamento dell'app: ${err.message}. Assicurati di servire questi file via HTTP (es. <code>python -m http.server</code>) e non aprendo direttamente il file.</p>`;
});
