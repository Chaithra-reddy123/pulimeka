/* ============================================================
   scene.js — the living Indian village: warm sky, mud ground,
   huts, pond, coconut trees, a great banyan tree, seated
   villagers, and ambient life (leaves, butterflies, dragonflies,
   birds, dust). Static parts are baked to an offscreen canvas
   for a smooth 60fps; living parts are drawn each frame.
   Exposes `SCENE`.
   ============================================================ */
(function () {
  let off = null, offCtx = null;
  let W = 0, H = 0, DPR = 1, L = null;
  let seedRng = mulberry32(1337);

  // living things
  let leaves = [], flutterers = [], birds = [], dust = [];
  let wind = 0, dapplePhase = 0, birdTimer = 3;
  let decorGrass = [], banyan = null;

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

  /* ================= BUILD (static baked layer) ================= */
  function build(w, h, dpr, layout) {
    W = w; H = h; DPR = dpr; L = layout;
    seedRng = mulberry32(20240724);

    off = document.createElement('canvas');
    off.width = Math.max(1, Math.floor(w * dpr));
    off.height = Math.max(1, Math.floor(h * dpr));
    offCtx = off.getContext('2d');
    offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const c = offCtx;

    paintSky(c);
    paintDistance(c);
    paintGround(c);
    paintBanyanTrunk(c);
    paintGrassAndLitter(c);

    // banyan geometry for the live canopy
    banyan = {
      cx: w * 0.5, top: 0, base: L.horizon * 0.98,
      spread: Math.max(w * 0.62, 420),
    };

    // init living things
    leaves = []; for (let i = 0; i < 16; i++) leaves.push(newLeaf(true));
    flutterers = [];
    for (let i = 0; i < 5; i++) flutterers.push(newFlutterer('butterfly'));
    for (let i = 0; i < 2; i++) flutterers.push(newFlutterer('dragonfly'));
    birds = []; dust = []; birdTimer = 2;
  }

  function paintSky(c) {
    const g = c.createLinearGradient(0, 0, 0, L.horizon + 40);
    g.addColorStop(0, '#a9c9d6');
    g.addColorStop(0.45, '#d9dcc0');
    g.addColorStop(0.8, '#f4dfa4');
    g.addColorStop(1, '#f6e6b8');
    c.fillStyle = g;
    c.fillRect(0, 0, W, L.horizon + 40);
    // warm afternoon sun glow
    const sx = W * 0.74, sy = L.horizon * 0.42;
    const sun = c.createRadialGradient(sx, sy, 0, sx, sy, Math.max(W, H) * 0.5);
    sun.addColorStop(0, 'rgba(255,246,214,.95)');
    sun.addColorStop(0.15, 'rgba(255,236,175,.55)');
    sun.addColorStop(0.5, 'rgba(255,225,150,.12)');
    sun.addColorStop(1, 'rgba(255,225,150,0)');
    c.fillStyle = sun; c.fillRect(0, 0, W, L.horizon + 60);
    c.beginPath(); c.fillStyle = 'rgba(255,252,235,.95)';
    c.arc(sx, sy, Math.min(W, H) * 0.045, 0, 7); c.fill();
  }

  function paintDistance(c) {
    // far hills
    for (let layer = 0; layer < 2; layer++) {
      c.beginPath();
      const base = L.horizon - 6 + layer * 10;
      c.moveTo(0, base);
      const cols = ['#9fb08a', '#8aa07a'][layer];
      let x = 0;
      while (x <= W) {
        const hgt = 18 + Math.sin(x * 0.01 + layer) * 12 + rr(0, 14);
        c.lineTo(x, base - hgt);
        x += 40;
      }
      c.lineTo(W, base); c.lineTo(W, base + 40); c.lineTo(0, base + 40); c.closePath();
      c.globalAlpha = 0.55 - layer * 0.1; c.fillStyle = cols; c.fill(); c.globalAlpha = 1;
    }

    // village pond
    const pcx = W * 0.24, pcy = L.horizon - 4, pw = Math.min(W * 0.2, 150), ph = pw * 0.28;
    const pg = c.createRadialGradient(pcx, pcy, 2, pcx, pcy, pw);
    pg.addColorStop(0, '#bfe0e6'); pg.addColorStop(0.6, '#8fc2cf'); pg.addColorStop(1, '#6ea6b3');
    c.fillStyle = pg; c.beginPath(); c.ellipse(pcx, pcy, pw, ph, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(90,70,40,.4)'; c.lineWidth = 2; c.stroke();
    c.globalAlpha = 0.35; c.fillStyle = '#fff';
    c.beginPath(); c.ellipse(pcx - pw * 0.2, pcy - ph * 0.2, pw * 0.4, ph * 0.25, 0, 0, 7); c.fill();
    c.globalAlpha = 1;

    // huts
    hut(c, W * 0.10, L.horizon - 12, 46);
    hut(c, W * 0.155, L.horizon - 6, 60);
    hut(c, W * 0.87, L.horizon - 10, 52);

    // coconut trees
    coconut(c, W * 0.34, L.horizon - 2, 70);
    coconut(c, W * 0.40, L.horizon + 2, 58);
    coconut(c, W * 0.83, L.horizon - 4, 66);
    coconut(c, W * 0.93, L.horizon + 2, 60);
  }

  function hut(c, x, groundY, w) {
    const h = w * 0.6, wallH = h * 0.6;
    // wall
    c.fillStyle = '#c9a06a';
    c.fillRect(x - w / 2, groundY - wallH, w, wallH);
    c.fillStyle = 'rgba(90,60,30,.25)';
    c.fillRect(x - w / 2, groundY - wallH, w, wallH * 0.12);
    // door
    c.fillStyle = '#5b3d1f';
    c.fillRect(x - w * 0.12, groundY - wallH * 0.7, w * 0.24, wallH * 0.7);
    // thatched roof
    c.beginPath();
    c.moveTo(x - w * 0.62, groundY - wallH);
    c.lineTo(x, groundY - wallH - h * 0.55);
    c.lineTo(x + w * 0.62, groundY - wallH);
    c.closePath();
    const rg = c.createLinearGradient(0, groundY - wallH - h * 0.55, 0, groundY - wallH);
    rg.addColorStop(0, '#b98b4b'); rg.addColorStop(1, '#8f6631');
    c.fillStyle = rg; c.fill();
    c.strokeStyle = 'rgba(70,45,20,.4)'; c.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      c.beginPath();
      c.moveTo(x - w * 0.62 + (w * 1.24) * (i / 5) * 0.5, groundY - wallH);
      c.lineTo(x, groundY - wallH - h * 0.55 + i);
      c.stroke();
    }
  }

  function coconut(c, x, groundY, h) {
    c.strokeStyle = '#7d5a30'; c.lineWidth = Math.max(3, h * 0.05); c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, groundY);
    const bend = rr(-1, 1) * h * 0.12;
    c.quadraticCurveTo(x + bend, groundY - h * 0.55, x + bend * 1.6, groundY - h);
    c.stroke();
    const tx = x + bend * 1.6, ty = groundY - h;
    c.fillStyle = '#4e6b2c';
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + rr(-0.2, 0.2);
      const fl = h * 0.42;
      c.beginPath();
      c.moveTo(tx, ty);
      c.quadraticCurveTo(tx + Math.cos(a) * fl * 0.6, ty + Math.sin(a) * fl * 0.6 - 6,
        tx + Math.cos(a) * fl, ty + Math.sin(a) * fl + 4);
      c.quadraticCurveTo(tx + Math.cos(a) * fl * 0.6, ty + Math.sin(a) * fl * 0.6 + 4, tx, ty);
      c.fill();
    }
    c.fillStyle = '#6b4a24';
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(tx + rr(-4, 4), ty + rr(0, 6), 3.4, 0, 7); c.fill(); }
  }

  function paintGround(c) {
    const g = c.createLinearGradient(0, L.horizon, 0, H);
    g.addColorStop(0, '#8a6a3c');
    g.addColorStop(0.4, '#7c5a34');
    g.addColorStop(1, '#5f4324');
    c.fillStyle = g; c.fillRect(0, L.horizon, W, H - L.horizon);
    // mud mottling
    for (let i = 0; i < 260; i++) {
      const y = rr(L.horizon, H);
      const depth = (y - L.horizon) / (H - L.horizon);
      const x = rr(0, W);
      c.globalAlpha = rr(0.04, 0.12);
      c.fillStyle = R() > 0.5 ? '#4c3618' : '#9a774a';
      const s = rr(2, 6) * (0.6 + depth);
      c.beginPath(); c.ellipse(x, y, s, s * 0.5, rr(0, 3), 0, 7); c.fill();
    }
    c.globalAlpha = 1;
  }

  function paintGrassAndLitter(c) {
    // grass tufts, denser toward the front
    for (let i = 0; i < 150; i++) {
      const y = rr(L.horizon + 6, H);
      const depth = (y - L.horizon) / (H - L.horizon);
      if (R() > 0.25 + depth * 0.75) continue;
      const x = rr(0, W);
      grassTuft(c, x, y, rr(6, 14) * (0.5 + depth));
    }
    // small stones
    for (let i = 0; i < 60; i++) {
      const y = rr(L.horizon + 10, H);
      const depth = (y - L.horizon) / (H - L.horizon);
      const x = rr(0, W);
      const s = rr(2, 6) * (0.5 + depth);
      c.fillStyle = ['#9b9385', '#b8b0a0', '#7d766a'][(R() * 3) | 0];
      c.beginPath(); c.ellipse(x, y, s, s * 0.6, rr(0, 3), 0, 7); c.fill();
      c.fillStyle = 'rgba(0,0,0,.15)';
      c.beginPath(); c.ellipse(x + s * 0.4, y + s * 0.4, s * 0.7, s * 0.35, 0, 0, 7); c.fill();
    }
    // dried leaves on the ground
    for (let i = 0; i < 45; i++) {
      const y = rr(L.horizon + 10, H);
      const depth = (y - L.horizon) / (H - L.horizon);
      const x = rr(0, W);
      c.save(); c.translate(x, y); c.rotate(rr(0, 6));
      const s = rr(4, 9) * (0.5 + depth);
      c.fillStyle = ['#a5702e', '#8a5a24', '#b98a3e'][(R() * 3) | 0];
      c.globalAlpha = 0.8;
      c.beginPath(); c.ellipse(0, 0, s, s * 0.5, 0, 0, 7); c.fill();
      c.strokeStyle = 'rgba(70,45,15,.5)'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(-s, 0); c.lineTo(s, 0); c.stroke();
      c.restore();
    }
    c.globalAlpha = 1;
  }

  function grassTuft(c, x, y, s) {
    const col = ['#4f6f28', '#5c7d30', '#6b8a3a'][(R() * 3) | 0];
    c.strokeStyle = col; c.lineWidth = Math.max(1, s * 0.14); c.lineCap = 'round';
    for (let b = 0; b < 5; b++) {
      const a = -Math.PI / 2 + rr(-0.7, 0.7);
      c.beginPath(); c.moveTo(x, y);
      c.quadraticCurveTo(x + Math.cos(a) * s * 0.4, y + Math.sin(a) * s * 0.7,
        x + Math.cos(a) * s, y + Math.sin(a) * s - s * 0.2);
      c.stroke();
    }
  }

  function paintBanyanTrunk(c) {
    const bx = W * 0.5, by = L.horizon * 1.02;
    const tw = Math.min(W * 0.14, 120);
    // buttress roots spreading toward camera
    c.fillStyle = '#6b4a26';
    for (let i = -3; i <= 3; i++) {
      const spread = i * tw * 0.55;
      c.beginPath();
      c.moveTo(bx + spread * 0.3, by - tw * 1.6);
      c.quadraticCurveTo(bx + spread, by + 20, bx + spread * 1.7, by + 70 + Math.abs(i) * 14);
      c.lineTo(bx + spread * 1.7 + tw * 0.28, by + 74 + Math.abs(i) * 14);
      c.quadraticCurveTo(bx + spread * 1.25, by + 20, bx + spread * 0.3 + tw * 0.22, by - tw * 1.6);
      c.closePath();
      const rg = c.createLinearGradient(bx + spread, by - tw, bx + spread * 1.6, by + 70);
      rg.addColorStop(0, '#7a5530'); rg.addColorStop(1, '#4e3419');
      c.fillStyle = rg; c.fill();
    }
    // main trunk
    const tg = c.createLinearGradient(bx - tw, 0, bx + tw, 0);
    tg.addColorStop(0, '#4d3418'); tg.addColorStop(0.5, '#7c5730'); tg.addColorStop(1, '#4d3418');
    c.fillStyle = tg;
    c.beginPath();
    c.moveTo(bx - tw, by);
    c.quadraticCurveTo(bx - tw * 0.7, by - L.horizon * 0.8, bx - tw * 0.5, 0);
    c.lineTo(bx + tw * 0.5, 0);
    c.quadraticCurveTo(bx + tw * 0.7, by - L.horizon * 0.8, bx + tw, by);
    c.closePath(); c.fill();
    // bark grooves
    c.strokeStyle = 'rgba(40,25,10,.4)'; c.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const ox = bx - tw * 0.7 + (tw * 1.4) * (i / 6);
      c.beginPath(); c.moveTo(ox, by);
      c.quadraticCurveTo(ox + rr(-8, 8), by - L.horizon * 0.4, ox + rr(-6, 6), 0);
      c.stroke();
    }
  }

  /* ================= UPDATE (living things) ================= */
  function newLeaf(spread) {
    return {
      x: rr(0, W), y: spread ? rr(-H, H * 0.5) : rr(-40, -10),
      vx: rr(-8, 4), vy: rr(14, 34),
      rot: rr(0, 6), vr: rr(-2, 2),
      size: rr(6, 12), sway: rr(12, 30), phase: rr(0, 6),
      col: ['#6b8a3a', '#8a5a24', '#a5702e', '#4f6f28'][(R() * 4) | 0],
    };
  }
  function newFlutterer(kind) {
    return {
      kind,
      x: rr(0, W), y: rr(L.horizon, H * 0.9),
      phase: rr(0, 6), speed: kind === 'dragonfly' ? rr(40, 70) : rr(16, 30),
      dir: rr(0, 6), turn: rr(-0.4, 0.4),
      size: kind === 'dragonfly' ? rr(6, 9) : rr(7, 11),
      colA: kind === 'dragonfly' ? '#5fb0c4' : ['#e8973a', '#d94f6c', '#f2c14e', '#7a5ad9'][(R() * 4) | 0],
      colB: '#fff', wing: 0,
    };
  }
  function newBird(y) {
    const fromLeft = R() > 0.5;
    return {
      x: fromLeft ? -20 : W + 20, y: y || rr(L.horizon * 0.2, L.horizon * 0.7),
      vx: (fromLeft ? 1 : -1) * rr(60, 110), flap: 0, size: rr(7, 12),
    };
  }

  function update(dt) {
    wind += dt * 0.6;
    dapplePhase += dt * 0.25;

    for (const lf of leaves) {
      lf.phase += dt;
      lf.x += (lf.vx + Math.sin(lf.phase + wind) * lf.sway) * dt;
      lf.y += lf.vy * dt;
      lf.rot += lf.vr * dt;
      if (lf.y > H + 20) Object.assign(lf, newLeaf(false));
    }

    for (const f of flutterers) {
      f.phase += dt * (f.kind === 'dragonfly' ? 12 : 7);
      f.dir += f.turn * dt + Math.sin(f.phase * 0.2) * dt * 0.6;
      const bob = f.kind === 'dragonfly' ? 0 : Math.sin(f.phase) * 14 * dt;
      f.x += Math.cos(f.dir) * f.speed * dt;
      f.y += Math.sin(f.dir) * f.speed * dt * 0.5 + bob;
      f.wing = f.kind === 'dragonfly' ? Math.sin(f.phase) : Math.abs(Math.sin(f.phase));
      if (f.x < -30) f.x = W + 30; if (f.x > W + 30) f.x = -30;
      if (f.y < L.horizon) { f.y = L.horizon; f.dir = -f.dir; }
      if (f.y > H - 10) { f.y = H - 10; f.dir = -f.dir; }
      if (R() < dt * 0.4) f.turn = rr(-0.5, 0.5);
    }

    birdTimer -= dt;
    if (birdTimer <= 0 && birds.length < 3) {
      birdTimer = rr(6, 14);
      const n = 1 + ((R() * 3) | 0);
      for (let i = 0; i < n; i++) birds.push(newBird());
    }
    for (const b of birds) { b.x += b.vx * dt; b.y += Math.sin(wind * 2 + b.x * 0.01) * 6 * dt; b.flap += dt * 10; }
    birds = birds.filter((b) => b.x > -40 && b.x < W + 40);

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

  function drawDapples(c) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 10; i++) {
      const x = (i * 137.5 % W) + Math.sin(dapplePhase + i) * 26;
      const y = L.horizon + 30 + ((i * 73) % (H - L.horizon - 40)) + Math.cos(dapplePhase * 0.8 + i) * 14;
      const rad = 40 + (i % 3) * 26;
      const g = c.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(255,240,190,.16)');
      g.addColorStop(1, 'rgba(255,240,190,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, rad, 0, 7); c.fill();
    }
    c.restore();
  }

  function drawDust(c) {
    for (const d of dust) {
      c.globalAlpha = Math.max(0, d.life / d.max) * 0.6;
      c.fillStyle = '#c9a56b';
      c.beginPath(); c.arc(d.x, d.y, d.size, 0, 7); c.fill();
    }
    c.globalAlpha = 1;
  }

  function drawCanopy(c) {
    const sway = Math.sin(wind) * 6;
    // hanging aerial roots
    c.strokeStyle = 'rgba(70,48,24,.55)'; c.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const x = (i / 13) * W;
      const len = 40 + ((i * 53) % 90) + Math.sin(i) * 20;
      c.lineWidth = 1 + (i % 3);
      c.beginPath(); c.moveTo(x, 0);
      c.quadraticCurveTo(x + sway * 1.4, len * 0.6, x + sway * 2, len);
      c.stroke();
      c.fillStyle = 'rgba(70,48,24,.55)';
      c.beginPath(); c.arc(x + sway * 2, len, 2.4, 0, 7); c.fill();
    }
    // layered leaf canopy across the top
    const layers = [
      { y: -10, col: '#3c561d', blob: 0.30, alpha: 1 },
      { y: 6, col: '#4f6f28', blob: 0.26, alpha: 1 },
      { y: 26, col: '#5f8531', blob: 0.22, alpha: .96 },
      { y: 46, col: '#6f9838', blob: 0.18, alpha: .9 },
    ];
    for (const ly of layers) {
      c.fillStyle = ly.col; c.globalAlpha = ly.alpha;
      c.beginPath();
      let first = true;
      for (let x = -30; x <= W + 30; x += 26) {
        const yy = ly.y + Math.sin(x * 0.02 + wind + ly.y) * 14
          + Math.sin(x * 0.09) * 10 + (Math.abs(x - W / 2) * ly.blob);
        if (first) { c.moveTo(x, -60); c.lineTo(x, yy); first = false; }
        else c.lineTo(x, yy);
      }
      c.lineTo(W + 30, -60); c.closePath(); c.fill();
    }
    c.globalAlpha = 1;
    // little sun sparkles through the leaves
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 18; i++) {
      const x = (i * 89.3) % W;
      const y = 10 + (i * 37 % 70) + Math.sin(wind + i) * 4;
      c.fillStyle = 'rgba(255,246,200,.5)';
      c.beginPath(); c.arc(x, y, 1.8 + (i % 3), 0, 7); c.fill();
    }
    c.globalCompositeOperation = 'source-over';
  }

  function drawFliers(c) {
    // birds (in the sky)
    for (const b of birds) {
      const f = Math.sin(b.flap) * b.size * 0.6;
      c.strokeStyle = 'rgba(40,30,20,.75)'; c.lineWidth = 2; c.lineCap = 'round';
      c.beginPath();
      c.moveTo(b.x - b.size, b.y + f);
      c.quadraticCurveTo(b.x, b.y - f, b.x + b.size, b.y + f);
      c.stroke();
    }
    // butterflies & dragonflies
    for (const f of flutterers) {
      c.save(); c.translate(f.x, f.y); c.rotate(f.dir);
      if (f.kind === 'dragonfly') {
        c.strokeStyle = '#3d6f78'; c.lineWidth = 1.4;
        c.beginPath(); c.moveTo(-f.size, 0); c.lineTo(f.size, 0); c.stroke();
        c.globalAlpha = 0.5; c.fillStyle = f.colA;
        const wl = f.size * 1.3, wa = 0.4 + f.wing * 0.5;
        for (const sgn of [-1, 1]) {
          c.save(); c.rotate(sgn * wa);
          c.beginPath(); c.ellipse(0, sgn * wl * 0.4, wl * 0.5, wl * 0.16, 0, 0, 7); c.fill();
          c.restore();
        }
        c.globalAlpha = 1;
      } else {
        const wa = 0.2 + f.wing * 1.0;
        for (const sgn of [-1, 1]) {
          c.save(); c.rotate(sgn * wa);
          c.fillStyle = f.colA;
          c.beginPath(); c.ellipse(0, sgn * f.size * 0.5, f.size * 0.6, f.size * 0.42, 0, 0, 7); c.fill();
          c.fillStyle = 'rgba(255,255,255,.5)';
          c.beginPath(); c.ellipse(f.size * 0.15, sgn * f.size * 0.5, f.size * 0.22, f.size * 0.16, 0, 0, 7); c.fill();
          c.restore();
        }
        c.fillStyle = '#2a1c10';
        c.beginPath(); c.ellipse(0, 0, f.size * 0.14, f.size * 0.5, 0, 0, 7); c.fill();
      }
      c.restore();
    }
    // falling leaves (front)
    for (const lf of leaves) {
      c.save(); c.translate(lf.x, lf.y); c.rotate(lf.rot);
      c.fillStyle = lf.col; c.globalAlpha = 0.9;
      c.beginPath(); c.ellipse(0, 0, lf.size, lf.size * 0.45, 0, 0, 7); c.fill();
      c.strokeStyle = 'rgba(50,35,12,.5)'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(-lf.size, 0); c.lineTo(lf.size, 0); c.stroke();
      c.restore();
    }
    c.globalAlpha = 1;
  }

  /* ================= VILLAGERS ================= */
  function villager(c, x, y, s, t, opt) {
    const breath = Math.sin(t * 1.6 + opt.phase) * 0.03;
    const blink = ((t + opt.phase) % 4) > 3.85 ? 0.1 : 1;
    const look = Math.sin(t * 0.5 + opt.phase) * 0.12;
    c.save(); c.translate(x, y);
    // shadow
    c.fillStyle = 'rgba(20,12,4,.25)';
    c.beginPath(); c.ellipse(0, s * 0.05, s * 1.05, s * 0.32, 0, 0, 7); c.fill();
    // crossed legs
    c.fillStyle = opt.lower;
    c.beginPath(); c.ellipse(0, -s * 0.05, s * 0.95, s * 0.4, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.15)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-s * 0.7, -s * 0.05); c.quadraticCurveTo(0, s * 0.15, s * 0.7, -s * 0.05); c.stroke();
    // torso (breathing)
    c.save(); c.translate(0, -s * 0.3); c.scale(1 + breath, 1 + breath);
    c.fillStyle = opt.upper;
    c.beginPath();
    c.moveTo(-s * 0.55, s * 0.25);
    c.quadraticCurveTo(-s * 0.62, -s * 0.55, 0, -s * 0.62);
    c.quadraticCurveTo(s * 0.62, -s * 0.55, s * 0.55, s * 0.25);
    c.closePath(); c.fill();
    // shawl fold
    c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-s * 0.3, -s * 0.5); c.lineTo(s * 0.2, s * 0.2); c.stroke();
    // arms resting toward the board
    c.fillStyle = opt.skin;
    c.beginPath(); c.ellipse(opt.face * s * 0.5, s * 0.1, s * 0.16, s * 0.32, opt.face * 0.5, 0, 7); c.fill();
    c.restore();
    // head
    c.save(); c.translate(look * s, -s * 0.95);
    c.fillStyle = opt.skin;
    c.beginPath(); c.arc(0, 0, s * 0.3, 0, 7); c.fill();
    // hair / turban
    c.fillStyle = opt.hair;
    if (opt.turban) {
      c.beginPath(); c.ellipse(0, -s * 0.18, s * 0.34, s * 0.22, 0, Math.PI, 0); c.fill();
      c.beginPath(); c.ellipse(0, -s * 0.24, s * 0.3, s * 0.16, 0, Math.PI, 2 * Math.PI); c.fill();
    } else {
      c.beginPath(); c.arc(0, -s * 0.04, s * 0.3, Math.PI * 1.05, Math.PI * 1.95); c.fill();
      // bun
      c.beginPath(); c.arc(-s * 0.02, s * 0.12, s * 0.12, 0, 7); c.fill();
    }
    // eyes
    c.fillStyle = '#2a1c10';
    for (const ex of [-1, 1]) {
      c.save(); c.translate(ex * s * 0.11 + look * s * 0.5, s * 0.02); c.scale(1, blink);
      c.beginPath(); c.arc(0, 0, s * 0.035, 0, 7); c.fill(); c.restore();
    }
    // smile (gentle, occasional wider)
    const smile = 0.02 + (Math.sin(t * 0.4 + opt.phase) > 0.7 ? 0.03 : 0);
    c.strokeStyle = '#6b3f22'; c.lineWidth = 1.6; c.lineCap = 'round';
    c.beginPath(); c.arc(0, s * 0.1, s * 0.1, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
    c.restore();
    c.restore();
  }

  function drawVillagers(c, t) {
    const s = Math.min(Math.max(L.unit * 0.9, 34), 62);
    // seated at the sides, behind/around the board, under the tree
    const y = L.boardTop + L.unit * 0.25;
    const xL = Math.max(s * 1.1, W * 0.11);
    const xR = Math.min(W - s * 1.1, W * 0.89);
    villager(c, xL, y, s, t,
      { phase: 0, upper: '#e7e0cf', lower: '#c98a3a', skin: '#c98b5e', hair: '#2a1a0e', turban: true, face: 1 });
    villager(c, xR, y, s * 0.96, t,
      { phase: 2.1, upper: '#c85b52', lower: '#3f6d3a', skin: '#d29a6a', hair: '#1c120a', turban: false, face: -1 });
  }

  window.SCENE = {
    build, update, spawnDust,
    drawStatic, drawDapples, drawDust, drawCanopy, drawFliers, drawVillagers,
  };
})();
