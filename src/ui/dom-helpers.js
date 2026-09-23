// ui/dom-helpers.js
// Utility generiche per costruire elementi DOM senza framework.
// Nessuna dipendenza da stato applicativo: riceve solo argomenti espliciti.

import { TYPE_LABELS_IT } from '../core/graph.js';

/**
 * Crea un elemento DOM con attributi/eventi e figli, in stile "hyperscript".
 *
 * Props speciali:
 *  - class: imposta className
 *  - text: imposta textContent
 *  - onXxx: registra un event listener per "xxx"
 *  - true: imposta l'attributo senza valore (es. disabled: true)
 *  - false/null/undefined: l'attributo viene ignorato
 *  - altrimenti: setAttribute(key, value)
 *
 * @param {string} tag
 * @param {object} [props]
 * @param {...(Node|string|Array|null|undefined)} kids
 * @returns {HTMLElement}
 */
export function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null) e.append(c);
  return e;
}

/**
 * Pallino/quadratino colorato che rappresenta il tipo di un nodo
 * (gruppo, uomo, donna, persona, agenzia). Il colore arriva dalla
 * variabile CSS --c-<type> definita nel foglio di stile.
 *
 * @param {string} type uno tra i valori di TYPES (graph.js)
 * @returns {HTMLElement}
 */
export function swatch(type) {
  return h('span', { class: 'sw' + (type === 'label' ? ' sq' : ''), style: `--c:var(--c-${type})` });
}

/**
 * Etichetta italiana leggibile per un tipo di nodo.
 * @param {string} type
 * @returns {string}
 */
export function typeLabel(type) {
  return TYPE_LABELS_IT[type] ?? type;
}

/**
 * Troncamento con ellissi per stringhe troppo lunghe (es. nomi sul canvas).
 * @param {string} s
 * @param {number} max
 * @returns {string}
 */
export function clip(s, max) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
