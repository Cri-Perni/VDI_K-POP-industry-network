import { CONFIG } from './config.js';

export const dataMixin = {
    async loadData() {
        const [nodesData, edgesData] = await Promise.all([
            d3.csv(CONFIG.paths.nodes),
            d3.csv(CONFIG.paths.edges)
        ]);

        if (this.dom.loading) {
            this.dom.loading.classList.add("hidden");
        }

        this.globalNodes = this.parseNodes(nodesData);

        const nodeTypeMap = new Map(this.globalNodes.map(n => [n.id, n.type]));

        this.globalEdges = this.parseEdges(edgesData, nodeTypeMap);

        this.buildAdjacencyMap();
    },

    parseNodes(nodesData) {
        return nodesData.map(d => ({
            id: d.id.trim(),
            name: d.name.trim(),
            type: d.type.trim()
        }));
    },

    parseEdges(edgesData, nodeTypeMap) {
        return edgesData.map(e => {
            const srcId = e.source.trim();
            const tgtId = e.target.trim();
            const srcType = nodeTypeMap.get(srcId);
            const tgtType = nodeTypeMap.get(tgtId);
            let relType = "association";
            if (srcType === "label") {
                relType = "management";
            } else if ((srcType === "person" || srcType === "male" || srcType === "female") && tgtType === "group") {
                relType = "membership";
            }
            return {
                source: srcId,
                target: tgtId,
                relation: relType
            };
        });
    },

    buildAdjacencyMap() {
        this.globalNodes.forEach(n => this.adjacency.set(n.id, new Set()));
        this.globalEdges.forEach(e => {
            const s = e.source.id || e.source;
            const t = e.target.id || e.target;
            this.adjacency.get(s)?.add(t);
            this.adjacency.get(t)?.add(s);
        });
    }
};
