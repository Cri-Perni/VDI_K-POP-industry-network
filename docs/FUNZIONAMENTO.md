# K-Pop Network Analysis — How it Works Guide

## 1. General Overview

A web application to visualize relationships in the **K-Pop** industry in the form of an **interactive graph**. Each node represents an entity (agency/label, music group, idol), and each edge represents a relationship (management, membership, collaboration).

**Technologies Used:**
- **D3.js v7** — force-directed physics simulation
- **Canvas 2D API** — rendering of graphical entities
- **Tailwind CSS v4** — user interface
- **JavaScript ES6** — application logic

---

## 2. System Architecture

### Flowchart

```
                    ┌──────────────────────┐
                    │   CSV (nodes + edges)│
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │  initialize()        │
                    │  Load and parse      │
                    │  data                │
                    └──────┬──────────┬────┘
                           │          │
               ┌────────────▼──┐  ┌───▼────────────┐
               │ initCanvas()  │  │ setupListeners() │
               │ Create canvas │  │ Bind           │
               │ & simulation  │  │ UI events      │
               └───────┬───────┘  └────────────────┘
                       │
               ┌───────▼────────┐
               │  updateGraph() │ ←── Filter changes / window resize
               │  Filter data   │
               │  Start physics │
               └───────┬────────┘
                       │
               ┌───────▼────────┐
               │  simulation    │
               │  .on("tick")   │──→ draw() [Canvas]
               │  Calculate     │
               │  positions     │
               └────────────────┘
```

### Key Classes and Methods

```
KPopNetworkGraph
├── initialize()        — Entry point: loads data, initializes canvas and UI
├── initCanvas()        — Creates <canvas> element and D3-force engine
├── updateGraph()       — Filters nodes/edges, updates simulation
├── draw()              — Renders the graph on canvas (60fps)
│
├── Mouse handlers
│   ├── onMouseDown()   — Start drag (node or pan)
│   ├── onMouseMove()   — Drag/hover
│   ├── onMouseUp()     — End drag
│   ├── onClick()       — Node selection / deselection
│   ├── onWheel()       — Zoom
│   └── onMouseLeave()  — Clears hover
│
├── selectNode()        — Selects node, shows details, centers view
├── clearNodeSelection() — Deselects selection
├── showNodeDetails()   — Populates sidebar with info and connections
│
├── setupSearch()       — Debounced search (80ms)
├── applySearchHighlight() — Highlights search results
│
├── resetZoom()         — Returns to initial view
├── panToNode()         — Animates centering on a node
│
└── Helpers
    ├── findNodeAt()    — Hit detection (screen → node)
    ├── screenToWorld() — Coordinate conversion: screen → world
    ├── getActiveNodes()— Nodes currently in the simulation
    └── getActiveEdges()— Edges currently in the simulation
```

---

## 3. Input Data

### CSV Format

**K-pop_node.csv** (4674 nodes)
| Field | Example | Description |
|---|---|---|
| `id` | `SM_Entertainment` | Unique identifier |
| `name` | `SM Entertainment` | Display name |
| `type` | `label` | Type: `label`, `group`, `person`, `male`, `female` |

**K-pop_edge.csv** (5094 edges)
| Field | Example | Description |
|---|---|---|
| `source` | `SM_Entertainment` | Source node ID |
| `target` | `NCT_127` | Target node ID |

### Relational Inference

The type of relationship is not explicit in the CSV data but is inferred automatically in the code:

```
If source.type === "label"       → relationship = "management"
If source.type is person and
   target.type === "group"       → relationship = "membership"
Otherwise                       → relationship = "association"
```

### Color Mapping

| Node Type | Color | Role |
|---|---|---|
| `label` | 🔴 Red | Management agency / Label |
| `group` | 🔵 Blue | Music group |
| `person` | 🟢 Green | Generic Idol |
| `male` | 🔷 Cyan | Male Idol |
| `female` | 🩷 Pink | Female Idol |

| Edge Type | Color | Meaning |
|---|---|---|
| `management` | 🔴 Red | Agency → artist/group contract |
| `membership` | 🔵 Blue | Idol → group membership |
| `association` | 🟢 Green | Collaboration or other relation |

---

## 4. Physics Engine (D3 Force Simulation)

### How it Works

