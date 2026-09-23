// ui/palette.js
// Lettura dei colori dal tema CSS attivo (chiaro/scuro) e notifica dei
// componenti quando l'utente cambia preferenza di sistema.

import { TYPES } from '../core/graph.js';

const PALETTE_VARS = {
  bg: '--bg',
  ink: '--ink',
  accent: '--accent',
  edge: '--edge',
  edgeLabel: '--edge-label',
  edgeHi: '--edge-hi',
  bridge: '--bridge',
  bridgeHalo: '--bridge-halo',
};

/**
 * Legge dal DOM il valore corrente delle variabili CSS del tema
 * (incluso un colore per ogni TYPE di nodo, --c-<type>).
 * @returns {object} mappa nome logico -> valore CSS (stringa)
 */
export function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  const g = name => cs.getPropertyValue(name).trim();

  const pal = {};
  for (const [key, cssVar] of Object.entries(PALETTE_VARS)) pal[key] = g(cssVar);
  for (const t of TYPES) pal[t] = g('--c-' + t);
  return pal;
}

/**
 * Si iscrive al cambio di preferenza chiaro/scuro del sistema operativo
 * e richiama `onChange` con la palette aggiornata.
 * @param {(palette: object) => void} onChange
 * @returns {() => void} funzione per annullare l'iscrizione
 */
export function watchPalette(onChange) {
  const mq = matchMedia('(prefers-color-scheme: dark)');
  const handler = () => onChange(readPalette());
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
