# 🇰🇷 K-Pop Network Analysis — Visualizing the K-Pop Industry

An advanced, interactive web application for exploring and visualizing the relationship network within the **Korean Pop (K-Pop)** music industry.

The system models the connections between major **record labels (agencies)**, **music groups**, and **individual artists (idols)** through interactive graphs in **2D and 3D modes**, enabling in-depth analysis of corporate structures, group memberships, and artistic collaborations.

---

## 📸 Preview and Screenshots

> [!NOTE]
> *Application screenshots can be placed in the [`../docs/screenshots/`](../docs/screenshots/) folder using the filenames specified below.*

### 🎨 2D Visualization (Canvas API & D3 Force)
![K-Pop Graph 2D View](../docs/screenshots/2d-network-view.png)
*High-performance, force-directed two-dimensional visualization rendered using the Canvas 2D API. Supports zoom, pan, node dragging, and highlighting of first-level neighbors.*

---

### 🌐 3D Visualization (WebGL & Orbit Controls)
![K-Pop Graph 3D View](../docs/screenshots/3d-network-view.png)
*High-framerate 3D WebGL visualization featuring 360° orbit controls, spatial simulation, a floating UI direction widget, and a BFS depth slider for exploring relational hops.*

---

### 🔍 Search and Entity Details
![Search and Entity Details Card](../docs/screenshots/search-and-details.png)
*Instant search panel with real-time highlighting, entity type filtering, and an interactive info card for navigating connected relationships.*

---

## ✨ Key Features

* **Dual-Mode 2D & 3D:** Instant toggle between the 2D view (Canvas API + D3.js) and the 3D view (WebGL + Three.js / Orbit Controls).
* **Full 3D Orbit Controls:** 360° 3D camera control with a fixed axis (Pole Lock) and a floating navigation widget with directional arrows (◄ ► ▲ ▼) for guided orientation.
* **Dynamic Relational Depth (BFS Hops):** A slider in 3D mode to explore the network of connections around a selected node at a scalable depth (from 1 to 4 hops away).
* **Entity Type Filters:** Ability to dynamically filter graph nodes by Label, Group, and Person/Idol.
* **Smooth Focus & Target Tracking:** Automatic, smooth camera transition centering on the selected node in both 2D and 3D views.
* **Interactive Details Card:** A dynamic sidebar showing the entity type, count of active relationships, and a clickable list of connections.

---

## 🚀 Local Setup & Running

Run in the main project directory:
```bash
npx serve kpop-graph
```
Or via Python:
```bash
python -m http.server 8000
```
And open `http://localhost:8000/kpop-graph/` in your browser.
