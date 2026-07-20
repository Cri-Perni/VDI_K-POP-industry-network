import { CONFIG } from './config.js';

export const interactionMixin = {
    screenToWorld(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - this.transform.x) / this.transform.k,
            y: (e.clientY - rect.top - this.transform.y) / this.transform.k
        };
    },

    findNodeAt(wx, wy) {
        let closest = null;
        let minDist = Infinity;
        for (const n of this.getActiveNodes()) {
            const dx = n.x - wx;
            const dy = n.y - wy;
            const dist = dx * dx + dy * dy;
            const threshold = Math.max(CONFIG.nodeRadii[n.type] || CONFIG.nodeRadii.default, 5) + 3;
            if (dist < threshold * threshold && dist < minDist) {
                minDist = dist;
                closest = n;
            }
        }
        return closest;
    },

    onMouseDown(e) {
        this.dragState.clickPos = { x: e.clientX, y: e.clientY };
        const pos = this.screenToWorld(e);
        const node = this.findNodeAt(pos.x, pos.y);

        if (node) {
            this.dragState.active = true;
            this.dragState.node = node;
            node.fx = node.x;
            node.fy = node.y;
            this.simulation.alphaTarget(CONFIG.forces.alphaTargetDrag).restart();
        } else {
            this.dragState.active = true;
            this.dragState.node = null;
            this.dragState.panStartX = this.transform.x;
            this.dragState.panStartY = this.transform.y;
            this.dragState.startX = e.clientX;
            this.dragState.startY = e.clientY;
        }
    },

    onMouseMove(e) {
        const pos = this.screenToWorld(e);

        if (this.dragState.active) {
            if (this.dragState.node) {
                this.dragState.node.fx = pos.x;
                this.dragState.node.fy = pos.y;
            } else {
                this.transform.x = this.dragState.panStartX + (e.clientX - this.dragState.startX);
                this.transform.y = this.dragState.panStartY + (e.clientY - this.dragState.startY);
                this.draw();
            }
            return;
        }

        if (this.selectedNode || this.searchQuery) return;

        const node = this.findNodeAt(pos.x, pos.y);
        if (node !== this.hoveredNode) {
            this.hoveredNode = node;
            this.draw();
        }
    },

    onMouseUp() {
        if (!this.dragState.active) return;
        if (this.dragState.node) {
            this.dragState.node.fx = null;
            this.dragState.node.fy = null;
            this.simulation.alphaTarget(0);
        }
        this.dragState.active = false;
        this.dragState.node = null;
    },

    onClick(e) {
        const cp = this.dragState.clickPos;
        if (cp) {
            const dx = e.clientX - cp.x;
            const dy = e.clientY - cp.y;
            if (dx * dx + dy * dy > 25) return;
        }

        const pos = this.screenToWorld(e);
        const node = this.findNodeAt(pos.x, pos.y);

        if (node) {
            this.selectNode(node);
        } else if (this.selectedNode) {
            this.clearNodeSelection();
        }
    },

    onWheel(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const delta = e.deltaY > 0 ? 0.92 : 1.08;
        const newK = this.transform.k * delta;
        if (newK < 0.05 || newK > 8) return;

        this.transform.x = mx - delta * (mx - this.transform.x);
        this.transform.y = my - delta * (my - this.transform.y);
        this.transform.k = newK;
        this.draw();
    },

    onMouseLeave() {
        if (this.hoveredNode && !this.selectedNode && !this.searchQuery) {
            this.hoveredNode = null;
            this.draw();
        }
    }
};
