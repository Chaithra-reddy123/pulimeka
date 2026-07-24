/* ============================================================
   render.js — board layout, 2.5D projection, chalk board and
   the handcrafted stone pieces (pebble goats + engraved tigers).
   Exposes `RENDER`.
   ============================================================ */
(function () {
  const B = window.BOARD;
  const E = window.ENGINE;

  let layout = null;
  let edgeWobble = null; // deterministic hand-drawn jitter per edge
  let pieceSeed = null;  // per-node visual seed for pebbles

  function rand(seed) { // tiny deterministic hash -> 0..1
    let x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function computeLayout(w, h) {
    const portrait = h >= w;
    // Board sits in the lower-centre of the screen. It is wider than
    // it is tall, so fit it by width and derive the height from the
    // board's real aspect ratio (keeps the drawing undistorted).
    const cx = w * 0.5;
    const boardW = Math.min(w * (portrait ? 0.90 : 0.60), (h * 0.5) / B.ASPECT);
    const halfW = boardW / 2;
    const boardH = boardW * B.ASPECT;
    const boardTop = h * (portrait ? 0.40 : 0.34);
    const boardBottom = boardTop + boardH;
    const backScale = 0.82;
    const unit = boardW * B.UNIT_N;
    layout = {
      w, h, cx, halfW, boardTop, boardBottom, boardH, backScale, unit,
      horizon: h * (portrait ? 0.30 : 0.24),
      pieceR: unit * 0.34,
    };

    // Precompute chalk wobble
    edgeWobble = B.EDGES.map((e, i) => {
      const segs = 6;
      const pts = [];
      for (let k = 0; k <= segs; k++) {
        const j = rand(i * 13.3 + k * 7.7) - 0.5;
        const j2 = rand(i * 5.1 + k * 3.3 + 99) - 0.5;
        pts.push([j, j2]);
      }
      return pts;
    });

    pieceSeed = [];
    for (let i = 0; i < B.COUNT; i++) {
      pieceSeed.push({
        size: 0.86 + rand(i * 2.7 + 1) * 0.26,
        rot: (rand(i * 1.3 + 5) - 0.5) * 0.8,
        tint: rand(i * 9.1 + 3),
        squash: 0.80 + rand(i * 4.4) * 0.18,
      });
    }
    return layout;
  }

  function project(bx, by) {
    const persp = layout.backScale + (1 - layout.backScale) * by;
    const x = layout.cx + (bx - 0.5) * layout.halfW * 2 * persp;
    const y = layout.boardTop + layout.boardH * Math.pow(by, 1.02);
    return { x, y, s: persp };
  }

  function nodeScreen(i) { const p = B.POS[i]; return project(p.x, p.y); }

  // Nearest node to a screen point, within a tap radius.
  function pickNode(sx, sy) {
    let best = -1, bd = 1e9;
    for (let i = 0; i < B.COUNT; i++) {
      const p = nodeScreen(i);
      const d = (p.x - sx) ** 2 + (p.y - sy) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    const r = layout.unit * 0.55;
    return bd <= r * r ? best : -1;
  }

  /* ---------------- board chalk ---------------- */
  function drawSlate(ctx) {
    // bounding box of all nodes on screen
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (let i = 0; i < B.COUNT; i++) {
      const p = nodeScreen(i);
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    }
    const pad = layout.pieceR * 2.1;
    const x0 = minX - pad, y0 = minY - pad;
    const rw = (maxX + pad) - x0, rh = (maxY + pad) - y0;
    const rad = Math.min(rw, rh) * 0.09;

    ctx.save();
    // drop shadow onto the ground
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    roundRect(ctx, x0 + 10, y0 + 18, rw, rh, rad); ctx.fill();
    // slate body
    const g = ctx.createLinearGradient(0, y0, 0, y0 + rh);
    g.addColorStop(0, '#454c56'); g.addColorStop(0.5, '#2c323a'); g.addColorStop(1, '#191d23');
    ctx.fillStyle = g;
    roundRect(ctx, x0, y0, rw, rh, rad); ctx.fill();
    // marble veins
    ctx.save();
    roundRect(ctx, x0, y0, rw, rh, rad); ctx.clip();
    ctx.globalAlpha = 0.07; ctx.strokeStyle = '#cfd8e2'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let k = 0; k < 6; k++) {
      const yy = y0 + rh * (k + 0.5) / 6;
      ctx.beginPath();
      ctx.moveTo(x0, yy + Math.sin(k * 1.7) * 12);
      ctx.bezierCurveTo(x0 + rw * 0.33, yy - 16, x0 + rw * 0.66, yy + 16, x0 + rw, yy + Math.cos(k) * 12);
      ctx.stroke();
    }
    ctx.restore();
    // bevel: bright top edge, dark bottom edge
    ctx.strokeStyle = 'rgba(255,255,255,.13)'; ctx.lineWidth = 3;
    roundRect(ctx, x0 + 2, y0 + 2, rw - 4, rh - 4, rad); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 2;
    roundRect(ctx, x0, y0, rw, rh, rad); ctx.stroke();
    ctx.restore();
  }

  function drawBoard(ctx, view) {
    drawSlate(ctx);

    // chalk lines
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < B.EDGES.length; i++) {
      const [a, b] = B.EDGES[i];
      const pa = nodeScreen(a), pb = nodeScreen(b);
      const w = edgeWobble[i];
      const jitter = layout.unit * 0.04;
      // double stroke: dark groove then bright cool-white chalk
      for (let pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        for (let k = 0; k <= 6; k++) {
          const tt = k / 6;
          const x = pa.x + (pb.x - pa.x) * tt + w[k][0] * jitter;
          const y = pa.y + (pb.y - pa.y) * tt + w[k][1] * jitter;
          if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        if (pass === 0) { ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = layout.unit * 0.13; }
        else { ctx.strokeStyle = 'rgba(236,242,248,.95)'; ctx.lineWidth = layout.unit * 0.07; }
        ctx.stroke();
      }
    }
    // node marks
    for (let i = 0; i < B.COUNT; i++) {
      const p = nodeScreen(i);
      ctx.beginPath();
      ctx.fillStyle = 'rgba(236,242,248,.92)';
      ctx.arc(p.x, p.y, layout.unit * 0.055 * p.s + 1, 0, 7);
      ctx.fill();
    }
    ctx.restore();

    // highlights: selected + valid targets
    if (view.selected >= 0) {
      const p = nodeScreen(view.selected);
      const pulse = 0.5 + 0.5 * Math.sin(view.time * 6);
      ctx.save();
      ctx.strokeStyle = `rgba(255,214,120,${0.55 + 0.35 * pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, layout.pieceR * p.s * (1.5 + 0.12 * pulse), 0, 7);
      ctx.stroke();
      ctx.restore();
    }
    if (view.targets && view.targets.size) {
      const pulse = 0.5 + 0.5 * Math.sin(view.time * 5);
      for (const t of view.targets) {
        const p = nodeScreen(t);
        const isCap = view.captureTargets && view.captureTargets.has(t);
        ctx.save();
        const rr = layout.pieceR * p.s * (0.85 + 0.12 * pulse);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
        if (isCap) { g.addColorStop(0, 'rgba(255,120,70,.75)'); g.addColorStop(1, 'rgba(255,120,70,0)'); }
        else { g.addColorStop(0, 'rgba(150,230,120,.75)'); g.addColorStop(1, 'rgba(150,230,120,0)'); }
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, 7); ctx.fill();
        ctx.restore();
      }
    }
  }

  /* ---------------- pieces ---------------- */
  function drawShadow(ctx, x, y, r, s) {
    ctx.save();
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.6);
    g.addColorStop(0, 'rgba(30,18,6,.42)');
    g.addColorStop(1, 'rgba(30,18,6,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x + r * 0.18, y + r * 0.55, r * 1.35, r * 0.72, 0, 0, 7);
    ctx.fill();
    ctx.restore();
  }

  function drawGoat(ctx, x, y, r, seed, lift) {
    const R = r * seed.size;
    drawShadow(ctx, x, y + (lift || 0) * 0.4, R, 1);
    ctx.save();
    ctx.translate(x, y - (lift || 0));
    ctx.rotate(seed.rot);
    ctx.scale(1, seed.squash);
    const g = ctx.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.1, 0, 0, R * 1.1);
    const cool = 6 * seed.tint;
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.55, `rgb(${223 - cool},${230 - cool},${236 - cool})`);
    g.addColorStop(1, `rgb(${166 - cool},${178 - cool},${189 - cool})`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill();
    // subtle speckles + top gloss
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath(); ctx.ellipse(-R * 0.32, -R * 0.42, R * 0.34, R * 0.2, -0.5, 0, 7); ctx.fill();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#5c6672';
    for (let k = 0; k < 3; k++) {
      const a = seed.tint * 6 + k * 2.1;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * R * 0.4, Math.sin(a) * R * 0.4, R * 0.08, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  function drawTiger(ctx, x, y, r, seed, lift) {
    const R = r * 1.42; // tigers are the bigger, premium stones
    drawShadow(ctx, x, y + (lift || 0) * 0.4, R, 1);
    ctx.save();
    ctx.translate(x, y - (lift || 0));
    ctx.rotate(seed.rot * 0.5);
    ctx.scale(1, 0.84);
    const g = ctx.createRadialGradient(-R * 0.4, -R * 0.5, R * 0.1, 0, 0, R * 1.15);
    g.addColorStop(0, '#ffc85f');
    g.addColorStop(0.5, '#e17c1d');
    g.addColorStop(1, '#8a4408');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill();

    // engraved tiger stripes (carved grooves)
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, R * 0.96, 0, 7); ctx.clip();
    ctx.lineCap = 'round';
    for (let k = -2; k <= 2; k++) {
      const off = k * R * 0.34;
      // dark groove
      ctx.strokeStyle = 'rgba(90,38,0,.6)'; ctx.lineWidth = R * 0.13;
      ctx.beginPath();
      ctx.moveTo(off - R * 0.1, -R);
      ctx.quadraticCurveTo(off + R * 0.28, 0, off - R * 0.1, R);
      ctx.stroke();
      // bright highlight edge of the groove
      ctx.strokeStyle = 'rgba(255,224,150,.4)'; ctx.lineWidth = R * 0.05;
      ctx.beginPath();
      ctx.moveTo(off - R * 0.02, -R);
      ctx.quadraticCurveTo(off + R * 0.36, 0, off - R * 0.02, R);
      ctx.stroke();
    }
    ctx.restore();

    // polished gloss
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = 'rgba(255,245,220,.95)';
    ctx.beginPath(); ctx.ellipse(-R * 0.38, -R * 0.46, R * 0.34, R * 0.16, -0.5, 0, 7); ctx.fill();
    ctx.restore();
  }

  function drawPieces(ctx, view) {
    const s = view.state;
    const anim = view.anim;
    // draw back-to-front so nearer pieces overlap correctly
    const order = [];
    for (let i = 0; i < B.COUNT; i++) order.push(i);
    order.sort((a, b) => B.POS[a].y - B.POS[b].y);

    const moving = anim && anim.type === 'move';
    const fading = moving && anim.capFade != null;
    for (const i of order) {
      if (moving && i === anim.from) continue;      // moving piece drawn separately
      if (fading && i === anim.cap) continue;        // fading goat drawn separately
      const v = s.board[i];
      if (v === E.EMPTY) continue;
      const p = nodeScreen(i);
      if (v === E.GOAT) drawGoat(ctx, p.x, p.y, layout.pieceR * p.s, pieceSeed[i], 0);
      else drawTiger(ctx, p.x, p.y, layout.pieceR * p.s, pieceSeed[i], 0);
    }

    // captured goat fading out
    if (fading) {
      const p = nodeScreen(anim.cap);
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - anim.capFade);
      const sc = 1 - anim.capFade * 0.6;
      ctx.translate(p.x, p.y - anim.capFade * layout.unit * 0.3);
      ctx.scale(sc, sc);
      drawGoat(ctx, 0, 0, layout.pieceR * p.s, pieceSeed[anim.cap], 0);
      ctx.restore();
    }

    // the sliding / lifted piece
    if (moving) {
      const pa = nodeScreen(anim.from), pb = nodeScreen(anim.to);
      const tt = anim.ease;
      const x = pa.x + (pb.x - pa.x) * tt;
      const y = pa.y + (pb.y - pa.y) * tt;
      const s2 = pa.s + (pb.s - pa.s) * tt;
      const lift = Math.sin(tt * Math.PI) * layout.unit * (anim.piece === 'T' ? 0.28 : 0.4);
      if (anim.piece === 'G') drawGoat(ctx, x, y, layout.pieceR * s2, pieceSeed[anim.from], lift);
      else drawTiger(ctx, x, y, layout.pieceR * s2, pieceSeed[anim.from], lift);
    }

    // a goat being newly placed (drops from above)
    if (anim && anim.type === 'place') {
      const p = nodeScreen(anim.placeAt);
      const drop = (1 - anim.ease) * layout.unit * 2.2;
      const sc = 0.6 + anim.ease * 0.4;
      ctx.save(); ctx.globalAlpha = Math.min(1, anim.ease * 1.6 + 0.2);
      drawGoat(ctx, p.x, p.y - drop, layout.pieceR * p.s * sc, pieceSeed[anim.placeAt], 0);
      ctx.restore();
    }
  }

  window.RENDER = {
    computeLayout, project, nodeScreen, pickNode, drawBoard, drawPieces,
    get layout() { return layout; },
    getPieceSeed: (i) => pieceSeed[i],
  };
})();
