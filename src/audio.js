/* ============================================================
   audio.js — 100% synthesized village soundscape via Web Audio.
   No audio files needed. Ambient bed (wind, birds, cow bells)
   plus interaction SFX (stone click, wooden tap, capture, win/lose).
   Exposes `AUDIO`.
   ============================================================ */
(function () {
  let ctx = null, master = null, ambientGain = null, sfxGain = null;
  let started = false;
  let muted = false;
  try { muted = localStorage.getItem('pm_muted') === '1'; } catch (e) {}
  let noiseBuf = null;
  let birdTimer = null, cowTimer = null;

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ctx.destination);
    ambientGain = ctx.createGain(); ambientGain.gain.value = 0.5; ambientGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 1.0; sfxGain.connect(master);
    // pre-make noise
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
  }

  function now() { return ctx.currentTime; }

  function noiseSource() { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; }

  function startAmbience() {
    ensure();
    if (!ctx || started) return;
    started = true;
    if (ctx.state === 'suspended') ctx.resume();

    // wind through the leaves — filtered looping noise with a slow LFO
    const wind = noiseSource();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
    const wg = ctx.createGain(); wg.gain.value = 0.16;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.09;
    lfo.connect(lfoG); lfoG.connect(wg.gain);
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.05;
    const lfo2G = ctx.createGain(); lfo2G.gain.value = 220;
    lfo2.connect(lfo2G); lfo2G.connect(lp.frequency);
    wind.connect(lp); lp.connect(wg); wg.connect(ambientGain);
    wind.start(); lfo.start(); lfo2.start();

    scheduleBirds();
    scheduleCows();
  }

  function scheduleBirds() {
    clearTimeout(birdTimer);
    // chirp often so the village always feels alive
    const next = 900 + Math.random() * 2400;
    birdTimer = setTimeout(() => { if (started) { chirp(); if (Math.random() > 0.6) setTimeout(chirp, 220 + Math.random() * 300); } scheduleBirds(); }, next);
  }
  function scheduleCows() {
    clearTimeout(cowTimer);
    const next = 9000 + Math.random() * 12000;
    cowTimer = setTimeout(() => { if (started) cowbell(); scheduleCows(); }, next);
  }

  function chirp() {
    if (!ctx) return;
    const t = now();
    const n = 2 + ((Math.random() * 3) | 0);
    const base = 2200 + Math.random() * 1400;
    const g = ctx.createGain(); g.gain.value = 0; g.connect(ambientGain);
    const o = ctx.createOscillator(); o.type = 'sine'; o.connect(g);
    let tt = t;
    for (let i = 0; i < n; i++) {
      const f = base * (0.9 + Math.random() * 0.5);
      o.frequency.setValueAtTime(f, tt);
      o.frequency.linearRampToValueAtTime(f * 1.25, tt + 0.04);
      g.gain.setValueAtTime(0, tt);
      g.gain.linearRampToValueAtTime(0.10, tt + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, tt + 0.09);
      tt += 0.11 + Math.random() * 0.06;
    }
    o.start(t); o.stop(tt + 0.1);
  }

  function cowbell() {
    if (!ctx) return;
    const t = now();
    const g = ctx.createGain(); g.gain.value = 0; g.connect(ambientGain);
    const out = ctx.createBiquadFilter(); out.type = 'bandpass'; out.frequency.value = 900; out.Q.value = 3;
    out.connect(g);
    const ratios = [1, 1.34, 1.79, 2.11];
    for (const r of ratios) {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 420 * r;
      const og = ctx.createGain(); og.gain.value = 0.12; o.connect(og); og.connect(out);
      o.start(t); o.stop(t + 0.6);
    }
    for (let k = 0; k < 2; k++) {
      const tt = t + k * 0.22;
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.linearRampToValueAtTime(0.05, tt + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0008, tt + 0.2);
    }
  }

  /* ---------------- SFX ---------------- */
  function burst(dur, freq, type, vol, filterType, filterFreq) {
    if (!ctx) return;
    const t = now();
    const g = ctx.createGain(); g.gain.value = 0;
    let node = g;
    if (filterType) {
      const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = filterFreq || 800;
      f.connect(g); node = f;
    }
    g.connect(sfxGain);
    const o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.value = freq;
    o.connect(node);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.start(t); o.stop(t + dur + 0.02);
    return { o, g, t };
  }

  function noiseHit(dur, vol, fType, fFreq) {
    if (!ctx) return;
    const t = now();
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = fType || 'bandpass'; f.frequency.value = fFreq || 2000; f.Q.value = 1.2;
    const g = ctx.createGain(); g.gain.value = 0;
    s.connect(f); f.connect(g); g.connect(sfxGain);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    s.start(t, Math.random() * 1.0); s.stop(t + dur + 0.02);
  }

  const SFX = {
    stone() { ensure(); noiseHit(0.06, 0.25, 'highpass', 1600); burst(0.09, 240, 'triangle', 0.22, 'lowpass', 900); },
    place() { ensure(); noiseHit(0.05, 0.14, 'bandpass', 2600); burst(0.07, 420, 'sine', 0.12); },
    wood() { ensure(); burst(0.12, 180, 'triangle', 0.22, 'lowpass', 600); noiseHit(0.04, 0.08, 'lowpass', 500); },
    capture() {
      ensure(); noiseHit(0.12, 0.3, 'bandpass', 1400); burst(0.16, 150, 'triangle', 0.28, 'lowpass', 700);
      burst(0.2, 90, 'sine', 0.18);
    },
    win() {
      ensure(); if (!ctx) return; const base = 523.25; const seq = [0, 4, 7, 12];
      seq.forEach((s, i) => setTimeout(() => burst(0.4, base * Math.pow(2, s / 12), 'triangle', 0.18, 'lowpass', 2200), i * 130));
    },
    lose() {
      ensure(); if (!ctx) return; const base = 392; const seq = [0, -2, -5, -9];
      seq.forEach((s, i) => setTimeout(() => burst(0.5, base * Math.pow(2, s / 12), 'sine', 0.16, 'lowpass', 1400), i * 170));
    },
  };

  function play(name) { if (!started && !ctx) ensure(); if (SFX[name]) SFX[name](); }

  function setMuted(m) {
    muted = m; try { localStorage.setItem('pm_muted', m ? '1' : '0'); } catch (e) {}
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.05);
  }
  function isMuted() { return muted; }

  function resume() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); }

  window.AUDIO = { ensure, startAmbience, play, setMuted, isMuted, resume };
})();
