/* ============================================================
   engine.js — pure Puli Meka rules. No rendering, no globals
   except `ENGINE`. A `state` is a plain object so the AI can
   clone and simulate it freely.
   state = {
     board: Int8Array/Array of 25 : 0 empty, 1 goat, 2 tiger
     turn:  'G' | 'T'
     toPlace: goats still off the board (starts 20)
     captured: goats eaten so far
   }
   ============================================================ */
(function () {
  const B = window.BOARD;
  const EMPTY = 0, GOAT = 1, TIGER = 2;

  function initialState() {
    const board = new Array(B.COUNT).fill(EMPTY);
    for (const t of B.TIGER_START) board[t] = TIGER;
    return { board, turn: 'G', toPlace: B.GOAT_TOTAL, captured: 0 };
  }

  function clone(s) {
    return { board: s.board.slice(), turn: s.turn, toPlace: s.toPlace, captured: s.captured };
  }

  // Moves for a single tiger at `node`.
  function tigerMovesFrom(s, node) {
    const out = [];
    for (const nb of B.ADJ[node]) {
      const v = s.board[nb];
      if (v === EMPTY) {
        out.push({ type: 'move', piece: 'T', from: node, to: nb, cap: -1 });
      } else if (v === GOAT) {
        const land = B.jumpLanding(node, nb);
        if (land >= 0 && s.board[land] === EMPTY) {
          out.push({ type: 'move', piece: 'T', from: node, to: land, cap: nb });
        }
      }
    }
    return out;
  }

  function goatMovesFrom(s, node) {
    const out = [];
    for (const nb of B.ADJ[node]) {
      if (s.board[nb] === EMPTY) out.push({ type: 'move', piece: 'G', from: node, to: nb, cap: -1 });
    }
    return out;
  }

  // All legal moves for the side to move.
  function legalMoves(s) {
    const out = [];
    if (s.turn === 'G') {
      if (s.toPlace > 0) {
        for (let i = 0; i < B.COUNT; i++) if (s.board[i] === EMPTY) out.push({ type: 'place', to: i });
      } else {
        for (let i = 0; i < B.COUNT; i++) if (s.board[i] === GOAT) pushAll(out, goatMovesFrom(s, i));
      }
    } else {
      for (let i = 0; i < B.COUNT; i++) if (s.board[i] === TIGER) pushAll(out, tigerMovesFrom(s, i));
    }
    return out;
  }

  function pushAll(dst, src) { for (const m of src) dst.push(m); }

  // Mutates `s` in place. Also switches the turn. Returns `s`.
  function apply(s, m) {
    if (m.type === 'place') {
      s.board[m.to] = GOAT;
      s.toPlace--;
      s.turn = 'T';
    } else if (m.piece === 'G') {
      s.board[m.from] = EMPTY;
      s.board[m.to] = GOAT;
      s.turn = 'T';
    } else { // tiger
      s.board[m.from] = EMPTY;
      s.board[m.to] = TIGER;
      if (m.cap >= 0) { s.board[m.cap] = EMPTY; s.captured++; }
      s.turn = 'G';
    }
    return s;
  }

  function tigerHasMove(s) {
    for (let i = 0; i < B.COUNT; i++) {
      if (s.board[i] !== TIGER) continue;
      for (const nb of B.ADJ[i]) {
        if (s.board[nb] === EMPTY) return true;
        if (s.board[nb] === GOAT) {
          const land = B.jumpLanding(i, nb);
          if (land >= 0 && s.board[land] === EMPTY) return true;
        }
      }
    }
    return false;
  }

  function countTigerMoves(s) {
    let n = 0, caps = 0;
    for (let i = 0; i < B.COUNT; i++) {
      if (s.board[i] !== TIGER) continue;
      for (const nb of B.ADJ[i]) {
        if (s.board[nb] === EMPTY) n++;
        else if (s.board[nb] === GOAT) {
          const land = B.jumpLanding(i, nb);
          if (land >= 0 && s.board[land] === EMPTY) { n++; caps++; }
        }
      }
    }
    return { moves: n, captures: caps };
  }

  // Winner: 'T', 'G', or null.
  function winner(s) {
    if (s.captured >= B.GOATS_TO_LOSE) return 'T';
    if (!tigerHasMove(s)) return 'G';
    return null;
  }

  window.ENGINE = {
    EMPTY, GOAT, TIGER,
    initialState, clone,
    tigerMovesFrom, goatMovesFrom, legalMoves,
    apply, tigerHasMove, countTigerMoves, winner,
  };
})();
