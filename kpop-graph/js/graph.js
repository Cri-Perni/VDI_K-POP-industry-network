import { dataMixin } from './data.js';
import { rendererMixin } from './renderer.js';
import { renderer3dMixin } from './renderer3d.js';
import { interactionMixin } from './interaction.js';
import { navigationMixin } from './navigation.js';
import { searchMixin } from './search.js';
import { selectionMixin } from './selection.js';
import { filtersMixin } from './filters.js';
import { physicsMixin } from './physics.js';

class KPopNetworkGraph {
    constructor() {
        this.globalNodes = [];
        this.globalEdges = [];

        this.viewMode = "2D";
        this.relationDepth = 1;
        this.graph3d = null;
        this._focus3dFrame = null;
        this._focus3dRequestId = 0;

        this.selectedNode = null;
        this.searchQuery = "";
        this.adjacency = new Map();
        this._prevNodeCount = 0;

        this.canvas = null;
        this.ctx = null;
        this.canvasW = 0;
        this.canvasH = 0;
        this.transform = { x: 0, y: 0, k: 1 };
        this.hoveredNode = null;
        this.dragState = { active: false, node: null, startX: 0, startY: 0, panStartX: 0, panStartY: 0, clickPos: null };

        this.connectedNodeIds = new Set();
        this.searchMatchedIds = new Set();

        this.simulation = null;
        this.activeNodes = [];
        this.activeEdges = [];
        this.useWorker = false;
        this.worker = null;
        this.isWorkerActive = false;

        this.dom = {
            container: document.getElementById("canvas-container"),
            loading: document.getElementById("loading"),
            filterLabel: document.getElementById("filter-label"),
            filterGroup: document.getElementById("filter-group"),
            filterPerson: document.getElementById("filter-person"),
            filterRelManagement: document.getElementById("filter-rel-management"),
            filterRelMembership: document.getElementById("filter-rel-membership"),
            filterRelAssociation: document.getElementById("filter-rel-association"),
            searchInput: document.getElementById("search-input"),
            searchClear: document.getElementById("search-clear"),
            searchResultsCount: document.getElementById("search-results-count"),
            detailsBox: document.getElementById("details-box"),
            detailsClose: document.getElementById("details-close"),
            detailName: document.getElementById("detail-name"),
            detailTypeBadge: document.getElementById("detail-type-badge"),
            detailConnections: document.getElementById("detail-connections"),
            detailConnectionsSection: document.getElementById("detail-connections-list-section"),
            detailConnectionsList: document.getElementById("detail-connections-list"),
            btnResetZoom: document.getElementById("btn-reset-zoom")
        };
    }

    async initialize() {
        try {
            await this.loadData();
            this.initCanvas();
            this.setupListeners();
            this.updateGraph();
        } catch (error) {
            console.error("Errore critico durante l'inizializzazione:", error);
            if (this.dom.loading) {
                this.dom.loading.innerHTML = `
                    <div class='bg-red-500/10 border border-red-500/30 rounded-lg p-5 text-center max-w-md mx-auto shadow-xl'>
                        <p class='text-red-400 font-semibold mb-2'>Errore nel caricamento dei dati CSV</p>
                        <p class='text-xs text-slate-400 mb-4'>Verifica che la cartella 'data' sia accessibile e che il server locale sia avviato nella cartella principale.</p>
                        <span class='text-[10px] font-mono bg-slate-950 p-2 block rounded text-red-500/80 break-words'>${error.message}</span>
                    </div>`;
            }
        }
    }

    setupListeners() {
        const onFilterChange = () => {
            if (this.viewMode === "3D") this.update3DGraph();
            else this.updateGraph();
        };

        this.dom.filterLabel.addEventListener("change", onFilterChange);
        this.dom.filterGroup.addEventListener("change", onFilterChange);
        this.dom.filterPerson.addEventListener("change", onFilterChange);
        this.dom.filterRelManagement.addEventListener("change", onFilterChange);
        this.dom.filterRelMembership.addEventListener("change", onFilterChange);
        this.dom.filterRelAssociation.addEventListener("change", onFilterChange);

        this.dom.btnResetZoom.addEventListener("click", () => {
            if (this.viewMode === "3D") {
                this.resetZoom3D();
            } else {
                this.resetZoom();
            }
        });

        // Pulsanti di rotazione direzionale 3D
        const btnRotateUp = document.getElementById("btn-rotate-up");
        const btnRotateDown = document.getElementById("btn-rotate-down");
        const btnRotateLeft = document.getElementById("btn-rotate-left");
        const btnRotateRight = document.getElementById("btn-rotate-right");

        if (btnRotateUp) btnRotateUp.addEventListener("click", () => this.rotateCamera3D(0, 15));
        if (btnRotateDown) btnRotateDown.addEventListener("click", () => this.rotateCamera3D(0, -15));
        if (btnRotateLeft) btnRotateLeft.addEventListener("click", () => this.rotateCamera3D(-20, 0));
        if (btnRotateRight) btnRotateRight.addEventListener("click", () => this.rotateCamera3D(20, 0));

        // Event listener per lo switcher 2D / 3D
        const btn2d = document.getElementById("btn-view-2d");
        const btn3d = document.getElementById("btn-view-3d");
        if (btn2d && btn3d) {
            btn2d.addEventListener("click", () => this.switchViewMode("2D"));
            btn3d.addEventListener("click", () => this.switchViewMode("3D"));
        }

        // Event listener per lo slider della profondità
        const depthSlider = document.getElementById("depth-slider");
        const depthVal = document.getElementById("depth-val");
        if (depthSlider && depthVal) {
            depthSlider.addEventListener("input", (e) => {
                this.relationDepth = parseInt(e.target.value, 10);
                depthVal.innerText = `${this.relationDepth} ${this.relationDepth === 1 ? 'hop' : 'hops'}`;
                this.update3DGraph();
            });
        }

        this.dom.detailsClose.addEventListener("click", (e) => {
            e.stopPropagation();
            this.clearNodeSelection();
        });

        this.setupSearch();

        window.addEventListener("resize", () => {
            if (!this.canvas) return;
            const container = this.dom.container;
            const width = container.clientWidth;
            const height = container.clientHeight;
            if (width === 0 || height === 0) return;
            const dpr = window.devicePixelRatio || 1;
            this.canvasW = width;
            this.canvasH = height;
            this.canvas.width = width * dpr;
            this.canvas.height = height * dpr;
            this.canvas.style.width = width + "px";
            this.canvas.style.height = height + "px";
            this.resizePhysics(width, height);
        });
    }

    getActiveNodes() {
        return this.activeNodes || [];
    }

    getActiveEdges() {
        return this.activeEdges || [];
    }
}

Object.assign(
    KPopNetworkGraph.prototype,
    dataMixin,
    rendererMixin,
    renderer3dMixin,
    interactionMixin,
    navigationMixin,
    searchMixin,
    selectionMixin,
    filtersMixin,
    physicsMixin
);

export { KPopNetworkGraph };
