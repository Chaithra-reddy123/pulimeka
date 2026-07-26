/* ============================================================
   scene.js — a warm Indian-village setting so the game is played
   "under the old banyan tree": hazy dawn sky, distant hills, a
   couple of thatched huts, a big banyan whose canopy frames the
   top of the screen, sunlight dapples on the packed-earth ground,
   gliding birds and a few butterflies. The heavy static scenery is
   baked once to an offscreen canvas; only the living things
   (birds, butterflies, dapple shimmer, move dust) are drawn live.
   Exposes `SCENE` with the function names game.js expects.
   ============================================================ */
(function () {
  let off = null, offCtx = null;
  let W = 0, H = 0, DPR = 1, L = null;
  let seedRng = mulberry32(1337);
  let dust = [], birds = [], flutters = [], dapples = [], canopy = [];
  let horizon = 0, groundTop = 0;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const R = () => seedRng();
  const rr = (a, b) => a + (b - a) * seedRng();

  /* ================= BUILD ================= */
  function build(w, h, dpr, layout) {
    W = w; H = h; DPR = dpr; L = layout;
    seedRng = mulberry32(77123);
    horizon = layout ? layout.horizon : h * 0.30;
    groundTop = horizon;

    off = document.createElement('canvas');
    off.width = Math.max(1, Math.floor(w * dpr));
    off.height = Math.max(1, Math.floor(h * dpr));
    offCtx = off.getContext('2d');
    offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    paintVillage(offCtx);

    dust = [];
    initCanopy();
    initDapples();
    initFliers();
  }

  /* ---------------- baked scenery ---------------- */
  function paintVillage(c) {
    // --- sky: hazy warm dawn ---
    const sky = c.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#a9d4e8');
    sky.addColorStop(0.55, '#cfe6df');
    sky.addColorStop(1, '#f6e6b8');
    c.fillStyle = sky;
    c.fillRect(0, 0, W, horizon + 4);

    // soft sun glow near the horizon
    const sg = c.createRadialGradient(W * 0.72, horizon * 0.72, 6, W * 0.72, horizon * 0.72, horizon * 1.1);
    sg.addColorStop(0, 'rgba(255,248,214,.85)');
    sg.addColorStop(0.4, 'rgba(255,240,190,.35)');
    sg.addColorStop(1, 'rgba(255,240,190,0)');
    c.fillStyle = sg;
    c.fillRect(0, 0, W, horizon + 20);

    // --- distant hills ---
    hill(c, horizon, 0.06, '#9db877', 0.9);
    hill(c, horizon, 0.11, '#8aa869', 1.0);

    // --- huts on the far left ---
    hut(c, W * 0.16, horizon - 4, W * 0.115);
    hut(c, W * 0.30, horizon - 2, W * 0.085);

    // --- ground: packed warm earth receding to the viewer ---
    const gnd = c.createLinearGradient(0, horizon - 6, 0, H);
    gnd.addColorStop(0, '#c39a5e');
    gnd.addColorStop(0.32, '#b3854a');
    gnd.addColorStop(1, '#8a6234');
    c.fillStyle = gnd;
    c.fillRect(0, horizon - 6, W, H - horizon + 6);

    // subtle earth mottle / pebbles
    for (let i = 0; i < 260; i++) {
      const y = rr(horizon, H);
      const t = (y - horizon) / (H - horizon);
      const x = rr(0, W);
      c.fillStyle = R() > 0.5 ? 'rgba(90,60,28,.10)' : 'rgba(255,236,200,.07)';
      const s = rr(1, 2.4) * (0.6 + t);
      c.beginPath(); c.ellipse(x, y, s * 1.6, s, 0, 0, 7); c.fill();
    }
    // a faint worn play-circle where the board will sit
    if (L) {
      const cy = (L.boardTop + L.boardBottom) / 2;
      const rgd = c.createRadialGradient(L.cx, cy, 10, L.cx, cy, L.halfW * 1.5);
      rgd.addColorStop(0, 'rgba(70,46,20,.16)');
      rgd.addColorStop(1, 'rgba(70,46,20,0)');
      c.fillStyle = rgd;
      c.beginPath(); c.ellipse(L.cx, cy + L.boardH * 0.12, L.halfW * 1.5, L.boardH * 0.9, 0, 0, 7); c.fill();
    }

    // --- big banyan trunk on the right, roots hanging from the canopy ---
    banyanTrunk(c);

    // gentle top vignette so the canopy feels shady
    const vg = c.createLinearGradient(0, 0, 0, H);
    vg.addColorStop(0, 'rgba(20,30,12,.34)');
    vg.addColorStop(0.16, 'rgba(20,30,12,0)');
    vg.addColorStop(0.86, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(20,10,0,.30)');
    c.fillStyle = vg;
    c.fillRect(0, 0, W, H);
  }

  function hill(c, base, amp, color, spread) {
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(0, base);
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const x = (W * i) / steps;
      const y = base - H * amp * (0.5 + 0.5 * Math.sin(i * 1.3 + spread * 2)) - 4;
      c.lineTo(x, y);
    }
    c.lineTo(W, base); c.closePath(); c.fill();
  }

  function hut(c, x, baseY, w) {
    const wallH = w * 0.52, roofH = w * 0.6;
    // wall
    c.fillStyle = '#c9a877';
    c.fillRect(x - w / 2, baseY - wallH, w, wallH);
    c.fillStyle = 'rgba(0,0,0,.12)';
    c.fillRect(x - w / 2, baseY - wallH, w, wallH * 0.16);
    // door
    c.fillStyle = '#5a3c1f';
    c.fillRect(x - w * 0.12, baseY - wallH * 0.7, w * 0.24, wallH * 0.7);
    // thatched roof
    c.fillStyle = '#8a6a3a';
    c.beginPath();
    c.moveTo(x - w * 0.62, baseY - wallH);
    c.lineTo(x, baseY - wallH - roofH);
    c.lineTo(x + w * 0.62, baseY - wallH);
    c.closePath(); c.fill();
    c.strokeStyle = 'rgba(60,40,18,.35)'; c.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const t = i / 5;
      c.beginPath();
      c.moveTo(x - w * 0.62 * (1 - t), baseY - wallH - roofH * t);
      c.lineTo(x + w * 0.62 * (1 - t), baseY - wallH - roofH * t);
      c.stroke();
    }
  }

  function banyanTrunk(c) {
    const bx = W * 0.90, top = horizon * 0.4, bot = H * 0.86;
    const wTop = W * 0.05, wBot = W * 0.14;
    // main trunk
    const tg = c.createLinearGradient(bx - wBot, 0, bx + wTop, 0);
    tg.addColorStop(0, '#4a3218');
    tg.addColorStop(0.5, '#6b4a24');
    tg.addColorStop(1, '#3c280f');
    c.fillStyle = tg;
    c.beginPath();
    c.moveTo(bx - wTop, top);
    c.bezierCurveTo(bx - wTop * 1.4, (top + bot) / 2, bx - wBot * 0.7, bot - 40, bx - wBot, bot);
    c.lineTo(W + 20, bot);
    c.lineTo(W + 20, top);
    c.closePath(); c.fill();
    // bark grooves
    c.strokeStyle = 'rgba(30,18,6,.4)'; c.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const gx = bx - wBot * 0.6 + i * (wBot / 5);
      c.beginPath();
      c.moveTo(gx, top + 10);
      c.bezierCurveTo(gx - 8, (top + bot) / 2, gx + 6, bot - 60, gx - 4, bot);
      c.stroke();
    }
    // a few aerial roots hanging from the canopy
    c.strokeStyle = 'rgba(60,40,18,.55)';
    for (let i = 0; i < 7; i++) {
      const rx = rr(W * 0.55, W * 0.95);
      const rlen = rr(horizon * 0.5, horizon * 1.5);
      c.lineWidth = rr(1.5, 3.5);
      c.beginPath();
      c.moveTo(rx, horizon * 0.2);
      c.quadraticCurveTo(rx + rr(-6, 6), horizon * 0.2 + rlen * 0.6, rx + rr(-4, 4), horizon * 0.2 + rlen);
      c.stroke();
    }
  }

  /* ---------------- canopy (overhead leaves, live sway) ---------------- */
  function initCanopy() {
    canopy = [];
    // clusters framing the top edge like sitting beneath the tree
    const n = 26;
    for (let i = 0; i < n; i++) {
      const edge = R();
      let x, y;
      // bias to top band and the two upper corners
      x = rr(-20, W + 20);
      y = rr(-30, horizon * 0.72);
      // heavier on the right (trunk side) and along the very top
      if (x > W * 0.6) y = rr(-30, horizon * 0.95);
      canopy.push({
        x, y, r: rr(34, 88),
        hue: 90 + rr(-14, 18), light: rr(24, 40),
        sway: rr(0, 6.28), swaySpd: rr(0.3, 0.7), amp: rr(3, 8),
      });
    }
  }

  function drawCanopy(c) {
    const t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    for (const l of canopy) {
      const dx = Math.sin(t * l.swaySpd + l.sway) * l.amp;
      const dy = Math.cos(t * l.swaySpd * 0.8 + l.sway) * l.amp * 0.4;
      const g = c.createRadialGradient(l.x + dx, l.y + dy, l.r * 0.2, l.x + dx, l.y + dy, l.r);
      g.addColorStop(0, `hsla(${l.hue},46%,${l.light + 8}%,.96)`);
      g.addColorStop(0.7, `hsla(${l.hue},50%,${l.light}%,.95)`);
      g.addColorStop(1, `hsla(${l.hue},52%,${l.light - 8}%,0)`);
      c.fillStyle = g;
      c.beginPath(); c.arc(l.x + dx, l.y + dy, l.r, 0, 7); c.fill();
    }
  }

  /* ---------------- sun dapples on the ground ---------------- */
  function initDapples() {
    dapples = [];
    const n = 22;
    for (let i = 0; i < n; i++) {
      dapples.push({
        x: rr(0, W), y: rr(horizon + 10, H),
        r: rr(8, 26), ph: rr(0, 6.28), spd: rr(0.4, 1.1),
      });
    }
  }

  function drawDapples(c) {
    const t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const d of dapples) {
      const a = 0.05 + 0.05 * (0.5 + 0.5 * Math.sin(t * d.spd + d.ph));
      const g = c.createRadialGradient(d.x, d.y, 1, d.x, d.y, d.r);
      g.addColorStop(0, `rgba(255,244,200,${a})`);
      g.addColorStop(1, 'rgba(255,244,200,0)');
      c.fillStyle = g;
      c.beginPath(); c.ellipse(d.x, d.y, d.r * 1.4, d.r, 0, 0, 7); c.fill();
    }
    c.restore();
  }

  /* ---------------- birds + butterflies ---------------- */
  function initFliers() {
    birds = [];
    for (let i = 0; i < 5; i++) {
      birds.push({
        x: rr(0, W), y: rr(horizon * 0.15, horizon * 0.7),
        sp: rr(22, 46) * (R() > 0.5 ? 1 : -1),
        sc: rr(0.7, 1.3), ph: rr(0, 6.28),
      });
    }
    flutters = [];
    for (let i = 0; i < 4; i++) {
      flutters.push({
        x: rr(W * 0.2, W * 0.8), y: rr(horizon + 30, H * 0.8),
        vx: rr(-14, 14), vy: rr(-8, 8), ph: rr(0, 6.28),
        hue: rr(20, 55), sc: rr(0.7, 1.1),
      });
    }
  }

  function drawFliers(c) {
    const t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    // birds — distant silhouettes gliding, wings flapping
    c.strokeStyle = 'rgba(40,40,50,.7)';
    c.lineCap = 'round';
    for (const b of birds) {
      const flap = Math.sin(t * 6 + b.ph) * 0.5 + 0.4;
      const s = 8 * b.sc;
      c.lineWidth = 2 * b.sc;
      c.beginPath();
      c.moveTo(b.x - s, b.y + s * flap);
      c.quadraticCurveTo(b.x, b.y - s * 0.2, b.x, b.y);
      c.quadraticCurveTo(b.x, b.y - s * 0.2, b.x + s, b.y + s * flap);
      c.stroke();
    }
    // butterflies near the board
    for (const f of flutters) {
      const beat = Math.sin(t * 12 + f.ph);
      const wing = 5 * f.sc, open = 0.4 + 0.6 * Math.abs(beat);
      c.fillStyle = `hsla(${f.hue},80%,60%,.9)`;
      c.beginPath(); c.ellipse(f.x - wing * open, f.y, wing * open, wing, -0.4, 0, 7); c.fill();
      c.beginPath(); c.ellipse(f.x + wing * open, f.y, wing * open, wing, 0.4, 0, 7); c.fill();
      c.fillStyle = 'rgba(40,25,10,.8)';
      c.fillRect(f.x - 0.6, f.y - wing, 1.2, wing * 2);
    }
  }

  /* ---------------- villagers (subtle, seated near huts) ---------------- */
  function drawVillagers(c, time) {
    // two small seated silhouettes resting by the huts — kept faint and
    // distant so they never distract from the board.
    seatedFigure(c, W * 0.10, horizon - 2, 0.9, '#5a3b6a');
    seatedFigure(c, W * 0.235, horizon - 1, 0.8, '#7a4a2a');
  }

  function seatedFigure(c, x, baseY, sc, cloth) {
    const s = 16 * sc;
    c.fillStyle = cloth;
    c.beginPath(); c.ellipse(x, baseY - s * 0.35, s * 0.6, s * 0.5, 0, 0, 7); c.fill();
    c.fillStyle = '#8a5a34';
    c.beginPath(); c.arc(x, baseY - s * 0.95, s * 0.28, 0, 7); c.fill();
  }

  /* ================= live dust (move feedback) ================= */
  function update(dt) {
    for (const d of dust) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 20 * dt; d.life -= dt; }
    dust = dust.filter((d) => d.life > 0);

    for (const b of birds) {
      b.x += b.sp * dt;
      if (b.x < -30) b.x = W + 30;
      if (b.x > W + 30) b.x = -30;
    }
    for (const f of flutters) {
      f.x += f.vx * dt; f.y += f.vy * dt;
      f.vx += Math.sin(f.ph + f.y * 0.03) * 6 * dt;
      f.vy += Math.cos(f.ph + f.x * 0.03) * 6 * dt;
      f.vx = Math.max(-22, Math.min(22, f.vx));
      f.vy = Math.max(-16, Math.min(16, f.vy));
      if (f.x < W * 0.1) f.vx = Math.abs(f.vx);
      if (f.x > W * 0.9) f.vx = -Math.abs(f.vx);
      if (f.y < horizon + 20) f.vy = Math.abs(f.vy);
      if (f.y > H * 0.85) f.vy = -Math.abs(f.vy);
    }
  }

  function spawnDust(x, y, n) {
    for (let i = 0; i < (n || 8); i++) {
      dust.push({
        x, y, vx: rr(-40, 40), vy: rr(-30, -6),
        life: rr(0.4, 0.9), max: 0.9, size: rr(2, 5),
      });
    }
  }

  /* ================= DRAW ================= */
  function drawStatic(c) { c.drawImage(off, 0, 0, W, H); }

  function drawDust(c) {
    for (const d of dust) {
      c.globalAlpha = Math.max(0, d.life / d.max) * 0.5;
      c.fillStyle = '#e6cc9a';
      c.beginPath(); c.arc(d.x, d.y, d.size, 0, 7); c.fill();
    }
    c.globalAlpha = 1;
  }

  window.SCENE = {
    build, update, spawnDust,
    drawStatic, drawDust,
    drawDapples, drawCanopy, drawFliers, drawVillagers,
  };
})();
