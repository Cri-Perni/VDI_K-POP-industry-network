# K-Pop Network Analysis — Guida al Funzionamento

## 1. Panoramica Generale

Applicazione web per visualizzare le relazioni nell'industria **K-Pop** sotto forma di **grafo interattivo**. Ogni nodo è un'entità (agenzia, gruppo musicale, idol), ogni arco è una relazione (management, membership, collaborazione).

**Tecnologie utilizzate:**
- **D3.js v7** — simulazione fisica force-directed
- **Canvas 2D API** — rendering delle entità grafiche
- **Tailwind CSS v4** — interfaccia utente
- **JavaScript ES6** — logica applicativa

---

## 2. Architettura del Sistema

### Diagramma di flusso

```
                    ┌──────────────────────┐
                    │   CSV (nodi + archi) │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │  initialize()        │
                    │  Carica e parsifica  │
                    │  i dati              │
                    └──────┬──────────┬────┘
                           │          │
              ┌────────────▼──┐  ┌───▼────────────┐
              │ initCanvas()  │  │ setupListeners() │
              │ Crea canvas   │  │ Aggancia        │
              │ e simulazione │  │ eventi UI       │
              └───────┬───────┘  └────────────────┘
                      │
              ┌───────▼────────┐
              │  updateGraph() │ ←── Cambi filtri / resize
              │  Filtra dati   │
              │  Avvia fisica  │
              └───────┬────────┘
                      │
              ┌───────▼────────┐
              │  simulation    │
              │  .on("tick")   │──→ draw() [Canvas]
              │  Calcola       │
              │  posizioni     │
              └────────────────┘
```

### Classi e metodi principali

```
KPopNetworkGraph
├── initialize()        — Entry point: carica dati, inizializza canvas e UI
├── initCanvas()        — Crea elemento <canvas> e motore D3-force
├── updateGraph()       — Filtra nodi/archi, aggiorna simulazione
├── draw()              — Renderizza il grafo su canvas (60fps)
│
├── Mouse handlers
│   ├── onMouseDown()   — Inizio drag (nodo o pan)
│   ├── onMouseMove()   — Drag/hover
│   ├── onMouseUp()     — Fine drag
│   ├── onClick()       — Selezione nodo / deselezione
│   ├── onWheel()       — Zoom
│   └── onMouseLeave()  — Pulisce hover
│
├── selectNode()        — Seleziona nodo, mostra dettagli, centra
├── clearNodeSelection() — Deseleziona
├── showNodeDetails()   — Popola sidebar con info e connessioni
│
├── setupSearch()       — Ricerca con debounce (80ms)
├── applySearchHighlight() — Evidenzia risultati ricerca
│
├── resetZoom()         — Torna alla vista iniziale
├── panToNode()         — Anima il centramento su un nodo
│
└── Helpers
    ├── findNodeAt()    — Hit detection (screen → nodo)
    ├── screenToWorld() — Coordinata schermo → mondo
    ├── getActiveNodes()— Nodi attualmente nella simulazione
    └── getActiveEdges()— Archi attualmente nella simulazione
```

---

## 3. Dati in Ingresso

### Formato CSV

**K-pop_node.csv** (4674 nodi)
| Campo | Esempio | Descrizione |
|---|---|---|
| `id` | `SM_Entertainment` | Identificativo univoco |
| `name` | `SM Entertainment` | Nome visualizzato |
| `type` | `label` | Tipo: `label`, `group`, `person`, `male`, `female` |

**K-pop_edge.csv** (5094 archi)
| Campo | Esempio | Descrizione |
|---|---|---|
| `source` | `SM_Entertainment` | ID nodo sorgente |
| `target` | `NCT_127` | ID nodo destinazione |

### Inferenza del tipo di relazione

Il tipo di relazione non è esplicito nei dati, ma viene inferito automaticamente dal codice (`app.js:113-129`):

```
Se source.type === "label"       → relazione = "management"
Se source.type è persona e
   target.type === "group"       → relazione = "membership"
Altrimenti                       → relazione = "association"
```

### Colori associati

| Tipo nodo | Colore | Ruolo |
|---|---|---|
| `label` | 🔴 Rosso | Agenzia di management |
| `group` | 🔵 Blu | Gruppo musicale |
| `person` | 🟢 Verde | Idol generico |
| `male` | 🔷 Cyan | Idol maschile |
| `female` | 🩷 Rosa | Idol femminile |

| Tipo relazione | Colore | Significato |
|---|---|---|
| `management` | 🔴 Rosso | Contratto agenzia → artista/gruppo |
| `membership` | 🔵 Blu | Appartenenza idol → gruppo |
| `association` | 🟢 Verde | Collaborazione o altra relazione |

---

