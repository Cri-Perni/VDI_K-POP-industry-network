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

        this.initPhysics();

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
            for (const e of activeEdges) {
                const srcId = e.source.id || e.source;
                const tgtId = e.target.id || e.target;
                if (srcId === this.hoveredNode.id) highlightedIds.add(tgtId);
                else if (tgtId === this.hoveredNode.id) highlightedIds.add(srcId);
            }
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

        for (const e of activeEdges) {
            const src = e.source;
            const tgt = e.target;
            if (!src || !tgt) continue;

            const baseAlpha = edgeAlpha(e);
            ctx.globalAlpha = e.relation === "association" ? baseAlpha * 0.8 : baseAlpha;
            ctx.strokeStyle = CONFIG.edgeColors[e.relation] || CONFIG.edgeColors.association;
            ctx.lineWidth = CONFIG.edgeWidths[e.relation] || 1;
            ctx.beginPath();
            ctx.moveTo(src.x, src.y);
            ctx.lineTo(tgt.x, tgt.y);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;

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

        const k = this.transform.k;
        const showMajorLabels = k > 0.35;
        const showAllLabels = k > 0.8;

        if (showMajorLabels || hasHighlight) {
            ctx.textBaseline = "middle";
            for (const n of activeNodes) {
                if (n.x < vp.x || n.x > vp.x + vp.w || n.y < vp.y || n.y > vp.y + vp.h) continue;

                const isFocused = n === this.selectedNode || n === this.hoveredNode || (hasHighlight && highlightedIds.has(n.id));
                const isMajor = n.type === "label" || n.type === "group";

                // Mostra se è in focus, se è un'etichetta principale (con zoom adeguato) o con zoom ravvicinato
                if (!isFocused && !showAllLabels && (!showMajorLabels || !isMajor)) continue;

                const a = nodeAlpha(n);
                if (a < 0.1) continue;

                const radius = CONFIG.nodeRadii[n.type] || CONFIG.nodeRadii.default;

                if (isFocused) {
                    const isSelected = n === this.selectedNode;
                    ctx.font = isSelected ? "700 13px 'Inter', system-ui, sans-serif" : "600 11px 'Inter', system-ui, sans-serif";
                    ctx.strokeStyle = "rgba(15, 23, 42, 0.95)";
                    ctx.lineWidth = isSelected ? 4 : 3;
                    ctx.strokeText(n.name, n.x + radius + 5, n.y);
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = isSelected ? "#facc15" : "#ffffff";
                    ctx.fillText(n.name, n.x + radius + 5, n.y);
                } else {
                    ctx.font = "400 10px 'Inter', system-ui, sans-serif";
                    ctx.strokeStyle = "rgba(15, 23, 42, 0.85)";
                    ctx.lineWidth = 2.5;
                    ctx.strokeText(n.name, n.x + radius + 4, n.y);
                    ctx.globalAlpha = a * 0.85;
                    ctx.fillStyle = "#cbd5e1";
                    ctx.fillText(n.name, n.x + radius + 4, n.y);
                }
            }
        }

        ctx.restore();
    }
};
