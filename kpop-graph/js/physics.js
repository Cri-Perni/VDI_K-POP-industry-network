import { CONFIG } from './config.js';

export const physicsMixin = {
    initPhysics() {
        const width = this.canvasW;
        const height = this.canvasH;
        this.useWorker = false;
        this.worker = null;
        this.activeNodes = [];
        this.activeEdges = [];

        // Tentativo di inizializzazione del Web Worker su core dedicato
        if (window.Worker && location.protocol !== "file:") {
            try {
                this.worker = new Worker("js/physics.worker.js");
                this.worker.onmessage = (e) => this.handleWorkerMessage(e);
                this.worker.onerror = (err) => {
                    console.warn("Errore nel Web Worker, fallback su simulazione locale:", err);
                    this.fallbackToLocalPhysics(width, height);
                };

                this.worker.postMessage({
                    type: "INIT",
                    width: width,
                    height: height,
                    config: CONFIG
                });

                this.useWorker = true;
                this.isWorkerActive = true;
                console.log("⚡ Simulazione fisica D3 inizializzata nel Web Worker (off-thread su core dedicato).");
                return;
            } catch (err) {
                console.warn("Impossibile avviare il Web Worker, fallback su simulazione locale:", err);
            }
        }

        // Fallback sincrono su Main Thread
        this.fallbackToLocalPhysics(width, height);
    },

    getLinkDistance(link, forces) {
        const distances = forces.linkDistance;
        if (typeof distances === "number") return distances;
        if (distances) {
            if (link.relation && distances[link.relation]) return distances[link.relation];
            const srcType = link.source?.type;
            const tgtType = link.target?.type;
            if (srcType === "label" || tgtType === "label") return distances.management || 190;
            if (srcType === "group" || tgtType === "group") return distances.membership || 90;
            return distances.default || 80;
        }
        return 80;
    },

    getChargeStrength(node, forces) {
        const charges = forces.chargeStrength;
        if (typeof charges === "number") return charges;
        if (charges && node.type && charges[node.type] !== undefined) return charges[node.type];
        return (charges && charges.default) || -65;
    },

    getCollisionRadius(node, forces) {
        const radii = forces.collisionRadius;
        if (typeof radii === "number") return radii;
        if (radii && node.type && radii[node.type] !== undefined) return radii[node.type];
        return (radii && radii.default) || 14;
    },

    fallbackToLocalPhysics(width, height) {
        this.useWorker = false;
        this.isWorkerActive = false;
        if (this.worker) {
            try { this.worker.terminate(); } catch (_) {}
            this.worker = null;
        }

        const forces = CONFIG.forces || {};

        this.simulation = d3.forceSimulation()
            .force("link", d3.forceLink().id(d => d.id).distance(link => this.getLinkDistance(link, forces)))
            .force("charge", d3.forceManyBody().strength(node => this.getChargeStrength(node, forces)))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(node => this.getCollisionRadius(node, forces)));

        this.simulation.on("tick", () => this.draw());
        console.log("ℹ️ Simulazione fisica D3 avviata su Main Thread (fallback).");
    },

    handleWorkerMessage(e) {
        const data = e.data;
        if (data.type === "TICK") {
            const coords = new Float32Array(data.positions);
            const count = Math.min(this.activeNodes.length, coords.length / 2);
            for (let i = 0; i < count; i++) {
                this.activeNodes[i].x = coords[i * 2];
                this.activeNodes[i].y = coords[i * 2 + 1];
            }
            this.draw();
        } else if (data.type === "END") {
            // Simulazione stabilizzata
        }
    },

    updatePhysicsData(nodes, edges, isAddingNodes) {
        this.activeNodes = nodes;

        // Risolve i collegamenti agli oggetti nodo per garantire il rendering fluido dei segmenti
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        this.activeEdges = edges.map(e => {
            const srcId = typeof e.source === "object" ? e.source.id : e.source;
            const tgtId = typeof e.target === "object" ? e.target.id : e.target;
            return {
                source: nodeMap.get(srcId),
                target: nodeMap.get(tgtId),
                relation: e.relation
            };
        }).filter(e => e.source && e.target);

        const restartAlpha = isAddingNodes ? CONFIG.forces.alphaUpdateRestart : 0.03;

        if (this.useWorker && this.worker) {
            const serializedNodes = nodes.map(n => ({
                id: n.id,
                type: n.type,
                x: n.x,
                y: n.y,
                fx: n.fx,
                fy: n.fy
            }));

            const serializedEdges = edges.map(e => ({
                source: typeof e.source === "object" ? e.source.id : e.source,
                target: typeof e.target === "object" ? e.target.id : e.target,
                relation: e.relation
            }));

            this.worker.postMessage({
                type: "SET_DATA",
                nodes: serializedNodes,
                edges: serializedEdges,
                alpha: restartAlpha
            });
        } else if (this.simulation) {
            this.simulation.nodes(this.activeNodes);
            this.simulation.force("link").links(this.activeEdges);
            this.simulation.alpha(restartAlpha).restart();
        }
    },

    startDragNode(node, x, y) {
        node.fx = x;
        node.fy = y;
        node.x = x;
        node.y = y;

        if (this.useWorker && this.worker) {
            this.worker.postMessage({
                type: "DRAG_START",
                id: node.id,
                x: x,
                y: y
            });
        } else if (this.simulation) {
            this.simulation.alphaTarget(CONFIG.forces.alphaTargetDrag).restart();
        }
    },

    moveDragNode(node, x, y) {
        node.fx = x;
        node.fy = y;
        node.x = x;
        node.y = y;

        if (this.useWorker && this.worker) {
            this.worker.postMessage({
                type: "DRAG_MOVE",
                id: node.id,
                x: x,
                y: y
            });
        }
    },

    endDragNode(node) {
        node.fx = null;
        node.fy = null;

        if (this.useWorker && this.worker) {
            this.worker.postMessage({
                type: "DRAG_END",
                id: node.id
            });
        } else if (this.simulation) {
            this.simulation.alphaTarget(0);
        }
    },

    stopPhysics() {
        if (this.useWorker && this.worker) {
            this.worker.postMessage({ type: "STOP" });
        } else if (this.simulation) {
            this.simulation.stop();
        }
    },

    restartPhysics(alpha = 0.1) {
        if (this.useWorker && this.worker) {
            this.worker.postMessage({ type: "RESTART", alpha: alpha });
        } else if (this.simulation) {
            this.simulation.alpha(alpha).restart();
        }
    },

    resizePhysics(width, height) {
        if (this.useWorker && this.worker) {
            this.worker.postMessage({
                type: "RESIZE",
                width: width,
                height: height
            });
        } else if (this.simulation) {
            this.simulation.force("center", d3.forceCenter(width / 2, height / 2));
            this.simulation.alpha(0.1).restart();
        }
    }
};