The force-directed simulation assigns physical forces to each node:

```
Loaded node ──→ Repulsion force (charge)    ← pushes nodes apart from each other
             │
             ├──→ Elastic force (link)        ← holds connected nodes together
             │
             ├──→ Centripetal force (center)  ← keeps everything centered
             │
             └──→ Collision force (collide)   ← prevents node overlaps
```

The system evolves over time (tick by tick) until it reaches a stable equilibrium.

### Configuration Parameters

| Parameter | Value | Effect |
|---|---|---|
| `chargeStrength` | -80 | Repulsion between nodes (higher = more spaced out) |
| `linkDistance` | 75 | Ideal length of edges |
| `collisionRadius` | 18 | Minimum radius between nodes |
| `alphaUpdateRestart` | 0.15 | Initial energy when nodes are added |
| `alphaTargetDrag` | 0.15 | Responsiveness during drag operations |

### Simulation Lifecycle

```
updateGraph() called
       │
       ▼
simulation.nodes(filteredNodes)
simulation.force("link").links(filteredEdges)
       │
       ▼
If nodes are ADDED → alpha = 0.15 (medium energy)
If nodes are REMOVED → alpha = 0.03 (minimal energy)
       │
       ▼
Every tick: D3 calculates new positions
       │
       ▼
draw() → Canvas updates graphics
       │
       ▼
alpha decays to 0 → simulation stops
```

---

## 5. Rendering (2D Canvas)

### Why Canvas instead of SVG?

| Feature | SVG | Canvas |
|---|---|---|
| DOM Elements | 1 per node + 1 per edge | 1 total |
| Performance with 5,000+ elements | 🟠 Slow (DOM reflow) | 🟢 Fast (GPU-accelerated) |
| Hit Detection | Automatic (DOM events) | Manual (coordinate math) |
| Zoom/Pan | D3 zoom transforms `<g>` | `ctx.translate()` / `ctx.scale()` |
| Text Quality | 🟢 Sharp | 🟠 Slightly less sharp |

### Structure of the draw() Method

```
draw()
│
├── 1. Reset transform (HiDPI scaling)
├── 2. Clear with dark background (#0f172a)
├── 3. Apply zoom/pan (ctx.translate + ctx.scale)
│
├── 4. Determine highlight states
│   ├── searchQuery  → highlight matchedIds
│   ├── selectedNode → highlight node + neighbors
│   └── hoveredNode  → highlight node + neighbors
│
├── 5. Draw EDGES (links)
│   ├── Iterate through activeEdges
│   ├── globalAlpha based on highlight state
│   └── strokeStyle based on type (management/membership/association)
│
├── 6. Draw NODES (circles)
│   ├── Iterate activeNodes with viewport culling
│   ├── fillStyle based on node type
│   ├── Extra white ring for hovered/selected nodes
│   └── globalAlpha based on highlight state
│
└── 7. Draw LABELS (only if zoom > 0.4x)
    ├── Iterate activeNodes with viewport culling
    └── fillText() with node name
```

### Viewport Culling

```
    ┌─── Screen ─────┐
    │  Canvas        │
    │  ┌─────────┐   │
    │  │ Viewport │   │  ← Only nodes in this area
    │  │ (visible)│   │    are drawn
    │  └─────────┘   │
    │                │
    └────────────────┘
    ╔══ Node outside viewport ══╗  ← SKIPPED (not drawn)
    ╚═══════════════════════════╝
```

---

## 6. User Interaction

### Hover

```
Mouse moves over canvas
      │
      ▼
screenToWorld(e) → world coordinates (wx, wy)
      │
      ▼
findNodeAt(wx, wy) → searches for closest node
      │
      ▼
If node found and different from hoveredNode:
      │
      ▼
hoveredNode = node
draw() → highlights node + neighbors (adjusts opacity)
```

### Clicking on a Node

```
Click on canvas
      │
      ▼
findNodeAt() → node under mouse pointer?
      │
      ├── Yes → selectNode(node)
      │          ├── showNodeDetails() → sidebar with name, type, connections
      │          ├── highlight node + neighbors
      │          └── panToNode() → animate viewport centering
      │
      └── No → deselect (if a node was selected)
```

### Dragging

