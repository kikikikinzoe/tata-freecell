/* FreeCell engine — standard eight-column rules, no dependencies. */
(function (root) {
  'use strict';
  const SUITS = ['♠', '♥', '♣', '♦'];
  const RED = new Set([1, 3]);
  const names = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  function makeSeed(value) {
    const n = Number(value);
    return Number.isFinite(n) ? (Math.trunc(n) >>> 0) || 1 : 1;
  }
  function seededRandom(seed) {
    let x = makeSeed(seed);
    return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; };
  }
  function create(seed = 1) {
    const rand = seededRandom(seed);
    const deck = [];
    for (let suit = 0; suit < 4; suit++) for (let rank = 1; rank <= 13; rank++) deck.push({ suit, rank });
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    const tableau = Array.from({ length: 8 }, () => []);
    deck.forEach((card, i) => tableau[i % 8].push(card));
    return { seed: makeSeed(seed), tableau, cells: [null, null, null, null], foundations: [0, 0, 0, 0], moves: 0 };
  }
  function clone(s) {
    return { seed: s.seed, tableau: s.tableau.map(col => col.slice()), cells: s.cells.slice(), foundations: s.foundations.slice(), moves: s.moves };
  }
  function isAlternating(a, b) { return RED.has(a.suit) !== RED.has(b.suit); }
  function fitsOn(card, above) { return !above || (above.rank === card.rank + 1 && isAlternating(card, above)); }
  function runValid(col, start) {
    if (!Array.isArray(col) || start < 0 || start >= col.length) return false;
    for (let i = start; i < col.length - 1; i++) if (!fitsOn(col[i + 1], col[i])) return false;
    return true;
  }
  function sourceCards(state, src) {
    if (!src || !Number.isInteger(src.index)) return null;
    if (src.zone === 'tableau') {
      if (src.index < 0 || src.index > 7) return null;
      const col = state.tableau[src.index];
      const at = Number.isInteger(src.at) ? src.at : col.length - 1;
      if (!runValid(col, at)) return null;
      return col.slice(at);
    }
    if (src.zone === 'cells' && src.index >= 0 && src.index < 4) return state.cells[src.index] ? [state.cells[src.index]] : null;
    return null;
  }
  function capacity(state, targetColumnIndex) {
    const free = state.cells.filter(c => !c).length;
    const emptyColumns = state.tableau.reduce((n, col) => n + (col.length === 0 ? 1 : 0), 0);
    const destinationIsEmpty = state.tableau[targetColumnIndex].length === 0 ? 1 : 0;
    return (free + 1) * Math.pow(2, Math.max(0, emptyColumns - destinationIsEmpty));
  }
  function canMove(state, src, dst) {
    const cards = sourceCards(state, src);
    if (!cards || !cards.length || !dst || !Number.isInteger(dst.index)) return false;
    if (dst.zone === 'tableau') {
      if (dst.index < 0 || dst.index > 7 || (src.zone === 'tableau' && src.index === dst.index)) return false;
      const col = state.tableau[dst.index];
      return cards.length <= capacity(state, dst.index) && fitsOn(cards[0], col[col.length - 1]);
    }
    if (cards.length !== 1) return false;
    if (dst.zone === 'cells') return dst.index >= 0 && dst.index < 4 && state.cells[dst.index] === null;
    if (dst.zone === 'foundations') return dst.index >= 0 && dst.index < 4 && cards[0].suit === dst.index && cards[0].rank === state.foundations[dst.index] + 1;
    return false;
  }
  function move(state, src, dst) {
    if (!canMove(state, src, dst)) return null;
    const next = clone(state);
    const cards = sourceCards(next, src);
    if (src.zone === 'tableau') next.tableau[src.index].splice(next.tableau[src.index].length - cards.length, cards.length);
    else next.cells[src.index] = null;
    if (dst.zone === 'tableau') next.tableau[dst.index].push(...cards);
    else if (dst.zone === 'cells') next.cells[dst.index] = cards[0];
    else next.foundations[dst.index]++;
    next.moves++;
    return next;
  }
  function won(state) { return state.foundations.every(n => n === 13); }
  function safeToAuto(state, card) {
    if (card.rank <= 2) return true;
    const opposite = RED.has(card.suit) ? [0, 2] : [1, 3];
    const same = RED.has(card.suit) ? [1, 3] : [0, 2];
    return opposite.every(s => state.foundations[s] >= card.rank - 1) &&
      same.filter(s => s !== card.suit).every(s => state.foundations[s] >= card.rank - 2);
  }
  function autoFoundations(state) {
    let next = state, times = 0;
    for (let pass = 0; pass < 52; pass++) {
      let progressed = false;
      const sources = [
        ...state.cells.map((_, index) => ({ zone: 'cells', index })),
        ...state.tableau.map((_, index) => ({ zone: 'tableau', index })),
      ];
      for (const src of sources) {
        const cards = sourceCards(next, src);
        if (cards?.length === 1 && safeToAuto(next, cards[0])) {
          const dst = { zone: 'foundations', index: cards[0].suit };
          const attempted = move(next, src, dst);
          if (attempted) { next = attempted; progressed = true; times++; break; }
        }
      }
      if (!progressed) break;
    }
    return { state: next, count: times };
  }
  function suggest(state) {
    const sources = [
      ...state.tableau.map((col, index) => ({ zone: 'tableau', index, at: col.length - 1 })).filter(s => s.at >= 0),
      ...state.cells.map((card, index) => ({ zone: 'cells', index })).filter(s => !!state.cells[s.index]),
    ];
    for (const src of sources) {
      const card = sourceCards(state, src)?.[0];
      if (card && canMove(state, src, { zone: 'foundations', index: card.suit })) return { src, dst: { zone: 'foundations', index: card.suit } };
    }
    for (const src of sources) for (let index = 0; index < 8; index++) {
      if (state.tableau[index].length && canMove(state, src, { zone: 'tableau', index })) return { src, dst: { zone: 'tableau', index } };
    }
    for (const src of sources) for (let index = 0; index < 4; index++) {
      if (canMove(state, src, { zone: 'cells', index })) return { src, dst: { zone: 'cells', index } };
    }
    return null;
  }
  const api = { SUITS, names, create, clone, isAlternating, fitsOn, runValid, sourceCards, capacity, canMove, move, won, autoFoundations, suggest };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.FreeCellEngine = api;
})(typeof window !== 'undefined' ? window : null);