## 4. Motore Fisico (D3 Force Simulation)

### Come funziona

La simulazione force-directed assegna forze fisiche a ogni nodo:

```
Nodo caricato ──→ Forza di repulsione (charge)    ← allontana nodi tra loro
              │
              ├──→ Forza elastica (link)           ← tiene uniti i nodi collegati
              │
              ├──→ Forza centripeta (center)       ← mantiene tutto al centro
              │
              └──→ Forza di collisione (collide)   ← evita sovrapposizioni
```

Il sistema evolve nel tempo (tick dopo tick) fino a raggiungere un equilibrio stabile.

### Parametri configurati

| Parametro | Valore | Effetto |
|---|---|---|
| `chargeStrength` | -80 | Repulsione tra nodi (più alto = più spaziati) |
| `linkDistance` | 75 | Lunghezza ideale degli archi |
| `collisionRadius` | 18 | Raggio minimo tra nodi |
| `alphaUpdateRestart` | 0.15 | Energia iniziale quando si aggiungono nodi |
| `alphaTargetDrag` | 0.15 | Reattività durante il trascinamento |

### Ciclo di vita della simulazione

```
updateGraph() chiamata
       │
       ▼
simulation.nodes(filteredNodes)
simulation.force("link").links(filteredEdges)
       │
       ▼
Se si AGGIUNGONO nodi → alpha = 0.15 (energia media)
Se si RIMUOVONO nodi → alpha = 0.03 (energia minima)
       │
       ▼
Ogni tick: D3 calcola le nuove posizioni
       │
       ▼
draw() → Canvas aggiorna la grafica
       │
       ▼
alpha decade a 0 → simulazione si ferma
```

---

## 5. Rendering (Canvas 2D)

### Perché Canvas invece di SVG?

| Caratteristica | SVG | Canvas |
|---|---|---|
| N. elementi DOM | 1 per nodo + 1 per arco | 1 totale |
| Performance con 5000 elementi | 🟠 Lento (reflow DOM) | 🟢 Veloce (GPU) |
| Hit detection | Automatizzata (eventi DOM) | Manuale (calcolo coordinate) |
| Zoom/Pan | D3 zoom trasforma `<g>` | `ctx.translate()` / `ctx.scale()` |
| Qualità testo | 🟢 Nitido | 🟠 Leggermente meno nitido |

### Struttura del metodo draw()

```
draw()
│
├── 1. Reset trasformazione (HiDPI scaling)
├── 2. Sfondo scuro (#0f172a)
├── 3. Applica zoom/pan (ctx.translate + ctx.scale)
│
├── 4. Determina stato evidenziazione
│   ├── searchQuery  → highlight matchedIds
│   ├── selectedNode → highlight nodo + vicini
│   └── hoveredNode  → highlight nodo + vicini
│
├── 5. Disegna ARCHI (link)
│   ├── Itera activeEdges
│   ├── globalAlpha in base a evidenziazione
│   └── strokeStyle in base al tipo (management/membership/association)
│
├── 6. Disegna NODI (cerchi)
│   ├── Itera activeNodes con viewport culling
│   ├── fillStyle in base al tipo nodo
│   ├── Anello bianco extra per hovered/selected
│   └── globalAlpha in base a evidenziazione
│
└── 7. Disegna ETICHETTE (solo se zoom > 0.4x)
    ├── Itera activeNodes con viewport culling
    └── fillText() con nome nodo
```

### Viewport culling

```
    ┌─── Schermo ────┐
    │  Canvas        │
    │  ┌─────────┐   │
    │  │ Viewport │   │  ← Solo nodi in quest'area
    │  │ (visibile)│  │    vengono disegnati
    │  └─────────┘   │
    │                │
    └────────────────┘
    ╔══ Nodo fuori viewport ═══╗  ← SKIP (non disegnato)
    ╚═══════════════════════════╝
```

---

## 6. Interazione Utente

### Hover

```
Mouse si muove sul canvas
      │
      ▼
screenToWorld(e) → coordinate mondo (wx, wy)
      │
      ▼
findNodeAt(wx, wy) → cerca nodo più vicino
      │
      ▼
Se nodo trovato e diverso da hoveredNode:
      │
      ▼
hoveredNode = nodo
draw() → evidenzia nodo + vicini (opacità)
```

### Click su nodo

```
Click sul canvas
      │
      ▼
findNodeAt() → nodo sotto il mouse?
      │
      ├── Sì → selectNode(nodo)
      │         ├── showNodeDetails() → sidebar con nome, tipo, connessioni
      │         ├── highlight nodo + vicini
      │         └── panToNode() → anima il centramento
      │
      └── No → deseleziona (se c'era una selezione)
```

### Drag

