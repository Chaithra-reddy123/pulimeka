/* ============================================================
   scene.js — a clean, realistic setting so the focus stays on
   the board: a dark walnut wooden table lit by a soft overhead
   light, with a vignette. The heavy static texture is baked to
   an offscreen canvas once; only the little dust puffs (move
   feedback) are drawn live.
   Exposes `SCENE` with the same function names game.js expects.
   ============================================================ */
(function () {
  let off = null, offCtx = null;
  let W = 0, H = 0, DPR = 1, L = null;
  let seedRng = mulberry32(1337);
  let dust = [];

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

  /* ================= BUILD (baked wooden table) ================= */
  function build(w, h, dpr, layout) {
    W = w; H = h; DPR = dpr; L = layout;
    seedRng = mulberry32(20240724);

    off = document.createElement('canvas');
    off.width = Math.max(1, Math.floor(w * dpr));
    off.height = Math.max(1, Math.floor(h * dpr));
    offCtx = off.getContext('2d');
    offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    paintTable(offCtx);
    dust = [];
  }

  function paintTable(c) {
    // base walnut
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#4f3620');
    g.addColorStop(0.5, '#5e4127');
    g.addColorStop(1, '#3c2815');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);

    // long plank seams
    const plankW = Math.max(120, W / 5);
    for (let x = plankW; x < W; x += plankW) {
      const jx = x + rr(-8, 8);
      c.fillStyle = 'rgba(0,0,0,.30)';
      c.fillRect(jx - 1.5, 0, 3, H);
      c.fillStyle = 'rgba(255,220,170,.05)';
      c.fillRect(jx + 1.5, 0, 1, H);
    }

    // flowing wood grain
    for (let i = 0; i < 520; i++) {
      const x = rr(0, W), y = rr(0, H);
      const len = rr(80, 260);
      c.strokeStyle = R() > 0.5 ? 'rgba(45,28,12,.16)' : 'rgba(125,88,52,.10)';
      c.lineWidth = rr(0.6, 1.6);
      c.beginPath();
      c.moveTo(x, y);
      c.bezierCurveTo(x + len * 0.3, y + rr(-4, 4), x + len * 0.7, y + rr(-4, 4), x + len, y + rr(-3, 3));
      c.stroke();
    }

    // a few knots
    for (let i = 0; i < 5; i++) {
      const x = rr(W * 0.05, W * 0.95), y = rr(H * 0.05, H * 0.95), rad = rr(7, 15);
      const kg = c.createRadialGradient(x, y, 1, x, y, rad);
      kg.addColorStop(0, 'rgba(35,20,8,.55)');
      kg.addColorStop(0.6, 'rgba(60,38,18,.3)');
      kg.addColorStop(1, 'rgba(60,38,18,0)');
      c.fillStyle = kg;
      c.beginPath(); c.ellipse(x, y, rad, rad * 0.72, rr(0, 3), 0, 7); c.fill();
    }

    // soft overhead light pool
    const lx = W * 0.5, ly = H * 0.34;
    const light = c.createRadialGradient(lx, ly, 20, lx, ly, Math.max(W, H) * 0.8);
    light.addColorStop(0, 'rgba(255,240,210,.24)');
    light.addColorStop(0.5, 'rgba(255,236,200,.07)');
    light.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = light; c.fillRect(0, 0, W, H);

    // vignette for focus
    const vg = c.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.28, W * 0.5, H * 0.56, Math.max(W, H) * 0.8);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.55)');
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
  }

  /* ================= live dust (move feedback) ================= */
  function update(dt) {
    for (const d of dust) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 20 * dt; d.life -= dt; }
    dust = dust.filter((d) => d.life > 0);
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
      c.fillStyle = '#d8c19a';
      c.beginPath(); c.arc(d.x, d.y, d.size, 0, 7); c.fill();
    }
    c.globalAlpha = 1;
  }

  // The village extras are gone; keep the names as no-ops so game.js
  // can call them unconditionally.
  function noop() {}

  window.SCENE = {
    build, update, spawnDust,
    drawStatic, drawDust,
    drawDapples: noop, drawCanopy: noop, drawFliers: noop, drawVillagers: noop,
  };
})();