```
MouseDown on node       → set node fx/fy (locks position)
MouseDown on background → begin panning the viewport
      │
      ▼
MouseMove → update node position or viewport transform
      │
      ▼
MouseUp → release fx/fy (node is free again)
```

### Zooming (Scroll Wheel)

```
Wheel event
      │
      ▼
Calculate new scale factor (0.92x or 1.08x)
      │
      ▼
Apply zoom focused on mouse coordinate:
  transform.x = mx - delta * (mx - transform.x)
  transform.y = my - delta * (my - transform.y)
  transform.k *= delta
      │
      ▼
draw() → render with new transformation matrix
```

### Searching

```
User inputs text
      │
      ▼
Wait 80ms (debounce)
      │
      ▼
handleSearch()
      │
      ▼
If query empty → restore normal view
If query present → applySearchHighlight()
      │
      ▼
Iterate active nodes, case-insensitive match on name/id
      │
      ▼
draw() highlights matching nodes
```

---

## 7. Filters

Checkboxes control which **node types** are visible:

```
filterLabel  ☑ → show labels (agencies)
filterGroup  ☑ → show groups (music groups)
filterPerson ☑ → show person/male/female (idols)
```

When a filter state changes:

```
Change event
      │
      ▼
updateGraph()
      │
      ▼
1. Filter globalNodes by type
2. Create Set of activeNodeIds
3. Filter globalEdges (only connections between visible nodes)
4. If selectedNode is no longer visible → clearNodeSelection()
5. simulation.nodes(filteredNodes)
6. simulation.force("link").links(filteredEdges)
7. Conditional restart (alpha 0.15 if adding, 0.03 if removing nodes)
```

---

## 8. Details Panel

When a node is clicked:

```
┌─ Entity Details ────────────────────┐
│  [X]                                │
│                                     │
│  Name:   NCT 127                    │
│  Type:   [Group]                    │
│                                     │
│  Active Relations: 12               │
│                                     │
│  Connections:                       │
│  ┌─────────────────────────────┐    │
│  │ SM Entertainment  Management│ ← clickable
│  │ Taeyong             Member  │ ← clickable
│  │ MARK                Member  │ ← clickable
│  │ ...                         │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

Clicking a connection shifts the selection to that node (navigating through the graph).

---

## 9. Adjacency Map (Optimization)

Pre-calculated at startup to answer in O(1) time: "which nodes are connected to this one?":

```js
globalEdges.forEach(e => {
    const s = e.source, t = e.target;
    adjacency.get(s).add(t);  // s → t
    adjacency.get(t).add(s);  // t → s
});
```

Used in:
- **Hover**: instantly highlight neighbors of the node under the cursor
- **Selection**: highlight neighbors of the selected node

---

## 10. Animations

### Centering on a Node (panToNode)

```
Initial position (transform.x, transform.y)
         │
         ▼
Calculate targetX, targetY to center the node
         │
         ▼
requestAnimationFrame(animate)
         │
         ▼
Each frame: interpolate transform towards target coordinates
  t = (now - start) / duration (750ms)
  ease = 1 - (1-t)³  (cubic-out)
  transform.x = lerp(startX, targetX, ease)
  transform.y = lerp(startY, targetY, ease)
  draw()
         │
         ▼
t >= 1 → animation stops
```

### Reset Zoom

Same logic but target is the identity transform (x: 0, y: 0, k: 1).

---

## 11. Error Handling

If CSV files are unreachable:

```js
try {
    await d3.csv(path)
} catch (error) {
    // Show error message in DOM
    loading.innerHTML = `
        Error loading CSV data.
        Please verify that the 'data' folder is accessible
        and that the local server is running.
    `
}
```

---

## 12. How to Run

1. Open a terminal in the `visualizzazione dei dati/` directory
2. Start a local HTTP server (e.g., `npx serve .` or `python -m http.server 8000`)
3. Open your browser at `http://localhost:8000/kpop-graph/`
4. Wait for the CSV files to finish loading

---

## References

- Main logic code: `kpop-graph/app.js` (modular files are under `kpop-graph/js/`)
- User Interface: `kpop-graph/index.html`
- Optimization documentation: `docs/OTTIMIZZAZIONI.md`
- Data files: `data/K-pop_node.csv` and `data/K-pop_edge.csv`
