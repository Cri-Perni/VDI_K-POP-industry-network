// physics.worker.js — Off-Thread D3 Force Simulation Worker
try {
    importScripts('d3.v7.min.js');
} catch (e) {
    importScripts('https://d3js.org/d3.v7.min.js');
}

let simulation = null;
let nodes = [];
let nodeMap = new Map();
let edges = [];
let config = null;
let width = 800;
let height = 600;

function getLinkDistance(link, forces) {
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
}

function getChargeStrength(node, forces) {
    const charges = forces.chargeStrength;
    if (typeof charges === "number") return charges;
    if (charges && node.type && charges[node.type] !== undefined) return charges[node.type];
    return (charges && charges.default) || -65;
}

function getCollisionRadius(node, forces) {
    const radii = forces.collisionRadius;
    if (typeof radii === "number") return radii;
    if (radii && node.type && radii[node.type] !== undefined) return radii[node.type];
    return (radii && radii.default) || 14;
}

function initSimulation() {
    if (simulation) simulation.stop();

    const forces = (config && config.forces) || {};

    simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id).distance(link => getLinkDistance(link, forces)))
        .force("charge", d3.forceManyBody().strength(node => getChargeStrength(node, forces)))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(node => getCollisionRadius(node, forces)));

    simulation.on("tick", () => {
        const count = nodes.length;
        if (count === 0) return;

        const positions = new Float32Array(count * 2);
        for (let i = 0; i < count; i++) {
            positions[i * 2]     = nodes[i].x;
            positions[i * 2 + 1] = nodes[i].y;
        }

        // Trasferimento ad alte prestazioni con Transferable Object (zero-copy)
        self.postMessage({
            type: "TICK",
            positions: positions.buffer,
            alpha: simulation.alpha()
        }, [positions.buffer]);
    });

    simulation.on("end", () => {
        self.postMessage({ type: "END" });
    });

    simulation.stop();
}

function updateData(newNodes, newEdges, alpha) {
    if (!simulation) initSimulation();

    const prevMap = nodeMap;
    nodeMap = new Map();

    nodes = newNodes.map(n => {
        const prev = prevMap.get(n.id);
        const node = {
            id: n.id,
            type: n.type,
            x: n.x !== undefined ? n.x : (prev ? prev.x : undefined),
            y: n.y !== undefined ? n.y : (prev ? prev.y : undefined),
            vx: prev ? prev.vx : 0,
            vy: prev ? prev.vy : 0,
            fx: n.fx !== undefined ? n.fx : null,
            fy: n.fy !== undefined ? n.fy : null
        };
        nodeMap.set(node.id, node);
        return node;
    });

    const activeIds = new Set(nodes.map(n => n.id));
    edges = (newEdges || [])
        .filter(e => activeIds.has(e.source) && activeIds.has(e.target))
        .map(e => ({
            source: e.source,
            target: e.target,
            relation: e.relation
        }));

    simulation.nodes(nodes);
    simulation.force("link").links(edges);

    const targetAlpha = alpha !== undefined ? alpha : 0.15;
    simulation.alpha(targetAlpha).restart();
}

function dragStart(id, x, y) {
    const node = nodeMap.get(id);
    if (!node || !simulation) return;
    node.fx = x;
    node.fy = y;
    const alphaDrag = (config && config.forces && config.forces.alphaTargetDrag) || 0.15;
    simulation.alphaTarget(alphaDrag).restart();
}

function dragMove(id, x, y) {
    const node = nodeMap.get(id);
    if (!node) return;
    node.fx = x;
    node.fy = y;
}

function dragEnd(id) {
    const node = nodeMap.get(id);
    if (node) {
        node.fx = null;
        node.fy = null;
    }
    if (simulation) {
        simulation.alphaTarget(0);
    }
}

self.onmessage = function(e) {
    const data = e.data;
    if (!data) return;

    switch (data.type) {
        case 'INIT':
            width = data.width || 800;
            height = data.height || 600;
            config = data.config || {};
            initSimulation();
            break;

        case 'SET_DATA':
            updateData(data.nodes, data.edges, data.alpha);
            break;

        case 'DRAG_START':
            dragStart(data.id, data.x, data.y);
            break;

        case 'DRAG_MOVE':
            dragMove(data.id, data.x, data.y);
            break;

        case 'DRAG_END':
            dragEnd(data.id);
            break;

        case 'STOP':
            if (simulation) simulation.stop();
            break;

        case 'RESTART':
            if (simulation) simulation.alpha(data.alpha !== undefined ? data.alpha : 0.1).restart();
            break;

        case 'RESIZE':
            width = data.width;
            height = data.height;
            if (simulation) {
                simulation.force("center", d3.forceCenter(width / 2, height / 2));
                simulation.alpha(0.1).restart();
            }
            break;
    }
};
