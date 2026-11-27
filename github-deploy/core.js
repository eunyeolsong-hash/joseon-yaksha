'use strict';
// ============================================================
// core.js — constants, canvas scaling, utils, save, sound, input, UI
// ============================================================
const W = 960, H = 540;          // logical resolution (landscape)
const GROUND_Y = 462;            // street level in world coords
const WORLD_W = 1920;            // battle arena width
const GRAVITY = 2300;
const SERIF = '"Nanum Myeongjo", "AppleMyungjo", "Batang", serif';
const SANS = '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const VIEW = { ratio: 1 };

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  const cw = Math.round(W * s), ch = Math.round(H * s);
  canvas.style.width = cw + 'px';
  canvas.style.height = ch + 'px';
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  VIEW.ratio = canvas.width / W;
}
window.addEventListener('resize', resize);
resize();

// ---------- utils ----------
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const sign = v => (v > 0 ? 1 : v < 0 ? -1 : 0);
const easeOut = t => 1 - Math.pow(1 - t, 3);
function rectsOverlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2); }
function seg(c, x1, y1, x2, y2) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
function outlinedText(c, text, x, y, fill, stroke = '#000', lw = 4) {
  c.lineJoin = 'round';
  c.strokeStyle = stroke; c.lineWidth = lw; c.strokeText(text, x, y);
  c.fillStyle = fill; c.fillText(text, x, y);
}
// Word-wrap that also breaks long Korean runs character by character.
function wrapText(c, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (c.measureText(test).width <= maxW) { line = test; continue; }
      if (line) out.push(line);
      if (c.measureText(word).width > maxW) {
        let l = '';
        for (const ch of word) {
          if (c.measureText(l + ch).width > maxW) { out.push(l); l = ch; } else l += ch;
        }
        line = l;
      } else line = word;
    }
    out.push(line);
  }
  return out;
}

// ---------- save (per-browser, optional) ----------
const Save = {
  get(k, d = null) { try { const v = localStorage.getItem('joseon-yaksha:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('joseon-yaksha:' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
};

// ---------- tiny synth SFX (WebAudio, no asset files) ----------
const Sfx = (() => {
  // Soft synthesized SFX: sine thumps + filtered-noise whooshes through a compressor.
  // (The old square/sawtooth tones and the long beam-charge drone sounded harsh.)
  let ac = null, master = null, noiseBuf = null, musicOut = null;
  let muted = Save.get('muted', false);
  const last = {};
  function unlock() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        const comp = ac.createDynamicsCompressor();
        comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.15;
        master = ac.createGain(); master.gain.value = muted ? 0 : 0.5;
        master.connect(comp); comp.connect(ac.destination);
        musicOut = ac.createGain(); musicOut.gain.value = 0.75; musicOut.connect(master); // BGM bus (music.js) — muted with everything else
        noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { ac = null; }
    }
    if (ac && ac.state === 'suspended') ac.resume().then(() => { if (typeof Music !== 'undefined') Music.poke(); });
    if (typeof Music !== 'undefined') Music.poke();
  }
  function env(g, t0, vol, atk, dur) { // click-free attack/decay envelope
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }
  function tone(f, dur, vol = 0.15, slide = 0, delay = 0, type = 'sine') {
    const t0 = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t0 + dur);
    env(g, t0, vol, 0.006, dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.03);
  }
  function whoosh(dur, vol = 0.12, f0 = 800, f1 = 2400, q = 1.2, delay = 0) { // band-passed noise sweep
    const t0 = ac.currentTime + delay;
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ac.createGain(); env(g, t0, vol, Math.min(0.03, dur * 0.3), dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t0); s.stop(t0 + dur + 0.03);
  }
  function thump(f = 90, dur = 0.16, vol = 0.22, delay = 0) { tone(f, dur, vol, -f * 0.5, delay); }
  const P = {
    ui() { tone(880, 0.06, 0.06); tone(1320, 0.05, 0.03, 0, 0.02); },
    page() { whoosh(0.18, 0.05, 1200, 3200, 0.8); },
    swing() { whoosh(0.12, 0.08, 600, 1800); },
    slash() { whoosh(0.1, 0.09, 1800, 5200, 1.5); },
    hit() { thump(120, 0.12, 0.2); whoosh(0.05, 0.05, 2000, 1200, 1); },
    crit() { thump(100, 0.18, 0.26); tone(660, 0.12, 0.05, 220); },
    block() { tone(1250, 0.1, 0.05, -400); tone(1870, 0.08, 0.025, -600, 0.01); },
    jump() { whoosh(0.12, 0.05, 500, 1400, 0.9); },
    dodge() { whoosh(0.16, 0.07, 2600, 900, 1.2); },
    hurt() { thump(150, 0.18, 0.2); tone(300, 0.15, 0.05, -120); },
    smoke() { whoosh(0.45, 0.08, 300, 900, 0.7); thump(70, 0.3, 0.12); },
    water() { whoosh(0.35, 0.09, 900, 300, 0.8); tone(520, 0.2, 0.04, 200); },
    wind() { whoosh(0.4, 0.09, 400, 2200, 0.7); },
    dash() { whoosh(0.16, 0.08, 1500, 3800, 1); },
    ult() { tone(330, 0.35, 0.06, 330); tone(495, 0.35, 0.04, 495, 0.04); whoosh(0.4, 0.07, 500, 2600, 0.8); },
    synergy() { [392, 523, 659, 784].forEach((f, i) => tone(f, 0.3, 0.05, 0, i * 0.06)); whoosh(0.5, 0.08, 400, 3000, 0.8); },
    tag() { tone(660, 0.08, 0.06, 220); tone(990, 0.08, 0.04, 0, 0.05); },
    boom() { thump(70, 0.35, 0.3); whoosh(0.3, 0.07, 900, 200, 0.7); },
    charge() { tone(220, 0.5, 0.04, 440); tone(330, 0.5, 0.03, 660, 0.25); },
    beam() { thump(60, 0.5, 0.26); whoosh(0.6, 0.09, 600, 1800, 0.6); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.4, 0.07, 0, i * 0.12, 'triangle')); },
    lose() { [392, 330, 262].forEach((f, i) => tone(f, 0.55, 0.07, 0, i * 0.22)); },
  };
  return {
    unlock,
    get ctx() { return ac; },
    get musicOut() { return musicOut; },
    play(n) {
      if (!ac || muted) return;
      const now = ac.currentTime;
      if (last[n] && now - last[n] < 0.05) return; // drop rapid repeats (flurries used to stack into noise)
      last[n] = now;
      try { if (P[n]) P[n](); } catch (e) { /* ignore */ }
    },
    get muted() { return muted; },
    toggle() { muted = !muted; Save.set('muted', muted); if (master) master.gain.value = muted ? 0 : 0.5; if (!muted) this.play('ui'); return muted; },
  };
})();

