import { CONFIG } from './config.js';

export const renderer3dMixin = {
    init3DGraph() {
        if (this.graph3d) return; // Già inizializzato

        // Crea il container per il grafico 3D
        if (!this.dom.container3d) {
            this.dom.container3d = document.createElement("div");
            this.dom.container3d.id = "3d-container";
            this.dom.container3d.className = "absolute inset-0 hidden z-0";
            this.dom.container.appendChild(this.dom.container3d);
        }

        const ForceGraph3D = window.ForceGraph3D;
        if (!ForceGraph3D) {
            console.error("Libreria ForceGraph3D non trovata su window!");
            return;
        }

        try {
            this.graph3d = ForceGraph3D({ controlType: 'orbit' })(this.dom.container3d)
                .backgroundColor('#090d16')
                .nodeLabel('name')
                .nodeColor(node => {
                    // Se c'è una query di ricerca, illumina solo i nodi corrispondenti
                    if (this.searchQuery) {
                        return this.searchMatchedIds.has(node.id)
                            ? (CONFIG.nodeColors[node.type] || '#ffffff')
                            : 'rgba(71, 85, 105, 0.15)'; // Slate spento opaco
                    }
                    // Se c'è un nodo selezionato, illumina solo il nodo e i suoi connessi (BFS)
                    if (this.selectedNode) {
                        return this.connectedNodeIds.has(node.id)
                            ? (CONFIG.nodeColors[node.type] || '#ffffff')
                            : 'rgba(71, 85, 105, 0.15)'; // Slate spento opaco
                    }
                    return CONFIG.nodeColors[node.type] || '#ffffff';
                })
                .nodeVal(node => {
                    const baseRadius = CONFIG.nodeRadii[node.type] || CONFIG.nodeRadii.default;
                    if (this.selectedNode && this.selectedNode.id === node.id) {
                        return baseRadius * 1.8; // Evidenzia il nodo selezionato ingrandendolo
                    }
                    return baseRadius;
                })
                .nodeResolution(6) // Geometrie a bassi poligoni per performance estreme con 10k nodi
                .linkWidth(1.5)
                .linkColor(link => CONFIG.edgeColors[link.relation] || CONFIG.edgeColors.association)
                .linkOpacity(0.7)
                .showNavInfo(false)
                .enableNodeDrag(false)
                .enableNavigationControls(true)
                .onNodeClick(node => {
                    this.selectNode(node);
                })
                .onBackgroundClick(() => {
                    if (this.selectedNode) {
                        this.clearNodeSelection();
                    }
                });

            // Configurazione avanzata di OrbitControls per rotazione stabile ed efficace
            const controls = typeof this.graph3d.controls === 'function' ? this.graph3d.controls() : null;
            if (controls) {
                if (controls.enableRotate !== undefined) controls.enableRotate = true;
                if (controls.rotateSpeed !== undefined) controls.rotateSpeed = 1.2;
                if (controls.enableZoom !== undefined) controls.enableZoom = true;
                if (controls.zoomSpeed !== undefined) controls.zoomSpeed = 1.2;
                if (controls.enablePan !== undefined) controls.enablePan = true;
            }

            // Imposta la forza di repulsione dei nodi per allontanarli bene in 3D (evita sovrapposizioni)
            this.graph3d.d3Force('charge').strength(-40);

            // Gestione resize finestra
            window.addEventListener("resize", () => {
                if (this.viewMode === "3D" && this.graph3d) {
                    this.graph3d.width(this.dom.container.clientWidth);
                    this.graph3d.height(this.dom.container.clientHeight);
                }
            });
        } catch (err) {
            console.error("Errore durante l'inizializzazione di ForceGraph3D:", err);
            this.graph3d = null;
        }
    },

    update3DGraph() {
        if (!this.graph3d) {
            this.init3DGraph();
        }

        // Recupera i nodi attivi in base ai filtri correnti
        const showLabel = this.dom.filterLabel.checked;
        const showGroup = this.dom.filterGroup.checked;
        const showPerson = this.dom.filterPerson.checked;

        const isVisible = (type) => {
            if (type === "label") return showLabel;
            if (type === "group") return showGroup;
            if (type === "person" || type === "male" || type === "female") return showPerson;
            return true;
        };

        const existingNodesMap = new Map();
        if (this.graph3d) {
            const prevData = this.graph3d.graphData();
            if (prevData && prevData.nodes) {
                prevData.nodes.forEach(n => {
                    if (n.x !== undefined) existingNodesMap.set(n.id, n);
                });
            }
        }

        const filteredNodes = this.globalNodes
            .filter(n => isVisible(n.type))
            .map(n => existingNodesMap.get(n.id) || n);
        const filteredNodeIds = new Set(filteredNodes.map(n => n.id));

        let activeLinks = [];

        // Se un nodo è selezionato ed è visibile, esegue BFS per determinare i link a profondità D
        if (this.selectedNode && filteredNodeIds.has(this.selectedNode.id)) {
            activeLinks = this.getBfsSubGraph(this.selectedNode.id, this.relationDepth, filteredNodeIds);
            
            // Popola connectedNodeIds con tutti i nodi nel sottografo per l'evidenziazione visiva
            this.connectedNodeIds.clear();
            this.connectedNodeIds.add(this.selectedNode.id);
            activeLinks.forEach(link => {
                const s = link.source.id || link.source;
                const t = link.target.id || link.target;
                this.connectedNodeIds.add(s);
                this.connectedNodeIds.add(t);
            });
        } else {
            this.connectedNodeIds.clear();
        }

        // 3D-Force-Graph muta gli oggetti link sostituendo gli ID con gli oggetti nodo reali.
        // Creiamo cloni leggeri per isolare le mutazioni dal nostro set originale globalEdges.
        const cleanLinks = activeLinks.map(e => ({
            source: e.source.id || e.source,
            target: e.target.id || e.target,
            relation: e.relation
        }));

        this.graph3d.graphData({
            nodes: filteredNodes,
            links: cleanLinks
        });

        // Forza il rinfresco visivo di colori e dimensioni dei nodi
        this.graph3d.nodeColor(this.graph3d.nodeColor());
        this.graph3d.nodeVal(this.graph3d.nodeVal());
    },

    getBfsSubGraph(startNodeId, maxDepth, filteredNodeIds) {
        const visited = new Set();
        const edgesToShow = [];
        const queue = [{ id: startNodeId, depth: 0 }];
        visited.add(startNodeId);

        while (queue.length > 0) {
            const { id, depth } = queue.shift();
            if (depth >= maxDepth) continue;

            const neighbors = this.adjacency.get(id);
            if (neighbors) {
                for (const neighborId of neighbors) {
                    // Controlla che il vicino sia visibile con i filtri attuali
                    if (!filteredNodeIds.has(neighborId)) continue;

                    // Trova l'arco corrispondente
                    const edge = this.globalEdges.find(e => {
                        const s = e.source.id || e.source;
                        const t = e.target.id || e.target;
                        return (s === id && t === neighborId) || (s === neighborId && t === id);
                    });

                    if (edge) {
                        // Evita duplicati di link
                        const alreadyAdded = edgesToShow.some(e => {
                            const s = e.source.id || e.source;
                            const t = e.target.id || e.target;
                            const currS = edge.source.id || edge.source;
                            const currT = edge.target.id || edge.target;
                            return (s === currS && t === currT) || (s === currT && t === currS);
                        });
                        if (!alreadyAdded) {
                            edgesToShow.push(edge);
                        }
                    }

                    if (!visited.has(neighborId)) {
                        visited.add(neighborId);
                        queue.push({ id: neighborId, depth: depth + 1 });
                    }
                }
            }
        }
        return edgesToShow;
    },

    switchViewMode(mode) {
        if (this.viewMode === mode) return;

        const btn2d = document.getElementById("btn-view-2d");
        const btn3d = document.getElementById("btn-view-3d");
        const controls3dRotate = document.getElementById("controls-3d-rotate");

        if (mode === "3D") {
            // Tenta di inizializzare il grafico 3D prima di nascondere il canvas 2D
            this.init3DGraph();

            if (!this.graph3d) {
                console.error("Impossibile passare alla modalità 3D: inizializzazione fallita.");
                return;
            }

            this.viewMode = "3D";

            btn2d.className = "flex-1 py-1.5 text-xs font-semibold rounded text-slate-400 hover:text-white transition-all cursor-pointer";
            btn3d.className = "flex-1 py-1.5 text-xs font-semibold rounded text-white bg-violet-600 transition-all cursor-pointer";

            if (controls3dRotate) {
                controls3dRotate.classList.remove("hidden");
            }

            // Sospende la simulazione 2D per preservare CPU
            if (this.simulation) {
                this.simulation.stop();
            }

            // Nasconde il canvas 2D
            if (this.canvas) {
                this.canvas.classList.add("hidden");
            }

            // Mostra il container 3D
            if (this.dom.container3d) {
                this.dom.container3d.classList.remove("hidden");
                // Regola le dimensioni all'area corrente
                this.graph3d.width(this.dom.container.clientWidth);
                this.graph3d.height(this.dom.container.clientHeight);
            }

            // Sincronizza lo slider della profondità
            this.updateDepthControlState();

            // Ricalcola e disegna il grafo 3D
            this.update3DGraph();

            // Se c'era già un nodo selezionato, sposta la camera 3D su di esso
            if (this.selectedNode) {
                this.panToNode3D(this.selectedNode);
            }

        } else {
            this.viewMode = "2D";

            btn2d.className = "flex-1 py-1.5 text-xs font-semibold rounded text-white bg-violet-600 transition-all cursor-pointer";
            btn3d.className = "flex-1 py-1.5 text-xs font-semibold rounded text-slate-400 hover:text-white transition-all cursor-pointer";

            if (controls3dRotate) {
                controls3dRotate.classList.add("hidden");
            }

            // Nasconde il container 3D
            if (this.dom.container3d) {
                this.dom.container3d.classList.add("hidden");
            }

            // Mostra il canvas 2D
            if (this.canvas) {
                this.canvas.classList.remove("hidden");
            }

            // Riattiva e riscalda la simulazione 2D
            if (this.simulation) {
                this.simulation.alpha(0.3).restart();
            }

            // Sincronizza lo slider
            this.updateDepthControlState();

            // Disegna e centra
            this.updateGraph();
            if (this.selectedNode) {
                this.panToNode(this.selectedNode);
            }
        }
    },

    updateDepthControlState() {
        const depthContainer = document.getElementById("depth-control-container");
        if (!depthContainer) return;

        if (this.viewMode === "3D" && this.selectedNode) {
            depthContainer.classList.remove("opacity-50", "pointer-events-none");
        } else {
            depthContainer.classList.add("opacity-50", "pointer-events-none");
        }
    },

    panToNode3D(node) {
        if (!this.graph3d || !node) return;

        const gData = this.graph3d.graphData();
        const matchingNode = (gData.nodes && gData.nodes.find(n => n.id === node.id)) || node;

        // Se le coordinate non sono ancora calcolate o valgano zero assoluto (inizializzazione non pronta),
        // attendi un breve tick prima di eseguire l'inquadratura
        if (matchingNode.x === undefined || matchingNode.y === undefined || matchingNode.z === undefined) {
            setTimeout(() => this.panToNode3D(node), 100);
            return;
        }

        const currentCamPos = this.graph3d.cameraPosition() || { x: 0, y: 0, z: 200 };
        const controlsTarget = (typeof this.graph3d.controls === 'function' && this.graph3d.controls() && this.graph3d.controls().target)
            ? this.graph3d.controls().target
            : { x: 0, y: 0, z: 0 };

        // Vettore di direzione attuale dalla vista al target
        let dx = currentCamPos.x - controlsTarget.x;
        let dy = currentCamPos.y - controlsTarget.y;
        let dz = currentCamPos.z - controlsTarget.z;
        let len = Math.hypot(dx, dy, dz);

        // Se la lunghezza è vicina a zero, imposta un vettore predefinito lungo l'asse Z
        if (len < 0.001) {
            dx = 0;
            dy = 0;
            dz = 1;
            len = 1;
        }

        const targetDist = 120; // Distanza di messa a fuoco ottimale
        const camX = matchingNode.x + (dx / len) * targetDist;
        const camY = matchingNode.y + (dy / len) * targetDist;
        const camZ = matchingNode.z + (dz / len) * targetDist;

        this.graph3d.cameraPosition(
            { x: camX, y: camY, z: camZ },
            { x: matchingNode.x, y: matchingNode.y, z: matchingNode.z },
            1000 // durata animazione in ms
        );
    },

    resetZoom3D() {
        if (this.graph3d) {
            this.graph3d.zoomToFit(1000, 100);
        }
    },

    rotateCamera3D(angleDeltaX = 0, angleDeltaY = 0) {
        if (!this.graph3d) return;

        const currentCamPos = this.graph3d.cameraPosition() || { x: 0, y: 0, z: 200 };
        const controlsTarget = (this.graph3d.controls && this.graph3d.controls().target) || { x: 0, y: 0, z: 0 };

        // Calcolo coordinate sferiche rispetto al target
        let dx = currentCamPos.x - controlsTarget.x;
        let dy = currentCamPos.y - controlsTarget.y;
        let dz = currentCamPos.z - controlsTarget.z;

        const radius = Math.hypot(dx, dy, dz) || 200;
        let theta = Math.atan2(dx, dz); // azimuto
        let phi = Math.acos(Math.max(-1, Math.min(1, dy / radius))); // elevazione

        // Applica l'incremento di rotazione (in radianti)
        theta += (angleDeltaX * Math.PI) / 180;
        phi = Math.max(0.01, Math.min(Math.PI - 0.01, phi - (angleDeltaY * Math.PI) / 180));

        const newX = controlsTarget.x + radius * Math.sin(phi) * Math.sin(theta);
        const newY = controlsTarget.y + radius * Math.cos(phi);
        const newZ = controlsTarget.z + radius * Math.sin(phi) * Math.cos(theta);

        this.graph3d.cameraPosition(
            { x: newX, y: newY, z: newZ },
            controlsTarget,
            300 // animazione breve per rotazione fluida
        );
    }
};
