# Technical Document — K-Pop Network Analysis

> This document details every technology, algorithm, and design choice of the project. It is intended to answer technical questions during the exam/review.

---

## Table of Contents

1. [Technologies Used](#1-technologies-used)
2. [D3.js — Force Simulation](#2-d3js--force-simulation)
3. [Canvas 2D API](#3-canvas-2d-api)
4. [Vanilla JavaScript ES6](#4-vanilla-javascript-es6)
5. [Tailwind CSS](#5-tailwind-css)
6. [Algorithms and Data Structures](#6-algorithms-and-data-structures)
7. [Architectural Patterns](#7-architectural-patterns)
8. [Performance Optimizations](#8-performance-optimizations)
9. [Technical Glossary](#9-technical-glossary)
10. [Possible Exam Questions](#10-possible-exam-questions)

---

## 1. Technologies Used

### Overall Stack

```
┌──────────────────────────────────────────────┐
│                  Browser                      │
│  ┌────────────────────────────────────────┐   │
│  │            Canvas 2D API               │   │  ← Rendering
│  ├────────────────────────────────────────┤   │
│  │         D3.js Force Simulation         │   │  ← Physics/Layout
│  ├────────────────────────────────────────┤   │
│  │          Vanilla JavaScript ES6        │   │  ← Application Logic
│  ├────────────────────────────────────────┤   │
│  │       Tailwind CSS (CDN v4)            │   │  ← UI Styling
│  ├────────────────────────────────────────┤   │
│  │             HTML5 / DOM                │   │  ← Page Structure
│  └────────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

### 1.1 D3.js v7 (Data-Driven Documents)

| Aspect | Detail |
|---|---|
| **Version** | 7.x (loaded via CDN: `d3js.org/d3.v7.min.js`) |
| **Role in the project** | Force-directed simulation engine for calculating node positions |
| **Modules used** | `d3-force` (physics simulation), `d3-dsv` (CSV parsing), `d3-selection` (no longer used after Canvas migration) |
| **License** | ISC |

**What D3.js does in this project:**

D3.js is used exclusively for **calculating positions** of nodes using the `d3-force` module. Rendering no longer uses D3 (after migrating from SVG to Canvas), but the physics simulation remains in D3 because it is mature, highly performant, and well-documented.

**Specific modules:**
- **`d3.forceSimulation()`** — Creates the physics engine that manages the tick cycle.
- **`d3.forceLink()`** — Manages elastic forces between nodes connected by edges.
- **`d3.forceManyBody()`** — Manages repulsion/attraction between all nodes (Barnes-Hut algorithm).
- **`d3.forceCenter()`** — Centripetal force that keeps the graph centered in the canvas.
- **`d3.forceCollide()`** — Prevents node overlaps.
- **`d3.csv()`** — Function for parsing CSV files.

```js
this.simulation = d3.forceSimulation()          // ← Creates the engine
    .force("link", d3.forceLink()               // ← Elastic force of edges
        .id(d => d.id)                          // ← How to resolve IDs in the data
        .distance(CONFIG.forces.linkDistance))  // ← Ideal length
    .force("charge", d3.forceManyBody()         // ← Repulsion between nodes
        .strength(CONFIG.forces.chargeStrength))
    .force("center", d3.forceCenter(w, h))      // ← Centering
    .force("collision", d3.forceCollide()       // ← Anti-overlapping
        .radius(CONFIG.forces.collisionRadius));
```

### 1.2 Canvas 2D API

| Aspect | Detail |
|---|---|
| **Specification** | HTML5 Canvas 2D Context (W3C) |
| **Role** | Rendering of nodes, edges, labels, and interactive highlights |
| **Key Advantage** | GPU-accelerated rendering, zero DOM overhead |

**Canvas methods used in the project:**

| Method | Usage |
|---|---|
| `ctx.setTransform(a,b,c,d,e,f)` | Sets the initial transformation (HiDPI scaling) |
| `ctx.clearRect(x,y,w,h)` | Clears the canvas on every frame |
| `ctx.save()` / `ctx.restore()` | Saves/restores the state of the graphic context |
| `ctx.translate(tx, ty)` | Applies viewport pan |
| `ctx.scale(k, k)` | Applies viewport zoom |
| `ctx.fillRect()` | Draws the background |
| `ctx.arc(x, y, r, start, end)` | Draws circles (nodes and highlight rings) |
| `ctx.moveTo()` / `ctx.lineTo()` / `ctx.stroke()` | Draws lines (edges) |
| `ctx.fillText()` | Draws text labels |
| `ctx.beginPath()` / `ctx.closePath()` | Defines drawing paths |
| `ctx.globalAlpha` | Controls opacity (selection/hover/search highlight) |
| `ctx.fillStyle` / `ctx.strokeStyle` | Fill and contour colors |

**HiDPI / Retina display:**

```js
const dpr = window.devicePixelRatio || 1;
canvas.width = width * dpr;       // ← physical dimensions (real pixels)
canvas.height = height * dpr;
canvas.style.width = width + "px"; // ← logical dimensions (CSS)
canvas.style.height = height + "px";

// In draw():
ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // ← scales everything
```

Without this adjustment, the canvas would look pixelated on Retina screens (since each CSS pixel would map to 1 physical pixel instead of utilizing the 2-3 physical pixels available).

### 1.3 Vanilla JavaScript ES6+

| Aspect | Detail |
|---|---|
| **Standard** | ECMAScript 2015+ (ES6, ES7, ES8) |
| **No Framework** | Deliberate choice to avoid React/Vue/Angular overhead |
| **No Bundler** | Deliberate choice: no Webpack/Vite/Parcel |

**ES6+ Features Used:**

| Feature | Where | Why |
|---|---|---|
| **`class`** | Entire codebase (`class KPopNetworkGraph`) | Clear OOP organization |
| **`async/await`** | `initialize()` | Asynchronous loading of CSVs with clean linear code |
| **`Promise.all()`** | `initialize()` | Loads nodes and edges IN PARALLEL (non-sequential) |
| **Arrow functions `() =>`** | Everywhere | Lexical `this`, concise code |
| **`const` / `let`** | Everywhere | Block scoping, no hoisting |
| **`Map`** | `this.adjacency`, `nodeTypeMap` | O(1) lookup with non-string keys |
| **`Set`** | `connectedNodeIds`, `searchMatchedIds`, `activeNodeIds` | Unique sets with O(1) lookups |
| **Destructuring** | `const [nodesData, edgesData]` | Extracting multiple values from array |
| **Template literals** | `` `${count} nodes found}` `` | String interpolation |
| **Optional chaining `?.`** | `this.adjacency.get(s)?.add(t)` | Safety against null/undefined |
| **`Array.filter()`** | Filtering nodes/edges | Creates new arrays without mutating the original ones |
| **`Array.forEach()`** | Iterating over arrays | More readable than traditional `for` loops |
| **`Array.map()`** | Parsing CSV | 1:1 array transformation |

**Why no framework (React/Vue/Angular):**

The project is a **single-page application** with a single purpose: visualizing an interactive graph. A framework like React would have introduced:
- Bundle overhead (dozens of KBs)
- Virtual DOM (useless for Canvas, which has no DOM)
- State and lifecycle management complexity
- Mandatory build step (JSX, compilation)

Choosing Vanilla JS keeps the project **lightweight**, **independent**, and **directly executable** (requiring only a static HTTP server).

### 1.4 Tailwind CSS v4

| Aspect | Detail |
|---|---|
| **Version** | 4 (loaded via CDN: `@tailwindcss/browser@4`) |
| **Role** | Styling the user interface (sidebar, header, filter panel) |
| **No Build Step** | Tailwind v4 "browser" compiles CSS on the fly in the browser |

**How Tailwind CSS works:**

Tailwind is a **utility-first** framework: it doesn't provide pre-built components but rather atomic CSS classes corresponding to individual CSS properties:

```html
<div class="bg-slate-800 p-4 rounded-lg border border-slate-700">
    <!-- background-color: #1e293b
         padding: 1rem
         border-radius: 0.5rem
         border: 1px solid #334155 -->
</div>
```

**Advantages:**
- No custom CSS files to write and maintain
- Consistent design system (predefined colors, spacing, and typography)
- Native responsive design using prefixes like `sm:`, `md:`, `lg:`
- Native dark mode (the project already uses the `slate-*` palette)

**Disadvantages:**
- Verbose HTML classes
- Learning curve for utility class names
- CSS size (partially mitigated by the v4 CDN which only compiles the utility classes actually used)

### 1.5 Versioning: CDN vs Build

| Version | Advantage | Disadvantage |
|---|---|---|
| **CDN** (`@tailwindcss/browser`) | Zero configuration required | Larger download footprint |
| **Build** (`npm install tailwindcss`) | Minimal CSS (unused classes removed) | Requires a build process |

The project uses the **CDN** version to avoid introducing a compilation build step.

---

## 2. D3.js — Force Simulation

### 2.1 What is a Force Simulation

A **force-directed simulation** is a **graph layout** algorithm that assigns physical forces to nodes and allows the system to naturally evolve toward a stable state of equilibrium.

```
Conceptually:
                                                
    Node A ←━━━━━━━ repulsion ━━━━━━━━→ Node B
       │                                     │
       │                                     │
    attraction (link)                     attraction (link)
       │                                     │
       │                                     │
    Node C ←━━━━━━━ repulsion ━━━━━━━━→ Node D
                                                
    Center ←━━━━ centripetal attraction ━━━━→ all nodes
```

### 2.2 Core Algorithm (Barnes-Hut)

D3.js uses the **Barnes-Hut** algorithm to optimize the calculation of repulsion forces between N nodes.

**Without optimization (brute force):** O(N²) — for each node, compute repulsion with all other nodes. For N=4700 → ~22 million pairs.

**With Barnes-Hut:** O(N log N) — space is recursively divided into a **quadtree** (an tree of quadrants). Distant nodes are grouped together and treated as a single center of mass:

```
     ┌──────┬──────┐
     │  A   │  B   │
     ├──────┼──────┤
     │  C   │  D   │
     └──────┴──────┘
     
     If node X is here → to compute repulsion:
     - A, B, C, D are far away → they are used as a single point
       with mass = sum of the masses of the quadrant
     - Only nearby nodes are calculated individually
```

### 2.3 Simulation Tick Cycle

```
Every "tick" (approx. 1/60s):
      │
      ▼
1. Calculate forces on each node
   ├── charge: pairwise repulsion (Barnes-Hut)
   ├── link: elastic spring force for edges
   ├── center: attraction towards center
   └── collide: pushes apart overlapping nodes
      │
      ▼
2. Update velocity and position
   ├── vx += force_x * damping
   ├── vy += force_y * damping
   ├── x += vx
   └── y += vy
      │
      ▼
3. Decrement alpha (energy)
   ├── alpha = alpha * (1 - alphaDecay)  ← default: alphaDecay ≈ 0.0228
   └── When alpha < alphaMin (after ~300 ticks) → simulation stops
      │
      ▼
4. Fire callback .on("tick")
   └── In this project → draw() on Canvas
```

### 2.4 Simulation Parameters

| Parameter | Default D3 | Value in Project | Effect |
|---|---|---|---|
| `alpha` | 1 | 0.15 (restart) | Initial energy. Higher = more movement |
| `alphaMin` | 0.001 | 0.001 (default) | Minimum energy threshold below which simulation stops |
| `alphaDecay` | 0.0228 | 0.0228 (default) | Decay rate of energy |
| `velocityDecay` | 0.4 | 0.4 (default) | Damping: 1 = no damping, 0 = instant stop |
| `chargeStrength` | -30 | **-80** | Repulsion between nodes (negative) |
| `linkDistance` | 30 | **75** | Ideal edge length |
| `collisionRadius` | N/A | **18** | Collision radius |

### 2.5 Why We Reduced the Parameters

With 4,700 nodes, the default parameters of D3 cause:
- **Strong repulsion** (-140 originally) → nodes fly away and take a long time to return
- **Large collision radius** (28) → high computation time for collision detection
- **High initial energy** (0.4) → many ticks required to stabilize

The new values (-80 charge, 18 collision, 0.15 alpha) reduce the required ticks by ~60%.

### 2.6 Managing Filters in the Simulation

When the user toggles a filter:

```
      FILTER TOGGLED OFF (nodes hidden)
                      │
                      ▼
    filteredNodes = visible nodes
    filteredEdges = edges between visible nodes
                      │
                      ▼
    simulation.nodes(filteredNodes)     ← update dataset
    simulation.force("link").links(filteredEdges)
                      │
                      ▼
    isAddingNodes = false (nodes were removed)
                      │
                      ▼
    alpha = 0.03 (minimal energy)
    restart() (simulation resumes BUT with low energy)
                      │
                      ▼
    The remaining nodes settle slightly
    without the chaos of a full high-energy restart
```

---

## 3. Canvas 2D API

### 3.1 What is Canvas

Canvas is an HTML5 element that provides a bitmap drawing area manipulated via JavaScript. Unlike SVG (which maintains a DOM tree of vector elements), Canvas is **immediate mode**: you draw, and the output is just pixels. There is no "document structure" to query or modify after rendering.

### 3.2 Canvas vs SVG — Core Differences

| Feature | SVG | Canvas |
|---|---|---|
| **Model** | Vector (DOM tree) | Bitmap (pixels) |
| **Elements** | Each shape is a DOM element | No elements, only pixels |
| **Events** | `onclick`, `onmouseover` per element | Must be calculated manually |
| **Rendering** | Slow with many elements (each is a DOM node) | Fast (GPU-accelerated draw call) |
| **Zoom** | Vector shapes stay sharp automatically | Pixels stretch (must redraw at higher scale) |
| **Accessibility** | Good (screen readers parse the DOM) | Poor (pixels only) |
| **Use Case** | Few elements (< 1,000), interactive | Many elements (> 1,000), animated |

### 3.3 Rendering Pipeline

The `draw()` method runs on every tick of the simulation and on every user interaction.

```
draw() called
     │
     ▼
┌─────────────────────────────────────────┐
│ 1. ctx.setTransform(dpr,0,0,dpr,0,0)   │  ← HiDPI scaling
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ 2. ctx.fillStyle = "#0f172a"            │  ← Background color
│    ctx.fillRect(0, 0, W, H)            │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ 3. ctx.save()                           │  ← Save state
│    ctx.translate(tx, ty)               │  ← Zoom/Pan
│    ctx.scale(k, k)                     │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ 4. Compute highlightedIds               │  ← Highlight states
│    (search? selected? hovered?)         │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ 5. Viewport Culling                     │  ← Skip off-screen
│    vp = {x, y, w, h}                   │    nodes
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ 6. For each edge:                       │  ← Edges
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
│ 7. For each node (if in viewport):      │  ← Nodes
│    ctx.beginPath()                     │
│    ctx.arc(x, y, radius, 0, 2π)        │
│    ctx.fillStyle = nodeColor           │
│    ctx.globalAlpha = ...               │
│    ctx.fill()                          │
│    Highlight ring if hovered/selected  │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ 8. If zoom > 0.4:                       │  ← Labels
│    For each node (if in viewport):      │
│    ctx.font, ctx.fillText(name)         │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ 9. ctx.restore()                        │  ← Restore state
└─────────────────────────────────────────┘
```

### 3.4 Why Canvas is Faster than SVG

**Problem with SVG:**
Each `<circle>`, `<line>`, and `<text>` is a node in the DOM. The browser must:
1. Maintain the DOM tree (memory overhead)
2. Compute the layout (reflow)
3. Rasterize the pixels (repaint)

With 5,000 edges and 4,700 nodes, there are **9,700 DOM elements**. Every tick of the simulation modifies the coordinates (`x`, `y`, `x1`, `y1`, `x2`, `y2`) of ALL these elements, resulting in the browser executing 24,700+ DOM attribute assignments.

**Canvas Solution:**
The Canvas is a single `<canvas>` element that always occupies the same position in the DOM. Its content is an **internal bitmap** managed by the GPU. There is no DOM to update, no reflow, and no repaint. We simply call drawing functions (`arc`, `lineTo`, `fillText`) that the GPU executes directly.

### 3.5 Hit Detection on Canvas

Unlike SVG (which fires mouse events automatically for each element), Canvas requires manual coordinate calculation to determine if the cursor is hovering over an object.

```js
// 1. Transform screen coordinates → world coordinates
screenToWorld(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left - this.transform.x) / this.transform.k,
        y: (e.clientY - rect.top - this.transform.y) / this.transform.k
    };
}

// 2. Find the nearest node within a radius
findNodeAt(wx, wy) {
    let closest = null;
    let minDist = Infinity;
    for (const n of this.getActiveNodes()) {     // ← O(n) iteration
        const dx = n.x - wx;
        const dy = n.y - wy;
        const dist = dx*dx + dy*dy;              // ← squared distance
        const threshold = CONFIG.nodeRadii[n.type] + 3;
        if (dist < threshold*threshold && dist < minDist) {
            minDist = dist;
            closest = n;
        }
    }
    return closest;
}
```

Complexity: **O(N)** where N is the number of active nodes. With 4,700 nodes, this operation takes ~0.5ms, which is negligible at 60fps (16.6ms per frame).

---

## 4. Vanilla JavaScript ES6

### 4.1 ES6 Classes

```js
class KPopNetworkGraph {
    constructor() {
        // Initialize state
    }
    
    async initialize() { ... }   // ← async method
    initCanvas() { ... }
    draw() { ... }
    // ...
}
```

Unlike the "function + prototype" constructor syntax of ES5, the `class` keyword is **syntactic sugar** that makes code cleaner but behaves the same under the hood (prototype chain).

### 4.2 Async/Await and Promise.all

```js
async initialize() {
    try {
        const [nodesData, edgesData] = await Promise.all([
            d3.csv(CONFIG.paths.nodes),   // ← Promise 1
            d3.csv(CONFIG.paths.edges)    // ← Promise 2
        ]);
        // Both CSVs loaded successfully
    } catch (error) {
        // Error handling
    }
}
```

**Promise.all** fires both requests in parallel and waits for ALL of them to resolve. Without `Promise.all`, we would do:

```js
const nodesData = await d3.csv(path1);  // ← waits 100ms
const edgesData = await d3.csv(path2);  // ← then waits another 100ms
// TOTAL: 200ms
```

With `Promise.all`:
```js
// Launches both immediately
// TOTAL: ~100ms (equal to the slowest of the two)
```

### 4.3 Map and Set

A **Map** is a key-value data structure that allows any type of key (not just strings):

```js
// Map for O(1) lookup of node types
const nodeTypeMap = new Map(
    this.globalNodes.map(n => [n.id, n.type])
);
// Usage: nodeTypeMap.get("NCT_127") → "group"
```

A **Set** represents a collection of unique values:

```js
const activeNodeIds = new Set(filteredNodes.map(n => n.id));
// Usage: activeNodeIds.has("NCT_127") → true/false
```

Both structures provide **O(1)** operations (constant time, regardless of the dataset size). An equivalent array would require O(N) linear time for searches.

### 4.4 Optional Chaining

```js
this.adjacency.get(s)?.add(t);
```

Equivalent to:

```js
const set = this.adjacency.get(s);
if (set !== undefined && set !== null) {
    set.add(t);
}
```

Prevents `Cannot read property 'add' of undefined` errors when a node does not exist in the map (e.g. because of missing or incorrect data in the CSV files).

---

## 5. Tailwind CSS

### 5.1 What it is and How it Works

Tailwind CSS is a **utility-first** CSS framework. Instead of writing custom CSS rules:

```css
.my-button {
    background-color: #1e293b;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    color: #e2e8f0;
}
```

Predefined classes are applied directly in the HTML:

```html
<button class="bg-slate-800 px-4 py-2 rounded-md text-slate-200">
```

Each utility class corresponds to a single CSS property:
- `bg-slate-800` → `background-color: #1e293b`
- `px-4` → `padding-left: 1rem; padding-right: 1rem`
- `rounded-md` → `border-radius: 0.375rem`

### 5.2 Advantages and Disadvantages in the Project

**Advantages:**
- **Rapid Development**: Styles are authored directly in the HTML markup.
- **Visual Consistency**: Consistent predefined color palettes (slate, pink, red, etc.).
- **Responsive design**: Classes like `md:w-80` adapt styling at screen breakpoints.
- **Zero build setup**: The Tailwind v4 browser script compiles classes on the fly.

**Disadvantages:**
- **Verbose HTML**: Markup can become cluttered with styling utility classes.
- **Learning Curve**: Utility names must be memorized (`p-4` = padding 1rem).
- **Lock-in**: Hard to migrate to another CSS solution without completely rewriting classes.

### 5.3 CDN vs Build Versions

| Version | Advantage | Disadvantage |
|---|---|---|
| **CDN** (`@tailwindcss/browser`) | Zero configuration required | Larger download footprint |
| **Build** (`npm install tailwindcss`) | Smallest CSS payload (purges unused classes) | Requires a build process |

The project uses the **CDN** version to avoid introducing a compilation build step.

---

## 6. Algorithms and Data Structures

### 6.1 Adjacency Map

**Problem:** Finding the neighbors of a node on hover or selection is a frequent task. Scanning all edges at every mouse event is O(E) with E = 5000+.

**Solution:** Pre-calculate a lookup structure that answers "which nodes are connected to this one?" in O(1) constant time.

```js
// Built once, at startup
this.globalNodes.forEach(n => this.adjacency.set(n.id, new Set()));

this.globalEdges.forEach(e => {
    const s = e.source, t = e.target;
    this.adjacency.get(s)?.add(t);  // s → t
    this.adjacency.get(t)?.add(s);  // t → s (undirected graph)
});
```

**Representation:**
```
adjacency Map {
    "SM_Entertainment" → Set { "NCT_127", "aespa", "Red_Velvet", ... }
    "NCT_127"          → Set { "SM_Entertainment", "Taeyong", "Mark", ... }
    "Taeyong"          → Set { "NCT_127", "SM_Entertainment" }
    ...
}
```

**Complexity:**
- Construction: O(N + E) — a single pass over nodes and edges.
- Query: **O(1)** — `Map.get()` + `Set.size()` are constant time operations.
- Memory: O(N + E) — each edge is stored twice (once for source, once for target).

### 6.2 Viewport Culling

**Problem:** Drawing all 4,700 nodes at every frame is wasted CPU/GPU effort if the user is zoomed into a specific region.

**Solution:** Calculate the boundary of the screen in "world" coordinates and skip rendering nodes that lie outside it.

```js
const vp = {
    x: -this.transform.x / this.transform.k - 60,
    y: -this.transform.y / this.transform.k - 60,
    w: this.canvasW / this.transform.k + 120,
    h: this.canvasH / this.transform.k + 120
};

// During rendering:
if (n.x < vp.x || n.x > vp.x + vp.w || 
    n.y < vp.y || n.y > vp.y + vp.h) continue;
```

**Derivation:**

Screen coordinate to world coordinate transformation:
```
screenX = worldX * k + tx    ← inverse: worldX = (screenX - tx) / k
screenY = worldY * k + ty    ← inverse: worldY = (screenY - ty) / k
```

The viewport boundary in world coordinates is calculated by mapping the screen bounds `[0, canvasW]` to world space, adding a 60px padding margin to prevent nodes from flashing on/off at the screen edges.

### 6.3 Debouncing

**Problem:** The input search listener fires on EVERY single keystroke. If a user types "NCT" rapidly, `applySearchHighlight()` (which iterates over all nodes) is called 3 times in 200ms.

**Solution:** Debounce — wait for the user to pause typing for 80ms before triggering the search query.

```js
let searchTimeout;
input.addEventListener("input", () => {
    clearTimeout(searchTimeout);          // ← Cancels the previous timer
    searchTimeout = setTimeout(           // ← Starts a new timer
        handleSearch,                     // ← Callback function
        80                                // ← 80ms delay
    );
});
```

**How it works:**
```
Type "N" → timer starts (80ms)
Type "C" → timer cancelled, restarts (80ms)
Type "T" → timer cancelled, restarts (80ms)
└── 80ms typing pause → handleSearch executes with query "NCT"
```

Result: the search logic runs ONCE instead of 3 times.

### 6.4 Hit Detection (Squared Distance)

```js
const dx = n.x - wx;
const dy = n.y - wy;
const dist = dx * dx + dy * dy;  // ← Square distance (DO NOT use Math.sqrt())
```

**Why squared distance?** Computing square roots (`Math.sqrt()`) is a computationally heavy CPU instruction. Comparing the squared distance against the squared threshold is mathematically equivalent and significantly faster:

```
dist < threshold      ↔      dist² < threshold²
Substituted:
√(dx² + dy²) < 5      ↔      dx² + dy² < 25
```

### 6.5 Barnes-Hut (handled by D3)

D3.js internally uses the **Barnes-Hut** algorithm to speed up the calculation of multi-body repulsion forces (`d3.forceManyBody`).

**Principle:** Instead of computing repulsion between EVERY node pair (O(N²)), space is recursively partitioned into a **quadtree**:

```
Level 1: ┌──────┬──────┐
         │  A   │  B   │
         ├──────┼──────┤
         │  C   │  D   │
         └──────┴──────┘

Level 2 (quadrant A subdivided):
         ┌──┬──┐
         │A1│A2│
         ├──┼──┤
         │A3│A4│
         └──┴──┘
```

For any node X, the repulsion from nodes in a distant quadrant is computed **once** using that quadrant's collective center of mass, rather than calculating it individually for each node. This reduces the complexity from O(N²) to **O(N log N)**.

---

## 7. Architectural Patterns

### 7.1 Single Class Pattern

All application logic is encapsulated inside the `KPopNetworkGraph` class. This is sometimes called a **God Object** or **Fat Controller** pattern. While criticized in massive applications, it is **appropriate** for this project because:

- The application has a single primary view and function.
- There are no multiple routes, pages, or decoupled subsystems.
- Method communication is self-contained (state shared via `this`).
- The low structural complexity does not justify splitting the code across multiple files.

### 7.2 Event Delegation

**Before (SVG):** Each node `<g>` element was assigned its own `mouseover`, `mouseout`, and `click` listeners. → **4700 nodes x 3 listeners = 14,100 event listeners** reallocated on every filter change.

**After (Canvas):** A single event listener is registered for each event type on the `<canvas>` element. → **6 event listeners** in total.

```js
this.canvas.addEventListener("mousedown", (e) => this.onMouseDown(e));
this.canvas.addEventListener("mousemove", (e) => this.onMouseMove(e));
this.canvas.addEventListener("mouseup",   (e) => this.onMouseUp(e));
this.canvas.addEventListener("click",     (e) => this.onClick(e));
this.canvas.addEventListener("wheel",     (e) => this.onWheel(e), { passive: false });
this.canvas.addEventListener("mouseleave",() => this.onMouseLeave());
```

### 7.3 Stateful Rendering

The `draw()` method is state-driven: its output depends on the **current state variables** of the application (`selectedNode`, `hoveredNode`, `searchQuery`, `transform`, `connectedNodeIds`, `searchMatchedIds`).

```
draw() → Reads current state variables → Renders graph elements accordingly
                  ▲
                  │
        (Methods update state, then call draw())
```

This pattern avoids:
- Fragmented DOM manipulation (a common source of bugs in libraries like jQuery).
- Visual inconsistencies (the state variables act as the single source of truth).
- Keeping multiple systems in sync (no SVG element attributes to keep updated in parallel).

### 7.4 Configuration Object Pattern

All configurable settings and constants are grouped in a single global `CONFIG` object:

```js
const CONFIG = {
    nodeColors: { ... },
    edgeColors: { ... },
    nodeRadii: { ... },
    forces: { ... },
    typeBadges: { ... }
};
```

**Benefits:**
- **Single source of truth** — settings are easy to find and modify.
- **No magic numbers** scattered throughout the codebase.
- **Implicit documentation** — property names describe what the parameters do.

---

## 8. Performance Optimizations

### 8.1 Summary of Optimizations

| # | Optimization | Problem Solved | Improvement |
|---|---|---|---|
| 1 | Adjacency Map | O(E) loop during hover → O(1) | 100x |
| 2 | 2D Canvas | SVG DOM bottleneck with 10k+ nodes | 10,000x (DOM) |
| 3 | Conditional Simulation Energy | Avoids high-energy restarts on filter changes | 5-10x |
| 4 | Reduced Physics Settings | Fewer simulation steps to settle | 2x |
| 5 | Search Debouncing | Avoids search execution on every keystroke | 10x perceived |
| 6 | Viewport Culling | Avoids drawing nodes that are off-screen | Variable |
| 7 | Custom Canvas Hit Detection | Avoids registering 4,700+ DOM click listeners | 4,700x |
| 8 | requestAnimationFrame | Provides fluid view transitions for zoom/pan | Stable 60fps |

### 8.2 Technical Breakdown of Optimizations

**Optimization 1 — Adjacency Map:**
- **Before**: `self.linkSelection.each(l => { if (l.source.id === d.id) ... })` — every hover scanned all visible edges. With 5,000 edges, this required ~5,000 iterations per hover event.
- **After**: `self.adjacency.get(d.id)` — a single `Map.get()` returns the `Set` of neighbors in constant time.
- **Result**: 5,000+ iterations reduced to a single lookup. Hover performance no longer scales with edge count.

**Optimization 2 — 2D Canvas:**
- **Before**: D3 data-join created/removed SVG nodes. Every tick modified positions of 5,000 `<line>` and 4,700 `<g>` elements in the DOM.
- **After**: Drawing pixels using `clearRect()`, `arc()`, and `lineTo()` on a single `<canvas>` element.
- **Result**: Zero DOM manipulations during simulation steps. Rendering is offloaded to the GPU.

**Optimization 3 — Conditional Energy Restart:**
- **Before**: Every filter change called `simulation.alpha(0.4).restart()`, creating massive movement.
- **After**: Node counts before and after filtering are compared. If nodes were only removed, the simulation restarts with `alpha = 0.03` (just enough to adjust positions gently).
- **Result**: Hiding nodes no longer creates a massive shaking effect.

### 8.3 Remaining Bottleneck

The only remaining performance bottleneck is the **CPU cost of the D3-force simulation itself** for 4,700 nodes. Every tick must compute:
- Barnes-Hut multi-body forces: O(N log N) with N=4700.
- Link spring forces: O(E) with E=5000.
- Collision resolution: O(N) with N=4700.

Even with Canvas rendering, if the CPU cannot compute 60 simulation ticks per second, the framerate will be bottlenecked by the physics, not the graphics. This is acceptable because the simulation cools down and stops after ~100-200 ticks once `alpha < alphaMin`.

---

## 9. Technical Glossary

| Term | Meaning |
|---|---|
| **Alpha** | The current energy level of the physics simulation. 1 is maximum, 0 is stopped |
| **Alpha decay** | The rate at which the simulation energy decreases at each tick |
| **Alpha min** | The threshold below which the simulation stops executing |
| **Barnes-Hut** | An algorithm that speeds up multi-body force calculations to O(N log N) using a quadtree |
| **CDN** | Content Delivery Network — a network of servers used to distribute assets and libraries |
| **Culling** | The technique of ignoring elements that are not currently visible to save computing power |
| **Debounce** | A method of delaying a function's execution until a certain duration of inactivity has passed |
| **DPI / DPR** | Device Pixel Ratio — the ratio of physical screen pixels to logical CSS pixels |
| **Force-directed** | A layout algorithm that uses physical forces (springs/repulsion) to arrange graphs |
| **GlobalAlpha** | A Canvas property that controls the opacity of all subsequent drawing commands |
| **God Object** | An architectural anti-pattern where a single object holds too many responsibilities |
| **HiDPI** | High density display screens (e.g. Apple Retina, 4K monitors) |
| **Hit detection** | Determining which graphical object the user has hovered over or clicked |
| **Layout** | The spatial arrangement of nodes in 2D or 3D space |
| **Lookup O(1)** | An operation that completes in constant time, independent of dataset size |
| **Quadtree** | A tree structure that recursively divides a 2D space into 4 quadrants |
| **Repaint** | The browser rendering step that redraws pixels on the screen |
| **Reflow** | The browser rendering step that recalculates the geometry and layout of DOM elements |
| **requestAnimationFrame**| A browser API for scheduling animations synchronized with the screen's refresh rate |
| **Tick** | A single step of the physics simulation (typically 1/60th of a second) |
| **Utility-first** | A CSS design approach utilizing composition of atomic classes instead of abstract components |
| **Viewport** | The visible portion of a web page in the browser window |
| **Viewport culling** | Skipping the drawing commands for elements that are outside the visible screen region |

---

## 10. Possible Exam Questions

### Q1: Why did you choose Canvas over SVG?

> The application handles ~4,700 nodes and ~5,000 edges. With SVG, every node and edge is a DOM element (totaling ~10,000 elements). Every tick of the physics simulation updates positions, causing expensive DOM reflow and repaint calculations. Canvas is a single DOM node that draws onto a flat bitmap. GPU-accelerated rasterization scales exceptionally well and avoids DOM modification overhead.

### Q2: How do you handle hit detection on the Canvas?

> Since Canvas doesn't fire click events for individual drawings, we listen for clicks on the canvas element, translate the mouse screen coordinate to world space using the inverse transform matrix (zoom/pan offset), and iterate through active nodes to find the closest one. We compare squared distances to skip calling the slow `Math.sqrt()` function. This O(N) iteration for N=4,700 nodes takes ~0.5ms, which is trivial.

### Q3: How does the D3.js force-directed simulation work?

> D3 assigns physical forces to nodes: repulsion between all node pairs (using the Barnes-Hut O(N log N) algorithm), elastic spring attraction along edges, centripetal center forces, and collision forces to prevent overlaps. The velocity and position of nodes are updated on each tick. The simulation cools down over time as the energy level (`alpha`) decays, stopping once it falls below the minimum threshold.

### Q4: How did you optimize edge checking for hovers and selection?

> We pre-calculated an adjacency map: `Map<nodeId, Set<neighborIds>>` at startup. Instead of searching through all 5,000+ edges on every hover event to find connected nodes, we perform an O(1) map lookup `Map.get(nodeId)` which instantly returns the set of neighboring IDs.

### Q5: Why did you choose not to use React or other frameworks?

> The application is a single-page app focused purely on displaying a graph. React would have introduced extra bundle size and virtual DOM overhead with no benefit, since the primary view is drawn inside a Canvas and the remaining UI consists of a simple sidebar and header. Vanilla JavaScript keeps the project fast, clean, and directly runnable.

### Q6: How do you distinguish between clicking and dragging?

> We record the mouse coordinates on `mousedown`. On mouse release (`click`/`mouseup`), if the cursor has moved more than 5 pixels, we classify the action as a drag/pan operation and skip triggering the node selection event. This prevents node deselection when panning the view.

### Q7: Explain your zoom and pan implementation.

> We don't use D3 zoom. We manage the transformation state `{x, y, k}` (offsets and scale) manually. During scroll wheel events, we compute the new scale `k` and translate offsets to zoom centered on the cursor position. During dragging on the background, we update the `x` and `y` offsets. Before rendering in `draw()`, we apply `ctx.translate(tx, ty)` and `ctx.scale(k, k)`.

### Q8: How do you ensure visual sharpness on Retina screens?

> We scale the physical canvas size by the browser's `window.devicePixelRatio` while keeping its CSS display size constant. We then call `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` in our draw loop. Without this scaling, one CSS pixel would be mapped to a single physical pixel, resulting in blurry rendering on high-DPI displays.

### Q9: How did you reduce lag when applying filters?

> When nodes are hidden by filter toggles, we avoid restarting the simulation at full energy. We compare active node counts before and after the change: if nodes were only removed, we restart with a minimal energy level `alpha = 0.03`. If nodes were added, we use `alpha = 0.15`. This prevents a high-energy "explosion" effect when hiding elements.

### Q10: How does the details panel navigation work?

> Clicking a node triggers `showNodeDetails()`, which populates the sidebar with the node's attributes and connections. Connections are gathered by scanning the active edges. Clicking a connection link in the list calls `selectNode(neighborId)`, which centers the view on the neighbor node and updates the details panel seamlessly.
