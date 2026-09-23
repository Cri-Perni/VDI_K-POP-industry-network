# Intorni K-pop

Visualizzatore interattivo della rete di collegamenti tra artisti, gruppi
e agenzie K-pop. Parti da uno o più nodi, escludi ciò che non ti interessa,
e osserva l'intorno che si forma con un grafo a forze su canvas.

## Uso

L'app è composta da file statici (nessun bundler, nessuna build). Il
dataset viene caricato con `fetch`, che i browser bloccano se apri il file
`index.html` direttamente (`file://`): serve un server HTTP locale, anche
minimo.

Dalla cartella del progetto:

```bash
python -m http.server 8765
```

oppure, con Node già installato:

```bash
npx http-server -p 8765
```

Poi apri `http://localhost:8765/` nel browser.

## Struttura del progetto

```
index.html               markup della pagina, carica styles.css, D3 e src/main.js
styles.css                tutti gli stili (tema chiaro/scuro incluso)
vendor/
  d3.v7.min.js            libreria D3 v7.9.0, invariata rispetto all'originale
src/
  data/
    data.json             dataset: nodi (artisti/gruppi/agenzie) e archi (collegamenti)
  core/                    logica pura, nessuna dipendenza da DOM/canvas
    graph.js               normalizzazione dati grezzi -> nodes/byId/adj
    neighborhood.js         BFS multi-seed con raggio/blocchi/modalità label
    search.js               ricerca testuale sui nodi
  ui/                      livello di presentazione, dipende da DOM/canvas
    state.js                store centrale (stato + azioni + pub/sub)
    palette.js              lettura colori dal tema CSS, ascolto dark-mode
    dom-helpers.js           costruzione elementi DOM (h, swatch, clip, typeLabel)
    canvas-renderer.js      simulazione d3-force e disegno su canvas
    sidebar.js               ricerca, chip partenze/sfavoriti, statistiche
    detail-panel.js          pannello di dettaglio del nodo selezionato
  main.js                  bootstrap: carica i dati e collega tutti i moduli
test/
  graph.test.js
  neighborhood.test.js
  search.test.js
```

### Perché questa divisione

- **`core/`** contiene solo funzioni pure (input → output, niente `window`
  o `document`): sono testabili in isolamento e sono le stesse identiche
  funzioni usate sia nei test Node sia nel browser.
- **`ui/`** orchestra DOM e canvas. `state.js` è l'unico punto che possiede
  lo stato mutabile; ogni altro modulo si iscrive con `store.subscribe()`
  e reagisce ai cambiamenti, senza chiamarsi a vicenda direttamente.
- **`main.js`** è puro wiring: crea le istanze e le collega. Non contiene
  logica applicativa.

## Sviluppo

### Eseguire i test

Serve solo Node.js ≥ 18 (nessuna dipendenza da installare: si usa il test
runner integrato `node:test`).

```bash
node --test
```

Copre `core/graph.js`, `core/neighborhood.js` e `core/search.js` con test
unitari su dataset di controllo piccoli e verificabili a mano. I moduli in
`ui/` non hanno test automatici (richiedono DOM/canvas reali): la verifica
è visuale, tramite il browser.

### Modificare la logica del grafo

Le funzioni in `core/` sono pure: se cambi `computeNeighborhood` o
`search`, aggiorna anche i test corrispondenti in `test/`, poi verifica con
`node --test`.

### Modificare l'interfaccia

I moduli in `ui/` seguono il pattern "si iscrive allo store": se aggiungi
un nuovo pezzo di UI che deve reagire ai cambiamenti di stato, usa
`store.subscribe(callback)` invece di aggiungere nuove chiamate dirette tra
moduli. Dopo una modifica visuale, avvia il server locale e controlla a
occhio (non ci sono test automatici per questa parte).

### Aggiungere un preset

I preset (i pulsanti "Esempi" nella sidebar) sono definiti in
`src/ui/state.js`, oggetto `PRESETS`. Ogni preset specifica `seeds`,
`blocked`, `radius` e `labelMode`; il pulsante nel markup deve avere
`data-preset="<nomepreset>"`.

## Dataset

`src/data/data.json` contiene due array:

- `nodes`: `[id, tipo, nome]` dove tipo è un indice 0-4 che corrisponde a
  `['group', 'male', 'female', 'person', 'label']` (vedi `TYPES` in
  `src/core/graph.js`)
- `edges`: `[idA, idB]`, collegamento non orientato tra due nodi

Per aggiornare il dataset, basta sostituire questo file mantenendo lo
stesso formato: nessun altro file dipende dalla sua origine.
