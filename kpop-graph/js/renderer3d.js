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
                .nodeLabel(node => {
                    const badgeText = CONFIG.typeBadges[node.type]?.text || node.type;
                    const color = CONFIG.nodeColors[node.type] || '#ffffff';
                    return `<div style="background: rgba(15,23,42,0.92); color: #f8fafc; padding: 5px 9px; border-radius: 6px; font-family: Inter, sans-serif; font-size: 12px; font-weight: 600; border: 1px solid rgba(148,163,184,0.25); box-shadow: 0 4px 12px rgba(0,0,0,0.5);"><span>${node.name}</span><span style="display: inline-block; margin-left: 6px; padding: 1px 6px; font-size: 10px; border-radius: 4px; background: ${color}25; color: ${color}; border: 1px solid ${color}40;">${badgeText}</span></div>`;
                })
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
                .linkWidth(link => CONFIG.edgeWidths?.[link.relation] || 1)
                .linkColor(link => CONFIG.edgeColors[link.relation] || CONFIG.edgeColors.association)
                .linkOpacity(link => link.relation === "association" ? 0.45 : 0.75)
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
            .filter(n => this.isNodeTypeVisible(n.type))
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

            // Rinfresca il pannello dettagli per riflettere le relazioni filtrate
            this.showNodeDetails(this.selectedNode);
        } else {
            this.connectedNodeIds.clear();
            if (this.selectedNode && !filteredNodeIds.has(this.selectedNode.id)) {
                this.clearNodeSelection();
            }
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
                    // Controlla che il vicino sia visibile con i filtri dei nodi attuali
                    if (!filteredNodeIds.has(neighborId)) continue;

                    // Trova l'arco corrispondente e controlla che la relazione sia visibile
                    const edge = this.globalEdges.find(e => {
                        const s = e.source.id || e.source;
                        const t = e.target.id || e.target;
                        const matchesEndpoints = (s === id && t === neighborId) || (s === neighborId && t === id);
                        return matchesEndpoints && this.isRelationVisible(e.relation);
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

                        if (!visited.has(neighborId)) {
                            visited.add(neighborId);
                            queue.push({ id: neighborId, depth: depth + 1 });
                        }
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

            // Se c'era già un nodo selezionato, inquadra il suo sottografo visibile
            if (this.selectedNode) {
                this.focusSubgraph3D();
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

    focusSubgraph3D() {
        if (!this.graph3d || !this.selectedNode) return;

        // Attende il frame in cui il renderer ha applicato i dati aggiornati,
        // evitando di calcolare il bounding box su coordinate obsolete.
        if (this._focus3dFrame !== null) {
            cancelAnimationFrame(this._focus3dFrame);
        }

        const focusRequestId = ++this._focus3dRequestId;
        this._focus3dFrame = requestAnimationFrame(() => {
            this._focus3dFrame = null;

            // Ignora il focus reso obsoleto da una selezione più recente.
            if (focusRequestId !== this._focus3dRequestId || !this.graph3d || !this.selectedNode) return;

            const focusNodeIds = new Set(this.connectedNodeIds);
            focusNodeIds.add(this.selectedNode.id);

            const graphData = this.graph3d.graphData();
            const hasVisibleFocusNode = graphData.nodes?.some(node => focusNodeIds.has(node.id));
            if (!hasVisibleFocusNode) return;

            // Prima calcola il bounding box del sottografo senza animazione,
            // così possiamo ridurre la distanza mantenendo lo stesso centro.
            this.graph3d.zoomToFit(
                0,
                32,
                node => focusNodeIds.has(node.id)
            );

            const cameraPosition = this.graph3d.cameraPosition();
            const controls = typeof this.graph3d.controls === 'function'
                ? this.graph3d.controls()
                : null;
            const target = controls?.target || { x: 0, y: 0, z: 0 };

            if (cameraPosition && Number.isFinite(cameraPosition.x) && Number.isFinite(cameraPosition.y) && Number.isFinite(cameraPosition.z)) {
                const zoomInFactor = 0.5;
                const closerPosition = {
                    x: target.x + (cameraPosition.x - target.x) * zoomInFactor,
                    y: target.y + (cameraPosition.y - target.y) * zoomInFactor,
                    z: target.z + (cameraPosition.z - target.z) * zoomInFactor
                };

                this.graph3d.cameraPosition(
                    closerPosition,
                    { x: target.x, y: target.y, z: target.z },
                    800
                );
            }
        });
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
