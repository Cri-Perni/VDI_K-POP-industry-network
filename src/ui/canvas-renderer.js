// ui/canvas-renderer.js
// Simulazione d3-force e disegno su canvas dell'intorno corrente.
// Si iscrive allo store (ui/state.js): ogni volta che lo stato cambia,
// ricalcola la vista (rebuild) se il risultato dell'intorno è cambiato,
// altrimenti ridisegna soltanto (per hover/selezione/toggle visuali che
// non richiedono un nuovo layout di forza).
//
// Espone poche funzioni pubbliche (fit, centerOn, resize, destroy) usate
// da main.js e dagli altri moduli UI (es. sidebar/detail-panel vogliono
// centrare la vista su un nodo cliccato).

/* global d3 */

import { typeLabel } from './dom-helpers.js';
import { pathsToTargets } from '../core/neighborhood.js';

const TAU = Math.PI * 2;

/**
 * @param {object} opts
 * @param {HTMLElement} opts.stage    contenitore che definisce le dimensioni del canvas
 * @param {HTMLCanvasElement} opts.cv
 * @param {HTMLElement} opts.tip      elemento tooltip (assoluto, hidden by default)
 * @param {object} opts.store         istanza creata da createStore()
 * @param {Map<number, number[]>} opts.adj
 * @param {Map<number, object>} opts.byId
 * @param {() => object} opts.getPalette   ritorna la palette colori corrente
 * @param {(palette:object)=>void} [opts.onPaletteChange] callback opzionale usata dal chiamante per registrare watchPalette
 * @returns {{fit:Function, centerOn:Function, resize:Function, destroy:Function}}
 */
