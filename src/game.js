/* ============================================================
   game.js — glue: canvas + main loop, camera (shake/zoom),
   animation system, input, AI turns and all UI wiring.
   ============================================================ */
(function () {
  const B = window.BOARD, E = window.ENGINE;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, DPR = 1, layout = null;
  let last = 0;

  const other = (s) => (s === 'G' ? 'T' : 'G');

  const G = {
    state: null,
    humanSide: 'G',        // (pvc only) which side the human controls
    gameMode: 'pvc',       // pvc | pvp | watch
    players: { G: 'human', T: 'ai' }, // who controls each side
    aiDepth: 3,
    mode: 'menu',          // menu | playing | over (app screen state)
    busy: false,
    selMoves: [],
    view: { state: null, selected: -1, targets: new Set(), captureTargets: new Set(), anim: null, time: 0 },
    camera: { shakeX: 0, shakeY: 0, shakeMag: 0, zoomPulse: 0 },
  };

  /* ---------------- layout / resize ---------------- */
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    layout = RENDER.computeLayout(W, H);
    SCENE.build(W, H, DPR, layout);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 150));

  /* ---------------- game control ---------------- */
  function newGame() {
    G.state = E.initialState();
    G.view.state = G.state;
    G.view.selected = -1;
    G.view.targets.clear();
    G.view.captureTargets.clear();
    G.view.anim = null;
    G.selMoves = [];
    G.busy = false;
    G.mode = 'playing';
    updateHUD();
    // Goats always move first; let the controller of that side start.
    if (G.players[G.state.turn] === 'ai') scheduleAI();
    else showHint(hintForTurn(), 2600);
  }

  function hintForTurn() {
    if (G.state.turn === 'G') return G.state.toPlace > 0 ? 'Tap an empty point to place a goat' : 'Tap a goat, then a green point';
    return 'Tap a tiger, then a highlighted point';
  }

  function scheduleAI() {
    G.busy = true;
    clearSelection();
    updateHUD();
    setTimeout(() => {
      if (G.mode !== 'playing') return;
      const m = AI.chooseMove(G.state, G.aiDepth);
      if (!m) { finishIfStuck(); return; }
      startMove(m);
    }, 340);
  }

  function finishIfStuck() {
    const w = E.winner(G.state);
    if (w) return endGame(w);
    // goats with no move (rare) -> tigers win
    if (E.legalMoves(G.state).length === 0) endGame(G.state.turn === 'T' ? 'G' : 'T');
  }

  /* ---------------- animation ---------------- */
  const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  function startMove(move) {
    G.busy = true;
    clearSelection();
    if (move.type === 'place') {
      G.view.anim = { type: 'place', placeAt: move.to, dur: 0.42, elapsed: 0, ease: 0, piece: 'G', move };
    } else {
      G.view.anim = {
        type: 'move', piece: move.piece, from: move.from, to: move.to, cap: move.cap,
        dur: 0.34, elapsed: 0, ease: 0, phase: 'slide', capFade: null, move,
      };
    }
    G.camera.zoomPulse = 0.045; // gentle cinematic zoom on every move
  }

  function updateAnim(dt) {
    const a = G.view.anim;
    if (!a) return;
    if (a.type === 'place') {
      a.elapsed += dt;
      a.ease = easeOut(Math.min(1, a.elapsed / a.dur));
      if (a.elapsed >= a.dur) { AUDIO.play('place'); SCENE.spawnDust(dustAt(a.placeAt), 5); completeMove(a.move); }
      return;
    }
    // move
    if (a.phase === 'slide') {
      a.elapsed += dt;
      const p = Math.min(1, a.elapsed / a.dur);
      a.ease = easeIO(p);
      if (p >= 1) {
        const d = dustAt(a.to);
        SCENE.spawnDust(d, a.cap >= 0 ? 12 : 7);
        if (a.cap >= 0) {
          a.phase = 'fade'; a.capFade = 0; a.elapsed = 0;
          G.camera.shakeMag = 9; AUDIO.play('capture');
          bigToast('Caught!');
        } else {
          AUDIO.play('stone'); completeMove(a.move);
        }
      }
    } else if (a.phase === 'fade') {
      a.capFade += dt / 0.42;
      if (a.capFade >= 1) completeMove(a.move);
    }
  }

  function dustAt(node) { const p = RENDER.nodeScreen(node); return { x: p.x, y: p.y }; }

  function completeMove(move) {
    G.view.anim = null;
    E.apply(G.state, move);
    updateHUD();
    const w = E.winner(G.state);
    if (w) return endGame(w);
    if (E.legalMoves(G.state).length === 0) return endGame(G.state.turn === 'T' ? 'G' : 'T');
    if (G.players[G.state.turn] === 'human') { G.busy = false; showHint(hintForTurn(), 1600); }
    else scheduleAI();
  }

  // SCENE.spawnDust expects (x,y,n)
  const _spawn = SCENE.spawnDust;
  SCENE.spawnDust = (p, n) => _spawn(p.x, p.y, n);

  /* ---------------- camera ---------------- */
  function updateCamera(dt) {
    const c = G.camera;
    c.shakeMag *= Math.pow(0.001, dt); // fast decay
    if (c.shakeMag < 0.15) c.shakeMag = 0;
    c.shakeX = (Math.random() - 0.5) * 2 * c.shakeMag;
    c.shakeY = (Math.random() - 0.5) * 2 * c.shakeMag;
    c.zoomPulse *= Math.pow(0.02, dt);
    if (c.zoomPulse < 0.001) c.zoomPulse = 0;
  }

  /* ---------------- input ---------------- */
  function onPointer(e) {
    if (G.mode !== 'playing' || G.busy) return;
    if (G.players[G.state.turn] !== 'human') return; // not a human's turn
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX !== undefined ? e.clientX : e.touches[0].clientX) - rect.left;
    const y = (e.clientY !== undefined ? e.clientY : e.touches[0].clientY) - rect.top;
    const node = RENDER.pickNode(x, y);
    AUDIO.resume();

    if (G.state.turn === 'G') handleGoatTap(node);
    else handleTigerTap(node);
  }

  function handleGoatTap(node) {
    const s = G.state;
    if (s.toPlace > 0) { // placement
      if (node < 0) return;
      if (s.board[node] === E.EMPTY) startMove({ type: 'place', to: node });
      else nudge('That point is taken');
      return;
    }
    // movement phase
    if (node < 0) { clearSelection(); return; }
    if (G.view.selected < 0) {
      if (s.board[node] === E.GOAT) select(node);
      else if (s.board[node] === E.TIGER) nudge('That is a tiger');
    } else {
      const mv = G.selMoves.find((m) => m.to === node);
      if (mv) startMove(mv);
      else if (s.board[node] === E.GOAT) select(node);
      else clearSelection();
    }
  }

  function handleTigerTap(node) {
    const s = G.state;
    if (node < 0) { clearSelection(); return; }
    if (G.view.selected < 0) {
      if (s.board[node] === E.TIGER) select(node);
      else nudge('Pick one of your tigers');
    } else {
      const mv = G.selMoves.find((m) => m.to === node);
      if (mv) startMove(mv);
      else if (s.board[node] === E.TIGER) select(node);
      else clearSelection();
    }
  }

  function select(node) {
    const s = G.state;
    G.selMoves = s.turn === 'G' ? E.goatMovesFrom(s, node) : E.tigerMovesFrom(s, node);
    if (G.selMoves.length === 0) { nudge('No moves from there'); clearSelection(); AUDIO.play('wood'); return; }
    G.view.selected = node;
    G.view.targets = new Set(G.selMoves.map((m) => m.to));
    G.view.captureTargets = new Set(G.selMoves.filter((m) => m.cap >= 0).map((m) => m.to));
    AUDIO.play('wood');
  }

  function clearSelection() {
    G.view.selected = -1;
    G.view.targets.clear();
    G.view.captureTargets.clear();
    G.selMoves = [];
  }

  canvas.addEventListener('pointerdown', onPointer, { passive: false });

  /* ---------------- main loop ---------------- */
  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    G.view.time += dt;
    if (layout) {
      SCENE.update(dt);
      updateAnim(dt);
      updateCamera(dt);
      draw();
    }
    requestAnimationFrame(frame);
  }

  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const bcx = layout.cx, bcy = (layout.boardTop + layout.boardBottom) / 2;
    const z = 1 + G.camera.zoomPulse;
    ctx.save();
    ctx.translate(G.camera.shakeX, G.camera.shakeY);
    ctx.translate(bcx, bcy); ctx.scale(z, z); ctx.translate(-bcx, -bcy);

    SCENE.drawStatic(ctx);
    SCENE.drawDapples(ctx);
    if (G.mode !== 'menu') {
      RENDER.drawBoard(ctx, G.view);
      SCENE.drawVillagers(ctx, G.view.time);
      RENDER.drawPieces(ctx, G.view);
      SCENE.drawDust(ctx);
    } else {
      SCENE.drawVillagers(ctx, G.view.time);
    }
    SCENE.drawCanopy(ctx);
    SCENE.drawFliers(ctx);
    ctx.restore();
  }

  /* ---------------- HUD / UI ---------------- */
  const el = (id) => document.getElementById(id);
  function updateHUD() {
    const s = G.state; if (!s) return;
    el('capCount').textContent = s.captured;
    const mid = el('goatLeft');
    const midLabel = mid.parentElement.querySelector('.l');
    if (s.toPlace > 0) { mid.textContent = s.toPlace; midLabel.textContent = 'To place'; }
    else { mid.textContent = (B.GOAT_TOTAL - s.captured); midLabel.textContent = 'Goats'; }
    let tag;
    if (s.turn === 'G') tag = s.toPlace > 0 ? 'Goats: place' : 'Goats: move';
    else tag = 'Tigers: move';
    if (G.mode === 'over') { /* keep as-is */ }
    else if (G.gameMode === 'pvc') tag += (s.turn === G.humanSide) ? ' — you' : ' — thinking…';
    else if (G.gameMode === 'pvp') tag += ' — your turn';
    else tag += ' — auto';
    el('turnTag').textContent = tag;
  }

  let hintT = null;
  function showHint(text, ms) {
    const h = el('hint'); h.textContent = text; h.classList.add('show');
    clearTimeout(hintT); hintT = setTimeout(() => h.classList.remove('show'), ms || 1600);
  }
  function nudge(text) { showHint(text, 1100); AUDIO.play('wood'); }

  function bigToast(text) {
    const t = el('toast'); t.textContent = text;
    t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop');
  }

  function endGame(winner) {
    G.mode = 'over';
    G.busy = true;
    clearSelection();
    updateHUD();
    el('resultTitle').textContent = winner === 'G' ? 'Goats Win!' : 'Tigers Win!';
    el('resultText').textContent = winner === 'G'
      ? 'Every tiger is trapped under the old banyan tree.'
      : 'The tigers feasted — five goats were caught.';
    if (G.gameMode === 'pvc') {
      const humanWon = winner === G.humanSide;
      bigToast(humanWon ? 'You Win!' : 'You Lose');
      AUDIO.play(humanWon ? 'win' : 'lose');
    } else {
      bigToast(winner === 'G' ? 'Goats Win!' : 'Tigers Win!');
      AUDIO.play('win');
    }
    setTimeout(() => el('result').classList.add('show'), 1200);
  }

  /* ---------------- menu wiring ---------------- */
  function setupChoice(gridId, attr, cb) {
    const grid = el(gridId);
    grid.querySelectorAll('.choice').forEach((c) => {
      c.addEventListener('click', () => {
        grid.querySelectorAll('.choice').forEach((x) => x.classList.remove('sel'));
        c.classList.add('sel');
        AUDIO.play('wood');
        cb(c.getAttribute(attr));
      });
    });
  }

  let chosenSide = 'G', chosenDiff = 3, chosenMode = 'pvc';
  setupChoice('sideGrid', 'data-side', (v) => { chosenSide = v; });
  setupChoice('diffGrid', 'data-diff', (v) => { chosenDiff = parseInt(v, 10); });
  setupChoice('modeGrid', 'data-mode', (v) => { chosenMode = v; refreshModeUI(); });

  function refreshModeUI() {
    // "Play as" only matters when facing the computer.
    const show = chosenMode === 'pvc';
    el('playAsHead').style.display = show ? '' : 'none';
    el('sideGrid').style.display = show ? 'grid' : 'none';
    // Skill only matters when a computer plays.
    const skillShow = chosenMode !== 'pvp';
    el('diffGrid').style.display = skillShow ? 'grid' : 'none';
    el('diffGrid').previousElementSibling.style.display = skillShow ? '' : 'none';
  }
  refreshModeUI();

  el('startBtn').addEventListener('click', () => {
    AUDIO.play('wood'); AUDIO.startAmbience();
    G.gameMode = chosenMode;
    G.aiDepth = Math.max(2, chosenDiff);
    if (chosenMode === 'pvc') {
      G.humanSide = chosenSide;
      G.players = {}; G.players[chosenSide] = 'human'; G.players[other(chosenSide)] = 'ai';
    } else if (chosenMode === 'pvp') {
      G.humanSide = null;
      G.players = { G: 'human', T: 'human' };
    } else { // watch
      G.humanSide = null;
      G.players = { G: 'ai', T: 'ai' };
    }
    el('menu').classList.remove('show');
    el('hud').style.display = 'flex';
    newGame();
  });
  el('howBtn').addEventListener('click', () => { AUDIO.play('wood'); el('how').classList.add('show'); });
  el('howBack').addEventListener('click', () => { AUDIO.play('wood'); el('how').classList.remove('show'); });

  el('menuBtn').addEventListener('click', () => {
    AUDIO.play('wood');
    G.mode = 'menu'; G.busy = true;
    el('hud').style.display = 'none';
    el('menu').classList.add('show');
  });
  el('againBtn').addEventListener('click', () => {
    AUDIO.play('wood'); el('result').classList.remove('show');
    el('hud').style.display = 'flex'; newGame();
  });
  el('resultMenuBtn').addEventListener('click', () => {
    AUDIO.play('wood'); el('result').classList.remove('show');
    G.mode = 'menu'; el('menu').classList.add('show');
  });

  const muteBtn = el('muteBtn');
  function refreshMute() { muteBtn.textContent = AUDIO.isMuted() ? '🔇' : '🔊'; }
  refreshMute();
  muteBtn.addEventListener('click', () => { AUDIO.ensure(); AUDIO.setMuted(!AUDIO.isMuted()); refreshMute(); if (!AUDIO.isMuted()) AUDIO.startAmbience(); });

  // Kick unlock audio on first touch anywhere
  window.addEventListener('pointerdown', () => AUDIO.resume(), { once: true });

  /* ---------------- boot ---------------- */
  resize();
  G.state = E.initialState(); G.view.state = G.state; // so the menu shows the scene
  requestAnimationFrame(frame);
})();
