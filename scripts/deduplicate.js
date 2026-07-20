/**
 * Deduplica i nodi duplicati nel dataset K-Pop Network.
 *
 * Cerca nodi con stesso (name, type) e unisce le loro connessioni.
 * Gestisce self-loop, archi duplicati e nomi con encoding corrotto.
 * Crea backup .bak dei CSV originali (una sola volta — idempotente).
 *
 * Esecuzione: node scripts\deduplicate.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const NODES_PATH = path.join(DATA_DIR, 'K-pop_node.csv');
const EDGES_PATH = path.join(DATA_DIR, 'K-pop_edge.csv');

// ===== CSV PARSER =====

function parseCSV(text) {
    const lines = text.split('\n').filter(l => l.trim() !== '');
    if (lines.length === 0) return { header: [], rows: [] };
    const header = parseCSVLine(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const vals = parseCSVLine(lines[i]);
        if (vals.length === header.length) {
            const obj = {};
            for (let j = 0; j < header.length; j++) obj[header[j]] = vals[j];
            rows.push(obj);
        }
    }
    return { header, rows };
}

function parseCSVLine(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                cur += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (c === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
        } else {
            cur += c;
        }
    }
    result.push(cur.trim());
    return result;
}

// ===== CSV SERIALIZER =====

function toCSV(rows, header) {
    const lines = [header.join(',')];
    for (const row of rows) {
        const vals = header.map(h => {
            const v = row[h] !== undefined ? String(row[h]) : '';
            if (v.includes(',') || v.includes('"') || v.includes('\n')) {
                return '"' + v.replace(/"/g, '""') + '"';
            }
            return v;
        });
        lines.push(vals.join(','));
    }
    return lines.join('\n');
}

// ===== MAIN =====

console.log('================================================================');
console.log('             DEDUPLICAZIONE K-POP DATASET');
console.log('================================================================\n');

// Leggi file
const nodesRaw = fs.readFileSync(NODES_PATH, 'utf8');
const edgesRaw = fs.readFileSync(EDGES_PATH, 'utf8');

// Backup idempotente
const nodesBak = NODES_PATH + '.bak';
const edgesBak = EDGES_PATH + '.bak';
let createdBak = false;
if (!fs.existsSync(nodesBak)) {
    fs.writeFileSync(nodesBak, nodesRaw);
    createdBak = true;
}
if (!fs.existsSync(edgesBak)) {
    fs.writeFileSync(edgesBak, edgesRaw);
    createdBak = true;
}
if (createdBak) {
    console.log('  [BACKUP] Backup dei file originali creati (.bak)\n');
} else {
    console.log('  [BACKUP] Backup già esistenti, saltati.\n');
}

// Parse
const nodesParsed = parseCSV(nodesRaw);
const edgesParsed = parseCSV(edgesRaw);
const nodes = nodesParsed.rows;
const edges = edgesParsed.rows;

console.log(`  Nodi originali:  ${nodes.length}`);
console.log(`  Archi originali: ${edges.length}\n`);

// Raggruppa per (name_lower, type)
const groups = new Map();
let skippedCorrupted = 0;

for (const n of nodes) {
    const id = (n.id || '').trim();
    const name = (n.name || '').trim();
    const type = (n.type || '').trim();
    if (!id || !name || !type) continue;

    // Skip nomi con encoding corrotto (U+FFFD)
    if (name.includes('\uFFFD')) {
        skippedCorrupted++;
        continue;
    }

    const key = name.toLowerCase() + '|' + type;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ id, name, type });
}

// Trova duplicati
const duplicateGroups = [];
for (const [key, group] of groups) {
    if (group.length > 1) duplicateGroups.push(group);
}

console.log(`  Gruppi duplicati trovati: ${duplicateGroups.length}`);
console.log(`  Saltati (nomi corrotti):  ${skippedCorrupted}\n`);

// Conta archi per ogni node ID
const edgeCount = new Map();
for (const e of edges) {
    const s = (e.source || '').trim();
    const t = (e.target || '').trim();
    if (s) edgeCount.set(s, (edgeCount.get(s) || 0) + 1);
    if (t) edgeCount.set(t, (edgeCount.get(t) || 0) + 1);
}

// Costruisci idMap: loserId → winnerId
const idMap = new Map();
const mergeLog = [];

for (const group of duplicateGroups) {
    // Sort: edgeCount desc, poi ID numerico asc
    group.sort((a, b) => {
        const ca = edgeCount.get(a.id) || 0;
        const cb = edgeCount.get(b.id) || 0;
        if (cb !== ca) return cb - ca;
        return parseInt(a.id, 10) - parseInt(b.id, 10);
    });

    const winner = group[0];
    for (let i = 1; i < group.length; i++) {
        const loser = group[i];
        idMap.set(loser.id, winner.id);
        mergeLog.push({
            name: winner.name,
            type: winner.type,
            winnerId: winner.id,
            loserId: loser.id,
            winnerEdges: edgeCount.get(winner.id) || 0,
            loserEdges: edgeCount.get(loser.id) || 0
        });
    }
}

// Merge archi con deduplicazione
const seenEdges = new Set();
const newEdges = [];
let selfLoopsRemoved = 0;
let duplicatesRemoved = 0;

for (const e of edges) {
    let src = (e.source || '').trim();
    let tgt = (e.target || '').trim();
    if (!src || !tgt) continue;

    src = idMap.get(src) || src;
    tgt = idMap.get(tgt) || tgt;

    if (src === tgt) {
        selfLoopsRemoved++;
        continue;
    }

    const key = src < tgt ? src + '|' + tgt : tgt + '|' + src;
    if (seenEdges.has(key)) {
        duplicatesRemoved++;
        continue;
    }
    seenEdges.add(key);
    newEdges.push({ source: src, target: tgt });
}

// Filtra nodi
const loserIds = new Set(idMap.keys());
const newNodes = nodes.filter(n => {
    const id = (n.id || '').trim();
    return !loserIds.has(id);
});

// Scrivi
fs.writeFileSync(NODES_PATH, toCSV(newNodes, ['id', 'type', 'name']));
fs.writeFileSync(EDGES_PATH, toCSV(newEdges, ['source', 'target']));

// Report
console.log('================================================================');
console.log('                           REPORT');
console.log('================================================================');
console.log(`\n  Fusioni eseguite: ${mergeLog.length}`);
console.log(`\n  Nodi:  ${nodes.length} → ${newNodes.length}  (${nodes.length - newNodes.length} rimossi)`);
console.log(`  Archi: ${edges.length} → ${newEdges.length}  (${selfLoopsRemoved} self-loop + ${duplicatesRemoved} duplicati)\n`);

console.log('  Prime 20 fusioni:');
for (const m of mergeLog.slice(0, 20)) {
    console.log(
        '    ' +
        m.name.padEnd(32).slice(0, 32) +
        ' [' + m.type.padEnd(8).slice(0, 8) + ']' +
        ' → winner ' + m.winnerId.padStart(5) +
        ' (< ' + m.loserId.padStart(5) + ')  ' +
        ' archi: ' + m.winnerEdges + ' (vincente) vs ' + m.loserEdges + ' (assorbito)'
    );
}
if (mergeLog.length > 20) {
    console.log(`    ... e altre ${mergeLog.length - 20} fusioni.\n`);
}

console.log('  Backup:');
console.log('    ' + nodesBak);
console.log('    ' + edgesBak);
console.log('\n================================================================');
console.log('   FINE. Riavvia il server per caricare i dati puliti.');
console.log('================================================================');