```
MouseDown su nodo   → imposta fx/fy del nodo (lo blocca)
MouseDown su sfondo → inizia pan della visuale
      │
      ▼
MouseMove → aggiorna posizione nodo o trasformazione
      │
      ▼
MouseUp → rilascia fx/fy (nodo torna libero)
```

### Zoom (rotellina)

```
Wheel event
      │
      ▼
Calcola nuovo fattore di scala (0.92x o 1.08x)
      │
      ▼
Applica zoom verso il punto sotto il mouse:
  transform.x = mx - delta * (mx - transform.x)
  transform.y = my - delta * (my - transform.y)
  transform.k *= delta
      │
      ▼
draw() → render con nuova trasformazione
```

### Ricerca

```
Input utente
      │
      ▼
Attesa 80ms (debounce)
      │
      ▼
handleSearch()
      │
      ▼
Se query vuota → ripristina vista normale
Se query presente → applySearchHighlight()
      │
      ▼
Itera nodi attivi, matcha nome/id case-insensitive
      │
      ▼
draw() evidenzia nodi matchati
```

---

## 7. Filtri

I checkbox filtro controllano quali **tipi di nodo** sono visibili:

```
filterLabel  ☑ → mostra label (agenzie)
filterGroup  ☑ → mostra group (gruppi)
filterPerson ☑ → mostra person/male/female (idols)
```

Quando un filtro cambia:

```
Change event
      │
      ▼
updateGraph()
      │
      ▼
1. Filtra globalNodes per tipo
2. Crea Set activeNodeIds
3. Filtra globalEdges (solo archi tra nodi visibili)
4. Se selectedNode non è più visibile → clearNodeSelection()
5. simulation.nodes(filteredNodes)
6. simulation.force("link").links(filteredEdges)
7. Restart condizionale (alpha 0.15 se aggiungo, 0.03 se rimuovo)
```

---

## 8. Pannello Dettagli

Quando si clicca un nodo:

```
┌─ Dettagli Entità ──────────────────┐
│  [X]                                │
│                                     │
│  Nome:   NCT 127                    │
│  Tipo:   [Gruppo]                   │
│                                     │
│  Relazioni attive: 12               │
│                                     │
│  Connessioni:                       │
│  ┌─────────────────────────────┐    │
│  │ SM Entertainment  Management│ ← cliccabile
│  │ Taeyong             Membro  │ ← cliccabile
│  │ MARK                Membro  │ ← cliccabile
│  │ ...                         │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

Cliccando una connessione, la selezione si sposta su quel nodo (navigazione nel grafo).

---

## 9. Mappa di Adiacenza (Ottimizzazione)

Pre-calcolata all'avvio per rispondere in O(1) alla domanda "quali nodi sono vicini a questo?":

```
globalEdges.forEach(e => {
    const s = e.source, t = e.target;
    adjacency.get(s).add(t);  // s → t
    adjacency.get(t).add(s);  // t → s
});
```

Usata in:
- **Hover**: evidenzia immediatamente i vicini del nodo sotto il mouse
- **Selezione**: evidenzia i vicini del nodo selezionato

---

## 10. Animazioni

### Centramento su nodo (panToNode)

```
Posizione iniziale (transform.x, transform.y)
         │
         ▼
Calcola targetX, targetY per centrare il nodo
         │
         ▼
requestAnimationFrame(animate)
         │
         ▼
Ogni frame: interpola transform verso target
  t = (now - start) / durata (750ms)
  ease = 1 - (1-t)³  (cubic-out)
  transform.x = lerp(startX, targetX, ease)
  transform.y = lerp(startY, targetY, ease)
  draw()
         │
         ▼
t >= 1 → stop animazione
```

### Reset zoom

Stessa logica ma target = transform identità (x:0, y:0, k:1).

---

## 11. Gestione Errori

Se i file CSV non sono accessibili:

```
try {
    await d3.csv(path)
} catch (error) {
    // Mostra messaggio di errore nel DOM
    loading.innerHTML = `
        Errore nel caricamento dei dati CSV.
        Verifica che la cartella 'data' sia accessibile
        e che il server locale sia avviato.
    `
}
```

---

## 12. Come Avviare

1. Aprire un terminale nella cartella `visualizzazione dei dati/`
2. Avviare un server HTTP locale (es. `npx serve .` o `python -m http.server 8000`)
3. Aprire il browser su `http://localhost:8000/kpop-graph/`
4. Attendere il caricamento dei file CSV

---

## Riferimenti

- Tutto il codice: `kpop-graph/app.js` (~718 righe)
- Interfaccia: `kpop-graph/index.html`
- Documentazione ottimizzazioni: `kpop-graph/OTTIMIZZAZIONI.md`
- Dati: `data/K-pop_node.csv` e `data/K-pop_edge.csv`
