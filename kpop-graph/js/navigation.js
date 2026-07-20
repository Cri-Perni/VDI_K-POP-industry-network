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
        const targetX = this.canvasW / 2 - node.x * this.transform.k;
        const targetY = this.canvasH / 2 - node.y * this.transform.k;

        const startX = this.transform.x;
        const startY = this.transform.y;
        const startTime = performance.now();
        const duration = 750;

        const animate = (time) => {
            const t = Math.min((time - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - t, 3);

            this.transform.x = startX + (targetX - startX) * ease;
            this.transform.y = startY + (targetY - startY) * ease;
            this.draw();

            if (t < 1) requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }
};
