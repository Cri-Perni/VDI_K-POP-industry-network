# 🇰🇷 K-Pop Network Analysis — Visualizzazione dell'Industria K-Pop

Applicazione web avanzata ed interattiva per l'esplorazione e la visualizzazione della rete delle relazioni nell'industria musicale del **Korean Pop (K-Pop)**.

Il sistema modella le connessioni tra le principali **agenzie discografiche (labels)**, i **gruppi musicali** e i **singoli artisti (idol)** tramite grafi interattivi in **modalità 2D e 3D**, consentendo un'analisi approfondita delle strutture aziendali, delle appartenenze ai gruppi e delle collaborazioni artistiche.

---

## 📸 Anteprima e Screenshot

> [!NOTE]
> *Gli screenshot dell'applicazione possono essere inseriti nella cartella [`docs/screenshots/`](./docs/screenshots/) con i nomi di file indicati di seguito.*

### 🎨 Visualizzazione 2D (Canvas API & D3 Force)
![Vista 2D del Grafo K-Pop](./docs/screenshots/2d-network-view.png)
*Visualizzazione bidimensionale force-directed renderizzata ad alte prestazioni tramite Canvas 2D API. Supporta zoom, pan, trascinamento dei nodi ed evidenziazione dei vicini di primo livello.*

---

### 🌐 Visualizzazione 3D (WebGL & Orbit Controls)
![Vista 3D del Grafo K-Pop](./docs/screenshots/3d-network-view.png)
*Visualizzazione tridimensionale WebGL ad alta frequenza di fotogrammi con controlli d'orbita a 360°, simulazione spaziale, widget direzionale UI e slider di profondità BFS delle relazioni.*

---

### 🔍 Ricerca e Dettagli Entità
![Ricerca e Card Dettagli Entità](./docs/screenshots/search-and-details.png)
*Pannello di ricerca istantanea con evidenziazione in tempo reale, filtri per tipologia di entità e card informativa interattiva per la navigazione tra le relazioni collegate.*

---

## ✨ Caratteristiche Principali

* **Dual-Mode 2D & 3D:** Passaggio istantaneo tra la vista 2D (Canvas API + D3.js) e la vista 3D (WebGL + Three.js / Orbit Controls).
* **Controlli d'Orbita 3D Completi:** Telecamera 3D a 360° con asse fisso (Pole Lock) e widget fluttuante con frecce direzionali (◄ ► ▲ ▼) per un orientamento guidato della vista.
* **Profondità Relazionale Dinamica (BFS Hops):** Slider in modalità 3D per esplorare la rete di connessioni attorno al nodo selezionato a profondità scalabile (da 1 a 4 salti di distanza).
* **Filtri Tipologia Entità:** Possibilità di filtrare dinamicamente i nodi del grafo per:
  * 🏢 **Agenzie (Labels):** *Es. SM Entertainment, HYBE, YG, JYP*
  * 👥 **Gruppi Musicali:** *Es. BTS, BLACKPINK, EXO, TWICE*
  * 👤 **Idol / Persone:** *Singoli artisti maschili e femminili*
* **Ricerca Istantanea debounciata:** Ricerca in tempo reale per nome entità con isolamento visivo dei risultati trovati.
* **Messa a Fuoco Fluida & Inseguimento:** Messa a fuoco automatica e centrata sul nodo selezionato sia in vista 2D che 3D.
* **Card Dettagli Interattiva:** Sidebar dinamica che mostra la tipologia dell'entità, il conteggio delle relazioni attive e l'elenco cliccabile di tutti i collegamenti diretti.

---

## 🛠️ Stack Tecnologico

