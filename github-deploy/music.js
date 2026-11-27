'use strict';
// ============================================================
// music.js — 조선야차 BGM, synthesized live with Web Audio (no audio files, no licensing).
// 국악 palette over a dark modern pulse, all in D 계면조-style minor pentatonic (D F G A C):
//   가야금 = plucked triangle with a fast filter decay, 대금 = breathy sine with 농현 bends,
//   해금 = nasal band-passed saw, 북/장구 = pitched-down sines + noise slaps, 징 = inharmonic gong,
//   꽹과리 = metallic clank. A lookahead scheduler queues notes ~120ms ahead of the audio clock.
// Tracks: 'title' (스산한 밤), 'story' (대화·지도, quieter), 'battle' (자진모리 12/8 — phase 1-3 raise
// tempo and layers), 'victory' / 'defeat' (one-shot stings).
// ============================================================
const Music = (() => {
  const LOOKAHEAD = 0.12, TICK_MS = 25;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  let ac = null, out = null, bus = null, noise = null, verb = null;
  let track = null, want = null, intensity = 1, step = 0, nextT = 0, timer = null, drone = null;

  // ---------- setup ----------
  function ready() {
    if (ac) return ac.state === 'running';
    ac = Sfx.ctx; out = Sfx.musicOut;
    if (!ac || !out) { ac = null; return false; }
    bus = ac.createGain(); bus.gain.value = 0;
    bus.connect(out);
    noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // cheap hall: two damped feedback delays (a big empty palace at night)
    verb = ac.createGain(); verb.gain.value = 0.32;
    [0.137, 0.211].forEach((dt, i) => {
      const dl = ac.createDelay(1), fb = ac.createGain(), lp = ac.createBiquadFilter();
      dl.delayTime.value = dt; fb.gain.value = i ? 0.42 : 0.5; lp.type = 'lowpass'; lp.frequency.value = 2600;
      verb.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(bus);
    });
    return ac.state === 'running';
  }
  const send = (node, wet = 0.35) => { node.connect(bus); if (wet) { const g = ac.createGain(); g.gain.value = wet; node.connect(g); g.connect(verb); } };
  function env(g, t, peak, atk, dur, rel = 0.08) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + atk);
    g.gain.setTargetAtTime(0.0001, t + Math.max(atk, dur - rel), rel / 3);
  }
  function noiseSrc(t, dur) { const s = ac.createBufferSource(); s.buffer = noise; s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05); return s; }

  // ---------- instruments ----------
  function gayageum(m, t, vol = 0.12, dur = 0.9) { // 가야금: bright attack, string sag, quick filter close
    const f = mtof(m), o = ac.createOscillator(), o2 = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'triangle'; o2.type = 'square'; o2.detune.value = 4;
    o.frequency.setValueAtTime(f * 1.012, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
    o2.frequency.setValueAtTime(f, t);
    const g2 = ac.createGain(); g2.gain.value = 0.18;
    lp.type = 'lowpass'; lp.Q.value = 3; lp.frequency.setValueAtTime(f * 9, t); lp.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.25);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); send(g, 0.4);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  function daegeum(m, t, dur, vol = 0.07) { // 대금: slides up into the note (농현), widening vibrato, breath
    const f = mtof(m), o = ac.createOscillator(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f * 0.94, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.14);
    lfo.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + dur * 0.6);
    lfo.connect(lg); lg.connect(o.frequency);
    env(g, t, vol, 0.09, dur, 0.25);
    const h = ac.createOscillator(), hg = ac.createGain(); h.type = 'triangle'; h.frequency.value = f * 2; hg.gain.value = 0.12;
    h.connect(hg); hg.connect(g);
    const br = noiseSrc(t, dur), bp = ac.createBiquadFilter(), bg = ac.createGain();
    bp.type = 'bandpass'; bp.frequency.value = f * 2.5; bp.Q.value = 4; bg.gain.value = 0.35; br.connect(bp); bp.connect(bg); bg.connect(g);
    o.connect(g); send(g, 0.55);
    [o, lfo, h].forEach(n => { n.start(t); n.stop(t + dur + 0.4); });
  }
  function haegeum(m, t, dur, vol = 0.05) { // 해금: nasal bowed saw, bend from below
    const f = mtof(m), o = ac.createOscillator(), bp = ac.createBiquadFilter(), lp = ac.createBiquadFilter(), g = ac.createGain();
    const lfo = ac.createOscillator(), lg = ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 0.97, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.09);
    lfo.frequency.value = 6.2; lg.gain.value = f * 0.009; lfo.connect(lg); lg.connect(o.frequency);
    bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 1.4; lp.type = 'lowpass'; lp.frequency.value = 3200;
    env(g, t, vol, 0.05, dur, 0.12);
    o.connect(bp); bp.connect(lp); lp.connect(g); send(g, 0.45);
    [o, lfo].forEach(n => { n.start(t); n.stop(t + dur + 0.3); });
  }
  function bass(m, t, dur, vol = 0.16) { // dark synth pulse under the 국악 layer
    const f = mtof(m), o = ac.createOscillator(), s = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; s.type = 'sine'; o.frequency.value = f; s.frequency.value = f / 2;
    lp.type = 'lowpass'; lp.Q.value = 6; lp.frequency.setValueAtTime(f * 7, t); lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + dur * 0.8);
    const sg = ac.createGain(); sg.gain.value = 0.8;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); lp.connect(g); s.connect(sg); sg.connect(g); send(g, 0);
    [o, s].forEach(n => { n.start(t); n.stop(t + dur + 0.05); });
  }
  function buk(t, vol = 0.5, f0 = 92) { // 북: deep skin thump
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.35);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g); send(g, 0.2); o.start(t); o.stop(t + 0.55);
    slap(t, vol * 0.25, 900, 0.03);
  }
  function slap(t, vol, f = 2600, dur = 0.06) { // 장구 채편 '덕'
    const s = noiseSrc(t, dur), bp = ac.createBiquadFilter(), g = ac.createGain();
    bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 1.6;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp); bp.connect(g); send(g, 0.25);
    const o = ac.createOscillator(), og = ac.createGain(); o.frequency.value = 420; o.type = 'triangle';
    og.gain.setValueAtTime(vol * 0.5, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(og); og.connect(bus); o.start(t); o.stop(t + 0.07);
  }
  function kung(t, vol = 0.3) { // 장구 북편 '쿵'
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.2);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); send(g, 0.2); o.start(t); o.stop(t + 0.35);
  }
  function jing(t, vol = 0.12, f = 98) { // 징: long inharmonic gong swell — marks phrases & danger
    [1, 1.48, 2.02, 2.74, 3.9].forEach((r, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(f * r * 1.01, t); o.frequency.exponentialRampToValueAtTime(f * r, t + 0.6);
      const v = vol / (1 + i * 0.9);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.06 + i * 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 4.5 - i * 0.5);
      o.connect(g); send(g, 0.6); o.start(t); o.stop(t + 4.6);
    });
  }
  function kkwaeng(t, vol = 0.05) { // 꽹과리: bright metallic clank
    [1, 1.34, 1.79, 2.41].forEach(r => {
      const o = ac.createOscillator(), g = ac.createGain(), hp = ac.createBiquadFilter();
      o.type = 'square'; o.frequency.value = 1180 * r; hp.type = 'highpass'; hp.frequency.value = 2000;
      g.gain.setValueAtTime(vol / 4, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(hp); hp.connect(g); send(g, 0.15); o.start(t); o.stop(t + 0.14);
    });
  }
  function riser(t, dur, vol = 0.05) { // filtered-noise swell before a section turns
    const s = noiseSrc(t, dur), bp = ac.createBiquadFilter(), g = ac.createGain();
    bp.type = 'bandpass'; bp.Q.value = 2; bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(4000, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.95); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.02);
    s.connect(bp); bp.connect(g); send(g, 0.3);
  }
  function startDrone(notes, vol, cutoff) { // sustained low bed with a slow breathing filter
    stopDrone();
    const g = ac.createGain(), lp = ac.createBiquadFilter(), lfo = ac.createOscillator(), lg = ac.createGain();
    lp.type = 'lowpass'; lp.frequency.value = cutoff; lp.Q.value = 2;
    lfo.frequency.value = 0.07; lg.gain.value = cutoff * 0.45; lfo.connect(lg); lg.connect(lp.frequency);
    g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.linearRampToValueAtTime(vol, ac.currentTime + 3);
    const oscs = notes.flatMap(m => [-7, 6].map(dt => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = dt; o.connect(lp); o.start(); return o; }));
    lp.connect(g); send(g, 0.3); lfo.start();
    drone = { g, oscs: oscs.concat(lfo) };
  }
  function stopDrone() {
    if (!drone) return;
    const d = drone, t = ac.currentTime; drone = null;
    d.g.gain.cancelScheduledValues(t); d.g.gain.setTargetAtTime(0.0001, t, 0.5);
    d.oscs.forEach(o => { try { o.stop(t + 2.5); } catch (e) { /* already stopped */ } });
  }

  // ---------- score (D minor pentatonic; midi 62 = D4) ----------
  const _ = null;
  // 자진모리-feel 12/8: 12 eighth-note steps per bar, 4-bar cycle over roots D D C A
  const B_ROOTS = [38, 38, 36, 33];
  const B_RIFF = [
    [62, _, 69, 67, _, 65, 62, _, 60, 62, 65, 67],
    [69, _, 72, 69, _, 67, 65, _, 67, 69, _, 65],
    [60, _, 67, 65, _, 62, 60, _, 57, 60, 62, 65],
    [57, _, 62, 60, _, 57, 55, _, 57, 60, _, 62],
  ];
  // 해금 lead, 8 bars: [bar, step, midi, steps]
  const B_LEAD = [
    [0, 0, 74, 6], [0, 6, 72, 3], [0, 9, 69, 3], [1, 0, 72, 9], [1, 9, 69, 3], [2, 0, 67, 6], [2, 6, 65, 6], [3, 0, 62, 12],
    [4, 0, 69, 3], [4, 3, 72, 3], [4, 6, 74, 6], [5, 0, 77, 9], [5, 9, 74, 3], [6, 0, 72, 6], [6, 6, 69, 3], [6, 9, 67, 3], [7, 0, 69, 12],
  ];
  // 장구 장단 per bar: 덩(kung+slap) · 쿵 · 덕 · 더러러(roll)
  const JANGGU = { 0: 'dung', 3: 'kung', 5: 'deok', 6: 'dung', 9: 'kung', 10: 'deok', 11: 'deok' };
  // title / story: slow 8-step bars
  const T_PLUCK = [[62, 0], [69, 3], [67, 5], [65, 8], [62, 11], [60, 13], [57, 16], [62, 19], [65, 21], [67, 24], [69, 27], [72, 29]];
  const T_FLUTE = [[74, 0, 10], [72, 12, 4], [69, 16, 12], [67, 32, 6], [69, 38, 4], [65, 42, 6], [62, 48, 16]];

  const TRACKS = {
    title: { bpm: 66, steps: 8, bars: 8, vol: 0.9, drone: [[38, 45], 0.05, 380] },
    story: { bpm: 60, steps: 8, bars: 8, vol: 0.7, drone: [[38, 45], 0.04, 300] },
    battle: { bpm: 138, steps: 12, bars: 8, vol: 0.85, drone: [[26, 38], 0.035, 260] },
  };
  function stepDur() { const T = TRACKS[track]; const bpm = track === 'battle' ? T.bpm + (intensity - 1) * 10 : T.bpm; return 60 / bpm / (T.steps === 12 ? 3 : 2); }

  function playStep(t) {
    const T = TRACKS[track], sd = stepDur(), bar = Math.floor(step / T.steps) % T.bars, s = step % T.steps, cyc = Math.floor(step / (T.steps * T.bars));
    if (track === 'battle') {
      const r = B_ROOTS[bar % 4], k = intensity;
      // percussion
      if (JANGGU[s] === 'dung') { buk(t, 0.42 + 0.06 * k); slap(t, 0.16); }
      else if (JANGGU[s] === 'kung') kung(t, 0.26);
      else if (JANGGU[s] === 'deok') slap(t, s === 11 && k >= 2 ? 0.14 : 0.1);
      if (k >= 2 && (s === 1 || s === 7)) slap(t, 0.05, 3400, 0.04);
      if (k >= 3 && s % 3 === 0) kkwaeng(t, s === 0 ? 0.07 : 0.04);
      if (s === 0 && bar % 4 === 0) jing(t, 0.07 + 0.03 * k, 73.4);
      // dark bass pulse
      if ([0, 2, 3, 5, 6, 8, 9, 11].includes(s)) bass(s === 9 ? r + 7 : r, t, sd * 1.8, s % 3 === 0 ? 0.16 : 0.09);
      // 가야금 ostinato (an octave up in phase 3)
      const n = B_RIFF[bar % 4][s];
      if (n != null) gayageum(n + (k >= 3 && bar >= 4 ? 12 : 0), t, s % 3 === 0 ? 0.1 : 0.07, 0.6);
      // 해금 lead from the second cycle on (phase 1), always from phase 2
      if (cyc >= 1 || k >= 2) for (const [lb, ls, m, len] of B_LEAD) if (lb === bar && ls === s) haegeum(m + (k >= 2 ? 12 : 0), t, len * sd * 0.95, 0.045 + 0.008 * k);
      if (bar === T.bars - 1 && s === 0) riser(t, sd * 12, 0.03 + 0.015 * k);
    } else {
      const total = T.steps * T.bars, at = step % total, q = track === 'title' ? 1 : 0.7;
      for (const [m, st] of T_PLUCK) if (st === at % 32) gayageum(m, t, 0.08 * q, 2.2);
      for (const [m, st, len] of T_FLUTE) if (st === at) daegeum(m, t, len * sd, 0.055 * q);
      if (at === 0) jing(t, track === 'title' ? 0.09 : 0.05, 73.4);
      if (track === 'title' && (at === 16 || at === 48)) buk(t, 0.18, 70);
    }
  }
  function tick() {
    if (!track || !ac) return;
    while (nextT < ac.currentTime + LOOKAHEAD) {
      try { playStep(nextT); } catch (e) { /* keep the clock running */ }
      nextT += stepDur(); step++;
    }
  }
  function begin(name) {
    if (!ready()) { want = name; return; }
    want = null;
    if (track === name) return;
    const now = ac.currentTime;
    bus.gain.cancelScheduledValues(now); bus.gain.setValueAtTime(bus.gain.value, now);
    if (!name) { bus.gain.linearRampToValueAtTime(0, now + 0.8); stopDrone(); track = null; return; }
    track = name; step = 0; nextT = now + 0.1;
    const T = TRACKS[name];
    bus.gain.linearRampToValueAtTime(T.vol, now + 1.2);
    startDrone(...T.drone);
    if (!timer) timer = setInterval(tick, TICK_MS);
  }
  function sting(win) { // short victory / defeat cue, then silence
    begin(null);
    if (!ready()) return;
    const t = ac.currentTime + 0.9;
    bus.gain.cancelScheduledValues(ac.currentTime); bus.gain.setValueAtTime(0.9, t - 0.05);
    if (win) {
      jing(t, 0.14, 73.4); [62, 65, 69, 74].forEach((m, i) => gayageum(m, t + i * 0.16, 0.11, 1.6)); daegeum(81, t + 0.7, 2.4, 0.06);
    } else {
      jing(t, 0.12, 55); daegeum(69, t + 0.3, 1.2, 0.05); daegeum(67, t + 1.5, 1.2, 0.05); daegeum(62, t + 2.7, 2.6, 0.05);
    }
  }
  return {
    play(name) { if (name === 'victory' || name === 'defeat') return sting(name === 'victory'); begin(name); },
    setIntensity(k) { // battle phase 1-3: faster tempo + extra layers; a gong hit marks the turn
      if (k === intensity) return; intensity = k;
      if (track === 'battle' && ready()) { jing(ac.currentTime + 0.05, 0.16, 61.7); riser(ac.currentTime, 1.2, 0.05); }
    },
    resetIntensity() { intensity = 1; },
    poke() { if (want && ready()) begin(want); }, // called after the first tap / key unlocks audio
    get track() { return track; },
  };
})();