// ---------- input: keyboard + multi-touch virtual buttons ----------
const Input = (() => {
  const KEYMAP = {
    ArrowLeft: ['left'], KeyA: ['left'], ArrowRight: ['right'], KeyD: ['right'],
    ArrowDown: ['down'], KeyS: ['down'], ArrowUp: ['jump', 'up'], KeyW: ['jump', 'up'],
    Space: ['jump', 'confirm'], KeyJ: ['attack'], KeyK: ['skill'], KeyU: ['ult'], KeyI: ['ult'], KeyO: ['synergy'], KeyY: ['synergy'], KeyM: ['mute'],
    KeyL: ['dodge'], ShiftLeft: ['dodge'], ShiftRight: ['dodge'], KeyQ: ['tag'], Tab: ['tag'],
    Enter: ['confirm'], NumpadEnter: ['confirm'], Escape: ['pause'], KeyP: ['pause'],
  };
  const keys = new Set();
  const pulse = new Set();      // presses that began since last poll (so very quick taps are never lost)
  const pointers = new Map();
  let taps = [], buttons = [], cur = {}, prev = {}, touch = false;

  function logical(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }
  function btnAt(p) {
    for (const b of buttons) {
      const dx = p.x - b.x, dy = p.y - b.y;
      if (dx * dx + dy * dy <= (b.r * 1.2) ** 2) return b;
    }
    return null;
  }
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault(); Sfx.unlock();
    if (e.pointerType === 'touch') touch = true;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    const p = logical(e);
    pointers.set(e.pointerId, p);
    const b = btnAt(p);
    if (b) pulse.add(b.action); else taps.push({ x: p.x, y: p.y, used: false });
  });
  canvas.addEventListener('pointermove', e => { if (pointers.has(e.pointerId)) pointers.set(e.pointerId, logical(e)); });
  const up = e => pointers.delete(e.pointerId);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('lostpointercapture', up);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('keydown', e => {
    const a = KEYMAP[e.code];
    if (a) { e.preventDefault(); if (!e.repeat) a.forEach(x => pulse.add(x)); }
    keys.add(e.code); Sfx.unlock();
  });
  window.addEventListener('keyup', e => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); pointers.clear(); });

  return {
    poll() {
      const n = {};
      for (const k of keys) for (const a of (KEYMAP[k] || [])) n[a] = true;
      for (const p of pointers.values()) { const b = btnAt(p); if (b) n[b.action] = true; }
      for (const a of pulse) n[a] = true;
      pulse.clear(); prev = cur; cur = n;
    },
    endFrame() { taps = []; },
    held: a => !!cur[a],
    pressed: a => !!cur[a] && !prev[a],
    setButtons(b) { buttons = b || []; },
    tapIn(x, y, w, h) {
      for (const t of taps) if (!t.used && t.x >= x && t.x <= x + w && t.y >= y && t.y <= y + h) { t.used = true; return true; }
      return false;
    },
    tapCircle(x, y, r) {
      for (const t of taps) if (!t.used && (t.x - x) ** 2 + (t.y - y) ** 2 <= r * r) { t.used = true; return true; }
      return false;
    },
    anyTap() { for (const t of taps) if (!t.used) { t.used = true; return true; } return false; },
    get touch() { return touch; },
  };
})();

// ---------- simple canvas UI ----------
const UI = {
  button(c, x, y, w, h, label, opt = {}) {
    c.save();
    roundRect(c, x, y, w, h, 10);
    const g = c.createLinearGradient(0, y, 0, y + h);
    if (opt.disabled) { g.addColorStop(0, '#3a2a3a'); g.addColorStop(1, '#1e141e'); }
    else if (opt.primary) { g.addColorStop(0, '#c8203e'); g.addColorStop(1, '#5a0a1c'); }
    else { g.addColorStop(0, '#3a1a3e'); g.addColorStop(1, '#180a1c'); }
    c.fillStyle = g; c.fill();
    c.shadowColor = '#ff4a8a'; c.shadowBlur = opt.disabled ? 0 : 12;
    c.lineWidth = 2; c.strokeStyle = opt.primary ? '#ffb0c8' : 'rgba(255,160,200,0.6)'; c.stroke(); c.shadowBlur = 0;
    c.fillStyle = opt.disabled ? '#8a8a96' : '#fff';
    c.font = `700 ${opt.size || 20}px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(label, x + w / 2, y + h / 2 + 1);
    c.restore();
  },
};
