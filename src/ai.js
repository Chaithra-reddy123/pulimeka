/* ============================================================
   ai.js — alpha-beta search for both sides. Evaluation is from
   the TIGER's point of view (higher = better for tigers).
   Exposes `AI.chooseMove(state, depth)`.
   ============================================================ */
(function () {
  const B = window.BOARD;
  const E = window.ENGINE;
  const WIN = 1e6;

  // Central points are stronger for tigers (mobility) and dangerous
  // for lone goats. Precompute a small positional weight.
  const CENTER = (() => {
    const w = new Array(B.COUNT);
    for (let i = 0; i < B.COUNT; i++) {
      const r = B.rowOf(i), c = B.colOf(i);
      const dr = Math.abs(r - 2), dc = Math.abs(c - 2);
      w[i] = (4 - dr - dc); // 4 at centre, 0 at corners
    }
    return w;
  })();

  function evaluate(s) {
    const tm = E.countTigerMoves(s);
    let val = 0;
    val += 220 * s.captured;              // eaten goats are gold
    val += 6 * tm.moves;                  // tiger mobility
    val += 22 * tm.captures;              // immediate threats
    // positional: tigers like the centre, and goats away from open lines
    for (let i = 0; i < B.COUNT; i++) {
      const v = s.board[i];
      if (v === E.TIGER) val += 1.2 * CENTER[i];
      else if (v === E.GOAT) val -= 3; // every surviving goat helps the goats
    }
    return val;
  }

  // Order moves so captures are searched first (better pruning).
  function order(moves) {
    return moves.sort((a, b) => (b.cap >= 0 ? 1 : 0) - (a.cap >= 0 ? 1 : 0));
  }

  function search(s, depth, alpha, beta) {
    const w = E.winner(s);
    if (w === 'T') return WIN + depth;
    if (w === 'G') return -WIN - depth;
    if (depth === 0) return evaluate(s);

    const moves = order(E.legalMoves(s));
    if (moves.length === 0) {
      // side to move is stuck
      return s.turn === 'T' ? -WIN - depth : evaluate(s);
    }

    if (s.turn === 'T') { // maximizing
      let best = -Infinity;
      for (const m of moves) {
        const v = search(E.apply(E.clone(s), m), depth - 1, alpha, beta);
        if (v > best) best = v;
        if (best > alpha) alpha = best;
        if (alpha >= beta) break;
      }
      return best;
    } else { // minimizing (goats)
      let best = Infinity;
      for (const m of moves) {
        const v = search(E.apply(E.clone(s), m), depth - 1, alpha, beta);
        if (v < best) best = v;
        if (best < beta) beta = best;
        if (alpha >= beta) break;
      }
      return best;
    }
  }

  function chooseMove(s, depth) {
    const moves = order(E.legalMoves(s));
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    const maximizing = s.turn === 'T';
    let bestVal = maximizing ? -Infinity : Infinity;
    const scored = [];
    for (const m of moves) {
      const v = search(E.apply(E.clone(s), m), depth - 1, -Infinity, Infinity);
      scored.push({ m, v });
      if (maximizing ? v > bestVal : v < bestVal) bestVal = v;
    }
    // Pick randomly among near-best moves so games feel alive.
    const eps = 2.0;
    const pool = scored.filter((x) => Math.abs(x.v - bestVal) <= eps);
    const pick = pool[(Math.random() * pool.length) | 0] || scored[0];
    return pick.m;
  }

  window.AI = { chooseMove, evaluate };
})();
