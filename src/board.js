/* ============================================================
   board.js — Puli Meka (Bagh Chal variant) board topology
   5x5 grid = 25 points. Orthogonal neighbours everywhere;
   diagonals only on even-parity points (the classic X pattern).
   4 tigers start on the corners, 20 goats are placed one by one.
   Exposes a global `BOARD`.
   ============================================================ */
(function () {
  const SIZE = 5;
  const COUNT = SIZE * SIZE;

  const rc = (r, c) => r * SIZE + c;
  const inBounds = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;
  const rowOf = (i) => Math.floor(i / SIZE);
  const colOf = (i) => i % SIZE;

  const ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

  // Adjacency list
  const ADJ = Array.from({ length: COUNT }, () => []);
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const a = rc(r, c);
      for (const [dr, dc] of ORTHO) {
        if (inBounds(r + dr, c + dc)) ADJ[a].push(rc(r + dr, c + dc));
      }
      if ((r + c) % 2 === 0) {
        for (const [dr, dc] of DIAG) {
          if (inBounds(r + dr, c + dc)) ADJ[a].push(rc(r + dr, c + dc));
        }
      }
    }
  }

  // Board-space coordinates in 0..1 (c -> x, r -> y). Rendering adds perspective.
  const POS = [];
  for (let i = 0; i < COUNT; i++) {
    POS.push({ x: colOf(i) / (SIZE - 1), y: rowOf(i) / (SIZE - 1) });
  }

  // Unique undirected edges (for drawing the chalk lines)
  const EDGES = [];
  for (let a = 0; a < COUNT; a++) {
    for (const b of ADJ[a]) if (a < b) EDGES.push([a, b]);
  }

  const TIGER_START = [rc(0, 0), rc(0, SIZE - 1), rc(SIZE - 1, 0), rc(SIZE - 1, SIZE - 1)];

  /**
   * Landing point when jumping from `from` over adjacent `over`.
   * Returns the landing node id if the straight continuation is a real
   * drawn line, else -1.
   */
  function jumpLanding(from, over) {
    const fr = rowOf(from), fc = colOf(from);
    const or = rowOf(over), oc = colOf(over);
    const lr = 2 * or - fr, lc = 2 * oc - fc;
    if (!inBounds(lr, lc)) return -1;
    const land = rc(lr, lc);
    // The middle point must be linked to both ends by drawn lines.
    return ADJ[over].includes(land) && ADJ[over].includes(from) ? land : -1;
  }

  window.BOARD = {
    SIZE, COUNT, ADJ, POS, EDGES, TIGER_START,
    rc, inBounds, rowOf, colOf, jumpLanding,
    GOAT_TOTAL: 20,
    TIGER_TOTAL: 4,
    GOATS_TO_LOSE: 5, // tigers win after eating this many
  };
})();
