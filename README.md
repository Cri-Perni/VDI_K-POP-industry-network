# Intorni K-pop — K-POP Industry Network

Applicazione web interattiva per l'esplorazione, l'analisi e la visualizzazione delle reti di relazioni nell'industria musicale del K-pop (artisti, gruppi, agenzie discografiche e professionisti del settore).

Il progetto permette di isolare ed esplorare l'intorno relazionale (*ego-network* o *multi-seed neighborhood*) a partire da uno o più nodi selezionati, identificare nodi ponte ("bridge") in comune, escludere intermediari ("sfavoriti") per scoprire percorsi alternativi e ottenere suggerimenti personalizzati tramite algoritmi di *link prediction*.

---

## Funzionalità Principali

- **Ricerca intelligente ed estesa**:
  - Ricerca per nome con supporto completo all'alfabeto Hangul (caratteri coreani) e caratteri latini, insensibile a maiuscole/minuscole e segni diacritici (`norm()`).
  - Ricerca diretta tramite ID numerico del nodo.
  - Ordinamento per pertinenza (corrispondenza esatta, prefisso, sottostringa) e popolarità (grado di connessione del nodo).
- **Esplorazione Multi-Seed & Raggio di Distanza**:
  - Possibilità di selezionare uno o più nodi di partenza contemporaneamente (*seeds*).
  - Regolazione del raggio massimo di esplorazione da 1 a 4 passi (*hops*).
- **Filtri e Nodi Sfavoriti (Blocked)**:
  - Esclusione mirata di specifici nodi per impedire che il calcolo dell'intorno passi attraverso di essi, rivelando connessioni meno ovvie.
- **Gestione avanzata delle Agenzie (Label)**:
  Le agenzie collegano spesso centinaia di artisti, rischiando di far esplodere la dimensione del grafo:
  - **Fanno da ponte** (*through*): attraversate come qualsiasi altro nodo.
  - **Visibili, ma non fanno da ponte** (*endpoint*): visibili nel grafo come foglie/collegamenti diretti, senza espansione ulteriore.
  - **Nascoste** (*hide*): escluse sia dai cammini che dalla visualizzazione.
- **Identificazione Nodi in Comune & Ponti (Bridge)**:
  - Calcolo e visualizzazione in risalto dei nodi raggiunti da tutte le partenze o da almeno due partenze.
  - Tracciamento visivo dei cammini minimi (*shortest paths*) tra le partenze e i nodi in comune.
- **Classifica dei Nodi Suggeriti (Link Recommendation)**:
  - Algoritmo ispirato al **Resource Allocation Index (RAI)**:
    - Premia i nodi raggiunti da più partenze.
    - Premia le connessioni dirette e i cammini che passano per intermediari a basso grado (connessioni rare e specifiche).
    - Penalizza i passaggi attraverso grandi hub o grandi agenzie.
  - Visualizzazione trasparente del punteggio e dei cammini intermedi nella sidebar e nel pannello di dettaglio.
- **Hub dell'Intorno**:
  - Classifica immediata dei nodi con il maggior numero di connessioni nell'intorno corrente.
- **Rendering ad Alte Prestazioni con Layout a Forze**:
  - Simulazione fisica interattiva guidata da forze (`d3-force`) disegnata su HTML5 Canvas.
  - Navigazione fluida: Pan (trascinamento dello sfondo), Zoom (rotella del mouse / pinch), trascinamento dei singoli nodi, centratura automatica sulla selezione.
- **Preset Didattici**:
  - Scenari preconfigurati per esplorare casi studio reali (es. connessioni tra *EXO* e *SHINee* con e senza *S.M. Entertainment*; relazioni tra membri di *BEAST*, *4Minute*, *Brown Eyed Girls* e *BIGBANG* con e senza intermediari come *Shinsadong Tiger* o *Hyuna*).
- **Tema Chiaro e Scuro**:
  - Rilevamento automatico delle preferenze di sistema (`prefers-color-scheme`) e transizione dinamica della palette colori del canvas.
- **Protezione da Sovraccarico**:
  - Soglia massima di nodi visualizzabili (`MAX_NODES = 1500`) con avviso all'utente per garantire sempre fluidità a 60 fps.

---

## Tipologie di Nodi e Palette Colori

| Tipo | Categoria | Descrizione |
| :--- | :--- | :--- |
| <span style="color:#6C4CF1">●</span> `group` | **Gruppo** | Band o gruppi musicali (es. EXO, BIGBANG, SHINee) |
| <span style="color:#1E88E5">●</span> `male` | **Uomo** | Artisti e performer maschili |
| <span style="color:#E8437F">●</span> `female` | **Donna** | Artiste e performer femminili |
| <span style="color:#0FA39A">●</span> `person` | **Persona** | Produttori musicali, compositori e staff del settore |
| <span style="color:#7C879E">●</span> `label` | **Agenzia** | Agenzie di intrattenimento e case discografiche (es. SM, YG, JYP, Cube) |

---

## Struttura del Progetto

