/**
 * Progetto 16: K-Pop Network Analysis
 * Corso di Visualizzazione delle Informazioni
 * Codice sorgente strutturato ad Oggetti (OOP) e ottimizzato
 */

/**
 * Configurazione centrale e centralizzata dell'applicazione.
 * Contiene i parametri visivi, fisici e i selettori DOM per una manutenzione rapida.
 */
const CONFIG = {
    // Percorsi dei dati CSV
    paths: {
        nodes: "../data/K-pop_node.csv",
        edges: "../data/K-pop_edge.csv"
    },
    // Codici colore associati a ciascuna tipologia di nodo
    nodeColors: {
        "label": "#ef4444",   // Rosso: Agenzie di Management
        "group": "#3b82f6",   // Blu: Gruppi Musicali (Band)
        "person": "#10b981",  // Verde: Idols generici
        "male": "#06b6d4",    // Cyan: Idols maschili
        "female": "#ec4899"   // Rosa: Idols femminili
    },
    // Classi Tailwind per i badge della card dettagli
    typeBadges: {
        label: { text: "Agenzia", css: "bg-red-500/20 text-red-400 border border-red-500/30" },
        group: { text: "Gruppo", css: "bg-blue-500/20 text-blue-400 border border-blue-500/30" },
        person: { text: "Idol", css: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" },
        male: { text: "Idol (M)", css: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" },
        female: { text: "Idol (F)", css: "bg-pink-500/20 text-pink-400 border border-pink-500/30" }
    },
    // Colori degli archi in base al tipo di relazione inferita
    edgeColors: {
        management: "#ef4444", // Rosso: Contratto agenzia -> idol/gruppo
        membership: "#3b82f6", // Blu: Appartenenza idol -> gruppo
        association: "#10b981" // Verde: Collaborazioni o altro
    },
    // Dimensioni dei cerchi dei nodi per tipo
    nodeRadii: {
        label: 10,
        group: 7.5,
        default: 5.5
    },
    // Parametri del motore fisico Force-Directed di D3
    forces: {
        chargeStrength: -140,  // Forza di repulsione tra i nodi
        linkDistance: 75,      // Distanza ideale degli archi
        collisionRadius: 28,   // Raggio di collisione per prevenire overlap
        alphaTargetDrag: 0.2,   // Reattività termica della fisica durante il drag
        alphaUpdateRestart: 0.4 // Livello di energia per il rinfresco del grafo
    }
};

/**
 * Classe principale di orchestrazione del grafo K-Pop Network.
 * Incapsula lo stato, la logica D3 e gli handler degli eventi UI per prevenire inquinamenti globali.
 */
class KPopNetworkGraph {
    constructor() {
        // --- STATO APPLICATIVO ---
        this.globalNodes = [];    // Nodi totali caricati (immutabili post-load)
        this.globalEdges = [];    // Archi totali caricati (immutabili post-load)
        
        this.selectedNode = null; // Nodo correntemente cliccato/selezionato
        this.searchQuery = "";    // Query di ricerca corrente

        // --- RIFERIMENTI D3 ---
        this.svg = null;
        this.g = null;            // Gruppo contenitore principale soggetto a zoom
        this.zoomBehavior = null;
        this.simulation = null;
        
        this.linkSelection = null;
        this.nodeSelection = null;

        // --- CACHE DEGLI ELEMENTI DOM ---
        this.dom = {
            container: document.getElementById("canvas-container"),
            loading: document.getElementById("loading"),
            
            // Filtri
            filterLabel: document.getElementById("filter-label"),
            filterGroup: document.getElementById("filter-group"),
            filterPerson: document.getElementById("filter-person"),
            
            // Ricerca
            searchInput: document.getElementById("search-input"),
            searchClear: document.getElementById("search-clear"),
            searchResultsCount: document.getElementById("search-results-count"),
            
            // Card dettagli
            detailsBox: document.getElementById("details-box"),
            detailsClose: document.getElementById("details-close"),
            detailName: document.getElementById("detail-name"),
            detailTypeBadge: document.getElementById("detail-type-badge"),
            detailConnections: document.getElementById("detail-connections"),
            detailConnectionsSection: document.getElementById("detail-connections-list-section"),
            detailConnectionsList: document.getElementById("detail-connections-list"),
            
            // Pulsante Reset
            btnResetZoom: document.getElementById("btn-reset-zoom")
        };
    }

    /**
     * Entrypoint principale dell'applicazione. Carica i file e inizializza il grafo.
     */
    async initialize() {
        try {
            // Caricamento asincrono parallelo tramite Promise ed ES6 async/await
            const [nodesData, edgesData] = await Promise.all([
                d3.csv(CONFIG.paths.nodes),
                d3.csv(CONFIG.paths.edges)
            ]);

            // Nascondi la schermata di caricamento
            if (this.dom.loading) {
                this.dom.loading.classList.add("hidden");
            }

            // Parsing e pulizia formale dei dati dei nodi
            this.globalNodes = nodesData.map(d => ({
                id: d.id.trim(),
                name: d.name.trim(),
                type: d.type.trim() // label, group, person, male, female
            }));

            // Creazione di una mappa per risolvere i tipi dei nodi tramite ID in O(1)
            const nodeTypeMap = new Map(this.globalNodes.map(n => [n.id, n.type]));

            // Inferenza semantica del tipo di relazione dagli estremi dell'arco
            this.globalEdges = edgesData.map(e => {
                const srcId = e.source.trim();
                const tgtId = e.target.trim();
                
                const srcType = nodeTypeMap.get(srcId);
                const tgtType = nodeTypeMap.get(tgtId);
                
                let relType = "association"; // Default collaborativo generico
                
                if (srcType === "label") {
                    relType = "management"; // Agenzia -> Gruppo o Agenzia -> Idol
                } else if ((srcType === "person" || srcType === "male" || srcType === "female") && tgtType === "group") {
                    relType = "membership"; // Idol -> Gruppo d'appartenenza
                }

                return {
                    source: srcId,
                    target: tgtId,
                    relation: relType
                };
            });

            // Configurazione della struttura visiva e fisica di D3
            this.initGraph();
            
            // Aggancio dei listener degli eventi sui componenti UI
            this.setupListeners();

            // Primo rendering reattivo del grafo
            this.updateGraph();

        } catch (error) {
            console.error("Errore critico durante l'inizializzazione dell'applicazione:", error);
            if (this.dom.loading) {
                this.dom.loading.innerHTML = `
                    <div class='bg-red-500/10 border border-red-500/30 rounded-lg p-5 text-center max-w-md mx-auto shadow-xl'>
                        <p class='text-red-400 font-semibold mb-2'>Errore nel caricamento dei dati CSV</p>
                        <p class='text-xs text-slate-400 mb-4'>Verifica che la cartella 'data' sia accessibile e che il server locale sia avviato nella cartella principale.</p>
                        <span class='text-[10px] font-mono bg-slate-950 p-2 block rounded text-red-500/80 break-words'>${error.message}</span>
                    </div>`;
            }
        }
    }

    /**
     * Inizializza l'architettura grafica SVG, lo zoom e il motore fisico.
     */
    initGraph() {
        const width = this.dom.container.clientWidth;
        const height = this.dom.container.clientHeight;

        // Creazione dell'elemento SVG responsive
        this.svg = d3.select("#canvas-container")
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${width} ${height}`);

        // Container g principale che ospita gli elementi soggetti a Zoom/Pan
        this.g = this.svg.append("g");

        // Configurazione del modulo di Zoom e Panning
        this.zoomBehavior = d3.zoom()
            .scaleExtent([0.05, 8]) // Da panoramica distante a dettaglio macro
            .on("zoom", (event) => { 
                this.g.attr("transform", event.transform); 
            });
        this.svg.call(this.zoomBehavior);

        // Configurazione del motore fisico ad algoritmi Force-Directed
        this.simulation = d3.forceSimulation()
            .force("link", d3.forceLink().id(d => d.id).distance(CONFIG.forces.linkDistance))
            .force("charge", d3.forceManyBody().strength(CONFIG.forces.chargeStrength))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(CONFIG.forces.collisionRadius));

        // Creazione dei layer SVG (Archi disegnati sotto, Nodi sovrapposti sopra)
        this.linkSelection = this.g.append("g")
            .attr("class", "links")
            .selectAll("line");

        this.nodeSelection = this.g.append("g")
            .attr("class", "nodes")
            .selectAll("g");

        // Aggancio del calcolo fisico frame-by-frame (Tick della simulazione)
        this.simulation.on("tick", () => {
            this.linkSelection
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            this.nodeSelection
                .attr("transform", d => `translate(${d.x}, ${d.y})`);
        });
    }

    /**
     * Motore reattivo dell'applicazione. Filtra i dati in base ai controlli attivi,
     * aggiorna il Data Join di D3, applica le transizioni e rinfresca la fisica.
     */
    updateGraph() {
        // Lettura dello stato corrente dei checkbox filtri
        const showLabel = this.dom.filterLabel.checked;
        const showGroup = this.dom.filterGroup.checked;
        const showPerson = this.dom.filterPerson.checked;

        // Predicato di validazione visibilità
        const isVisible = (type) => {
            if (type === "label") return showLabel;
            if (type === "group") return showGroup;
            if (type === "person" || type === "male" || type === "female") return showPerson;
            return true;
        };

        // Filtra i nodi visibili
        const filteredNodes = this.globalNodes.filter(n => isVisible(n.type));
        const activeNodeIds = new Set(filteredNodes.map(n => n.id));

        // Filtra gli archi (conserviamo solo relazioni i cui estremi sono entrambi visibili)
        const filteredEdges = this.globalEdges.filter(e => {
            const sourceId = e.source.id || e.source;
            const targetId = e.target.id || e.target;
            return activeNodeIds.has(sourceId) && activeNodeIds.has(targetId);
        });

        // 1. DATA JOIN SUGLI ARCHI (LINKS)
        this.linkSelection = this.linkSelection.data(
            filteredEdges, 
            d => `${d.source.id || d.source}-${d.target.id || d.target}`
        );
        this.linkSelection.exit().remove(); // Rimozione archi disattivati

        const linkEnter = this.linkSelection.enter().append("line")
            .attr("class", "link")
            .attr("stroke", d => CONFIG.edgeColors[d.relation] || CONFIG.edgeColors.association);
        
        this.linkSelection = linkEnter.merge(this.linkSelection);

        // 2. DATA JOIN SUI NODI (NODES)
        this.nodeSelection = this.nodeSelection.data(filteredNodes, d => d.id);
        
        // Se un nodo selezionato scompare a causa dei filtri, azzera la selezione dei dettagli
        if (this.selectedNode && !activeNodeIds.has(this.selectedNode.id)) {
            this.clearNodeSelection();
        }
        
        this.nodeSelection.exit().remove(); // Rimozione nodi filtrati

        // Creazione del guscio 'g' contenitore per ciascun nodo inserito
        const nodeEnter = this.nodeSelection.enter().append("g")
            .attr("class", "node cursor-pointer")
            .call(this.drag(this.simulation)); // Collegamento della routine di trascinamento mouse

        // Cerchio geometrico del nodo
        nodeEnter.append("circle")
            .attr("r", d => CONFIG.nodeRadii[d.type] || CONFIG.nodeRadii.default)
            .attr("fill", d => CONFIG.nodeColors[d.type] || "#ffffff")
            .attr("stroke", "#0f172a")
            .attr("stroke-width", 1.5);

        // Etichetta testuale del nodo
        nodeEnter.append("text")
            .attr("dx", 14)
            .attr("dy", ".35em")
            .text(d => d.name)
            .attr("fill", "#94a3b8");

        this.nodeSelection = nodeEnter.merge(this.nodeSelection);

        // Configurazione delle routine interattive contestuali
        this.setupInteractions();

        // Ricalcolo del layout della barra di ricerca se è presente testo
        if (this.searchQuery) {
            this.applySearchHighlight();
        }

        // 3. AGGIORNAMENTO SIMULAZIONE FISICA
        this.simulation.nodes(filteredNodes);
        this.simulation.force("link").links(filteredEdges);
        this.simulation.alpha(CONFIG.forces.alphaUpdateRestart).restart();
    }

    /**
     * Gestisce i comportamenti interattivi come focus su Hover e click di dettaglio.
     */
    setupInteractions() {
        const self = this;

        // Gestione Hover (Focus ed isolamento dei vicini immediati)
        this.nodeSelection.on("mouseover", function(event, d) {
            // Se c'è una query di ricerca attiva o un nodo cliccato, l'hover non deve sovrascrivere l'evidenziazione
            if (self.searchQuery || self.selectedNode) return;

            const connectedNodeIds = new Set([d.id]);
            
            // Analisi dei link correntemente visualizzati per mappare i confinanti
            self.linkSelection.each(l => {
                if (l.source.id === d.id) connectedNodeIds.add(l.target.id);
                if (l.target.id === d.id) connectedNodeIds.add(l.source.id);
            });

            // Opacità selettiva (attenuazione drastica del rumore visivo)
            self.nodeSelection.style("opacity", n => connectedNodeIds.has(n.id) ? 1 : 0.08);
            self.linkSelection.style("opacity", l => (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.02);
            
            // Evidenziazione bordo del cerchio hoverato
            d3.select(this).select("circle")
                .transition().duration(150)
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 2.5);
        });

        // Ripristino delle opacità standard all'uscita del cursore
        this.nodeSelection.on("mouseout", function(event, d) {
            if (self.searchQuery || self.selectedNode) {
                // Se c'è uno stato attivo (ricerca o selezione), ripristiniamo l'evidenziazione dello stato
                if (self.selectedNode) {
                    self.applySelectionHighlight();
                } else {
                    self.applySearchHighlight();
                }
                return;
            }

            self.nodeSelection.style("opacity", 1);
            self.linkSelection.style("opacity", 0.6);

            d3.select(this).select("circle")
                .transition().duration(150)
                .attr("stroke", "#0f172a")
                .attr("stroke-width", 1.5);
        });

        // Click sul nodo per aprire e focalizzare la Card Dettagli
        this.nodeSelection.on("click", function(event, d) {
            event.stopPropagation(); // Previene eventi di click sul background SVG
            self.selectNode(d);
        });
    }

    /**
     * Seleziona e focalizza un nodo specifico, aggiornando sia la grafica che la sidebar.
     */
    selectNode(node) {
        this.selectedNode = node;
        
        // Popola ed apre la card dettagli della sidebar
        this.showNodeDetails(node);
        
        // Applica l'isolamento grafico del nodo selezionato
        this.applySelectionHighlight();

        // Ricentra la telecamera sul nodo cliccato con un'animazione fluida
        this.panToNode(node);
    }

    /**
     * Applica l'evidenziazione visiva incentrata sul nodo selezionato.
     */
    applySelectionHighlight() {
        if (!this.selectedNode) return;
        const targetId = this.selectedNode.id;
        const connectedNodeIds = new Set([targetId]);

        // Trova i nodi collegati basandosi sui link visibili
        this.linkSelection.each(l => {
            const srcId = l.source.id || l.source;
            const tgtId = l.target.id || l.target;
            if (srcId === targetId) connectedNodeIds.add(tgtId);
            if (tgtId === targetId) connectedNodeIds.add(srcId);
        });

        // Regola l'opacità per isolare la sottorete del nodo selezionato
        this.nodeSelection.style("opacity", n => connectedNodeIds.has(n.id) ? 1 : 0.08);
        this.linkSelection.style("opacity", l => {
            const srcId = l.source.id || l.source;
            const tgtId = l.target.id || l.target;
            return (srcId === targetId || tgtId === targetId) ? 1 : 0.02;
        });

        // Aggiungi un anello di evidenziazione bianco al nodo selezionato
        this.nodeSelection.select("circle")
            .attr("stroke", n => n.id === targetId ? "#ffffff" : "#0f172a")
            .attr("stroke-width", n => n.id === targetId ? 3 : 1.5);
    }

    /**
     * Popola e mostra la card dei dettagli avanzati del nodo selezionato, 
     * includendo le connessioni navigabili in un elenco interattivo.
     */
    showNodeDetails(node) {
        const self = this;
        const box = this.dom.detailsBox;
        
        // Rendi visibile la card rimuovendo 'hidden' con una piccola transizione
        box.classList.remove("hidden");
        
        // 1. Popola testi primari
        this.dom.detailName.innerText = node.name;
        
        // 2. Configura badge del tipo con colori coordinati da CONFIG
        const badgeDef = CONFIG.typeBadges[node.type] || { text: node.type, css: "bg-slate-700 text-slate-300" };
        this.dom.detailTypeBadge.innerText = badgeDef.text;
        this.dom.detailTypeBadge.className = `px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${badgeDef.css}`;

        // 3. Estrae e popola la lista delle relazioni attive confinanti
        const currentLinks = [];
        this.linkSelection.each(l => {
            const srcId = l.source.id || l.source;
            const tgtId = l.target.id || l.target;
            
            if (srcId === node.id || tgtId === node.id) {
                const neighbor = srcId === node.id ? l.target : l.source;
                currentLinks.push({
                    neighbor: neighbor,
                    relation: l.relation
                });
            }
        });

        this.dom.detailConnections.innerText = `${currentLinks.length} relazioni attive visibili`;

        // Se ci sono connessioni, mostra la lista interattiva
        if (currentLinks.length > 0) {
            this.dom.detailConnectionsSection.classList.remove("hidden");
            this.dom.detailConnectionsList.innerHTML = ""; // Svuota lista

            currentLinks.forEach(link => {
                const neighbor = link.neighbor;
                
                // Creazione elemento riga
                const row = document.createElement("button");
                row.className = "w-full text-left flex justify-between items-center bg-slate-800/40 hover:bg-pink-500/10 hover:border-pink-500/20 border border-transparent p-1.5 rounded transition-all cursor-pointer text-slate-300 hover:text-pink-300 text-[11px] focus:outline-none";
                
                // Badge della relazione a destra
                let relLabel = "Collaborazione";
                let relColorClass = "text-emerald-400";
                if (link.relation === "management") {
                    relLabel = "Management";
                    relColorClass = "text-red-400";
                } else if (link.relation === "membership") {
                    relLabel = "Membro";
                    relColorClass = "text-blue-400";
                }

                row.innerHTML = `
                    <span class="font-semibold truncate pr-2 max-w-[130px]">${neighbor.name}</span>
                    <span class="text-[9px] uppercase tracking-wider font-bold ${relColorClass}">${relLabel}</span>
                `;

                // Al click della riga, naviga verso il nodo corrispondente
                row.addEventListener("click", (e) => {
                    e.stopPropagation();
                    self.selectNode(neighbor);
                });

                this.dom.detailConnectionsList.appendChild(row);
            });
        } else {
            this.dom.detailConnectionsSection.classList.add("hidden");
        }
    }

    /**
     * Cancella la selezione del nodo corrente e ripristina la visualizzazione normale.
     */
    clearNodeSelection() {
        this.selectedNode = null;
        
        // Nascondi la card dei dettagli
        this.dom.detailsBox.classList.add("hidden");
        
        // Ripristina l'aspetto originario di nodi e bordi
        this.nodeSelection.style("opacity", 1);
        this.linkSelection.style("opacity", 0.6);
        
        this.nodeSelection.select("circle")
            .attr("stroke", "#0f172a")
            .attr("stroke-width", 1.5);

        // Se c'è una ricerca attiva, applica nuovamente l'evidenziazione dei risultati
        if (this.searchQuery) {
            this.applySearchHighlight();
        }
    }

    /**
     * Configura la logica di ricerca interattiva real-time.
     */
    setupSearch() {
        const input = this.dom.searchInput;
        const clearBtn = this.dom.searchClear;
        const resultsCount = this.dom.searchResultsCount;

        const handleSearch = (event) => {
            this.searchQuery = event.target.value.toLowerCase().trim();

            if (this.searchQuery === "") {
                // Query vuota: ripristina lo stato standard
                clearBtn.classList.add("hidden");
                resultsCount.classList.add("hidden");
                
                if (this.selectedNode) {
                    this.applySelectionHighlight();
                } else {
                    this.nodeSelection.style("opacity", 1);
                    this.linkSelection.style("opacity", 0.6);
                }
            } else {
                // Query presente: mostra pulsante di pulizia e applica evidenziazione
                clearBtn.classList.remove("hidden");
                this.applySearchHighlight();
            }
        };

        input.addEventListener("input", handleSearch);

        // Bottone X per azzerare istantaneamente il testo inserito
        clearBtn.addEventListener("click", () => {
            input.value = "";
            this.searchQuery = "";
            clearBtn.classList.add("hidden");
            resultsCount.classList.add("hidden");

            if (this.selectedNode) {
                this.applySelectionHighlight();
            } else {
                this.nodeSelection.style("opacity", 1);
                this.linkSelection.style("opacity", 0.6);
            }
        });
    }

    /**
     * Evidenzia ed isola i nodi che corrispondono alla query di ricerca digitata.
     */
    applySearchHighlight() {
        const query = this.searchQuery;
        if (!query) return;

        const matchedIds = new Set();
        
        // Identifica i nodi corrispondenti (Case insensitive su ID e Nome)
        this.nodeSelection.each(n => {
            if (n.name.toLowerCase().includes(query) || n.id.toLowerCase().includes(query)) {
                matchedIds.add(n.id);
            }
        });

        // Aggiorna il contatore dei risultati trovati
        const count = matchedIds.size;
        const countDiv = this.dom.searchResultsCount;
        countDiv.classList.remove("hidden");
        if (count === 0) {
            countDiv.innerHTML = "<span class='text-red-400 font-semibold'>Nessun risultato trovato</span>";
        } else {
            countDiv.innerHTML = `<span class='text-pink-400 font-semibold'>${count}</span> ${count === 1 ? 'nodo trovato' : 'nodi trovati'}`;
        }

        // Se un nodo è già cliccato/selezionato, la ricerca evidenzia la combinazione delle due
        // Altrimenti attenua i nodi e link non corrispondenti
        this.nodeSelection.style("opacity", n => matchedIds.has(n.id) ? 1 : 0.08);
        this.linkSelection.style("opacity", l => {
            const srcId = l.source.id || l.source;
            const tgtId = l.target.id || l.target;
            return (matchedIds.has(srcId) || matchedIds.has(tgtId)) ? 0.8 : 0.02;
        });

        // Evidenziazione visiva dei cerchi trovati
        this.nodeSelection.select("circle")
            .attr("stroke", n => matchedIds.has(n.id) ? "#ec4899" : "#0f172a") // Rosa Tailwind per i match
            .attr("stroke-width", n => matchedIds.has(n.id) ? 2.5 : 1.5);
    }

    /**
     * Resetta lo zoom ed effettua il panning fluido per ricentrare la visualizzazione.
     */
    resetZoom() {
        if (!this.svg || !this.zoomBehavior) return;

        const width = this.dom.container.clientWidth;
        const height = this.dom.container.clientHeight;

        // Transizione coordinata verso lo zoom predefinito (identità scalata 1:1, centrata)
        this.svg.transition()
            .duration(750)
            .ease(d3.easeCubicOut)
            .call(this.zoomBehavior.transform, d3.zoomIdentity.translate(0, 0).scale(1));
    }

    /**
     * Esegue il panning dinamico per centrare un determinato nodo nello schermo.
     */
    panToNode(node) {
        if (!this.svg || !this.zoomBehavior) return;

        const width = this.dom.container.clientWidth;
        const height = this.dom.container.clientHeight;

        // Calcola lo spostamento necessario per allineare il nodo al centro geometrico
        const targetX = width / 2 - node.x;
        const targetY = height / 2 - node.y;

        const transform = d3.zoomIdentity
            .translate(targetX, targetY)
            .scale(1); // Mantiene scala ad 1 per focus dettagliato

        this.svg.transition()
            .duration(750)
            .ease(d3.easeCubicOut)
            .call(this.zoomBehavior.transform, transform);
    }

    /**
     * Collega gli eventi DOM ai vari componenti di controllo della Sidebar e del Grafo.
     */
    setupListeners() {
        // Listener sui Checkbox dei filtri (Eseguono il rinfresco D3 reattivo)
        this.dom.filterLabel.addEventListener("change", () => this.updateGraph());
        this.dom.filterGroup.addEventListener("change", () => this.updateGraph());
        this.dom.filterPerson.addEventListener("change", () => this.updateGraph());

        // Pulsante di reset zoom flottante
        this.dom.btnResetZoom.addEventListener("click", () => this.resetZoom());

        // Bottone di chiusura card dettagli
        this.dom.detailsClose.addEventListener("click", (e) => {
            e.stopPropagation();
            this.clearNodeSelection();
        });

        // Cliccare sullo sfondo vuoto dell'SVG deseleziona il nodo corrente
        if (this.svg) {
            this.svg.on("click", () => {
                if (this.selectedNode) {
                    this.clearNodeSelection();
                }
            });
        }

        // Inizializzazione della barra di ricerca
        this.setupSearch();

        // Ricalcola le dimensioni dell'SVG in caso di ridimensionamento finestra (Responsive)
        window.addEventListener("resize", () => {
            if (!this.svg || !this.simulation) return;
            const width = this.dom.container.clientWidth;
            const height = this.dom.container.clientHeight;
            
            this.simulation.force("center", d3.forceCenter(width / 2, height / 2));
            this.simulation.alpha(0.1).restart();
        });
    }

    /**
     * Modulo di trascinamento mouse (Drag & Drop) dei nodi basato sul motore fisico.
     */
    drag(simulation) {
        function dragstarted(event, d) {
            // Mantiene attiva la fisica rinfocolando l'energia durante l'interazione
            if (!event.active) {
                simulation.alphaTarget(CONFIG.forces.alphaTargetDrag).restart();
            }
            d.fx = d.x;
            d.fy = d.y;
        }
        
        function dragged(event, d) {
            // Blocca la coordinata del nodo alla posizione corrente del mouse
            d.fx = event.x;
            d.fy = event.y;
        }
        
        function dragended(event, d) {
            if (!event.active) {
                simulation.alphaTarget(0);
            }
            // Rilascia i vincoli fissati riattivando l'assestamento automatico dei nodi
            d.fx = null;
            d.fy = null;
        }
        
        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }
}

// Inizializzazione all'avvio del caricamento del DOM
document.addEventListener("DOMContentLoaded", () => {
    const app = new KPopNetworkGraph();
    app.initialize();
});
