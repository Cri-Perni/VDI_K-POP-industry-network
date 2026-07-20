import { CONFIG } from './config.js';

export const rendererMixin = {
    initCanvas() {
        const container = this.dom.container;
        const width = container.clientWidth;
        const height = container.clientHeight;

        this.canvas = document.createElement("canvas");
        this.canvas.style.display = "block";
        container.prepend(this.canvas);

        const dpr = window.devicePixelRatio || 1;
        this.canvasW = width;
        this.canvasH = height;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = width + "px";
        this.canvas.style.height = height + "px";

        this.ctx = this.canvas.getContext("2d");

        this.simulation = d3.forceSimulation()
            .force("link", d3.forceLink().id(d => d.id).distance(CONFIG.forces.linkDistance))
            .force("charge", d3.forceManyBody().strength(CONFIG.forces.chargeStrength))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(CONFIG.forces.collisionRadius));

        this.simulation.on("tick", () => this.draw());

        this.canvas.addEventListener("mousedown", (e) => this.onMouseDown(e));
        this.canvas.addEventListener("mousemove", (e) => this.onMouseMove(e));
        this.canvas.addEventListener("mouseup", (e) => this.onMouseUp(e));
        this.canvas.addEventListener("click", (e) => this.onClick(e));
        this.canvas.addEventListener("wheel", (e) => this.onWheel(e), { passive: false });
        this.canvas.addEventListener("mouseleave", () => this.onMouseLeave());

        const oldSvg = container.querySelector("svg");
        if (oldSvg) oldSvg.remove();
    },

    draw() {
        const ctx = this.ctx;
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, this.canvasW, this.canvasH);

        const activeNodes = this.getActiveNodes();
        const activeEdges = this.getActiveEdges();
        if (!activeNodes.length) return;

        ctx.save();
        ctx.translate(this.transform.x, this.transform.y);
        ctx.scale(this.transform.k, this.transform.k);

        const highlightedIds = new Set();
        let hasHighlight = false;

        if (this.searchQuery) {
            hasHighlight = true;
            this.searchMatchedIds.forEach(id => highlightedIds.add(id));
        } else if (this.selectedNode) {
            hasHighlight = true;
            this.connectedNodeIds.forEach(id => highlightedIds.add(id));
        } else if (this.hoveredNode) {
            hasHighlight = true;
            highlightedIds.add(this.hoveredNode.id);
            const adj = this.adjacency.get(this.hoveredNode.id);
            if (adj) adj.forEach(id => highlightedIds.add(id));
        }

        const nodeAlpha = (n) => {
            if (!hasHighlight) return 0.85;
            return highlightedIds.has(n.id) ? 1 : 0.08;
        };

        const edgeAlpha = (e) => {
            if (!hasHighlight) return 0.12;
            const srcId = e.source.id || e.source;
            const tgtId = e.target.id || e.target;
            return highlightedIds.has(srcId) || highlightedIds.has(tgtId) ? 0.6 : 0.02;
        };

        const vp = {
            x: -this.transform.x / this.transform.k - 60,
            y: -this.transform.y / this.transform.k - 60,
            w: this.canvasW / this.transform.k + 120,
            h: this.canvasH / this.transform.k + 120
        };

        ctx.lineWidth = 1;
        for (const e of activeEdges) {
            const src = e.source;
            const tgt = e.target;
            if (!src || !tgt) continue;

            ctx.globalAlpha = edgeAlpha(e);
            ctx.strokeStyle = CONFIG.edgeColors[e.relation] || CONFIG.edgeColors.association;
            ctx.beginPath();
            ctx.moveTo(src.x, src.y);
            ctx.lineTo(tgt.x, tgt.y);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
        const showLabels = this.transform.k > 0.4;

        for (const n of activeNodes) {
            if (n.x < vp.x || n.x > vp.x + vp.w || n.y < vp.y || n.y > vp.y + vp.h) continue;

            const radius = CONFIG.nodeRadii[n.type] || CONFIG.nodeRadii.default;
            const fill = CONFIG.nodeColors[n.type] || "#ffffff";
            const a = nodeAlpha(n);

            ctx.beginPath();
            ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
            ctx.globalAlpha = a;
            ctx.fillStyle = fill;
            ctx.fill();

            ctx.globalAlpha = Math.min(a, 0.5);
            ctx.strokeStyle = "#0f172a";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            if ((n === this.hoveredNode && !this.selectedNode && !this.searchQuery) || n === this.selectedNode) {
                ctx.beginPath();
                ctx.arc(n.x, n.y, radius + 2.5, 0, Math.PI * 2);
                ctx.globalAlpha = 1;
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 2.5;
                ctx.stroke();
            }
        }

        if (showLabels) {
            ctx.globalAlpha = 1;
            ctx.font = "11px sans-serif";
            ctx.textBaseline = "middle";
            for (const n of activeNodes) {
                if (n.x < vp.x || n.x > vp.x + vp.w || n.y < vp.y || n.y > vp.y + vp.h) continue;
                const a = nodeAlpha(n);
                const radius = CONFIG.nodeRadii[n.type] || CONFIG.nodeRadii.default;
                ctx.globalAlpha = a * 0.85;
                ctx.fillStyle = "#94a3b8";
                ctx.fillText(n.name, n.x + radius + 4, n.y);
            }
        }

        ctx.restore();
    }
};
