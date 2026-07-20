export const searchMixin = {
    setupSearch() {
        const input = this.dom.searchInput;
        const clearBtn = this.dom.searchClear;
        const resultsCount = this.dom.searchResultsCount;

        const handleSearch = () => {
            this.searchQuery = input.value.toLowerCase().trim();

            if (this.searchQuery === "") {
                clearBtn.classList.add("hidden");
                resultsCount.classList.add("hidden");
                this.searchMatchedIds.clear();
                if (this.selectedNode) {
                    this.connectedNodeIds.clear();
                    this.connectedNodeIds.add(this.selectedNode.id);
                    const adj = this.adjacency.get(this.selectedNode.id);
                    if (adj) adj.forEach(id => this.connectedNodeIds.add(id));
                }
                this.draw();
            } else {
                clearBtn.classList.remove("hidden");
                this.applySearchHighlight();
            }
        };

        let searchTimeout;
        input.addEventListener("input", () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(handleSearch, 80);
        });

        clearBtn.addEventListener("click", () => {
            input.value = "";
            clearTimeout(searchTimeout);
            handleSearch();
        });
    },

    applySearchHighlight() {
        const query = this.searchQuery;
        if (!query) return;

        this.searchMatchedIds.clear();
        for (const n of this.getActiveNodes()) {
            if (n.name.toLowerCase().includes(query) || n.id.toLowerCase().includes(query)) {
                this.searchMatchedIds.add(n.id);
            }
        }

        const count = this.searchMatchedIds.size;
        const countDiv = this.dom.searchResultsCount;
        countDiv.classList.remove("hidden");
        if (count === 0) {
            countDiv.innerHTML = "<span class='text-red-400 font-semibold'>Nessun risultato trovato</span>";
        } else {
            countDiv.innerHTML = `<span class='text-violet-400 font-semibold'>${count}</span> ${count === 1 ? 'nodo trovato' : 'nodi trovati'}`;
        }

        this.draw();
    }
};
