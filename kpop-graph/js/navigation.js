export const navigationMixin = {
    resetZoom() {
        const startX = this.transform.x;
        const startY = this.transform.y;
        const startK = this.transform.k;
        const startTime = performance.now();
        const duration = 750;

        const animate = (time) => {
            const t = Math.min((time - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - t, 3);

            this.transform.x = startX + (0 - startX) * ease;
            this.transform.y = startY + (0 - startY) * ease;
            this.transform.k = startK + (1 - startK) * ease;
            this.draw();

            if (t < 1) requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    },

    panToNode(node) {
        if (!node || node.x === undefined || node.y === undefined) return;

        const startK = this.transform.k;
        const targetK = Math.max(startK, 1.2);

        // Coordinate del mondo attualmente al centro dello schermo
        const startWorldX = (this.canvasW / 2 - this.transform.x) / startK;
        const startWorldY = (this.canvasH / 2 - this.transform.y) / startK;

        const startTime = performance.now();
        const duration = 750;

        const animate = (time) => {
            const t = Math.min((time - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - t, 3);

            const currentWorldX = startWorldX + (node.x - startWorldX) * ease;
            const currentWorldY = startWorldY + (node.y - startWorldY) * ease;
            const currentK = startK + (targetK - startK) * ease;

            this.transform.k = currentK;
            this.transform.x = this.canvasW / 2 - currentWorldX * currentK;
            this.transform.y = this.canvasH / 2 - currentWorldY * currentK;
            this.draw();

            if (t < 1) requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }
};
