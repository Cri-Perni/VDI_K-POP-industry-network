# 🇰🇷 K-Pop Network Analysis — Visualizzazione dell'Industria K-Pop

Applicazione web avanzata ed interattiva per l'esplorazione e la visualizzazione della rete delle relazioni nell'industria musicale del **Korean Pop (K-Pop)**.

Il sistema modella le connessioni tra le principali **agenzie discografiche (labels)**, i **gruppi musicali** e i **singoli artisti (idol)** tramite grafi interattivi in **modalità 2D e 3D**, consentendo un'analisi approfondita delle strutture aziendali, delle appartenenze ai gruppi e delle collaborazioni artistiche.

---

## 📸 Anteprima e Screenshot

> [!NOTE]
> *Gli screenshot dell'applicazione possono essere inseriti nella cartella [`../docs/screenshots/`](../docs/screenshots/) con i nomi di file indicati di seguito.*

### 🎨 Visualizzazione 2D (Canvas API & D3 Force)
![Vista 2D del Grafo K-Pop](../docs/screenshots/2d-network-view.png)
*Visualizzazione bidimensionale force-directed renderizzata ad alte prestazioni tramite Canvas 2D API. Supporta zoom, pan, trascinamento dei nodi ed evidenziazione dei vicini di primo livello.*

---

### 🌐 Visualizzazione 3D (WebGL & Orbit Controls)
![Vista 3D del Grafo K-Pop](../docs/screenshots/3d-network-view.png)
*Visualizzazione tridimensionale WebGL ad alta frequenza di fotogrammi con controlli d'orbita a 360°, simulazione spaziale, widget direzionale UI e slider di profondità BFS delle relazioni.*

---

### 🔍 Ricerca e Dettagli Entità
![Ricerca e Card Dettagli Entità](../docs/screenshots/search-and-details.png)
*Pannello di ricerca istantanea con evidenziazione in tempo reale, filtri per tipologia di entità e card informativa interattiva per la navigazione tra le relazioni collegate.*

---

## ✨ Caratteristiche Principali

* **Dual-Mode 2D & 3D:** Passaggio istantaneo tra la vista 2D (Canvas API + D3.js) e la vista 3D (WebGL + Three.js / Orbit Controls).
* **Controlli d'Orbita 3D Completi:** Telecamera 3D a 360° con asse fisso (Pole Lock) e widget fluttuante con frecce direzionali (◄ ► ▲ ▼) per un orientamento guidato della vista.
* **Profondità Relazionale Dinamica (BFS Hops):** Slider in modalità 3D per esplorare la rete di connessioni attorno al nodo selezionato a profondità scalabile (da 1 a 4 salti di distanza).
* **Filtri Tipologia Entità:** Possibilità di filtrare dinamicamente i nodi del grafo per Label, Gruppi e Persone/Idol.
* **Messa a Fuoco Fluida & Inseguimento:** Inquadratura automatica e centrata sul nodo selezionato sia in vista 2D che 3D.
* **Card Dettagli Interattiva:** Sidebar dinamica che mostra la tipologia dell'entità, il conteggio delle relazioni attive e l'elenco cliccabile dei collegamenti.

---

## 🚀 Avvio Locale

Eseguire nella cartella principale del progetto:
```bash
npx serve kpop-graph
```
Oppure tramite Python:
```bash
python -m http.server 8000
```
E aprire nel browser `http://localhost:8000/kpop-graph/`.