* **Frontend Logic:** JavaScript ES6 Modulare (Architettura a Mixin: `data.js`, `renderer.js`, `renderer3d.js`, `navigation.js`, `selection.js`, `interaction.js`, `filters.js`, `search.js`, `graph.js`).
* **Motore Fisico:** [D3.js v7](https://d3js.org/) (`d3-force` per la simulazione fisica 2D e calcoli di forza).
* **Motore 3D:** [3d-force-graph](https://github.com/vasturiano/3d-force-graph) / [Three.js](https://threejs.org/) (Rendering WebGL e `OrbitControls`).
* **Rendering 2D:** HTML5 Canvas 2D API ottimizzato con culling delle coordinate fuori viewport.
* **Styling & UI:** [Tailwind CSS v4](https://tailwindcss.com/) + Typography Google Fonts (Inter).

---

## 📂 Struttura del Progetto

```
visualizzazione dei dati/
├── README.md                      # Documentazione principale del progetto
├── Progetto                       # Descrizione sintetica del dominio dei dati
├── data/                          # Dataset CSV sorgente
│   ├── K-pop_node.csv             # Definizione dei nodi (id, name, type)
│   └── K-pop_edge.csv             # Definizione delle relazioni (source, target)
├── docs/                          # Documentazione tecnica e media
│   ├── DOCUMENTO_TECNICO.md       # Relazione tecnica di progetto
│   ├── FUNZIONAMENTO.md           # Guida architetturale al funzionamento
│   ├── OTTIMIZZAZIONI.md          # Note sulle ottimizzazioni prestazionali
│   └── screenshots/               # Cartella per le immagini dell'applicazione
│       ├── .gitkeep
│       ├── 2d-network-view.png    # [Segnaposto] Screenshot 2D
│       ├── 3d-network-view.png    # [Segnaposto] Screenshot 3D
│       └── search-and-details.png # [Segnaposto] Screenshot Ricerca/Dettagli
├── kpop-graph/                    # Codice sorgente dell'applicazione Web
│   ├── index.html                 # Struttura HTML dell'applicazione
│   ├── style.css                  # Stili personalizzati e utility CSS
│   └── js/                        # Moduli JavaScript ES6
│       ├── config.js              # Configurazione colori, raggi e forze
│       ├── data.js                # Caricamento e parsing dati CSV
│       ├── filters.js             # Gestione filtri di visualizzazione
│       ├── graph.js               # Classe principale KPopNetworkGraph
│       ├── interaction.js         # Eventi mouse 2D (pan, drag, zoom)
│       ├── main.js                # Entry point applicativo
│       ├── navigation.js          # Inquadratura fluida e reset zoom
│       ├── renderer.js            # Engine di rendering Canvas 2D
│       ├── renderer3d.js          # Engine di rendering WebGL 3D & OrbitControls
│       ├── search.js              # Ricerca e highlight entità
│       └── selection.js           # Gestione selezione e sidebar dettagli
└── scripts/                       # Script accessori di pulizia/deduplicazione
    └── deduplicate.js
```

---

## 📊 Formato Dati CSV

L'applicazione carica i dati in tempo reale dai file CSV ubicati nella cartella `data/`:

### 1. `K-pop_node.csv` (4.674 Entità)
| Campo | Tipo | Descrizione | Valori Ammessi |
|---|---|---|---|
| `id` | String | Identificativo univoco dell'entità | es. `SM_Entertainment`, `BTS` |
| `name` | String | Nome leggibile dell'entità | es. `SM Entertainment`, `BTS` |
| `type` | String | Categoria dell'entità | `label`, `group`, `person`, `male`, `female` |

### 2. `K-pop_edge.csv` (5.094 Relazioni)
| Campo | Tipo | Descrizione | Relazione Inferita |
|---|---|---|---|
| `source` | String | ID dell'entità sorgente | `label` ➔ Management |
| `target` | String | ID dell'entità destinazione | `artist` ➔ `group` (Membership) |

---

## 🚀 Avvio Locale

Poiché l'applicazione utilizza **ES6 Modules** ed effettua il caricamento dei file CSV tramite `fetch`/`d3.csv`, deve essere servita tramite un server web locale.

### Metodo 1: Node.js / `npx serve` (Consigliato)
Eseguire nella cartella del progetto:
```bash
npx serve kpop-graph
```
Aprire nel browser l'indirizzo mostrato nel terminale (es. `http://localhost:3000`).

### Metodo 2: Python HTTP Server
Eseguire nella radice del progetto:
```bash
python -m http.server 8000
```
Aprire nel browser: `http://localhost:8000/kpop-graph/`

### Metodo 3: VS Code Live Server
Aprire la cartella in Visual Studio Code e fare click su **"Go Live"** avviando l'estensione Live Server sul file `kpop-graph/index.html`.
