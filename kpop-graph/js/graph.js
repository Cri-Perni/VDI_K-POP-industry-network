import { dataMixin } from './data.js';
import { rendererMixin } from './renderer.js';
import { interactionMixin } from './interaction.js';
import { navigationMixin } from './navigation.js';
import { searchMixin } from './search.js';
import { selectionMixin } from './selection.js';
import { filtersMixin } from './filters.js';

class KPopNetworkGraph {
    constructor() {
        this.globalNodes = [];
        this.globalEdges = [];

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

        this.dom = {
            container: document.getElementById("canvas-container"),
            loading: document.getElementById("loading"),
            filterLabel: document.getElementById("filter-label"),
            filterGroup: document.getElementById("filter-group"),
            filterPerson: document.getElementById("filter-person"),
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
        this.dom.filterLabel.addEventListener("change", () => this.updateGraph());
        this.dom.filterGroup.addEventListener("change", () => this.updateGraph());
        this.dom.filterPerson.addEventListener("change", () => this.updateGraph());

        this.dom.btnResetZoom.addEventListener("click", () => this.resetZoom());

        this.dom.detailsClose.addEventListener("click", (e) => {
            e.stopPropagation();
            this.clearNodeSelection();
        });

        this.setupSearch();

        window.addEventListener("resize", () => {
            if (!this.canvas || !this.simulation) return;
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
            this.simulation.force("center", d3.forceCenter(width / 2, height / 2));
            this.simulation.alpha(0.1).restart();
        });
    }

    getActiveNodes() {
        return this.simulation ? this.simulation.nodes() : [];
    }

    getActiveEdges() {
        if (!this.simulation) return [];
        const f = this.simulation.force("link");
        return f ? f.links() : [];
    }
}

Object.assign(
    KPopNetworkGraph.prototype,
    dataMixin,
    rendererMixin,
    interactionMixin,
    navigationMixin,
    searchMixin,
    selectionMixin,
    filtersMixin
);

export { KPopNetworkGraph };