export function createCanvasRenderer({ stage, cv, tip, store, adj, byId, getPalette }) {
  const ctx = cv.getContext('2d');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FONT = getComputedStyle(document.body).fontFamily;

  let PAL = getPalette();
  let W = 0, H = 0, DPR = 1;
  let T = d3.zoomIdentity;
  let viewIdx = new Map();   // id -> nodo nel grafico visualizzato
  let viewAdj = new Map();   // id -> Set(id vicini nel grafico visualizzato)
  let simLinks = [];
  let fitPending = false;
  const pos = new Map();    // ultime posizioni note, per continuità visiva tra ricalcoli

  const rad = d => d.seed ? 10 : Math.min(3.2 + Math.sqrt(d.deg) * 0.85, 9);

  const sim = d3.forceSimulation()
    .alphaDecay(0.035).velocityDecay(0.35)
    .force('link', d3.forceLink().distance(l => l.isLabel ? 70 : 34).strength(l => l.isLabel ? 0.05 : 0.6))
    .force('charge', d3.forceManyBody().strength(-80).distanceMax(380))
    .force('x', d3.forceX(0).strength(0.035))
    .force('y', d3.forceY(0).strength(0.035))
    .force('collide', d3.forceCollide().radius(d => rad(d) + 2))
    .on('tick', () => {
      if (fitPending && sim.alpha() < 0.1) { fitPending = false; fit(true); }
      draw();
    });

  function snapshot() {
    for (const n of sim.nodes()) pos.set(n.id, { x: n.x, y: n.y });
  }

  function rebuild(res) {
    snapshot();
    const list = [];
    for (const [id, hop] of res.hop) {
      const b = byId.get(id), p = pos.get(id), by = res.reachedBy.get(id);
      const seed = store.state.seeds.has(id);
      list.push({
        id, type: b.type, name: b.name, deg: b.deg, hop, by, seed,
        x: p ? p.x : undefined, y: p ? p.y : undefined,
      });
    }
    viewIdx = new Map(list.map(n => [n.id, n]));
    for (const n of list) {
      if (n.x !== undefined) continue;
      const nb = adj.get(n.id).map(v => viewIdx.get(v)).find(v => v && v.x !== undefined);
      n.x = (nb ? nb.x : 0) + (Math.random() - .5) * 40;
      n.y = (nb ? nb.y : 0) + (Math.random() - .5) * 40;
    }
    simLinks = res.edges.map(([a, b]) => ({
      source: viewIdx.get(a), target: viewIdx.get(b),
      isLabel: byId.get(a).type === 'label' || byId.get(b).type === 'label',
    }));
    viewAdj = new Map(list.map(n => [n.id, new Set()]));
    for (const l of simLinks) {
      viewAdj.get(l.source.id).add(l.target.id);
      viewAdj.get(l.target.id).add(l.source.id);
    }
    focusMemo = { id: null, set: null };
    sim.nodes(list);
    sim.force('link').links(simLinks);
    sim.alpha(0.7).restart();
    if (store.state.selected != null && !viewIdx.has(store.state.selected)) {
      store.select(null);
    }
  }

  function clearGraph() {
    snapshot();
    sim.nodes([]);
    sim.force('link').links([]);
    viewIdx = new Map();
    viewAdj = new Map();
    simLinks = [];
    draw();
  }

  let focusMemo = { id: null, set: null };
  function focusSet(id) {
    if (id == null || !viewAdj.has(id)) return null;
    if (focusMemo.id === id) return focusMemo.set;

    const direct = new Set([id, ...viewAdj.get(id)]);
    const node = viewIdx.get(id);

    if (node?.seed && store.state.showBridges) {
      // per un nodo di partenza, evidenzia anche il cammino più corto verso
      // ogni nodo "in comune" (bridge) che questo seed raggiunge davvero:
      // reachedBy garantisce che il cammino esista nel sottografo visualizzato.
      const bridgeTargets = [];
      for (const n of sim.nodes()) {
        if (n.id !== id && store.isCommon(n.seed, n.by) && n.by.includes(id)) {
          bridgeTargets.push(n.id);
        }
      }
      if (bridgeTargets.length) {
        const withPaths = pathsToTargets(viewAdj, id, bridgeTargets);
        for (const v of withPaths) direct.add(v);
      }
    }

    focusMemo = { id, set: direct };
    return direct;
  }

  function shape(n, r) {
    ctx.beginPath();
    if (n.type === 'label') {
      const s = r * 0.92;
      ctx.roundRect(n.x - s, n.y - s, s * 2, s * 2, s * 0.28);
    } else if (n.type === 'group') {
      // diamante: stesso roundRect delle agenzie, ma ruotato di 45° attorno
      // al centro del nodo, per restare distinguibile dal cerchio degli
      // artisti e dal quadrato (non ruotato) delle agenzie.
      const s = r * 0.98;
      ctx.save();
      ctx.translate(n.x, n.y);
      ctx.rotate(Math.PI / 4);
      ctx.roundRect(-s, -s, s * 2, s * 2, s * 0.28);
      ctx.restore();
    } else {
      ctx.arc(n.x, n.y, r, 0, TAU);
    }
  }

  function clipText(s, m) {
    return s.length > m ? s.slice(0, m - 1) + '…' : s;
  }

  let raf = 0;
  function scheduleDraw() {
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); });
  }

  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const ns = sim.nodes();
    if (!ns.length) return;

    const { hover, selected, showBridges, showNames } = store.state;
    const focusId = hover ?? selected;
    const focus = focusSet(focusId);
    ctx.save();
    ctx.translate(T.x, T.y);
    ctx.scale(T.k, T.k);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const pB = new Path2D(), pL = new Path2D(), pH = new Path2D();
    for (const l of simLinks) {
      const hi = focus != null && focus.has(l.source.id) && focus.has(l.target.id);
      const p = hi ? pH : (l.isLabel ? pL : pB);
      p.moveTo(l.source.x, l.source.y);
      p.lineTo(l.target.x, l.target.y);
    }
    ctx.lineWidth = 1 / T.k;
    ctx.globalAlpha = focus ? 0.4 : 1;
    ctx.strokeStyle = PAL.edge; ctx.stroke(pB);
    ctx.strokeStyle = PAL.edgeLabel; ctx.stroke(pL);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = PAL.edgeHi; ctx.lineWidth = 1.7 / T.k; ctx.stroke(pH);

    for (const n of ns) {
      const r = rad(n);
      ctx.globalAlpha = focus && !focus.has(n.id) ? 0.16 : 1;
      const common = showBridges && store.isCommon(n.seed, n.by);
      if (common) {
        ctx.beginPath(); ctx.arc(n.x, n.y, r + 5, 0, TAU); ctx.fillStyle = PAL.bridgeHalo; ctx.fill();
      }
      shape(n, r); ctx.fillStyle = PAL[n.type]; ctx.fill();
      if (common) { shape(n, r); ctx.lineWidth = 1.8 / T.k; ctx.strokeStyle = PAL.bridge; ctx.stroke(); }
      if (n.seed) { ctx.beginPath(); ctx.arc(n.x, n.y, r + 3, 0, TAU); ctx.lineWidth = 2.2 / T.k; ctx.strokeStyle = PAL.ink; ctx.stroke(); }
      if (n.id === selected) { ctx.beginPath(); ctx.arc(n.x, n.y, r + 6.5, 0, TAU); ctx.lineWidth = 2 / T.k; ctx.strokeStyle = PAL.accent; ctx.stroke(); }
    }

    ctx.globalAlpha = 1;
    ctx.font = `600 ${12 / T.k}px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.lineWidth = 3.6 / T.k; ctx.strokeStyle = PAL.bg; ctx.fillStyle = PAL.ink;
    const all = showNames || T.k >= 2.2;
    const fewBridges = ns.reduce((c, n) => c + (showBridges && store.isCommon(n.seed, n.by) ? 1 : 0), 0) <= 40;
    for (const n of ns) {
      const dimmed = focus && !focus.has(n.id);
      const show = all || n.seed || n.id === selected ||
        (showBridges && store.isCommon(n.seed, n.by) && (fewBridges || T.k >= 1.6)) ||
        (focus && focus.has(n.id) && T.k > 0.8);
      if (!show || (dimmed && !n.seed)) continue;
      const y = n.y + rad(n) + 4;
      const t = clipText(n.name, 26);
      ctx.strokeText(t, n.x, y);
      ctx.fillText(t, n.x, y);
    }
    ctx.restore();
  }

  /* --- zoom, drag, hover, click --- */
  const zoom = d3.zoom().scaleExtent([0.08, 10])
    .on('zoom', ev => {
      T = ev.transform;
      if (ev.sourceEvent) fitPending = false;
      hideTip();
      scheduleDraw();
    });

  function nodeAt(ev) {
    const [mx, my] = d3.pointer(ev, cv);
    const [x, y] = T.invert([mx, my]);
    return sim.find(x, y, 14 / T.k);
  }

  const drag = d3.drag().container(cv)
    .subject(ev => {
      const [x, y] = T.invert([ev.x, ev.y]);
      const n = sim.find(x, y, 14 / T.k);
      return n ? { x: T.applyX(n.x), y: T.applyY(n.y), node: n } : null;
    })
    .on('start', ev => {
      if (!ev.active) sim.alphaTarget(0.25).restart();
      const n = ev.subject.node; n.fx = n.x; n.fy = n.y; hideTip();
    })
    .on('drag', ev => {
      const n = ev.subject.node, [x, y] = T.invert([ev.x, ev.y]);
      n.fx = x; n.fy = y;
    })
    .on('end', ev => {
      if (!ev.active) sim.alphaTarget(0);
      const n = ev.subject.node; n.fx = null; n.fy = null;
    });

  d3.select(cv).call(drag).call(zoom).on('dblclick.zoom', null);

  function onClick(ev) { const n = nodeAt(ev); store.select(n ? n.id : null); }
  function onDblClick(ev) { const n = nodeAt(ev); if (n) store.addSeed(n.id, false); }
  function onContextMenu(ev) { ev.preventDefault(); const n = nodeAt(ev); if (n) store.addBlocked(n.id, false); }
  function onMouseMove(ev) {
    const n = nodeAt(ev), id = n ? n.id : null;
    cv.style.cursor = n ? 'pointer' : 'grab';
    store.setHover(id);
    if (n) showTip(n, ev); else hideTip();
  }
  function onMouseLeave() { store.setHover(null); hideTip(); }
  function onKeyDown(ev) { if (ev.key === 'Escape') store.select(null); }

  cv.addEventListener('click', onClick);
  cv.addEventListener('dblclick', onDblClick);
  cv.addEventListener('contextmenu', onContextMenu);
  cv.addEventListener('mousemove', onMouseMove);
  cv.addEventListener('mouseleave', onMouseLeave);
  addEventListener('keydown', onKeyDown);

  function showTip(n, ev) {
    tip.replaceChildren();
    const b = document.createElement('b');
    b.textContent = n.name;
    tip.append(b, `${typeLabel(n.type)}, ${n.deg} collegamenti`);
    tip.hidden = false;
    const r = stage.getBoundingClientRect();
    const x = Math.min(ev.clientX - r.left + 14, r.width - tip.offsetWidth - 8);
    const y = Math.min(ev.clientY - r.top + 16, r.height - tip.offsetHeight - 8);
    tip.style.left = Math.max(8, x) + 'px';
    tip.style.top = Math.max(8, y) + 'px';
  }
  function hideTip() { tip.hidden = true; }

  function fit(animate) {
    const ns = sim.nodes();
    if (!ns.length || !W) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of ns) {
      x0 = Math.min(x0, n.x); x1 = Math.max(x1, n.x);
      y0 = Math.min(y0, n.y); y1 = Math.max(y1, n.y);
    }
    const pad = 70, bw = Math.max(x1 - x0, 40), bh = Math.max(y1 - y0, 40);
    const k = Math.max(0.1, Math.min(3, (W - 2 * pad) / bw, (H - 2 * pad) / bh));
    const t = d3.zoomIdentity.translate(W / 2, H / 2).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    const sel = d3.select(cv);
    (animate && !reduceMotion ? sel.transition().duration(500) : sel).call(zoom.transform, t);
  }

  function centerOn(id) {
    const n = viewIdx.get(id);
    if (!n) return;
    const sel = d3.select(cv);
    (reduceMotion ? sel : sel.transition().duration(400)).call(zoom.translateTo, n.x, n.y);
  }

  function resize() {
    const r = stage.getBoundingClientRect();
    const old = { W, H };
    W = r.width; H = r.height; DPR = window.devicePixelRatio || 1;
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    if (old.W) {
      const c = T.invert([old.W / 2, old.H / 2]);
      d3.select(cv).call(zoom.transform, d3.zoomIdentity.translate(W / 2 - c[0] * T.k, H / 2 - c[1] * T.k).scale(T.k));
    } else {
      d3.select(cv).call(zoom.transform, d3.zoomIdentity.translate(W / 2, H / 2));
    }
    draw();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);

  /* --- reagisce ai cambi di stato dello store --- */
  let lastResRef = null;
  const unsubscribe = store.subscribe(({ last, overflow, doFit }) => {
    if (overflow != null) { clearGraph(); return; }
    if (!last.res) { clearGraph(); return; }
    if (last.res !== lastResRef) {
      lastResRef = last.res;
      rebuild(last.res);
      fitPending = doFit;
    } else {
      scheduleDraw();
    }
  });

  function setPalette(p) { PAL = p; draw(); }

  /** Ritorna il nodo (con posizione/hop/by) come attualmente visualizzato, o undefined. */
  function getViewNode(id) { return viewIdx.get(id); }

  /** Ritorna gli id dei vicini di `id` nel grafico visualizzato (Set vuoto se assente). */
  function getViewNeighbors(id) { return viewAdj.get(id) ?? new Set(); }

  /** Ritorna l'insieme di tutti gli id attualmente visualizzati. */
  function getViewIds() { return new Set(viewIdx.keys()); }

  function destroy() {
    unsubscribe();
    resizeObserver.disconnect();
    cv.removeEventListener('click', onClick);
    cv.removeEventListener('dblclick', onDblClick);
    cv.removeEventListener('contextmenu', onContextMenu);
    cv.removeEventListener('mousemove', onMouseMove);
    cv.removeEventListener('mouseleave', onMouseLeave);
    removeEventListener('keydown', onKeyDown);
    sim.stop();
  }

  return { fit, centerOn, resize, setPalette, destroy, getViewNode, getViewNeighbors, getViewIds, getFocusSet: focusSet };
}
