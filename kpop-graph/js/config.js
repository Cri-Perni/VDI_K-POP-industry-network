export const CONFIG = {
    paths: {
        nodes: "../data/K-pop_node.csv",
        edges: "../data/K-pop_edge.csv"
    },
    nodeColors: {
        "label": "#ef4444",
        "group": "#3b82f6",
        "person": "#10b981",
        "male": "#06b6d4",
        "female": "#ec4899"
    },
    typeBadges: {
        label: { text: "Agenzia", css: "bg-red-500/20 text-red-400 border border-red-500/30" },
        group: { text: "Gruppo", css: "bg-blue-500/20 text-blue-400 border border-blue-500/30" },
        person: { text: "Idol", css: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" },
        male: { text: "Idol (M)", css: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" },
        female: { text: "Idol (F)", css: "bg-pink-500/20 text-pink-400 border border-pink-500/30" }
    },
    edgeColors: {
        management: "#ef4444",
        membership: "#3b82f6",
        association: "#10b981"
    },
    nodeRadii: {
        label: 10,
        group: 7.5,
        default: 5.5
    },
    forces: {
        chargeStrength: -80,
        linkDistance: 75,
        collisionRadius: 18,
        alphaTargetDrag: 0.15,
        alphaUpdateRestart: 0.15
    }
};
