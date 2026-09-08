import { CONFIG } from './config.js';

export const selectionMixin = {
    updateConnectedNodes() {
        if (!this.selectedNode) {
            this.connectedNodeIds.clear();
            return;
        }
        this.connectedNodeIds.clear();
        this.connectedNodeIds.add(this.selectedNode.id);

        if (this.viewMode === "2D") {
            const activeEdges = this.getActiveEdges();
            for (const e of activeEdges) {
                const srcId = e.source.id || e.source;
                const tgtId = e.target.id || e.target;
                if (srcId === this.selectedNode.id) {
                    this.connectedNodeIds.add(tgtId);
                } else if (tgtId === this.selectedNode.id) {
                    this.connectedNodeIds.add(srcId);
                }
            }
        }
    },

    selectNode(node) {
        this.selectedNode = node;
        this.hoveredNode = null;

        this.updateConnectedNodes();
        this.showNodeDetails(node);

        if (this.viewMode === "3D") {
            this.updateDepthControlState();
            this.update3DGraph();
            this.focusSubgraph3D();
        } else {
            this.draw();
            this.panToNode(node);
        }
    },

    clearNodeSelection() {
        this.selectedNode = null;
        this.dom.detailsBox.classList.add("hidden");
        this.connectedNodeIds.clear();

        if (this.viewMode === "3D") {
            this.updateDepthControlState();
            this.update3DGraph();
        } else {
            if (this.searchQuery) {
                this.applySearchHighlight();
            } else {
                this.draw();
            }
        }
    },

    showNodeDetails(node) {
        const self = this;
        const box = this.dom.detailsBox;
        box.classList.remove("hidden");

        this.dom.detailName.innerText = node.name;

        const badgeDef = CONFIG.typeBadges[node.type] || { text: node.type, css: "bg-slate-700 text-slate-300" };
        this.dom.detailTypeBadge.innerText = badgeDef.text;
        this.dom.detailTypeBadge.className = `px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${badgeDef.css}`;

        const currentLinks = [];
        let edgesToInspect = [];

        if (this.viewMode === "3D") {
            const visibleNodeIds = new Set(this.globalNodes.filter(n => this.isNodeTypeVisible(n.type)).map(n => n.id));
            edgesToInspect = this.globalEdges.filter(e => {
                const s = e.source.id || e.source;
                const t = e.target.id || e.target;
                return visibleNodeIds.has(s) && visibleNodeIds.has(t) && this.isRelationVisible(e.relation);
            });
        } else {
            edgesToInspect = this.getActiveEdges();
        }
        
        for (const e of edgesToInspect) {
            const srcId = e.source.id || e.source;
            const tgtId = e.target.id || e.target;
            if (srcId === node.id || tgtId === node.id) {
                const neighborId = srcId === node.id ? tgtId : srcId;
                const neighbor = this.globalNodes.find(n => n.id === neighborId);
                if (neighbor) {
                    currentLinks.push({ neighbor: neighbor, relation: e.relation });
                }
            }
        }

        this.dom.detailConnections.innerText = `${currentLinks.length} relazioni attive visibili`;

        if (currentLinks.length > 0) {
            this.dom.detailConnectionsSection.classList.remove("hidden");
            this.dom.detailConnectionsList.innerHTML = "";

            currentLinks.forEach(link => {
                const neighbor = link.neighbor;
                const row = document.createElement("button");
                row.className = "w-full text-left flex justify-between items-center bg-slate-800/40 border border-transparent p-1.5 rounded transition-all cursor-pointer text-slate-300 text-[11px] focus:outline-none";

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
};
