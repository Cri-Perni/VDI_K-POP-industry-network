# Documento Tecnico — K-Pop Network Analysis

> Questo documento descrive in dettaglio ogni tecnologia, algoritmo e scelta progettuale del progetto. Pensato per rispondere a domande tecniche durante l'esame.

---

## Indice

1. [Tecnologie Utilizzate](#1-tecnologie-utilizzate)
2. [D3.js — Force Simulation](#2-d3js--force-simulation)
3. [Canvas 2D API](#3-canvas-2d-api)
4. [Vanilla JavaScript ES6](#4-vanilla-javascript-es6)
5. [Tailwind CSS](#5-tailwind-css)
6. [Algoritmi e Strutture Dati](#6-algoritmi-e-strutture-dati)
7. [Pattern Architetturali](#7-pattern-architetturali)
8. [Ottimizzazioni Performance](#8-ottimizzazioni-performance)
9. [Glossario Tecnico](#9-glossario-tecnico)
10. [Possibili Domande d'Esame](#10-possibili-domande-desame)

---

## 1. Tecnologie Utilizzate

### Stack complessivo

```
┌──────────────────────────────────────────────┐
│                  Browser                      │
│  ┌────────────────────────────────────────┐   │
│  │            Canvas 2D API               │   │  ← Rendering
│  ├────────────────────────────────────────┤   │
│  │         D3.js Force Simulation         │   │  ← Fisica/Layout
│  ├────────────────────────────────────────┤   │
│  │          Vanilla JavaScript ES6        │   │  ← Logica applicativa
│  ├────────────────────────────────────────┤   │
│  │       Tailwind CSS (CDN v4)            │   │  ← Stili UI
│  ├────────────────────────────────────────┤   │
│  │             HTML5 / DOM                │   │  ← Struttura pagina
│  └────────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

### 1.1 D3.js v7 (Data-Driven Documents)

| Aspetto | Dettaglio |
|---|---|
| **Versione** | 7.x (caricata da CDN: `d3js.org/d3.v7.min.js`) |
| **Ruolo nel progetto** | Motore di simulazione force-directed per il calcolo delle posizioni dei nodi |
| **Moduli usati** | `d3-force` (simulazione fisica), `d3-dsv` (parsing CSV), `d3-selection` (non più usato dopo migrazione Canvas) |
| **Licenza** | ISC |

**Cosa fa D3.js in questo progetto:**

D3.js viene utilizzato esclusivamente per il **calcolo delle posizioni** dei nodi tramite il modulo `d3-force`. Il rendering non usa più D3 (dopo la migrazione da SVG a Canvas), ma la simulazione fisica è rimasta in D3 perché è matura, performante e ben documentata.

**Moduli specifici:**
- **`d3.forceSimulation()`** — Crea il motore fisico che gestisce il ciclo di tick
- **`d3.forceLink()`** — Gestisce le forze elastiche tra nodi collegati da archi
- **`d3.forceManyBody()`** — Gestisce la repulsione/attrazione tra tutti i nodi (algoritmo Barnes-Hut)
- **`d3.forceCenter()`** — Forza centripeta che mantiene il grafo centrato nel canvas
- **`d3.forceCollide()`** — Previene la sovrapposizione tra nodi
- **`d3.csv()`** — Funzione per il parsing di file CSV

```js
this.simulation = d3.forceSimulation()          // ← Crea il motore
    .force("link", d3.forceLink()               // ← Forza elastica degli archi
        .id(d => d.id)                          // ← Come risolvere gli ID nei dati
        .distance(CONFIG.forces.linkDistance))  // ← Lunghezza ideale
    .force("charge", d3.forceManyBody()         // ← Repulsione tra nodi
        .strength(CONFIG.forces.chargeStrength))
    .force("center", d3.forceCenter(w, h))      // ← Centraggio
    .force("collision", d3.forceCollide()       // ← Anti-sovrapposizione
        .radius(CONFIG.forces.collisionRadius));
```

### 1.2 Canvas 2D API

| Aspetto | Dettaglio |
|---|---|
| **Specifica** | HTML5 Canvas 2D Context (W3C) |
| **Ruolo** | Rendering di nodi, archi, etichette e highlight interattivi |
| **Vantaggio chiave** | Rendering accelerato via GPU, nessun DOM overhead |

**Metodi Canvas utilizzati nel progetto:**

| Metodo | Utilizzo |
|---|---|
| `ctx.setTransform(a,b,c,d,e,f)` | Imposta la trasformazione iniziale (HiDPI scaling) |
| `ctx.clearRect(x,y,w,h)` | Pulisce il canvas a ogni frame |
| `ctx.save()` / `ctx.restore()` | Salva/ripristina lo stato del contesto grafico |
| `ctx.translate(tx, ty)` | Applica pan della visuale |
| `ctx.scale(k, k)` | Applica zoom della visuale |
| `ctx.fillRect()` | Disegna lo sfondo |
| `ctx.arc(x, y, r, start, end)` | Disegna cerchi (nodi e highlight ring) |
| `ctx.moveTo()` / `ctx.lineTo()` / `ctx.stroke()` | Disegna linee (archi) |
| `ctx.fillText()` | Disegna etichette testuali |
| `ctx.beginPath()` / `ctx.closePath()` | Definisce percorsi di disegno |
| `ctx.globalAlpha` | Controlla l'opacità (selezione/hover/search highlight) |
| `ctx.fillStyle` / `ctx.strokeStyle` | Colori di riempimento e contorno |

**HiDPI / Retina display:**

```js
const dpr = window.devicePixelRatio || 1;
canvas.width = width * dpr;       // ← dimensioni fisiche (pixel reali)
canvas.height = height * dpr;
canvas.style.width = width + "px"; // ← dimensioni logiche (CSS)
canvas.style.height = height + "px";

// In draw():
ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // ← scala tutto
```

Senza questo accorgimento, su schermi Retina il canvas apparirebbe sgranato (ogni pixel CSS viene mappato a 1 pixel fisico invece di usare i 2-3 pixel fisici disponibili).

### 1.3 Vanilla JavaScript ES6+

| Aspetto | Dettaglio |
|---|---|
| **Standard** | ECMAScript 2015+ (ES6, ES7, ES8) |
| **Nessun framework** | Scelta deliberata per evitare overhead di React/Vue/Angular |
| **Nessun bundler** | Scelta deliberata: nessun Webpack/Vite/Parcel |

**Feature ES6+ utilizzate:**

| Feature | Dove | Perché |
|---|---|---|
| **`class`** | Tutto il codice (`class KPopNetworkGraph`) | Organizzazione OOP chiara |
| **`async/await`** | `initialize()` | Caricamento asincrono dei CSV con codice lineare |
| **`Promise.all()`** | `initialize()` | Carica nodi e archi IN PARALLELO (non sequenziale) |
| **Arrow function `() =>`** | Ovunque | `this` lessicale, codice conciso |
| **`const` / `let`** | Ovunque | Scope a blocco, nessun hoisting |
| **`Map`** | `this.adjacency`, `nodeTypeMap` | Lookup O(1) con chiavi non-stringa |
| **`Set`** | `connectedNodeIds`, `searchMatchedIds`, `activeNodeIds` | Insiemi unici con lookup O(1) |
| **Destructuring** | `const [nodesData, edgesData]` | Estrazione multipla da array |
| **Template literal** | `` `${count} nodi trovati}` `` | Stringhe con interpolazione |
| **Optional chaining `?.`** | `this.adjacency.get(s)?.add(t)` | Sicurezza su null/undefined |
| **`Array.filter()`** | Filtraggio nodi/archi | Crea nuovi array senza mutare gli originali |
| **`Array.forEach()`** | Iterazione su array | Piu leggibile di `for` tradizionale |
| **`Array.map()`** | Parsing CSV | Trasformazione array 1:1 |

**Perché nessun framework (React/Vue/Angular):**

Il progetto è una **single-page application** con un unico scopo: visualizzare un grafo interattivo. Un framework come React avrebbe introdotto:
- Overhead di bundle (decine di KB)
- Virtual DOM (inutile con Canvas, che non ha DOM)
- Complessità di stato e ciclo di vita
- Build step obbligatorio (JSX, compilazione)

La scelta di Vanilla JS mantiene il progetto **leggero**, **indipendente** e **direttamente eseguibile** (basta un server HTTP statico).

### 1.4 Tailwind CSS v4

| Aspetto | Dettaglio |
|---|---|
| **Versione** | 4 (caricata da CDN: `@tailwindcss/browser@4`) |
| **Ruolo** | Stilizzazione dell'interfaccia utente (sidebar, header, pannello filtri) |
| **Nessuna build** | Tailwind v4 "browser" compila i CSS al volo via CDN |

**Come funziona Tailwind CSS:**

Tailwind è un framework **utility-first**: non fornisce componenti pre-costruiti ma classi CSS atomiche che corrispondono a singole proprietà CSS:

```html
<div class="bg-slate-800 p-4 rounded-lg border border-slate-700">
    <!-- background-color: #1e293b
         padding: 1rem
         border-radius: 0.5rem
         border: 1px solid #334155 -->
</div>
```

**Vantaggi:**
- Nessun file CSS da scrivere e mantenere
- Design system coerente (colori, spazi, font predefiniti)
- Responsive design nativo con prefissi `sm:`, `md:`, `lg:`
- Dark mode nativa (il progetto usa già la palette `slate-*`)

**Svantaggi:**
- Classi verbose nell'HTML
- Curva di apprendimento per i nomi delle utility
- Dimensione del CSS (parzialmente mitigato dalla CDN v4 che serve solo le utility usate)

---

## 2. D3.js — Force Simulation

### 2.1 Cos'è una Force Simulation

Una **force simulation** (simulazione a forze) è un algoritmo di **layout di grafi** che assegna forze fisiche ai nodi e lascia che il sistema evolva naturalmente verso uno stato di equilibrio stabile.

```
Concettualmente:
                                                
    Nodo A ←━━━━━━━ repulsione ━━━━━━━━→ Nodo B
       │                                      │
       │                                      │
    attrazione (link)                      attrazione (link)
       │                                      │
       │                                      │
    Nodo C ←━━━━━━━ repulsione ━━━━━━━━→ Nodo D
                                                
    Centro ←━━━━━ attrazione centripeta ━━━━━→ tutti i nodi
```

### 2.2 Algoritmo alla base (Barnes-Hut)

D3.js usa l'algoritmo **Barnes-Hut** per ottimizzare il calcolo delle forze di repulsione tra N nodi.

**Senza ottimizzazione (forza bruta):** O(N²) — per ogni nodo, calcola la repulsione con tutti gli altri. Con N=4700 → ~22 milioni di coppie.

**Con Barnes-Hut:** O(N log N) — lo spazio viene suddiviso in un **quadtree** (albero di quadranti). Nodi lontani vengono raggruppati e trattati come un unico centro di massa:

```
     ┌──────┬──────┐
     │  A   │  B   │
     ├──────┼──────┤
     │  C   │  D   │
     └──────┴──────┘
     
     Se il nodo X è qui → per calcolare la repulsione:
     - A, B, C, D sono lontani → si usano come unico punto
       con massa = somma delle masse del quadrante
     - Solo i nodi vicini vengono calcolati singolarmente
```

### 2.3 Ciclo di Tick della Simulazione

```
Ogni "tick" (≈ 1/60s):
     │
     ▼
1. Calcola forze su ogni nodo
   ├── charge: repulsione pairwise (Barnes-Hut)
   ├── link: molla elastica per archi
   ├── center: attrazione verso centro
   └── collide: spinge via nodi sovrapposti
     │
     ▼
2. Aggiorna velocità e posizione
   ├── vx += forza_x * damping
   ├── vy += forza_y * damping
   ├── x += vx
   └── y += vy
     │
     ▼
3. Decrementa alpha (energia)
   ├── alpha = alpha * (1 - alphaDecay)  ← default: alphaDecay ≈ 0.0228
   └── Dopo ≈ 300 tick: alpha < alphaMin → simulazione si ferma
     │
     ▼
4. Chiama il callback .on("tick")
   └── Questo progetto → draw() su Canvas
```

### 2.4 Parametri della Simulazione

| Parametro | Default D3 | Valore nel progetto | Effetto |
|---|---|---|---|
| `alpha` | 1 | 0.15 (restart) | Energia iniziale. Più alto = più movimento |
| `alphaMin` | 0.001 | 0.001 (default) | Soglia sotto cui la simulazione si ferma |
| `alphaDecay` | 0.0228 | 0.0228 (default) | Velocità di decadimento dell'energia |
| `velocityDecay` | 0.4 | 0.4 (default) | Smorzamento: 1 = nessuno, 0 = istantaneo |
| `chargeStrength` | -30 | **-80** | Repulsione tra nodi (negativo) |
| `linkDistance` | 30 | **75** | Lunghezza ideale archi |
| `collisionRadius` | N/A | **18** | Raggio di collisione |

### 2.5 Perché abbiamo ridotto i parametri

Con 4700 nodi, i parametri default di D3 causano:
- **Repulsione forte** (-140 originale) → nodi volano via, ci mettono molto a tornare
- **Collisione grande** (28) → tanta computazione di collision detection
- **Energia alta** (0.4) → molti tick prima di stabilizzarsi

I nuovi valori (-80 charge, 18 collision, 0.15 alpha) riducono i tick necessari del ~60%.

### 2.6 Gestione dei filtri nella simulazione

Quando l'utente cambia un filtro:

```
      FILTRO OFF (nascondo nodi)
         │
         ▼
   filteredNodes = nodi visibili
   filteredEdges = archi tra nodi visibili
         │
         ▼
   simulation.nodes(filteredNodes)     ← aggiorna dataset
   simulation.force("link").links(filteredEdges)
         │
         ▼
   isAddingNodes = false (sto togliendo)
         │
         ▼
   alpha = 0.03 (energia minima)
   restart() (la simulazione riprende MA con poca energia)
         │
         ▼
   I nodi rimasti si riassestano leggermente
   ma senza il caos di una ripartenza completa
```

---

## 3. Canvas 2D API

### 3.1 Cos'è Canvas

Canvas è un elemento HTML5 che fornisce un'area di disegno bitmap manipolabile via JavaScript. A differenza di SVG (che mantiene un albero DOM di elementi vettoriali), Canvas è **immediato**: si disegna, e l'output è solo pixel. Non c'è un "documento" da interrogare o modificare dopo il disegno.

### 3.2 Canvas vs SVG — Differenze Fondamentali

| Caratteristica | SVG | Canvas |
|---|---|---|
| **Modello** | Vettoriale (albero DOM) | Bitmap (pixel) |
| **Elementi** | Ogni forma è un elemento DOM | Non ci sono elementi, solo pixel |
| **Eventi** | `onclick`, `onmouseover` per elemento | Devono essere calcolati manualmente |
| **Rendering** | Lento con molti elementi (ogni elemento è DOM) | Veloce (draw call → GPU) |
| **Zoom** | Le forme vettoriali restano definite | I pixel si ingrandiscono (bisogna ridisegnare) |
| **Accessibilità** | Buona (screen reader leggono il DOM) | Scarsa (solo pixel) |
| **Caso d'uso** | Pochi elementi (< 1000), interattivi | Molti elementi (> 1000), animati |

### 3.3 Pipeline di Rendering

Il metodo `draw()` viene eseguito a ogni tick della simulazione e a ogni interazione utente.

```
draw() chiamato
    │
    ▼
┌─────────────────────────────────────────┐
│ 1. ctx.setTransform(dpr,0,0,dpr,0,0)   │  ← Scaling HiDPI
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 2. ctx.fillStyle = "#0f172a"            │  ← Sfondo
│    ctx.fillRect(0, 0, W, H)            │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 3. ctx.save()                           │  ← Salva stato
│    ctx.translate(tx, ty)               │  ← Zoom/Pan
│    ctx.scale(k, k)                     │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 4. Calcolo highlightedIds               │  ← Stato highlight
│    (search? selected? hovered?)         │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 5. viewport culling                     │  ← Skip nodi fuori
│    vp = {x, y, w, h}                   │     schermo
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 6. for each edge:                       │  ← Archi
│    ctx.beginPath()                     │
│    ctx.moveTo(src.x, src.y)            │
│    ctx.lineTo(tgt.x, tgt.y)            │
│    ctx.strokeStyle = edgeColor         │
│    ctx.globalAlpha = ...               │
│    ctx.stroke()                        │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 7. for each node (se in viewport):      │  ← Nodi
│    ctx.beginPath()                     │
│    ctx.arc(x, y, radius, 0, 2π)        │
│    ctx.fillStyle = nodeColor           │
│    ctx.globalAlpha = ...               │
│    ctx.fill()                          │
│    Anello highlight se hovered/selected│
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 8. if zoom > 0.4:                       │  ← Label
│    for each node (se in viewport):      │
│    ctx.font, ctx.fillText(name)         │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 9. ctx.restore()                        │  ← Ripristina stato
└─────────────────────────────────────────┘
```

### 3.4 Perché il Canvas è più veloce dell'SVG

**Problema con SVG:**
Ogni `<circle>`, `<line>`, `<text>` è un nodo del DOM. Il browser deve:
1. Mantenere l'albero DOM (memoria)
2. Calcolare il layout (reflow)
3. Riprodurre i pixel (repaint)

Con 5000 archi e 4700 nodi: **9700 elementi DOM**. Ogni tick della simulazione modifica `x`, `y`, `x1`, `y1`, `x2`, `y2` di TUTTI questi elementi: il browser esegue 24.700+ assegnazioni di attributi DOM.

**Soluzione Canvas:**
Il Canvas è un singolo elemento `<canvas>` che occupa sempre lo stesso spazio nel DOM. Il contenuto è una **bitmap interna** gestita dalla GPU. Non c'è DOM da aggiornare, non c'è reflow, non c'è repaint. Si chiamano funzioni di disegno (`arc`, `lineTo`, `fillText`) che la GPU esegue direttamente.

### 3.5 Hit Detection su Canvas

A differenza di SVG (che genera eventi del mouse automaticamente per ogni elemento), Canvas richiede il calcolo manuale della posizione del mouse rispetto agli oggetti disegnati.

```js
// 1. Trasforma coordinate schermo → coordinate mondo
screenToWorld(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left - this.transform.x) / this.transform.k,
        y: (e.clientY - rect.top - this.transform.y) / this.transform.k
    };
}

// 2. Cerca il nodo più vicino entro un raggio
findNodeAt(wx, wy) {
    let closest = null;
    let minDist = Infinity;
    for (const n of this.getActiveNodes()) {     // ← O(n) iterazione
        const dx = n.x - wx;
        const dy = n.y - wy;
        const dist = dx*dx + dy*dy;              // ← distanza al quadrato
        const threshold = CONFIG.nodeRadii[n.type] + 3;
        if (dist < threshold*threshold && dist < minDist) {
            minDist = dist;
            closest = n;
        }
    }
    return closest;
}
```

Complessità: **O(N)** con N = nodi visibili. Su 4700 nodi, l'operazione richiede ~0.5ms — trascurabile rispetto a 60fps (16.6ms per frame).

---

## 4. Vanilla JavaScript ES6

### 4.1 Classi ES6

```js
class KPopNetworkGraph {
    constructor() {
        // Inizializza lo stato
    }
    
    async initialize() { ... }   // ← async method
    initCanvas() { ... }
    draw() { ... }
    // ...
}
```

A differenza dei costruttori "funzione + prototype" dell'ES5, la sintassi `class` è **zucchero sintattico** che rende il codice più leggibile ma si comporta allo stesso modo sotto il cofano (prototype chain).

### 4.2 Async/Await e Promise.all

```js
async initialize() {
    try {
        const [nodesData, edgesData] = await Promise.all([
            d3.csv(CONFIG.paths.nodes),   // ← Promise 1
            d3.csv(CONFIG.paths.edges)    // ← Promise 2
        ]);
        // Entrambi i CSV sono caricati
    } catch (error) {
        // Gestione errore
    }
}
```

**Promise.all** lancia entrambe le richieste in parallelo e attende che TUTTE siano completate. Senza `Promise.all`, dovremmo fare:

```js
const nodesData = await d3.csv(path1);  // ← aspetta 100ms
const edgesData = await d3.csv(path2);  // ← poi aspetta altri 100ms
// TOTALE: 200ms
```

Con `Promise.all`:
```js
// Lancia entrambe subito
// TOTALE: ~100ms (la più lenta delle due)
```

### 4.3 Map e Set

**Map** è una struttura dati chiave-valore che permette qualsiasi tipo di chiave (non solo stringhe):

```js
// Mappa per lookup O(1) del tipo di nodo
const nodeTypeMap = new Map(
    this.globalNodes.map(n => [n.id, n.type])
);
// Uso: nodeTypeMap.get("NCT_127") → "group"
```

**Set** è un insieme di valori unici:

```js
const activeNodeIds = new Set(filteredNodes.map(n => n.id));
// Uso: activeNodeIds.has("NCT_127") → true/false
```

Entrambi hanno operazioni **O(1)** (= tempo costante, indipendentemente dalla dimensione). Un array equivalente richiederebbe O(N) per la ricerca.

### 4.4 Optional Chaining

```js
this.adjacency.get(s)?.add(t);
```

Equivalente a:

```js
const set = this.adjacency.get(s);
if (set !== undefined && set !== null) {
    set.add(t);
}
```

Previene errori `Cannot read property 'add' of undefined` quando un nodo non esiste nella mappa (dati mancanti o IDs inesistenti nei CSV).

---

## 5. Tailwind CSS

### 5.1 Cos'è e come funziona

Tailwind CSS è un framework **utility-first**. Invece di scrivere CSS custom:

```css
.my-button {
    background-color: #1e293b;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    color: #e2e8f0;
}
```

Si usano classi predefinite nell'HTML:

```html
<button class="bg-slate-800 px-4 py-2 rounded-md text-slate-200">
```

Ogni classe corrisponde a UNA singola proprietà CSS:
- `bg-slate-800` → `background-color: #1e293b`
- `px-4` → `padding-left: 1rem; padding-right: 1rem`
- `rounded-md` → `border-radius: 0.375rem`

### 5.2 Vantaggi e Svantaggi nel progetto

**Vantaggi:**
- **Rapido sviluppo**: non si scrive CSS, solo HTML
- **Coerenza visiva**: palette di colori predefinita (slate, pink, red, etc.)
- **Responsive**: classi come `md:w-80` cambiano stile al breakpoint
- **Nessun file CSS**: Tailwind v4 "browser" compila al volo

**Svantaggi:**
- **HTML verboso**: le classi occupano spazio
- **Curva di apprendimento**: nomi non intuitivi (`p-4` = padding 1rem)
- **Lock-in**: difficile migrare ad altro framework senza riscrivere tutto

### 5.3 Versioni: CDN vs Build

| Versione | Vantaggio | Svantaggio |
|---|---|---|
| **CDN** (`@tailwindcss/browser`) | Zero configurazione | CSS più grande |
| **Build** (`npm install tailwindcss`) | CSS minimo (solo classi usate) | Richiede build step |

Il progetto usa la versione **CDN** perché non ha un build step.

---

## 6. Algoritmi e Strutture Dati

### 6.1 Mappa di Adiacenza (Adjacency Map)

**Problema:** Trovare i vicini di un nodo durante hover/click è un'operazione frequente. Scansionare tutti gli archi a ogni interazione è O(E) con E = 5000+.

**Soluzione:** Pre-calcolare una struttura che risponde alla domanda "quali nodi sono vicini a questo?" in O(1).

```js
// Costruzione (una volta, all'avvio)
this.globalNodes.forEach(n => this.adjacency.set(n.id, new Set()));

this.globalEdges.forEach(e => {
    const s = e.source, t = e.target;
    this.adjacency.get(s)?.add(t);  // s → t
    this.adjacency.get(t)?.add(s);  // t → s (grafo non diretto)
});
```

**Rappresentazione:**
```
adjacency Map {
    "SM_Entertainment" → Set { "NCT_127", "aespa", "Red_Velvet", ... }
    "NCT_127"          → Set { "SM_Entertainment", "Taeyong", "Mark", ... }
    "Taeyong"          → Set { "NCT_127", "SM_Entertainment" }
    ...
}
```

**Complessità:**
- Costruzione: O(N + E) — una passata su nodi e archi
- Query: **O(1)** — `Map.get()` + `Set.size()` sono costanti
- Memoria: O(N + E) — ogni arco viene memorizzato 2 volte (una per source, una per target)

### 6.2 Viewport Culling

**Problema:** Con 4700 nodi, anche a Canvas puro, disegnare tutti i nodi a ogni frame è lavoro sprecato se l'utente è zoomato su una zona specifica.

**Soluzione:** Calcolare il rettangolo dello schermo in coordinate "mondo" e saltare i nodi fuori da esso.

```js
const vp = {
    x: -this.transform.x / this.transform.k - 60,
    y: -this.transform.y / this.transform.k - 60,
    w: this.canvasW / this.transform.k + 120,
    h: this.canvasH / this.transform.k + 120
};

// Durante il rendering:
if (n.x < vp.x || n.x > vp.x + vp.w || 
    n.y < vp.y || n.y > vp.y + vp.h) continue;
```

**Derivazione:**

Trasformazione schermo → mondo:
```
screenX = worldX * k + tx    ← inversa: worldX = (screenX - tx) / k
screenY = worldY * k + ty    ← inversa: worldY = (screenY - ty) / k
```

Il viewport in mondo è l'intervallo [0, canvasW] in screen trasformato in mondo, con un margine di 60px per evitare flickering ai bordi.

### 6.3 Debouncing

**Problema:** Il listener `input` della ricerca si attiva a OGNI keystroke. Se l'utente digita "NCT" velocemente, la funzione `applySearchHighlight()` (che itera tutti i nodi) viene chiamata 3 volte in 200ms.

**Soluzione:** Debounce — aspetta che l'utente smetta di digitare per 80ms prima di eseguire.

```js
let searchTimeout;
input.addEventListener("input", () => {
    clearTimeout(searchTimeout);          ← Annulla il timer precedente
    searchTimeout = setTimeout(           ← Imposta nuovo timer
        handleSearch,                     ← Callback
        80                                ← Attesa 80ms
    );
});
```

**Come funziona:**
```
Digito "N" → timer parte (80ms)
Digito "C" → timer annullato, riparte (80ms)
Digito "T" → timer annullato, riparte (80ms)
└── 80ms di pausa → handleSearch eseguito con query "NCT"
```

Risultato: la ricerca viene eseguita UNA volta invece di 3.

### 6.4 Hit Detection (distanza al quadrato)

```js
const dx = n.x - wx;
const dy = n.y - wy;
const dist = dx * dx + dy * dy;  // ← NON uso Math.sqrt()
```

**Perché distanza al quadrato?** `Math.sqrt()` è costosa (decine di cicli CPU). Confrontare il quadrato della distanza con il quadrato della soglia è matematicamente equivalente e molto più veloce:

```
dist < threshold      ↔      dist² < threshold²
√(dx² + dy²) < 5      ↔      dx² + dy² < 25
```

### 6.5 Barnes-Hut (gestito da D3)

D3.js usa internamente l'algoritmo **Barnes-Hut** per accelerare il calcolo delle forze molti-corpi (`d3.forceManyBody`).

**Principio:** Invece di calcolare la repulsione tra OGNI coppia di nodi (O(N²)), lo spazio viene suddiviso ricorsivamente in un **quadtree**:

```
Livello 1: ┌──────┬──────┐
            │  A   │  B   │
            ├──────┼──────┤
            │  C   │  D   │
            └──────┴──────┘

Livello 2 (solo quadrante A):
         ┌──┬──┐
         │A1│A2│
         ├──┼──┤
         │A3│A4│
         └──┴──┘
```

Per un nodo X, la repulsione con i nodi in un quadrante lontano viene calcolata **una volta sola** usando il centro di massa del quadrante, non singolarmente per ogni nodo. Questo riduce la complessità da O(N²) a **O(N log N)**.

---

## 7. Pattern Architetturali

### 7.1 Single Class Pattern

Tutta la logica applicativa è incapsulata in una singola classe `KPopNetworkGraph`. Questo è un pattern chiamato **God Object** (o **Fat Controller**), criticato in architetture complesse ma **appropriato** per questo progetto perché:

- L'applicazione ha un unico scopo
- Non ci sono route, pagine multiple, o moduli indipendenti
- La comunicazione tra metodi è interna (stato condiviso via `this`)
- La ridotta complessità non giustifica la separazione in file multipli

### 7.2 Event Delegation

**Prima (SVG):** Ogni nodo `<g>` aveva i propri listener `mouseover`, `mouseout`, `click`. → **4700 x 3 = 14.100 listener** riassegnati a ogni cambio filtro.

**Dopo (Canvas):** Un singolo listener per tipo di evento sul `<canvas>`. → **6 listener** totali.

```js
this.canvas.addEventListener("mousedown", (e) => this.onMouseDown(e));
this.canvas.addEventListener("mousemove", (e) => this.onMouseMove(e));
this.canvas.addEventListener("mouseup",   (e) => this.onMouseUp(e));
this.canvas.addEventListener("click",     (e) => this.onClick(e));
this.canvas.addEventListener("wheel",     (e) => this.onWheel(e), { passive: false });
this.canvas.addEventListener("mouseleave",() => this.onMouseLeave());
```

### 7.3 Stateful Rendering

La funzione `draw()` non è pura: dipende dallo **stato corrente** dell'applicazione (`selectedNode`, `hoveredNode`, `searchQuery`, `transform`, `connectedNodeIds`, `searchMatchedIds`).

```
draw() → legge lo stato corrente → disegna coerentemente
               ↑
        (qualsiasi metodo modifica lo stato e chiama draw())
```

Questo pattern evita:
- Manipolazioni frammentate del DOM (tipiche di jQuery)
- Inconsistenze visive (lo stato è l'unica fonte di verità)
- Doppio mantenimento (non devo aggiornare SVG + stato)

### 7.4 Configuration Object Pattern

I parametri configurabili sono raggruppati in un oggetto `CONFIG` globale:

```js
const CONFIG = {
    nodeColors: { ... },
    edgeColors: { ... },
    nodeRadii: { ... },
    forces: { ... },
    typeBadges: { ... }
};
```

Vantaggi:
- **Tutte le costanti in un posto** — facile da trovare e modificare
- **Nessun magic number** sparso nel codice
- **Documentazione implicita** — i nomi delle proprietà descrivono lo scopo

---

## 8. Ottimizzazioni Performance

### 8.1 Riepilogo delle ottimizzazioni

| # | Ottimizzazione | Problema risolto | Miglioramento |
|---|---|---|---|
| 1 | Mappa di adiacenza | Loop O(E) su hover → O(1) | 100x |
| 2 | Canvas 2D | DOM SVG lento con 10.000 elementi | 10.000x (DOM) |
| 3 | Simulazione condizionale | Riavvio energia alta su ogni filtro | 5-10x |
| 4 | Parametri fisici ridotti | Troppi tick per stabilizzarsi | 2x |
| 5 | Debounce ricerca | ApplySearchHighlight a ogni keystroke | 10x percepito |
| 6 | Viewport culling | Nodi fuori schermo renderizzati inutilmente | Variabile |
| 7 | Hit detection custom | 4700 listener DOM → 1 listener canvas | 4700x |
| 8 | requestAnimationFrame | Animazioni fluide per zoom/pan | 60fps stabili |

### 8.2 Dettaglio tecnico delle ottimizzazioni

**Ottimizzazione 1 — Mappa di adiacenza:**
- **Prima**: `self.linkSelection.each(l => { if (l.source.id === d.id) ... })` — ogni hover iterava TUTTI gli archi visibili. Per 5000 archi, ~5000 iterazioni per hover.
- **Dopo**: `self.adjacency.get(d.id)` — un `Map.get()` restituisce il `Set` dei vicini in tempo costante.
- **Risultato**: 5000+ iterazioni → 1 lookup. L'hover non scala più con il numero di archi.

**Ottimizzazione 2 — Canvas 2D:**
- **Prima**: D3 data join creava/rimuoveva/aggiornava elementi SVG. Ogni tick: 5000 `<line>` + 4700 `<g>` con attributi aggiornati.
- **Dopo**: `clearRect()` + `arc()` + `lineTo()` su singolo `<canvas>`.
- **Risultato**: Zero operazioni DOM durante il tick. La GPU gestisce il rendering.

**Ottimizzazione 3 — Simulazione condizionale:**
- **Prima**: Ogni `updateGraph()` chiamava `simulation.alpha(0.4).restart()`.
- **Dopo**: Si confronta `filteredNodes.length` con `_prevNodeCount`. Se stiamo solo nascondendo nodi, alpha = 0.03 (appena sufficiente per riassestare).
- **Risultato**: Nascondere nodi non causa più un "terremoto" nel grafo.

### 8.3 Bottleneck residuo

L'unico bottleneck che rimane è la **simulazione D3-force stessa** con 4700 nodi. Ogni tick esegue:
- Barnes-Hut force: O(N log N) con N=4700
- Link force: O(E) con E=5000
- Collision force: O(N) con N=4700

Anche con Canvas, se la CPU non riesce a calcolare 60 tick al secondo, il frame rate sarà limitato dalla simulazione, non dal rendering. Questo è accettabile perché la simulazione si ferma dopo ~100-200 tick (una volta raggiunto alpha < alphaMin).

---

## 9. Glossario Tecnico

| Termine | Significato |
|---|---|
| **Alpha** | Energia residua della simulazione. 1 = massima energia, 0 = ferma |
| **Alpha decay** | Tasso di decadimento dell'energia a ogni tick |
| **Alpha min** | Soglia minima: quando alpha < alphaMin, la simulazione si ferma |
| **Barnes-Hut** | Algoritmo per accelerare il calcolo delle forze N-corpi usando un quadtree |
| **CDN** | Content Delivery Network — rete di server per distribuire librerie |
| **Culling** | Tecnica per non processare elementi non visibili |
| **Debounce** | Tecnica per ritardare l'esecuzione di una funzione fino a quando non c'è una pausa |
| **DPI / DPR** | Device Pixel Ratio — rapporto tra pixel fisici e pixel logici dello schermo |
| **Force-directed** | Algoritmo di layout che usa simulazione fisica per posizionare nodi |
| **GlobalAlpha** | Proprietà Canvas che controlla l'opacità di tutto ciò che viene disegnato |
| **God Object** | Pattern dove un singolo oggetto gestisce troppe responsabilità |
| **HiDPI** | Schermi ad alta densità di pixel (Retina, 4K, etc.) |
| **Hit detection** | Tecnica per determinare su quale oggetto grafico l'utente ha cliccato |
| **Layout** | Posizionamento dei nodi nello spazio bidimensionale |
| **Lookup O(1)** | Operazione che richiede tempo costante, indipendente dalla dimensione dei dati |
| **Quadtree** | Struttura dati ad albero che suddivide ricorsivamente lo spazio in 4 quadranti |
| **Repaint** | Fase del rendering browser che ridisegna i pixel a schermo |
| **Reflow** | Fase del rendering browser che ricalcola posizioni e dimensioni degli elementi DOM |
| **requestAnimationFrame** | API browser per animazioni sincronizzate con il refresh rate dello schermo |
| **Tick** | Singolo step della simulazione (tipicamente 1/60s) |
| **Utility-first** | Approccio CSS dove si usano classi atomiche anziché componenti astratti |
| **Viewport** | Porzione visibile della finestra del browser |
| **Viewport culling** | Non disegnare oggetti fuori dal viewport |

---

## 10. Possibili Domande d'Esame

### Q1: Perché avete scelto Canvas invece di SVG?

> L'applicazione gestisce ~4700 nodi e ~5000 archi. Con SVG, ogni entità è un elemento DOM: ~10.000 elementi totali. Ogni tick della simulazione modifica la posizione di tutti questi elementi, causando reflow e repaint costosi. Canvas è un singolo elemento DOM che disegna su una bitmap interna: non c'è DOM da aggiornare. Il rendering è accelerato via GPU e non scala con il numero di elementi.

### Q2: Come gestite la hit detection su Canvas?

> Canvas non ha eventi per elemento. Convertiamo le coordinate del mouse in coordinate "mondo" tramite la trasformazione inversa (zoom/pan), poi iteriamo i nodi attivi cercando il più vicino entro un raggio pari al raggio del cerchio + 3px. Usiamo la distanza al quadrato per evitare la costosa `Math.sqrt()`. L'operazione O(N) con N=4700 richiede ~0.5ms, trascurabile per 60fps.

### Q3: Come funziona la simulazione force-directed di D3.js?

> D3 assegna forze fisiche a ogni nodo: repulsione tra tutte le coppie (via algoritmo Barnes-Hut O(N log N)), attrazione elastica lungo gli archi, forza centripeta verso il centro, e collisione per evitare sovrapposizioni. Ogni tick (ogni ~16ms) vengono aggiornate posizioni e velocità. L'energia (alpha) decade a ogni tick fino a fermarsi quando alpha < alphaMin.

### Q4: Come avete ottimizzato la gestione degli archi per hover e selezione?

> Abbiamo pre-calcolato una mappa di adiacenza: `Map<nodeId, Set<neighborIds>>`. Costruita una volta all'avvio. Invece di scansionare 5000+ archi a ogni hover, facciamo un `Map.get()` O(1) che restituisce tutti i vicini del nodo.

### Q5: Perché non avete usato React o un altro framework?

> Il progetto è una single-page application con un unico scopo: visualizzare un grafo. React avrebbe introdotto overhead (Virtual DOM, bundle size) senza benefici reali, dato che il contenuto primario è su Canvas (non DOM) e l'unica UI DOM sono sidebar/header. Vanilla JS mantiene il progetto leggero e diretto.

### Q6: Come gestite la differenza tra click e drag?

> Salviamo la posizione del mouse al `mousedown`. Al `click`, se il mouse si è mosso più di 5px, consideriamo l'evento un drag e ignoriamo il click. Questo evita che dopo un pan si deselezioni il nodo.

### Q7: Spiegate il sistema di zoom e pan.

> Non usiamo D3 zoom. Manteniamo manualmente una trasformazione `{x, y, k}` (traslazione e scala). Per lo zoom with wheel, calcoliamo il nuovo k e applichiamo lo zoom verso il punto sotto il mouse. Per il pan, aggiorniamo x/y durante il drag. In `draw()`, applichiamo `ctx.translate(tx, ty)` e `ctx.scale(k, k)` prima di disegnare.

### Q8: Come garantite che la grafica sia nitida su schermi Retina?

> Usiamo `window.devicePixelRatio` per moltiplicare la dimensione fisica del canvas. Il canvas ha dimensioni logiche (CSS) e dimensioni fisiche (pixel reali). Senza questo scaling, su Retina ogni pixel CSS corrisponde a 2-3 pixel fisici e l'immagine appare sgranata.

### Q9: Come avete ridotto i lag nei filtri?

> Quando l'utente nasconde nodi (deseleziona un filtro), la simulazione non riparte con energia piena. Confrontiamo il conteggio dei nodi prima/dopo il filtro: se stiamo solo rimuovendo nodi, alpha = 0.03 (energia minima). Se stiamo aggiungendo, alpha = 0.15.

### Q10: Come funziona la navigazione nel pannello dettagli?

> Quando l'utente clicca un nodo, `showNodeDetails()` popola il pannello laterale con nome, tipo e connessioni. Le connessioni sono ottenute iterando gli archi attivi della simulazione. Cliccando una connessione, si chiama `selectNode(neighbor)` che centra il grafo sul nuovo nodo e aggiorna i dettagli.
