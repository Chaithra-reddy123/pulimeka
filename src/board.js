/* ============================================================
   board.js — Puli Meka traditional board topology.
   22 points: an apex, a top row, a full middle row, a narrow
   bottom row, and four corner triangles (each with 2 outer tips).
   Points are numbered 1..22 in the art (art/board-22.svg); here
   they are 0-indexed (0..21).

   4 tigers start fixed (points 1,2,3,4 -> idx 0,1,2,3).
   16 goats are placed one at a time, leaving 2 empty points.
   Exposes a global `BOARD`.
   ============================================================ */
(function () {
  // Layout coordinates copied from art/board-22.svg (pixels).
  // idx : [pxX, pxY]  (1-based label in the comment)
  const PX = [
    [450, 90],   // 0  (1) apex           TIGER
    [315, 250],  // 1  (2) top inner-L     TIGER
    [450, 250],  // 2  (3) top center      TIGER
    [585, 250],  // 3  (4) top inner-R     TIGER
    [180, 250],  // 4  (5) top-left corner
    [720, 250],  // 5  (6) top-right corner
    [180, 430],  // 6  (7) mid-left
    [315, 430],  // 7  (8) mid inner-L
    [450, 430],  // 8  (9) mid center
    [585, 430],  // 9  (10) mid inner-R
    [720, 430],  // 10 (11) mid-right
    [315, 610],  // 11 (12) bottom-left
    [450, 610],  // 12 (13) bottom-center
    [585, 610],  // 13 (14) bottom-right
    [90, 210],   // 14 (15) TL tip a
    [90, 300],   // 15 (16) TL tip b
    [775, 150],  // 16 (17) TR tip a
    [830, 200],  // 17 (18) TR tip b
    [830, 390],  // 18 (19) MR tip a
    [830, 470],  // 19 (20) MR tip b
    [95, 500],   // 20 (21) BL tip a
    [150, 560],  // 21 (22) BL tip b
  ];
  const COUNT = PX.length; // 22

  // Normalize so the board keeps its true proportions. X spans
  // 90..830 (740 wide), Y spans 90..610 (520 tall). Divide each axis
  // to 0..1; render re-applies ASPECT so nothing gets stretched.
  const MINX = 90, MAXX = 830, MINY = 90, MAXY = 610;
  const SPANX = MAXX - MINX, SPANY = MAXY - MINY;
  const ASPECT = SPANY / SPANX; // board height / width

  const POS = PX.map(([x, y]) => ({
    x: (x - MINX) / SPANX,
    y: (y - MINY) / SPANY,
  }));

  // Normalized horizontal spacing between adjacent grid columns
  // (315-180 px), used to size pieces on screen.
  const UNIT_N = 135 / SPANX;

  // ---- Undirected edges (the chalk lines) ----
  const EDGES = [
    // apex -> the three top tigers
    [0, 1], [0, 2], [0, 3],
    // top row: 5-2-3-4-6  (idx 4-1-2-3-5)
    [4, 1], [1, 2], [2, 3], [3, 5],
    // middle row: 7-8-9-10-11 (idx 6-7-8-9-10)
    [6, 7], [7, 8], [8, 9], [9, 10],
    // bottom row: 12-13-14 (idx 11-12-13)
    [11, 12], [12, 13],
    // verticals top -> middle
    [4, 6], [1, 7], [2, 8], [3, 9], [5, 10],
    // verticals middle -> bottom
    [7, 11], [8, 12], [9, 13],
    // corner triangles (each: corner-tipA, corner-tipB, tipA-tipB)
    [4, 14], [4, 15], [14, 15],   // top-left
    [5, 16], [5, 17], [16, 17],   // top-right
    [10, 18], [10, 19], [18, 19], // mid-right
    [6, 20], [6, 21], [20, 21],   // bottom-left
  ];

  // ---- Adjacency list ----
  const ADJ = Array.from({ length: COUNT }, () => []);
  for (const [a, b] of EDGES) { ADJ[a].push(b); ADJ[b].push(a); }

  // Unit direction from a to b.
  function dir(a, b) {
    const dx = POS[b].x - POS[a].x, dy = POS[b].y - POS[a].y;
    const L = Math.hypot(dx, dy) || 1;
    return [dx / L, dy / L];
  }

  /**
   * Landing point when jumping from `from` over adjacent `over`.
   * A jump is legal when `land` is a neighbour of `over` that lies
   * on the straight continuation of the from->over line (same
   * bearing). Distances need not be equal, so hand-drawn boards
   * with uneven spacing still work. Returns node id or -1.
   */
  function jumpLanding(from, over) {
    if (!ADJ[over].includes(from)) return -1;
    const [dx1, dy1] = dir(from, over);
    let best = -1, bestDot = 0.94; // ~20 degrees tolerance
    for (const land of ADJ[over]) {
      if (land === from) continue;
      const [dx2, dy2] = dir(over, land);
      const d = dx1 * dx2 + dy1 * dy2;
      if (d > bestDot) { bestDot = d; best = land; }
    }
    return best;
  }

  // Tiger starting layouts. Default: apex + top three (points 1,2,3,4).
  // "spine": the central vertical line (points 1,3,9,13).
  const TIGER_START_PRESETS = {
    classic: [0, 1, 2, 3],
    spine: [0, 2, 8, 12],
  };

  window.BOARD = {
    COUNT, ADJ, POS, EDGES, ASPECT, UNIT_N,
    jumpLanding,
    TIGER_START_PRESETS,
    TIGER_START: TIGER_START_PRESETS.classic.slice(),
    GOAT_TOTAL: 16,
    TIGER_TOTAL: 4,
    GOATS_TO_LOSE: 6, // tigers win after eating this many goats
  };
})();
