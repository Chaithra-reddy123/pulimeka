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
    // How big a piece is relative to the board width (used to keep the
    // outermost triangle tips + their pieces fully on-screen).
    const kPiece = B.UNIT_N * 0.29;
    // Desired size, then clamped so nothing (point OR the piece drawn on
    // it) can ever spill off the left/right edge — that was what made the
    // corner tips impossible to tap before.
    let boardW = Math.min(w * (portrait ? 0.94 : 0.66), (h * (portrait ? 0.56 : 0.54)) / B.ASPECT);
    boardW = Math.min(boardW, (w / 2 - 8) / (0.5 + kPiece));
    const halfW = boardW / 2;
    const boardH = boardW * B.ASPECT;
    const boardTop = h * (portrait ? 0.35 : 0.30);
    const boardBottom = boardTop + boardH;
    const backScale = 0.86;
    const unit = boardW * B.UNIT_N;
    layout = {
      w, h, cx, halfW, boardTop, boardBottom, boardH, backScale, unit,
      horizon: h * (portrait ? 0.30 : 0.24),
      pieceR: unit * 0.29,
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
    // soft contact shadow of the slab on the table
    ctx.save();
    ctx.filter = 'blur(6px)';
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    roundRect(ctx, x0 + 6, y0 + 16, rw, rh, rad); ctx.fill();
    ctx.restore();

    // slate body
    const g = ctx.createLinearGradient(0, y0, 0, y0 + rh);
    g.addColorStop(0, '#484f5a'); g.addColorStop(0.5, '#2d333c'); g.addColorStop(1, '#171b21');
    ctx.fillStyle = g;
    roundRect(ctx, x0, y0, rw, rh, rad); ctx.fill();

    ctx.save();
    roundRect(ctx, x0, y0, rw, rh, rad); ctx.clip();

    // fine stone speckle / grain
    for (let i = 0; i < 900; i++) {
      const px = x0 + rand(i * 1.7) * rw;
      const py = y0 + rand(i * 2.3 + 5) * rh;
      const t = rand(i * 3.1 + 9);
      ctx.globalAlpha = 0.03 + t * 0.06;
      ctx.fillStyle = t > 0.5 ? '#aeb8c4' : '#0d1014';
      const sz = 0.6 + t * 1.8;
      ctx.beginPath(); ctx.ellipse(px, py, sz, sz * 0.7, t * 6, 0, 7); ctx.fill();
    }
    // cleaved layer bands (slate splits in sheets)
    ctx.globalAlpha = 0.05; ctx.strokeStyle = '#c3ccd6'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    for (let k = 0; k < 7; k++) {
      const yy = y0 + rh * (k + 0.5) / 7;
      ctx.beginPath(); ctx.moveTo(x0, yy + Math.sin(k * 1.7) * 10);
      ctx.bezierCurveTo(x0 + rw * 0.33, yy - 14, x0 + rw * 0.66, yy + 14, x0 + rw, yy + Math.cos(k) * 10);
      ctx.stroke();
    }
    // a couple of hairline cracks
    ctx.globalAlpha = 0.28; ctx.strokeStyle = '#0b0e12'; ctx.lineWidth = 1.4;
    for (let k = 0; k < 3; k++) {
      let cx = x0 + rand(k * 12 + 3) * rw, cy = y0 + rand(k * 7 + 1) * rh;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      for (let s = 0; s < 5; s++) { cx += (rand(k * 5 + s) - 0.5) * rw * 0.18; cy += (rand(k * 9 + s) - 0.4) * rh * 0.16; ctx.lineTo(cx, cy); }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // top sheen from the overhead light
    const sheen = ctx.createLinearGradient(0, y0, 0, y0 + rh * 0.5);
    sheen.addColorStop(0, 'rgba(255,255,255,.07)'); sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen; ctx.fillRect(x0, y0, rw, rh * 0.5);
    ctx.restore();

    // bevel: bright top edge, dark bottom edge
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 3;
    roundRect(ctx, x0 + 2, y0 + 2, rw - 4, rh - 4, rad); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 2.5;
    roundRect(ctx, x0, y0, rw, rh, rad); ctx.stroke();
    ctx.restore();
  }

  function drawBoard(ctx, view) {
    drawSlate(ctx);

    // lines carved (engraved) into the slate and filled with a pale
    // mineral inlay: dark recessed groove + lit top lip + inlay core.
    ctx.save();
    ctx.lineCap = 'round';
    const dpt = layout.unit * 0.04; // carved depth in px
    // pass 0: dark recess (offset slightly down)
    // pass 1: bright top lip (offset slightly up)
    // pass 2: pale inlay core (centred)
    const passes = [
      { yoff: dpt, color: 'rgba(0,0,0,.5)', wmul: 0.14 },
      { yoff: -dpt, color: 'rgba(190,200,212,.28)', wmul: 0.11 },
      { yoff: 0, color: 'rgba(222,230,238,.92)', wmul: 0.075 },
    ];
    for (let i = 0; i < B.EDGES.length; i++) {
      const [a, b] = B.EDGES[i];
      const pa = nodeScreen(a), pb = nodeScreen(b);
      const w = edgeWobble[i];
      const jitter = layout.unit * 0.03;
      for (const ps of passes) {
        ctx.beginPath();
        for (let k = 0; k <= 6; k++) {
          const tt = k / 6;
          const x = pa.x + (pb.x - pa.x) * tt + w[k][0] * jitter;
          const y = pa.y + (pb.y - pa.y) * tt + w[k][1] * jitter + ps.yoff;
          if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = ps.color; ctx.lineWidth = layout.unit * ps.wmul;
        ctx.stroke();
      }
    }
    // node marks — small carved dimples with a pale inlaid dot
    for (let i = 0; i < B.COUNT; i++) {
      const p = nodeScreen(i);
      const rr0 = layout.unit * 0.06 * p.s + 1;
      ctx.beginPath(); ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.arc(p.x, p.y + 1, rr0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.fillStyle = 'rgba(226,233,240,.95)';
      ctx.arc(p.x, p.y, rr0 * 0.8, 0, 7); ctx.fill();
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
  // Contact shadow: a tight dark core (ambient occlusion where the
  // stone meets the board) plus a soft cast shadow to the lower-right.
  function drawShadow(ctx, x, y, r, lift) {
    ctx.save();
    const off = (lift || 0) * 0.5;
    // soft cast shadow (further when the piece is lifted)
    const g = ctx.createRadialGradient(x, y + r * 0.5, 0, x, y + r * 0.5, r * 1.7);
    g.addColorStop(0, `rgba(10,8,4,${0.4 - Math.min(0.25, off / (r * 8))})`);
    g.addColorStop(1, 'rgba(10,8,4,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x + r * 0.22 + off * 0.4, y + r * 0.58 + off, r * (1.35 + off / r), r * 0.66, 0, 0, 7);
    ctx.fill();
    // tight contact core (only when resting)
    if (off < r * 0.6) {
      ctx.globalAlpha = 0.5 * (1 - off / (r * 0.6));
      const gc = ctx.createRadialGradient(x, y + r * 0.72, 0, x, y + r * 0.72, r * 0.8);
      gc.addColorStop(0, 'rgba(0,0,0,.7)'); gc.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gc;
      ctx.beginPath(); ctx.ellipse(x, y + r * 0.72, r * 0.8, r * 0.34, 0, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  // Smooth polished river pebble: pale grey stone, top-lit, with a
  // crisp specular glint and a darker rim (form shadow).
  function drawGoat(ctx, x, y, r, seed, lift) {
    const R = r * seed.size;
    drawShadow(ctx, x, y, R, lift);
    ctx.save();
    ctx.translate(x, y - (lift || 0));
    ctx.rotate(seed.rot);
    ctx.scale(1, seed.squash * 0.96);
    const cool = 8 * seed.tint;
    const g = ctx.createRadialGradient(-R * 0.34, -R * 0.42, R * 0.05, R * 0.1, R * 0.15, R * 1.2);
    g.addColorStop(0, '#fdfefe');
    g.addColorStop(0.45, `rgb(${226 - cool},${231 - cool},${236 - cool})`);
    g.addColorStop(0.82, `rgb(${182 - cool},${190 - cool},${199 - cool})`);
    g.addColorStop(1, `rgb(${120 - cool},${130 - cool},${140 - cool})`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill();
    // faint mineral mottling
    ctx.globalAlpha = 0.10; ctx.fillStyle = '#5c6672';
    for (let k = 0; k < 4; k++) {
      const a = seed.tint * 6 + k * 1.7;
      ctx.beginPath(); ctx.ellipse(Math.cos(a) * R * 0.42, Math.sin(a) * R * 0.42, R * 0.13, R * 0.08, a, 0, 7); ctx.fill();
    }
    // dark form-shadow rim (lower-right)
    ctx.globalAlpha = 1;
    ctx.lineWidth = R * 0.10; ctx.strokeStyle = 'rgba(70,80,92,.35)';
    ctx.beginPath(); ctx.arc(0, 0, R * 0.94, 0.15 * Math.PI, 0.95 * Math.PI); ctx.stroke();
    // broad soft sheen + tight specular glint
    ctx.globalAlpha = 0.55; ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath(); ctx.ellipse(-R * 0.34, -R * 0.4, R * 0.36, R * 0.22, -0.5, 0, 7); ctx.fill();
    ctx.globalAlpha = 0.95; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(-R * 0.4, -R * 0.46, R * 0.12, R * 0.07, -0.5, 0, 7); ctx.fill();
    ctx.restore();
  }

  // Polished tiger-eye cabochon: warm amber-brown with chatoyant
  // golden bands and a glossy highlight.
  function drawTiger(ctx, x, y, r, seed, lift) {
    const R = r * 1.26; // tigers are the bigger, premium stones
    drawShadow(ctx, x, y, R, lift);
    ctx.save();
    ctx.translate(x, y - (lift || 0));
    ctx.rotate(seed.rot * 0.5);
    ctx.scale(1, 0.9);
    const g = ctx.createRadialGradient(-R * 0.36, -R * 0.46, R * 0.05, R * 0.1, R * 0.12, R * 1.2);
    g.addColorStop(0, '#ffd27a');
    g.addColorStop(0.4, '#d98a2f');
    g.addColorStop(0.78, '#8a4a12');
    g.addColorStop(1, '#3f1f06');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill();

    // chatoyant tiger-eye bands (fine golden fibres) angled across
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, R * 0.97, 0, 7); ctx.clip();
    ctx.rotate(-0.5 + seed.tint * 0.6);
    ctx.lineCap = 'round';
    for (let k = -5; k <= 5; k++) {
      const off = k * R * 0.16;
      const bright = 0.12 + 0.16 * (1 - Math.abs(k) / 6);
      ctx.strokeStyle = `rgba(255,214,120,${bright})`;
      ctx.lineWidth = R * 0.05;
      ctx.beginPath(); ctx.moveTo(off, -R * 1.1); ctx.lineTo(off + R * 0.12, R * 1.1); ctx.stroke();
      ctx.strokeStyle = 'rgba(60,26,4,.18)'; ctx.lineWidth = R * 0.03;
      ctx.beginPath(); ctx.moveTo(off + R * 0.09, -R * 1.1); ctx.lineTo(off + R * 0.21, R * 1.1); ctx.stroke();
    }
    ctx.restore();

    // dark form-shadow rim + glossy specular
    ctx.lineWidth = R * 0.10; ctx.strokeStyle = 'rgba(50,22,4,.4)';
    ctx.beginPath(); ctx.arc(0, 0, R * 0.93, 0.12 * Math.PI, 0.96 * Math.PI); ctx.stroke();
    ctx.globalAlpha = 0.5; ctx.fillStyle = 'rgba(255,246,220,.95)';
    ctx.beginPath(); ctx.ellipse(-R * 0.36, -R * 0.44, R * 0.34, R * 0.17, -0.5, 0, 7); ctx.fill();
    ctx.globalAlpha = 0.95; ctx.fillStyle = '#fffaf0';
    ctx.beginPath(); ctx.ellipse(-R * 0.42, -R * 0.5, R * 0.12, R * 0.07, -0.5, 0, 7); ctx.fill();
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
