export const CONFIG = {
    paths: {
        nodes: "../data/K-pop_node.csv",
        edges: "../data/K-pop_edge.csv"
    },
    nodeColors: {
        "label": "#f87171",
        "group": "#60a5fa",
        "person": "#34d399",
        "male": "#38bdf8",
        "female": "#f472b6"
    },
    typeBadges: {
        label: { text: "Agenzia", css: "bg-red-500/20 text-red-300 border border-red-500/30" },
        group: { text: "Gruppo", css: "bg-blue-500/20 text-blue-300 border border-blue-500/30" },
        person: { text: "Idol", css: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" },
        male: { text: "Idol (M)", css: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" },
        female: { text: "Idol (F)", css: "bg-pink-500/20 text-pink-300 border border-pink-500/30" }
    },
    edgeColors: {
        management: "#f87171",
        membership: "#60a5fa",
        association: "#34d399"
    },
    edgeWidths: {
        management: 2.0,
        membership: 1.3,
        association: 0.8
    },
    nodeRadii: {
        label: 10,
        group: 7.5,
        default: 5.5
    },
    forces: {
        chargeStrength: {
            label: -450,
            group: -160,
            default: -65
        },
        linkDistance: {
            management: 190,
            membership: 90,
            association: 75,
            default: 80
        },
        collisionRadius: {
            label: 38,
            group: 22,
            default: 14
        },
        alphaTargetDrag: 0.15,
        alphaUpdateRestart: 0.15
    }
};
