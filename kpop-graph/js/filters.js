import { CONFIG } from './config.js';

export const filtersMixin = {
    updateGraph() {
        const showLabel = this.dom.filterLabel.checked;
        const showGroup = this.dom.filterGroup.checked;
        const showPerson = this.dom.filterPerson.checked;

        const isVisible = (type) => {
            if (type === "label") return showLabel;
            if (type === "group") return showGroup;
            if (type === "person" || type === "male" || type === "female") return showPerson;
            return true;
        };

        const filteredNodes = this.globalNodes.filter(n => isVisible(n.type));
        const activeNodeIds = new Set(filteredNodes.map(n => n.id));
        const isAddingNodes = filteredNodes.length > this._prevNodeCount;
        this._prevNodeCount = filteredNodes.length;

        const filteredEdges = this.globalEdges.filter(e => {
            const sourceId = e.source.id || e.source;
            const targetId = e.target.id || e.target;
            return activeNodeIds.has(sourceId) && activeNodeIds.has(targetId);
        });

        if (this.selectedNode && !activeNodeIds.has(this.selectedNode.id)) {
            this.clearNodeSelection();
        }

        this.simulation.nodes(filteredNodes);
        this.simulation.force("link").links(filteredEdges);

        if (isAddingNodes) {
            this.simulation.alpha(CONFIG.forces.alphaUpdateRestart).restart();
        } else {
            this.simulation.alpha(0.03).restart();
        }

        if (this.searchQuery) {
            this.applySearchHighlight();
        } else {
            this.draw();
        }
    }
};