```text
VDI_K-POP-industry-network-main/
├── index.html                 # Pagina principale dell'applicazione
├── styles.css                 # Fogli di stile (layout, palette chiare/scure, responsive)
├── K-pop_node.csv             # Dataset originale nodi (id, type, name)
├── K-pop_edge.csv             # Dataset originale archi (source, target)
│
├── src/
│   ├── main.js                # Bootstrap dell'app: wiring tra dati, store e UI
│   │
│   ├── core/                  # Logica di business pura (zero dipendenze da DOM/Canvas)
│   │   ├── graph.js           # Normalizzazione stringhe (Hangul/diacritici) e costruzione del grafo
│   │   ├── neighborhood.js    # BFS multi-seed, calcolo intorni e cammini minimi
│   │   ├── search.js          # Motore di ricerca testuale e per ID numerico
│   │   └── suggestions.js     # Algoritmo di ranking e raccomandazione nodi (Resource Allocation)
│   │
│   ├── data/
│   │   └── data.json          # Dataset compilato e compresso per caricamento istantaneo
│   │
│   └── ui/                    # Moduli dell'interfaccia utente
│       ├── state.js           # Store reattivo centrale dell'applicazione (Observer pattern)
│       ├── canvas-renderer.js # Simulazione d3-force e disegno su HTML5 Canvas
│       ├── sidebar.js         # Ricerca, chip partenze/sfavoriti, controlli, statistiche e classifiche
│       ├── detail-panel.js    # Scheda descrittiva del nodo selezionato e collegamenti
│       ├── palette.js         # Gestione colori e listener preferenze dark mode
│       └── dom-helpers.js     # Utility per la creazione dichiarativa di elementi DOM
│
├── test/                      # Suite di test unitari (Node.js test runner)
│   ├── graph.test.js          # Test su normalizzazione e costruzione strutture adiacenza
│   ├── neighborhood.test.js   # Test su BFS, filtri agenzie, nodi bloccati e cammini
│   ├── search.test.js         # Test sul motore di ricerca e ordinamenti
│   └── suggestions.test.js    # Test sull'algoritmo di raccomandazione
│
└── vendor/
    └── d3.v7.min.js           # Libreria D3.js v7 (d3-force, d3-zoom)
```

---

## Come Eseguire il Progetto

Poiché l'applicazione utilizza **ES Modules** nativi (`import`/`export`) ed effettua una chiamata `fetch()` per caricare `src/data/data.json`, deve essere servita tramite un server web HTTP locale (non tramite doppio clic con protocollo `file://`, che bloccherebbe le richieste per le policy CORS dei browser moderni).

Non è necessaria alcuna installazione con `npm install` (zero dipendenze esterne di build).

### Opzione 1: Con Python (consigliato se già installato)

Dalla cartella principale del progetto:

```bash
# Con Python 3
python -m http.server 8000
```

Apri il browser su: [http://localhost:8000](http://localhost:8000)

### Opzione 2: Con Node.js (`npx`)

Se hai installato Node.js:

```bash
# Utilizzando serve
npx serve .

# Oppure utilizzando http-server
npx http-server -p 8000 .
```

### Opzione 3: Con estensione Visual Studio Code

1. Apri la cartella del progetto in **VS Code**.
2. Installa l'estensione **Live Server** (di Ritwick Dey).
3. Clicca con il tasto destro su `index.html` e seleziona **"Open with Live Server"**.

---

## Esecuzione dei Test Unitari

Il progetto include **58 test unitari** che verificano la correttezza matematica e logica di tutte le funzioni pure in `src/core/`.

I test utilizzano il test runner nativo di **Node.js** (`node:test` e `node:assert/strict`), quindi non richiedono Jest o configurazioni aggiuntive.

Per eseguire l'intera suite di test:

```bash
node --test
```

Output atteso:
```text
ℹ tests 58
ℹ suites 14
ℹ pass 58
ℹ fail 0
```

---

## 🎮 Controlli e Interazione

### Interazioni sul Canvas
- **Spostamento (Pan)**: Trascina lo sfondo con il tasto sinistro del mouse.
- **Zoom**: Scorri con la rotella del mouse o effettua un gesto di pinch su touchpad/touchscreen.
- **Selezione nodo**: Clicca su un nodo con il tasto sinistro per aprire la scheda di dettaglio.
- **Aggiungi/Rimuovi partenza**: Fai **doppio clic** su un nodo per impostarlo come nodo di partenza.
- **Sfavorisci/Blocca nodo**: Fai **clic con il tasto destro** su un nodo per bloccarlo ed escluderlo dai percorsi.
- **Riposiziona nodi**: Trascina un nodo per guidare la simulazione fisica.
- **Pulsante "Adatta alla vista"**: Riposiziona e adatta lo zoom del grafo per inquadrare tutti i nodi visualizzati.

### Controlli nella Barra Laterale
- **Cerca**: Digita il nome di un artista/gruppo o il suo ID numerico. Dai risultati puoi cliccare su **Parti** o **Evita**.
- **Chip Partenza e Sfavoriti**: Clicca sul nome per centrare la visuale, oppure sulla `×` per rimuoverlo.
- **Distanza massima**: Slider per definire la profondità della BFS (da 1 a 4).
- **Agenzie (label)**: Menu a tendina per scegliere se far attraversare le agenzie (*through*), tenerle solo come estremi (*endpoint*) o nasconderle (*hide*).
- **Evidenzia nodi in comune**: Evidenzia i nodi condivisi tramite un anello dorato e illumina i cammini minimi che li collegano alle partenze.
- **Esempi / Preset**: Pulsanti per caricare scenari ed esplorazioni significative con un solo clic.

---

## 📊 Dati e Fonti

I dati provengono dall'analisi delle connessioni dell'industria K-pop raccolti nei file:
- `K-pop_node.csv`: 4.676 nodi classificati per tipologia.
- `K-pop_edge.csv`: 5.096 collegamenti non orientati (collaborazioni, appartenenze a gruppi, contratti d'agenzia).

Per ottimizzare le prestazioni e ridurre i tempi di avvio, i dati sono stati indicizzati e convertiti in `src/data/data.json`.
