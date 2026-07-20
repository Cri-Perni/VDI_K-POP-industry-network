import { CONFIG } from './config.js';

export const selectionMixin = {
    selectNode(node) {
        this.selectedNode = node;
        this.hoveredNode = null;

        this.showNodeDetails(node);

        this.connectedNodeIds.clear();
        this.connectedNodeIds.add(node.id);
        const adj = this.adjacency.get(node.id);
        if (adj) adj.forEach(id => this.connectedNodeIds.add(id));

        this.draw();
        this.panToNode(node);
    },

    clearNodeSelection() {
        this.selectedNode = null;
        this.dom.detailsBox.classList.add("hidden");
        this.connectedNodeIds.clear();

        if (this.searchQuery) {
            this.applySearchHighlight();
        } else {
            this.draw();
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
        const activeEdges = this.getActiveEdges();
        for (const e of activeEdges) {
            const srcId = e.source.id || e.source;
            const tgtId = e.target.id || e.target;
            if (srcId === node.id || tgtId === node.id) {
                const neighbor = srcId === node.id ? e.target : e.source;
                currentLinks.push({ neighbor: neighbor, relation: e.relation });
            }
        }

        this.dom.detailConnections.innerText = `${currentLinks.length} relazioni attive visibili`;

        if (currentLinks.length > 0) {
            this.dom.detailConnectionsSection.classList.remove("hidden");
            this.dom.detailConnectionsList.innerHTML = "";

            currentLinks.forEach(link => {
                const neighbor = link.neighbor;
                const row = document.createElement("button");
                row.className = "w-full text-left flex justify-between items-center bg-slate-800/40 hover:bg-pink-500/10 hover:border-pink-500/20 border border-transparent p-1.5 rounded transition-all cursor-pointer text-slate-300 hover:text-pink-300 text-[11px] focus:outline-none";

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
