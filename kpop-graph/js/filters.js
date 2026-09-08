import { CONFIG } from './config.js';

export const filtersMixin = {
    isRelationVisible(relation) {
        if (relation === "management") return !this.dom.filterRelManagement || this.dom.filterRelManagement.checked;
        if (relation === "membership") return !this.dom.filterRelMembership || this.dom.filterRelMembership.checked;
        if (relation === "association") return !this.dom.filterRelAssociation || this.dom.filterRelAssociation.checked;
        return true;
    },

    isNodeTypeVisible(type) {
        const showLabel = !this.dom.filterLabel || this.dom.filterLabel.checked;
        const showGroup = !this.dom.filterGroup || this.dom.filterGroup.checked;
        const showPerson = !this.dom.filterPerson || this.dom.filterPerson.checked;

        if (type === "label") return showLabel;
        if (type === "group") return showGroup;
        if (type === "person" || type === "male" || type === "female") return showPerson;
        return true;
    },

    updateGraph() {
        const filteredNodes = this.globalNodes.filter(n => this.isNodeTypeVisible(n.type));
        const activeNodeIds = new Set(filteredNodes.map(n => n.id));
        const isAddingNodes = filteredNodes.length > this._prevNodeCount;
        this._prevNodeCount = filteredNodes.length;

        const filteredEdges = this.globalEdges.filter(e => {
            const sourceId = e.source.id || e.source;
            const targetId = e.target.id || e.target;
            return activeNodeIds.has(sourceId) && activeNodeIds.has(targetId) && this.isRelationVisible(e.relation);
        });

        if (this.selectedNode) {
            if (!activeNodeIds.has(this.selectedNode.id)) {
                this.clearNodeSelection();
            } else {
                this.updateConnectedNodes();
                this.showNodeDetails(this.selectedNode);
            }
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
