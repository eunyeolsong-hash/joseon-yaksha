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
  let ac = null, master = null, noiseBuf = null;
  function unlock() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain(); master.gain.value = 0.28; master.connect(ac.destination);
        noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { ac = null; }
    }
    if (ac && ac.state === 'suspended') ac.resume();
  }
  function tone(f, dur, type = 'sine', vol = 0.2, slide = 0, delay = 0) {
    const t0 = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.linearRampToValueAtTime(Math.max(20, f + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol = 0.3, freq = 2000, type = 'bandpass', delay = 0) {
    const t0 = ac.currentTime + delay;
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t0); s.stop(t0 + dur + 0.02);
  }
  const P = {
    ui() { tone(720, 0.07, 'sine', 0.14); },
    page() { noise(0.12, 0.15, 3000); },
    swing() { noise(0.1, 0.22, 1200); },
    slash() { noise(0.09, 0.28, 4500, 'highpass'); tone(1400, 0.05, 'triangle', 0.04, -600); },
    hit() { noise(0.07, 0.4, 1800); tone(160, 0.08, 'square', 0.1, -80); },
    crit() { noise(0.12, 0.5, 2500); tone(220, 0.15, 'sawtooth', 0.14, -150); },
    block() { tone(1100, 0.12, 'triangle', 0.1, -500); tone(1650, 0.08, 'sine', 0.05, -800); },
    jump() { tone(380, 0.09, 'sine', 0.07, 260); },
    dodge() { noise(0.15, 0.2, 3000, 'highpass'); },
    hurt() { tone(180, 0.2, 'sawtooth', 0.16, -110); noise(0.1, 0.28, 900); },
    smoke() { noise(0.5, 0.25, 400, 'lowpass'); tone(110, 0.4, 'sine', 0.12, -40); },
    dash() { noise(0.18, 0.25, 2500, 'highpass'); },
    ult() { tone(220, 0.5, 'sawtooth', 0.1, 440); noise(0.4, 0.2, 1500); },
    tag() { tone(520, 0.08, 'triangle', 0.13, 380); tone(880, 0.1, 'sine', 0.07, 0, 0.06); },
    boom() { noise(0.45, 0.5, 500, 'lowpass'); tone(70, 0.45, 'sine', 0.32, -35); },
    charge() { tone(160, 2.4, 'sawtooth', 0.045, 700); tone(240, 2.4, 'triangle', 0.045, 900); },
    beam() { noise(0.8, 0.42, 900, 'lowpass'); tone(90, 0.8, 'sawtooth', 0.16, -30); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.35, 'triangle', 0.14, 0, i * 0.12)); },
    lose() { [392, 330, 262].forEach((f, i) => tone(f, 0.5, 'sine', 0.14, 0, i * 0.22)); },
  };
  return { unlock, play(n) { if (!ac) return; try { if (P[n]) P[n](); } catch (e) { /* ignore */ } } };
})();

// ---------- input: keyboard + multi-touch virtual buttons ----------
const Input = (() => {
  const KEYMAP = {
    ArrowLeft: ['left'], KeyA: ['left'], ArrowRight: ['right'], KeyD: ['right'],
    ArrowDown: ['down'], KeyS: ['down'], ArrowUp: ['jump', 'up'], KeyW: ['jump', 'up'],
    Space: ['jump', 'confirm'], KeyJ: ['attack'], KeyK: ['skill'], KeyU: ['ult'], KeyI: ['ult'],
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
