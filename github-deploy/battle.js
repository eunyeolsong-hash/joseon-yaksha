'use strict';
// ============================================================
// battle.js — STAGE 1-5 「해님달님 — 원한의 끝」
//   2-character tag party (any two of 이동민·최호철·김선달·심청이), 요기 matchup rule
//   (간장·막야 absorb half of the 요기 술법 — 최호철's smoke skills and 심청이's 수류 술법; fists, blades and fans hit normally),
//   2인 시너지 합동기 (auto-assist 파마해체 for 최호철+이동민), twin-sword beam, 3 boss phases.
// ============================================================
const NO_INPUT = { held: () => false, pressed: () => false };
const PHASE_NAMES = { 1: '오누이의 협동 공격', 2: '막야의 주화입마', 3: '해님의 동요' };

// Numbers follow the design doc (조선야차_게임기획서, §2 and §4-2) where it gives them.
// frames: which doc-art sprite each state shows (see SPRITES in assets.js).
const CHAR_DATA = {
  hocheol: {
    name: '최호철', title: '월광대 의정부지부 팀장', hp: 1100, atk: 58, speed: 255, yogi: true,
    combo: [
      { dur: 0.34, hitAt: 0.11, range: 80, height: 60, mult: 1.0, push: 140, lunge: 120, frame: 'hocheol_punch', fx: 'punch' },
      { dur: 0.34, hitAt: 0.11, range: 80, height: 60, mult: 1.0, push: 140, lunge: 120, frame: 'hocheol_p4', fx: 'punch' },
      { dur: 0.5, hitAt: 0.2, range: 106, height: 72, mult: 1.7, push: 320, lunge: 260, frame: 'hocheol_p5', fx: 'pipe' },
    ],
    frames: { idle: 'hocheol_p1', walk: 'hocheol_p3', ready: 'hocheol_p3', air: 'hocheol_p4', dodge: 'hocheol_dash', skill: 'hocheol_cast', tagin: 'hocheol_punch', ult: ['hocheol_aura', 'hocheol_ult'], grab: 'hocheol_punch' },
    skill: { name: '흑연호박', hanja: '黑煙虎縛', cd: 8, desc: '검은 연기 호랑이로 광역 피해 + 2초 속박' },
    ult: { name: '흑연호왕', hanja: '黑煙虎王', desc: '연기 흑호 돌진 후 폭발' },
    passive: { name: '맹호의 위압', hanja: '猛虎之威' },
  },
  dongmin: {
    name: '이동민', title: '월광대 전투부원 · 344기', hp: 920, atk: 42, speed: 305, yogi: false,
    combo: [
      { dur: 0.22, hitAt: 0.07, range: 72, height: 58, mult: 0.9, push: 60, lunge: 140, frame: 'dongmin_slash1', fx: 'blade' },
      { dur: 0.22, hitAt: 0.07, range: 72, height: 58, mult: 0.9, push: 60, lunge: 140, frame: 'dongmin_slash2', fx: 'blade2' },
      { dur: 0.24, hitAt: 0.08, range: 76, height: 58, mult: 1.0, push: 80, lunge: 160, frame: 'dongmin_p5', fx: 'blade' },
      { dur: 0.4, hitAt: 0.14, range: 94, height: 72, mult: 1.8, push: 240, lunge: 240, frame: 'dongmin_lunge', fx: 'bladeBig' },
    ],
    frames: { idle: 'dongmin_p1', ready: 'dongmin_p4', air: 'dongmin_slash2', dodge: 'dongmin_p3', skill: 'dongmin_lunge', tagin: 'dongmin_lunge', ult: ['dongmin_dash', 'dongmin_ult', 'dongmin_slash2'], grab: 'dongmin_grab' },
    skill: { name: '해체자의 악력', hanja: '解體者握力', cd: 7, desc: '돌진 잡기 연타 + 방어력 15% 감소 + 2초 기절' },
    ult: { name: '광인의 해체식', hanja: '狂人의 解體式', desc: '돌진 베기 → 연속 베기 → 내려베기(3초 기절)' },
    passive: { name: '해체 본능', hanja: '解體本能' },
  },
  seondal: {
    name: '김선달', title: '월광대 반장', hp: 980, atk: 46, speed: 290, yogi: false,
    combo: [
      // 원거리 딜러: 부채 바람을 날린다 (range = 사거리, FanShot 참고). 뒤로 살짝 물러나며 쏜다.
      { dur: 0.3, hitAt: 0.1, range: 520, height: 60, mult: 0.85, push: 70, lunge: -40, frame: 'seondal_p4', fx: 'fan', shot: true },
      { dur: 0.32, hitAt: 0.11, range: 520, height: 60, mult: 0.85, push: 70, lunge: -40, frame: 'seondal_throw', fx: 'fan', shot: true },
      { dur: 0.48, hitAt: 0.17, range: 620, height: 90, mult: 1.45, push: 240, lunge: -70, frame: 'seondal_p5', fx: 'fanBig', shot: true },
    ],
    frames: { idle: 'seondal_p1', ready: 'seondal_p4', air: 'seondal_throw', dodge: 'seondal_p3', skill: 'seondal_p5', tagin: 'seondal_throw', ult: ['seondal_p4', 'seondal_p5'], grab: 'seondal_push' },
    skill: { name: '만리추풍', hanja: '萬里追風', cd: 6, desc: '직선 바람 관통 피해 + 끝에서 폭발해 밀쳐냄' },
    ult: { name: '천풍만리', hanja: '天風萬里', desc: '회오리로 끌어당겨 지속 피해 후 광역 폭발' },
    passive: { name: '풍류의 잔상', hanja: '風流의 殘像' },
  },
  simcheong: {
    name: '심청이', title: '용왕의 핏줄 · 수류 야차', hp: 1040, atk: 50, speed: 300, yogi: false,
    combo: [
      { dur: 0.26, hitAt: 0.08, range: 92, height: 62, mult: 0.95, push: 80, lunge: 150, frame: 'simcheong_p3', fx: 'sword' },
      { dur: 0.28, hitAt: 0.09, range: 96, height: 70, mult: 1.0, push: 90, lunge: 150, frame: 'simcheong_p4', fx: 'swordUp' },
      { dur: 0.42, hitAt: 0.15, range: 118, height: 78, mult: 1.7, push: 260, lunge: 240, frame: 'simcheong_p5', fx: 'swordBig' },
    ],
    frames: { idle: 'simcheong_p1', ready: 'simcheong_p3', air: 'simcheong_p2', dodge: 'simcheong_lunge', skill: 'simcheong_water', tagin: 'simcheong_p3', ult: ['simcheong_p2', 'simcheong_p5'], grab: 'simcheong_thrust' },
    skill: { name: '심연수류', hanja: '深淵水流', cd: 7, desc: '전방 직선 물줄기 관통 + 3초간 이동·공격 30% 둔화' },
    ult: { name: '흑련개화: 야차강림', hanja: '黑蓮開花: 夜叉降臨', desc: '흑련 영역으로 끌어당겨 지속 피해 → 내려찍기(2.5초 기절)' },
    passive: { name: '인당수의 한', hanja: '印塘水之恨' },
  },
};
// 심청이 용 변신 (야차강림 각성형) — 궁극기를 쓰면 변신, 궁극기가 끝난 뒤에도 DRAGON_DUR초 유지. 평타 피해 +25%.
const DRAGON_DUR = 15;
const DRAGON_FRAMES = {
  idle: 'simdragon_p1', ready: 'simdragon_p2', air: 'simdragon_p3', dodge: 'simdragon_p3', skill: 'simdragon_p4', tagin: 'simdragon_p5',
  grab: 'simdragon_p5', ult: ['simdragon_p4', 'simdragon_p5'], combo: ['simdragon_p3', 'simdragon_p5', 'simdragon_p4'],
};
const HAN_HP = 0.3; // 인당수의 한 발동 체력 (design doc: 30%)
const PLAYABLE = ['dongmin', 'hocheol', 'seondal', 'simcheong'];

// 2인 시너지 (design doc §2-3). Key = the two character keys sorted and joined with '+'.
const SYNERGY = {
  'dongmin+seondal':   { name: '풍혈도륙', hanja: '風血屠戮', kind: 'vortex', color: '#7fd8ff', desc: '회오리로 묶은 적에게 이동민의 난도질 — 타격 2배, 막타 방어 무시' },
  'dongmin+hocheol':   { name: '파마해체', hanja: '破魔解體', kind: 'assist', color: '#ff5a5a', desc: '요기에 막히면 이동민 자동 난입 — 기절 2초 + 방어력 30% 감소, 봉인 해제' },
  'hocheol+seondal':   { name: '흑풍맹호격', hanja: '黑風猛虎擊', kind: 'tiger', color: '#b47cff', desc: '바람으로 거대해진 연기 호랑이 — 화면 전체 속박, 두 사람 공·방 +10%' },
  'dongmin+simcheong': { name: '심연의 단두대', hanja: '深淵斷頭臺', kind: 'guillotine', color: '#ff4a7a', desc: '해체로 방어를 깎고 흑련 낙하 — 잃은 체력 비례 피해 1.5배, 회복 공유' },
  'seondal+simcheong': { name: '흑수풍운', hanja: '黑水風雲', kind: 'storm', color: '#4fd2ff', desc: '물줄기를 빨아올린 해일 폭풍 — 둔화된 적 경직, 광역 홀딩' },
  'hocheol+simcheong': { name: '용호야차진', hanja: '龍虎夜叉陣', kind: 'rush', color: '#ff9a3c', desc: '호랑이와 야차의 교차 돌진 — 슈퍼아머, 받는 피해 감소' },
};
const pairKey = (a, b) => [a, b].sort().join('+');

// ---------------- effects ----------------
class Effects {
  constructor() { this.p = []; this.txt = []; this.sl = []; this.rg = []; this.gh = []; this.vf = []; this.sw = []; this.t = 0; this.lastGhost = 0; }
  update(dt) {
    this.t += dt;
    for (const p of this.p) {
      p.life -= dt;
      const d = Math.pow(p.drag, dt);
      p.vx *= d; p.vy = p.vy * d + p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    this.p = this.p.filter(p => p.life > 0);
    for (const a of [this.txt, this.sl, this.rg, this.gh, this.sw]) for (const e of a) e.life -= dt;
    this.sw = this.sw.filter(e => e.life > 0);
    this.txt = this.txt.filter(e => e.life > 0);
    this.sl = this.sl.filter(e => e.life > 0);
    this.rg = this.rg.filter(e => e.life > 0);
    this.gh = this.gh.filter(e => e.life > 0);
    for (const v of this.vf) { v.life -= dt; v.x += v.vx * dt; v.y += v.vy * dt; v.rot += v.spin * dt; }
    this.vf = this.vf.filter(v => v.life > 0);
  }
  // Painted VFX sprite (vfx_*.webp from the VFX asset sheet). w = width in world px.
  // o: life, s0 → s1 (scale over life), fin (fade-in time), alpha, rot, spin, flip, ax/ay, sy, add, vx/vy, h
  vfx(name, x, y, w, o = {}) {
    if (this.vf.length > 60 || !Assets.vfxReady(name)) return;
    const life = o.life || 0.5;
    this.vf.push(Object.assign({ name, x, y, w, s0: 1, s1: 1.15, fin: 0.06, alpha: 1, rot: 0, spin: 0, vx: 0, vy: 0 }, o, { life, max: life }));
  }
  part(x, y, o) {
    if (this.p.length > 600) return;
    const life = o.life != null ? o.life : 0.5;
    this.p.push(Object.assign({ x, y, vx: 0, vy: 0, size: 3, color: '#fff', grav: 0, drag: 0.1, shape: 'dot', grow: 0 }, o, { life, max: life }));
  }
  spark(x, y, color = '#fff', n = 10, spd = 320) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), s = rand(0.3, 1) * spd;
      this.part(x, y, { vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.18, 0.4), size: rand(2, 3.5), color, drag: 0.02, shape: 'line' });
    }
  }
  smoke(x, y, n = 6, col = 'rgba(20,18,26,0.8)', spread = 40) {
    for (let i = 0; i < n; i++) this.part(x + rand(-spread, spread), y + rand(-spread * 0.6, spread * 0.6), { vx: rand(-40, 40), vy: rand(-80, -20), life: rand(0.5, 1.0), size: rand(10, 22), color: col, drag: 0.3, shape: 'puff', grow: 18 });
  }
  dust(x, y) { for (let i = 0; i < 6; i++) this.part(x + rand(-12, 12), y - 2, { vx: rand(-90, 90), vy: rand(-60, -10), life: 0.35, size: rand(4, 8), color: 'rgba(160,150,170,0.5)', shape: 'puff', grow: 10, drag: 0.05 }); }
  impact(x, y, color = '#fff') { this.spark(x, y, color, 8, 360); this.ring(x, y, 40, color, 0.18); }
  slash(x, y, dir, r, flip, color) { this.sl.push({ x, y, dir, r, flip, color, life: 0.18, max: 0.18 }); }
  // 검기 궤적: 칼끝이 a0 → a1로 휘어 지나가며 남기는 빛의 초승달 (가산 합성 글로우 + 흰 심선).
  // 각도는 캐릭터 정면 기준(0 = 앞, + = 아래). flipY = 올려베기, tilt = 궤적 기울기.
  swing(x, y, dir, o = {}) {
    if (this.sw.length > 24) return;
    const life = o.life || 0.24;
    this.sw.push(Object.assign({ x, y, dir, r: 60, color: '#ffffff', core: '#ffffff', a0: -1.35, a1: 1.05, thick: 14, tilt: 0, flipY: false, sweep: 0.38 }, o, { life, max: life }));
  }
  // 타격 섬광: 가산 합성 방사광 + 뾰족한 충격 가시 (주먹·둔기용)
  flash(x, y, r, color, dir = 1, o = {}) {
    if (this.sw.length > 24) return;
    const life = o.life || 0.16;
    this.sw.push(Object.assign({ kind: 'flash', x, y, r, color, dir, spikes: 7, cone: 1.1, rot: rand(0, 6) }, o, { life, max: life }));
  }
  ring(x, y, r, color, life = 0.35, flat = false) { this.rg.push({ x, y, r, color, life, max: life, flat }); }
  text(x, y, s, color, size = 18, life = 0.9) { this.txt.push({ x: x + rand(-8, 8), y, s, color, size, life, max: life }); }
  ghost(key, x, y, facing, frame) {
    if (this.t - this.lastGhost < 0.03) return;
    this.lastGhost = this.t;
    this.gh.push({ key, x, y, facing, frame, life: 0.22, max: 0.22 });
  }
  draw(c) {
    for (const g of this.gh) drawFighter(c, g.key, g.x, g.y, g.facing, { flash: true, alpha: (g.life / g.max) * 0.35, frame: g.frame });
    for (const r of this.rg) {
      const k = 1 - r.life / r.max;
      c.globalAlpha = (1 - k) * 0.9; c.strokeStyle = r.color; c.lineWidth = 6 * (1 - k) + 1;
      c.beginPath();
      if (r.flat) c.ellipse(r.x, r.y, r.r * (0.3 + k), r.r * (0.3 + k) * 0.28, 0, 0, Math.PI * 2);
      else c.arc(r.x, r.y, r.r * (0.3 + k * 0.9), 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = 1;
    for (const v of this.vf) {
      const age = v.max - v.life, k = age / v.max, s = lerp(v.s0, v.s1, easeOut(k));
      const a = v.alpha * Math.min(1, v.fin > 0 ? age / v.fin : 1) * Math.min(1, v.life / (v.max * 0.45));
      drawVfx(c, v.name, v.x, v.y, v.w * s, { alpha: a, rot: v.rot, flip: v.flip, ax: v.ax, ay: v.ay, sy: v.sy, add: v.add, h: v.h ? v.h * s : 0 });
    }
    for (const s of this.sw) drawSwing(c, s);
    for (const p of this.p) {
      const k = p.life / p.max;
      c.globalAlpha = Math.min(1, k * 1.5); c.fillStyle = p.color; c.strokeStyle = p.color;
      if (p.shape === 'line') { c.lineWidth = p.size; seg(c, p.x, p.y, p.x - p.vx * 0.03, p.y - p.vy * 0.03); }
      else if (p.shape === 'puff') { circle(c, p.x, p.y, p.size + p.grow * (1 - k)); c.fill(); }
      else c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    c.globalAlpha = 1;
    for (const s of this.sl) {
      const k = s.life / s.max;
      c.save(); c.translate(s.x, s.y); c.scale(s.dir, s.flip ? -1 : 1); c.rotate(-0.25);
      c.globalAlpha = Math.min(1, k * 1.6); c.fillStyle = s.color;
      c.beginPath(); c.arc(0, 0, s.r, -1.25, 1.25); c.arc(-s.r * 0.28, 0, s.r * 0.86, 1.15, -1.15, true); c.closePath(); c.fill();
      c.globalAlpha *= 0.8; c.fillStyle = '#fff';
      c.beginPath(); c.arc(0, 0, s.r, -0.9, 0.9); c.arc(-s.r * 0.12, 0, s.r * 0.93, 0.85, -0.85, true); c.closePath(); c.fill();
      c.restore();
    }
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const e of this.txt) {
      const k = 1 - e.life / e.max, pop = k < 0.12 ? 1 + (0.12 - k) * 4 : 1;
      c.globalAlpha = e.life < 0.25 ? e.life / 0.25 : 1;
      c.font = `900 ${Math.round(e.size * pop)}px ${SANS}`;
      outlinedText(c, e.s, e.x, e.y - easeOut(k) * 42, e.color, 'rgba(0,0,0,0.85)', 4);
    }
    c.globalAlpha = 1;
  }
}

function drawSwing(c, s) {
  if (s.kind === 'flash') return drawFlash(c, s);
  const age = s.max - s.life, K = age / s.max;
  const p = Math.min(1, K / s.sweep), fade = Math.min(1, s.life / (s.max * 0.55));
  const head = s.a0 + (s.a1 - s.a0) * easeOut(p);
  const tail = s.a0 + (s.a1 - s.a0) * Math.max(0, (K - 0.2) / 0.8) * 0.85;
  if (head - tail < 0.02) return;
  c.save(); c.translate(s.x, s.y); c.scale(s.dir, s.flipY ? -1 : 1); c.rotate(s.tilt);
  c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
  const N = 12;
  for (let pass = 0; pass < 3; pass++) { // 0 = 넓은 글로우, 1 = 색 칼날, 2 = 흰 심선
    const wMul = pass === 0 ? 2.4 : pass === 1 ? 1 : 0.32, aMul = pass === 0 ? 0.16 : pass === 1 ? 0.6 : 0.95;
    c.strokeStyle = pass === 2 ? s.core : s.color;
    for (let i = 0; i < N; i++) {
      const k1 = (i + 1) / N, a0 = tail + (head - tail) * (i / N), a1 = tail + (head - tail) * k1;
      c.globalAlpha = fade * aMul * (0.15 + 0.85 * k1);
      c.lineWidth = s.thick * wMul * (0.12 + 0.88 * k1 * k1);
      c.beginPath(); c.arc(0, 0, s.r - (pass === 2 ? s.thick * 0.12 : 0), a0, a1 + 0.01); c.stroke();
    }
  }
  if (p < 1) { // 칼끝 섬광
    const hx = Math.cos(head) * s.r, hy = Math.sin(head) * s.r;
    c.globalAlpha = fade * 0.9; c.fillStyle = s.core;
    circle(c, hx, hy, s.thick * 0.45); c.fill();
    c.globalAlpha = fade * 0.35; c.fillStyle = s.color;
    circle(c, hx, hy, s.thick * 0.85); c.fill();
  }
  c.restore();
}

function drawFlash(c, s) {
  const K = 1 - s.life / s.max, a = Math.min(1, s.life / (s.max * 0.6)), R = s.r * (0.55 + 0.6 * easeOut(K));
  c.save(); c.translate(s.x, s.y); c.scale(s.dir, 1); c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(0, 0, 0, 0, 0, R);
  g.addColorStop(0, 'rgba(255,255,255,' + (0.95 * a) + ')'); g.addColorStop(0.25, s.color); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.globalAlpha = a; c.fillStyle = g; circle(c, 0, 0, R); c.fill();
  c.fillStyle = s.color; c.globalAlpha = a * 0.9;
  for (let i = 0; i < s.spikes; i++) { // 정면 쪽으로 쏠린 충격 가시
    const ang = (i / (s.spikes - 1) - 0.5) * 2 * s.cone + Math.sin(s.rot + i * 2.3) * 0.12, L = R * (1.1 + 0.6 * ((i * 37) % 5) / 5);
    const w = R * 0.13;
    c.beginPath(); c.moveTo(Math.cos(ang + 1.57) * w, Math.sin(ang + 1.57) * w); c.lineTo(Math.cos(ang) * L, Math.sin(ang) * L); c.lineTo(Math.cos(ang - 1.57) * w, Math.sin(ang - 1.57) * w); c.fill();
  }
  c.globalAlpha = a; c.fillStyle = '#ffffff'; circle(c, 0, 0, R * 0.22); c.fill();
  c.restore();
}

// ---------------- base physics body ----------------
class Fighter {
  constructor(b) { this.b = b; this.x = 0; this.y = GROUND_Y; this.vx = 0; this.vy = 0; this.kbv = 0; this.facing = 1; this.onGround = true; this.flash = 0; this.walk = 0; this.dropT = 0; this.w = 36; this.h = 92; }
  rect() { return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h }; }
  frontRect(range, height, off = 0) {
    return { x: this.facing > 0 ? this.x + off : this.x - off - range, y: this.y - this.h * 0.55 - height / 2, w: range, h: height };
  }
  face(dx) { if (dx) this.facing = dx > 0 ? 1 : -1; }
  physics(dt, usePlatforms = true) {
    const prevY = this.y;
    this.vy = Math.min(1700, this.vy + GRAVITY * dt);
    this.x += (this.vx + this.kbv) * dt;
    this.kbv *= Math.pow(0.004, dt);
    if (Math.abs(this.kbv) < 5) this.kbv = 0;
    this.y += this.vy * dt;
    this.onGround = false;
    if (this.y >= GROUND_Y) { this.y = GROUND_Y; this.vy = 0; this.onGround = true; }
    else if (usePlatforms && this.vy >= 0 && this.dropT <= 0) {
      for (const p of this.b.platforms) {
        if (prevY <= p.y + 1 && this.y >= p.y && this.x > p.x - 8 && this.x < p.x + p.w + 8) { this.y = p.y; this.vy = 0; this.onGround = true; break; }
      }
    }
    this.x = clamp(this.x, 70, WORLD_W - 70);
    if (this.onGround && Math.abs(this.vx) > 10) this.walk += dt * Math.abs(this.vx) / 20;
  }
  groundBelow() {
    let g = GROUND_Y;
    for (const p of this.b.platforms) if (this.x > p.x - 8 && this.x < p.x + p.w + 8 && p.y >= this.y - 1 && p.y < g) g = p.y;
    return g;
  }
  drawShadow(c, r = 22) {
    const gy = this.groundBelow(), k = clamp(1 - (gy - this.y) / 300, 0.3, 1);
    c.fillStyle = `rgba(0,0,0,${0.35 * k})`; c.beginPath(); c.ellipse(this.x, gy + 1, r * k, 6 * k, 0, 0, Math.PI * 2); c.fill();
  }
}

// ---------------- player characters ----------------
class Player extends Fighter {
  constructor(b, key) {
    super(b);
    this.key = key; this.d = CHAR_DATA[key];
    this.maxHp = this.hp = this.d.hp; this.atk = this.d.atk; this.yogi = this.d.yogi;
    this.h = Math.round(118 * STYLES[key].scale); this.w = 34;
    this.state = 'idle'; this.st = 0; this.comboIdx = 0; this.queued = false; this.hitDone = false;
    this.inv = 0; this.skillCd = 0; this.ult = 0; this.sealed = 0; this.bound = 0; this.dodgeCd = 0; this.jumps = 0;
    this.dead = false; this.grabTarget = null; this.grabHits = 0; this.ultStage = 0; this.ultHit = null; this.ultTick = 0;
    this.fanStacks = 0;      // 김선달 풍류의 잔상
    this.combatT = 0;        // >0 → stand in the painted battle stance instead of the relaxed side pose
    this.buffAtk = 0; this.buffDef = 0;  // 시너지 버프 (seconds left)
    this.curFrame = null; this.prevFrame = null; this.frameAt = 0;
  }
  setState(s) { this.state = s; this.st = 0; this.hitDone = false; }
  update(dt) {
    const b = this.b, I = b.locked ? NO_INPUT : Input;
    this.st += dt;
    for (const k of ['inv', 'skillCd', 'sealed', 'bound', 'dodgeCd', 'flash', 'dropT', 'combatT', 'buffAtk', 'buffDef', 'dragonT']) if (this[k] > 0) this[k] = Math.max(0, this[k] - dt);
    if (this.dead) { this.vx *= Math.pow(0.05, dt); this.physics(dt); return; }
    if (this.key === 'hocheol') { // 맹호의 위압: 적이 무리 지어 다가오면(보스 둘 다 근접) 공격력 +10% · 받는 피해 -10%
      const near = b.liveBosses().filter(e => Math.abs(e.x - this.x) < 300).length;
      const on = near >= 2;
      if (on && !this.tigerAura) { b.fx.text(this.x, this.y - this.h - 34, '맹호의 위압!', '#c9a6ff', 18); b.skillCard(this.key, 'passive', this.d.passive.name); b.fx.vfx('hocheol_eyes', this.x, this.y - this.h * 0.62, 260, { life: 0.6, s0: 0.7, s1: 1.3 }); }
      this.tigerAura = on;
    }
    const dir = (I.held('right') ? 1 : 0) - (I.held('left') ? 1 : 0);
    if (this.state === 'idle' || this.state === 'move') {
      if (this.bound > 0) { this.vx = 0; this.state = 'idle'; }
      else {
        this.vx = dir * this.d.speed; if (dir) this.facing = dir;
        this.state = dir ? 'move' : 'idle';
        if (I.pressed('jump')) this.jump(I);
      }
      if (I.pressed('dodge') && this.dodgeCd <= 0 && this.bound <= 0) this.startDodge(dir || this.facing);
      else if (I.pressed('attack')) this.startAttack(0);
      else if (I.pressed('skill')) this.trySkill();
      else if (I.pressed('ult')) this.tryUlt();
    } else this.updateAction(dt, dir, I);
    this.physics(dt);
    if (this.onGround) this.jumps = 0;
  }
  jump(I) {
    if (I.held('down') && this.onGround && this.y < GROUND_Y - 1) { this.dropT = 0.25; this.vy = 80; this.onGround = false; return; }
    if (!this.onGround && this.jumps === 0) this.jumps = 1;
    if (this.jumps >= 2) return;
    this.vy = this.jumps === 0 ? -860 : -760; this.jumps++; this.onGround = false;
    Sfx.play('jump'); this.b.fx.dust(this.x, this.y);
  }
  startDodge(d) { this.setState('dodge'); this.facing = d; this.vx = d * 640; this.inv = 0.3; this.dodgeCd = 0.55; Sfx.play('dodge'); }
  startAttack(i) {
    const a = this.d.combo[i];
    this.setState('attack'); this.comboIdx = i; this.queued = false; this.combatT = 2;
    this.vx = this.facing * a.lunge;
    Sfx.play(this.key === 'dongmin' || this.key === 'simcheong' ? 'slash' : 'swing');
  }
  updateAction(dt, dir, I) {
    const b = this.b;
    switch (this.state) {
      case 'attack': {
        const a = this.d.combo[this.comboIdx];
        this.vx *= Math.pow(0.0005, dt);
        if (!this.hitDone && this.st >= a.hitAt) { this.hitDone = true; this.doAttackHit(a); }
        if (I.pressed('attack') && this.st > a.dur * 0.3) this.queued = true;
        if (I.pressed('dodge') && this.dodgeCd <= 0) { this.startDodge(dir || this.facing); break; }
        if (I.pressed('skill') && this.skillCd <= 0) { if (dir) this.facing = dir; this.trySkill(); if (this.state !== 'attack') break; }
        if (I.pressed('ult') && this.ult >= 100) { if (dir) this.facing = dir; this.tryUlt(); break; }
        if (this.st >= a.dur) {
          if (this.queued && this.comboIdx < this.d.combo.length - 1) { if (dir) this.facing = dir; this.startAttack(this.comboIdx + 1); }
          else { this.state = 'idle'; this.comboIdx = 0; }
        }
        break;
      }
      case 'dodge':
        b.fx.ghost(this.key, this.x, this.y, this.facing, this.spriteFrame(b.t));
        if (this.st >= 0.26) { this.state = 'idle'; this.vx *= 0.3; }
        break;
      case 'hurt':
        this.vx *= Math.pow(0.02, dt);
        if (this.st >= 0.32) this.state = 'idle';
        break;
      case 'tagin':
        this.vx = this.facing * 200;
        if (!this.hitDone && this.st >= 0.08) {
          this.hitDone = true;
          b.fx.slash(this.x + this.facing * 40, this.y - this.h * 0.55, this.facing, 56, false, STYLES[this.key].aura);
          b.playerHit(this, this.frontRect(96, 80, -10), { mult: 1.2, push: 200, phys: true });
        }
        if (this.st >= 0.3) { this.state = 'idle'; this.vx = 0; }
        break;
      case 'skill': this.updateSkill(); break;
      case 'grabdash': this.updateGrabDash(); break;
      case 'grab': this.updateGrab(); break;
      case 'ult': this.updateUlt(dt); break;
      case 'synergy': this.vx = 0; if (!b.synergy) this.state = 'idle'; break;
    }
  }
  doAttackHit(a) {
    const b = this.b, fx = b.fx, cy = this.y - this.h * 0.55, x = this.x + this.facing * 40;
    let mult = a.mult, range = a.range, pierce = false;
    if (this.key === 'seondal' && this.fanStacks >= 5) { // 풍류의 잔상: 5타 적중마다 다음 공격 강화(관통 + 추가 피해)
      this.fanStacks = 0; mult *= 1.6; range += 90; pierce = true;
      fx.text(this.x, this.y - this.h - 34, '풍류의 잔상!', '#9fe0ff', 18);
      fx.vfx('seondal_aura', this.x, this.y - this.h * 0.5, 170, { life: 0.55, s0: 0.7, s1: 1.35, spin: 5 });
      b.skillCard(this.key, 'passive', this.d.passive.name);
    }
    const F = this.facing, fin = this.comboIdx === this.d.combo.length - 1, step = this.comboIdx;
    switch (a.fx) {
      // ── 이동민: 쌍검 — 붉은 검기 궤적이 번갈아 교차, 막타는 X자 돌진 참격
      case 'blade': case 'blade2': {
        const up = a.fx === 'blade2';
        fx.swing(this.x + F * 18, cy, F, { r: 58, color: '#ff3a4e', core: '#fff1f1', thick: 15, tilt: up ? 0.15 : step === 2 ? -0.35 : 0.1, flipY: up, life: 0.2 });
        fx.swing(this.x + F * 10, cy + 4, F, { r: 44, color: '#ff8a96', core: '#ffffff', thick: 7, tilt: up ? 0.5 : -0.15, flipY: !up, life: 0.17, sweep: 0.5 });
        for (let i = 0; i < 5; i++) fx.part(this.x + F * rand(30, 80), cy + rand(-24, 24), { vx: F * rand(220, 420), vy: rand(-60, 60), life: 0.16, size: 2, color: '#ff8a96', shape: 'line', drag: 0.2 });
        break;
      }
      case 'bladeBig':
        fx.swing(this.x + F * 22, cy, F, { r: 74, color: '#ff2a3e', core: '#ffffff', thick: 20, tilt: -0.5, life: 0.28 });
        fx.swing(this.x + F * 22, cy, F, { r: 74, color: '#ff2a3e', core: '#ffffff', thick: 20, tilt: 0.5, flipY: true, life: 0.28 });
        fx.vfx('dongmin_xslash', this.x + F * 70, cy, 170, { flip: F < 0, life: 0.32, s0: 0.6, s1: 1.15, add: true, fin: 0.03 });
        fx.ghost(this.key, this.x - F * 30, this.y, F, this.spriteFrame(b.t));
        b.shake(3);
        break;
      // ── 최호철: 맹호권 — 주먹 끝에서 흑연 발톱이 할퀴고 충격파가 터진다, 막타는 흑호의 머리가 뛰어든다
      case 'punch': {
        const px = this.x + F * 62;
        fx.vfx('hocheol_claw', px + F * 30, cy - 4, 200, { flip: F > 0, sy: step === 1 ? -0.8 : 0.8, life: 0.28, s0: 0.7, s1: 1.1, fin: 0.03, add: true });
        fx.flash(px, cy, 46, 'rgba(255,150,50,0.9)', F, { life: 0.17 });
        fx.ring(px, cy, 34, '#ffb050', 0.2); fx.ring(px, cy, 20, '#c9a0ff', 0.16);
        fx.swing(this.x + F * 30, cy, F, { r: 36, color: '#ff9a3c', core: '#fff3d8', thick: 10, a0: -0.6, a1: 0.6, tilt: step === 1 ? -0.3 : 0.3, life: 0.16, sweep: 0.3 });
        for (let i = 0; i < 6; i++) { const ang = rand(-0.7, 0.7); fx.part(px, cy, { vx: F * Math.cos(ang) * rand(260, 460), vy: Math.sin(ang) * rand(260, 460), life: 0.18, size: 2.4, color: i % 2 ? '#ffb050' : '#c9a0ff', shape: 'line', drag: 0.05 }); }
        break;
      }
      case 'pipe': {
        const px = this.x + F * 70;
        fx.vfx('hocheol_head', px + F * 30, cy - 6, 200, { flip: F < 0, vx: F * 360, life: 0.38, s0: 0.55, s1: 1.15, fin: 0.04 });
        fx.vfx('hocheol_claw', px + F * 40, cy, 210, { flip: F > 0, life: 0.3, s0: 0.8, s1: 1.15, add: true });
        fx.swing(this.x + F * 26, cy - 6, F, { r: 70, color: '#ff8a2a', core: '#fff0d0', thick: 18, a0: -1.6, a1: 1.2, life: 0.26 });
        fx.flash(px, cy, 80, 'rgba(255,140,40,0.9)', F, { life: 0.22, spikes: 9, cone: 1.4 });
        fx.ring(px, cy, 64, '#ffb050', 0.28); fx.ring(this.x + F * 40, this.y, 90, '#b47cff', 0.3, true);
        fx.smoke(px, cy, 4, 'rgba(110,70,160,0.3)', 26); fx.dust(this.x + F * 30, this.y);
        b.shake(5);
        break;
      }
      // ── 김선달: 부채 바람 투사체 (FanShot)
      case 'fan': case 'fanBig': // 부채를 휘두른 자리에 짧은 바람 + 투사체 발사
        fx.slash(x - this.facing * 6, cy, this.facing, a.fx === 'fanBig' ? 44 : 32, Math.random() < 0.5, pierce ? '#ffffff' : '#9fe0ff');
        for (let i = 0; i < 4; i++) fx.part(x, cy + rand(-14, 14), { vx: this.facing * rand(160, 320), vy: rand(-40, 40), life: 0.22, size: 2.2, color: '#bfeaff', shape: 'line', drag: 0.3 });
        Sfx.play('wind'); break;
      // ── 심청이: 수류검 — 검은 물결이 검로를 따라 흐르고 물방울이 흩어진다. 용 변신 중엔 흑련(보라) 검기
      case 'sword': case 'swordUp': case 'swordBig': {
        const dr = this.dragon, big = a.fx === 'swordBig', up = a.fx === 'swordUp';
        const col = dr ? '#b57cff' : '#ff5fa8', core = dr ? '#f3e0ff' : '#e6fbff', drop = dr ? '#d9a8ff' : '#8ad8ff';
        fx.swing(this.x + F * 20, cy, F, { r: big ? 84 : 64, color: col, core, thick: big ? 22 : 16, tilt: big ? -0.2 : up ? 0.1 : 0.05, flipY: up, life: big ? 0.3 : 0.22 });
        fx.swing(this.x + F * 16, cy + (up ? -6 : 6), F, { r: big ? 70 : 52, color: dr ? '#7a5cff' : '#3fc8ff', core: '#ffffff', thick: big ? 10 : 7, tilt: up ? 0.35 : -0.25, flipY: up, life: big ? 0.26 : 0.2, sweep: 0.45 });
        if (!big) fx.vfx('simcheong_stream', this.x + F * 74, cy + (up ? -10 : 8), 150, { flip: F > 0, sy: up ? -0.55 : 0.55, life: 0.22, s0: 0.7, s1: 1.1, add: true, alpha: 0.85, vx: F * 140 });
        else {
          fx.vfx(dr ? 'simcheong_lotus' : 'simcheong_whirl', this.x + F * 80, cy, 190, { life: 0.4, s0: 0.45, s1: 1.15, add: true, spin: F * 4 });
          fx.vfx('simcheong_stream', this.x + F * 110, cy, 230, { flip: F > 0, sy: 0.4, life: 0.3, s0: 0.6, s1: 1.2, add: true, vx: F * 260 });
          b.shake(4);
        }
        for (let i = 0; i < (big ? 14 : 7); i++) fx.part(this.x + F * rand(20, big ? 120 : 80), cy + rand(-24, 24), { vx: F * rand(60, 240), vy: rand(-220, -40), life: rand(0.35, 0.6), size: rand(2, 4.5), color: i % 3 ? drop : '#ffffff', grav: 900, drag: 0.4 });
        break;
      }
    }
    if (!a.shot && a.lunge > 100) fx.ghost(this.key, this.x - F * 14, this.y, F, this.spriteFrame(b.t));
    if (a.shot) { b.zones.push(new FanShot(b, this, { mult, push: a.push, range, h: a.height, big: a.fx === 'fanBig', pierce })); return; }
    b.playerHit(this, this.frontRect(range, a.height, -10), { mult, push: a.push, basic: true, pierce, fin });
  }
  trySkill() {
    if (this.skillCd > 0) return;
    if (this.key === 'hocheol' && this.sealed > 0) {
      this.b.fx.text(this.x, this.y - this.h - 20, '요기 봉인 — 술법 불가!', '#c49bff', 17); Sfx.play('block');
      this.b.tryAssist(); return;
    }
    this.skillCd = this.d.skill.cd; this.combatT = 2.5;
    this.b.fx.text(this.x, this.y - this.h - 34, this.d.skill.name, STYLES[this.key].aura, 20);
    this.b.skillCard(this.key, 'active', this.d.skill.name);
    if (this.key === 'dongmin') { this.setState('grabdash'); this.inv = 0.35; Sfx.play('dash'); }
    else { this.setState('skill'); this.vx = 0; Sfx.play(this.key === 'hocheol' ? 'smoke' : this.key === 'seondal' ? 'wind' : 'water'); }
  }
  updateSkill() {
    const b = this.b;
    this.vx = 0;
    if (!this.hitDone && this.st >= 0.18) {
      this.hitDone = true;
      if (this.key === 'hocheol') b.zones.push(new SmokeTiger(b, this, this.x + this.facing * 140, this.y));          // 흑연호박
      else if (this.key === 'seondal') b.zones.push(new WindGust(b, this));                                           // 만리추풍
      else if (this.key === 'simcheong') b.zones.push(new WaterSlash(b, this));                                       // 심연수류
    }
    if (this.st >= 0.55) this.state = 'idle';
  }
  updateGrabDash() { // 해체자의 악력 — dash & grab
    const b = this.b;
    this.vx = this.facing * 980;
    b.fx.ghost(this.key, this.x, this.y, this.facing, this.spriteFrame(b.t));
    for (const e of b.liveBosses()) {
      if (!rectsOverlap(this.rect(), e.rect())) continue;
      if (e.superArmor) {
        b.damageBoss(this, e, { mult: 0.8 }); b.fx.text(e.x, e.y - e.h - 30, '슈퍼아머 — 잡기 실패', '#ffd27a', 15);
        this.state = 'idle'; this.vx = -this.facing * 200; return;
      }
      this.setState('grab'); this.grabTarget = e; this.grabHits = 0; this.vx = 0; this.inv = 1.0;
      e.grabbed = 1.0; this.x = e.x - this.facing * 34;
      Sfx.play('hit'); return;
    }
    if (this.st >= 0.3) { this.state = 'idle'; this.vx *= 0.2; }
  }
  updateGrab() {
    const b = this.b, e = this.grabTarget;
    this.vx = 0;
    if (!e || !e.alive) { this.state = 'idle'; this.grabTarget = null; return; }
    e.grabbed = 0.2;
    this.x = e.x - this.facing * 34;
    const times = [0.12, 0.3, 0.48];
    while (this.grabHits < 3 && this.st >= times[this.grabHits]) {
      this.grabHits++;
      b.damageBoss(this, e, { mult: 0.75 }); b.fx.impact(e.x, e.y - 64);
      b.fx.vfx('dongmin_grapple', e.x - this.facing * 6, e.y - 70, 140, { flip: this.facing < 0, life: 0.26, s0: 0.8, s1: 1.1 });
    }
    if (this.grabHits === 3 && this.st >= 0.7) {
      this.grabHits = 4;
      // design doc: 단일 대상 연속 피해 + 방어력 15% 감소 + 2초간 기절
      b.damageBoss(this, e, { mult: 1.6, stun: 2, defDown: 0.15, defT: 6 });
      b.shake(10); b.fx.ring(e.x, e.y, 90, '#ffd27a', 0.35, true); b.fx.dust(e.x, e.y);
      b.fx.vfx('dongmin_slam', e.x, e.y + 6, 230, { ay: 0.88, life: 0.6, s0: 0.7, s1: 1.15 });
      b.fx.text(e.x, e.y - e.h - 40, '방어력 -15% · 기절', '#ffd27a', 16, 1.2);
      Sfx.play('boom');
    }
    if (this.st >= 0.9) { this.state = 'idle'; e.grabbed = 0; this.grabTarget = null; this.inv = 0.25; }
  }
  tryUlt() {
    if (this.ult < 100) return;
    this.ult = 0; this.setState('ult'); this.ultStage = 0; this.ultFrenzy = false; this.ultHit = new Set(); this.ultTick = 0; this.inv = 99; this.combatT = 3;
    this.b.ultCinematic(this);
    if (this.key === 'simcheong') this.transformDragon();
    Sfx.play('ult');
  }
  transformDragon() { // 야차강림 — 심해의 용으로 각성
    const b = this.b, fresh = !this.dragon;
    this.dragonT = 1.75 + DRAGON_DUR; // 궁극기 연출 + 유지 시간
    b.fx.vfx('simcheong_lotus', this.x, this.y - 50, 300, { life: 0.8, s0: 0.4, s1: 1.3, add: true });
    b.fx.ring(this.x, this.y - 60, 140, '#b57cff', 0.5, true);
    if (fresh) b.fx.text(this.x, this.y - this.h - 60, '용 변신 — 야차강림!', '#d9a8ff', 22, 1.5);
  }
  updateUlt(dt) {
    const b = this.b, s = this.st;
    if (this.key === 'hocheol') { // 흑연호왕
      this.vx = 0;
      if (this.ultStage === 0 && s >= 0.35) { this.ultStage = 1; b.zones.push(new TigerRush(b, this)); Sfx.play('smoke'); }
      if (s >= 0.9) { this.state = 'idle'; this.inv = 0.3; }
      return;
    }
    if (this.key === 'seondal') { // 천풍만리: 부채를 던져 회오리 → 끌어당김 + 지속 피해 → 광역 폭발
      this.vx = 0;
      if (this.ultStage === 0 && s >= 0.3) { this.ultStage = 1; b.zones.push(new FanVortex(b, this, this.x + this.facing * 250)); Sfx.play('wind'); }
      if (s >= 0.8) { this.state = 'idle'; this.inv = 0.4; }
      return;
    }
    if (this.key === 'simcheong') { // 흑련개화: 야차강림
      this.vx = 0;
      if (this.ultStage === 0 && s >= 0.2) { this.ultStage = 1; b.zones.push(new LotusField(b, this, this.x + this.facing * 130)); Sfx.play('water'); }
      if (this.ultStage === 1 && s >= 1.05) { this.ultStage = 2; this.vy = -720; this.vx = this.facing * 120; }
      if (this.ultStage === 2 && s >= 1.4) { this.ultStage = 3; this.vy = 1100; }
      if (s >= 1.75) { this.state = 'idle'; this.inv = 0.3; }
      return;
    }
    // 광인의 해체식: dash → flurry → overhead finisher
    if (s < 0.35) {
      this.vx = this.facing * 950; b.fx.ghost(this.key, this.x, this.y, this.facing, this.spriteFrame(b.t));
      for (const e of b.liveBosses()) {
        if (this.ultHit.has(e) || !rectsOverlap(this.frontRect(90, 100, -40), e.rect())) continue;
        this.ultHit.add(e); b.damageBoss(this, e, { mult: 1.2 }); b.fx.slash(e.x, e.y - 64, this.facing, 70, false, '#ff4a4a');
        b.fx.vfx('dongmin_xslash', e.x, e.y - 66, 210, { flip: this.facing < 0, life: 0.42, s0: 0.75, s1: 1.2 });
      }
    } else if (s < 1.25) {
      this.vx = 0; this.ultTick -= dt;
      if (!this.ultFrenzy) { this.ultFrenzy = true; b.fx.vfx('dongmin_frenzy', this.x, this.y - 72, 330, { life: 0.95, fin: 0.12, s0: 0.85, s1: 1.12, flip: this.facing < 0 }); }
      if (this.ultTick <= 0) {
        this.ultTick = 0.1;
        const r = { x: this.x - 170, y: this.y - 160, w: 340, h: 170 };
        for (const e of b.liveBosses()) if (rectsOverlap(r, e.rect())) b.damageBoss(this, e, { mult: 0.42, quiet: true });
        b.fx.slash(this.x + rand(-120, 120), this.y - rand(30, 120), Math.random() < 0.5 ? 1 : -1, rand(40, 72), Math.random() < 0.5, Math.random() < 0.35 ? '#ff4a4a' : '#f0f4ff');
        Sfx.play('slash');
      }
    } else if (this.ultStage === 0) {
      this.ultStage = 1; this.vy = -640; this.vx = this.facing * 60;
    } else if (this.ultStage === 1 && s >= 1.5) {
      this.ultStage = 2; this.vy = 900;
      const r = this.frontRect(190, 180, -40);
      for (const e of b.liveBosses()) if (rectsOverlap(r, e.rect())) b.damageBoss(this, e, { mult: 4.0, stun: 3 });
      b.fx.slash(this.x + this.facing * 70, this.y - 40, this.facing, 110, false, '#ff3030');
      b.fx.ring(this.x + this.facing * 80, GROUND_Y, 160, '#ff5050', 0.5, true);
      b.fx.vfx('dongmin_cleave', this.x + this.facing * 80, GROUND_Y + 8, 210, { ay: 0.94, life: 0.7, s0: 0.8, s1: 1.1 });
      b.shake(18); Sfx.play('boom');
    } else if (s >= 1.9) { this.state = 'idle'; this.inv = 0.3; }
  }
  // which doc-art pose to show for the current state
  get dragon() { return this.key === 'simcheong' && this.dragonT > 0 && !this.dead; }
  spriteFrame(t) {
    const s = this.state, dr = this.dragon, F = dr ? DRAGON_FRAMES : this.d.frames;
    if (s === 'attack') return dr ? F.combo[this.comboIdx] : this.d.combo[this.comboIdx].frame;
    if (s === 'dodge') return F.dodge;
    if (s === 'grabdash' || s === 'tagin') return F.tagin;
    if (s === 'grab') return F.grab;
    if (s === 'skill') return F.skill;
    if (s === 'synergy') return F.ready;
    if (s === 'ult') {
      const u = F.ult;
      if (this.key === 'dongmin') return this.st < 0.35 ? u[0] : this.st < 1.25 ? u[1] : u[2];
      if (this.key === 'simcheong') return this.ultStage >= 2 ? u[1] : u[0];
      return this.st < 0.35 ? u[0] : u[1];
    }
    if (!this.onGround && s !== 'dead') return F.air;
    if (s === 'move' && this.onGround) { // 걷기: 워크사이클이 있으면 프레임 애니메이션, 없으면 옆으로 몸을 튼 보행 자세
      const a = animFrame((dr ? 'simdragon' : this.key) + '_walk', this.b.real);
      if (a) return a;
      if (F.walk) return F.walk;
    }
    if (s === 'idle' && this.key === 'hocheol' && this.combatT <= 0 && Math.floor((t || 0) / 3) % 3 === 2) return 'hocheol_p2';
    return this.combatT > 0 && s !== 'dead' ? F.ready : F.idle;
  }
  pose(t) {
    const P = { t, flash: this.flash > 0, moving: this.state === 'move' && this.onGround, walk: this.walk, air: !this.onGround, emo: 'normal' };
    const s = this.state;
    if (s === 'attack') { // squash + small push on the hit frame
      const a = this.d.combo[this.comboIdx], k = clamp(1 - Math.abs(this.st - a.hitAt) / 0.09, 0, 1);
      P.squash = 0.07 * k; P.lunge = 7 * k; P.emo = 'angry';
    } else if (s === 'dodge') P.lean = 0.25;
    else if (s === 'hurt') { P.emo = 'shock'; P.lean = -0.35; }
    else if (s === 'grab') { P.squash = this.grabHits % 2 ? 0.05 : 0; P.lunge = this.grabHits % 2 ? 6 : 0; }
    else if (s === 'move') { P.lean = /_walk_\d+$/.test(this.curFrame || '') ? 0 : 0.08; if (P.lean === 0) P.moving = false; }
    else if (s === 'dead') { P.emo = 'shock'; P.rot = -1.45; }
    // crossfade between painted frames
    const f = this.spriteFrame(t);
    if (f !== this.curFrame) {
      const cycle = /_(walk|run)_\d+$/;
      // frames inside one walk cycle swap instantly (a crossfade would smear the legs)
      if (cycle.test(f) && cycle.test(this.curFrame || '')) { this.prevFrame = null; this.frameAt = -9; } else { this.prevFrame = this.curFrame; this.frameAt = this.b.real; }
      this.curFrame = f;
    }
    P.frame = f; P.prevFrame = this.prevFrame; P.blend = (this.b.real - this.frameAt) / 0.09;
    return P;
  }
  draw(c, t) {
    this.drawShadow(c);
    if (!this.dead) { // painted passive auras (VFX sheet ①)
      if (this.key === 'seondal' && this.fanStacks >= 5) drawVfx(c, 'seondal_aura', this.x, this.y - this.h * 0.5, 150, { rot: t * 2.5, alpha: 0.6 + Math.sin(t * 6) * 0.15 });
      if (this.key === 'hocheol' && this.tigerAura) drawVfx(c, 'hocheol_eyes', this.x, this.y - this.h * 0.62, 230, { alpha: 0.55 + Math.sin(t * 4) * 0.12 });
      if (this.key === 'simcheong' && this.hp / this.maxHp <= HAN_HP) drawVfx(c, 'simcheong_regen', this.x, this.y + 6, 130, { ay: 0.96, alpha: 0.5 + Math.sin(t * 5) * 0.15 });
    }
    if (this.buffAtk > 0 || this.buffDef > 0) {
      c.strokeStyle = `rgba(255,200,120,${0.4 + Math.sin(t * 8) * 0.2})`; c.lineWidth = 2;
      c.beginPath(); c.ellipse(this.x, this.y - 2, 30, 8, 0, 0, Math.PI * 2); c.stroke();
    }
    drawFighter(c, this.key, this.x, this.y, this.facing, this.pose(t));
    if (this.dead) return;
    if (this.sealed > 0) { // 봉인 부적
      c.save(); c.translate(this.x + 22, this.y - this.h - 20); c.rotate(Math.sin(t * 4) * 0.15);
      c.fillStyle = '#f2d36b'; c.fillRect(-8, -13, 16, 26);
      c.strokeStyle = '#c0182a'; c.lineWidth = 1.6; seg(c, -4, -9, 4, -5); seg(c, 4, -5, -4, 0); seg(c, -4, 0, 4, 5); seg(c, 0, 5, 0, 10);
      c.restore();
    }
    if (this.bound > 0) { // 막야 구속 사슬
      c.strokeStyle = '#b48cff'; c.lineWidth = 3;
      for (let i = 0; i < 2; i++) {
        c.beginPath(); c.ellipse(this.x, this.y - this.h * (0.35 + i * 0.25), 26, 8, Math.sin(t * 3 + i) * 0.2, 0, Math.PI * 2); c.stroke();
      }
    }
  }
}

// ---------------- player-owned zones ----------------
class SmokeTiger { // 흑연호박: smoke tiger binds enemies in front
  constructor(b, owner, x, y) { this.b = b; this.o = owner; this.x0 = owner.x + owner.facing * 30; this.x = x; this.y = y; this.dir = owner.facing; this.t = 0; this.ticks = 0; this.done = false; this.r = 130; }
  update(dt) {
    this.t += dt;
    if (this.ticks < 3 && this.t >= 0.15 + this.ticks * 0.3) {
      this.ticks++;
      const r = { x: this.x - this.r, y: this.y - 180, w: this.r * 2, h: 190 };
      for (const e of this.b.liveBosses()) if (rectsOverlap(r, e.rect())) this.b.damageBoss(this.o, e, { mult: 0.8, bind: 2, noCount: this.ticks > 1 });
    }
    if (Math.random() < dt * 30) this.b.fx.smoke(this.x, this.y - 95, 1, 'rgba(20,18,28,0.6)', 70);
    if (this.t > 1.3) this.done = true;
  }
  draw(c) {
    const k = this.t < 0.2 ? this.t / 0.2 : this.t > 1.0 ? Math.max(0, 1 - (this.t - 1.0) / 0.3) : 1;
    if (Assets.vfxReady('hocheol_head') && Assets.vfxReady('hocheol_chains')) {
      // 흑호 형상 연기 투사체 flies out of the pipe, then 검은 연기 사슬 bind the area
      const fly = clamp(this.t / 0.22, 0, 1);
      if (this.t < 0.45) drawVfx(c, 'hocheol_head', lerp(this.x0, this.x, easeOut(fly)), this.y - 95, 230, { flip: this.dir < 0, alpha: this.t < 0.25 ? 1 : 1 - (this.t - 0.25) / 0.2, ax: 0.75 });
      if (this.t > 0.12) drawVfx(c, 'hocheol_chains', this.x, this.y - 92, 250, { alpha: k * Math.min(1, (this.t - 0.12) / 0.15), rot: Math.sin(this.t * 3) * 0.06, flip: this.dir < 0 });
      return;
    }
    drawSmokeTiger(c, this.x, this.y - 95, this.dir, 1, k, this.t);
  }
}
class TigerRush { // 흑연호왕: smoke tiger charges forward then explodes
  constructor(b, o) { this.b = b; this.o = o; this.x = o.x + o.facing * 40; this.y = o.y; this.dir = o.facing; this.t = 0; this.hit = new Set(); this.exploded = false; this.done = false; }
  update(dt) {
    const b = this.b;
    this.t += dt;
    if (!this.exploded) {
      this.x += this.dir * 760 * dt;
      const r = { x: this.x - 80, y: this.y - 170, w: 160, h: 170 };
      for (const e of b.liveBosses()) if (!this.hit.has(e) && rectsOverlap(r, e.rect())) { this.hit.add(e); b.damageBoss(this.o, e, { mult: 3.0, push: 300 }); }
      b.fx.smoke(this.x - this.dir * 50, this.y - 70, 2, 'rgba(18,16,24,0.7)', 30);
      if (this.t > 0.75 || this.x < 40 || this.x > WORLD_W - 40) {
        this.exploded = true; this.t = 0;
        b.fx.ring(this.x, this.y - 70, 220, '#b47cff', 0.5); b.fx.smoke(this.x, this.y - 70, 14, 'rgba(18,16,24,0.85)', 90);
        b.fx.vfx('hocheol_roar', this.x, GROUND_Y + 10, 400, { ay: 0.94, life: 0.95, s0: 0.75, s1: 1.1, flip: this.dir < 0 });
        b.shake(12); Sfx.play('boom');
        for (const e of b.liveBosses()) if (Math.abs(e.x - this.x) < 220) b.damageBoss(this.o, e, { mult: 2.0, push: 200, noCount: true });
      }
    } else if (this.t > 0.3) this.done = true;
  }
  draw(c) {
    if (this.exploded) return;
    // 흑연 맹호 발톱 할퀴기: the painted claw swipe faces left, so mirror it when charging right
    if (drawVfx(c, 'hocheol_claw', this.x - this.dir * 80, this.y - 92, 330, { flip: this.dir > 0, alpha: Math.min(1, this.t / 0.08) })) return;
    drawSmokeTiger(c, this.x, this.y - 100, this.dir, 1.25, 1, this.t * 3);
  }
}
function drawSmokeTiger(c, x, y, dir, s, alpha, t) {
  if (drawVfx(c, 'hocheol_head', x, y, 230 * s, { flip: dir < 0, alpha: alpha * (0.9 + Math.sin(t * 6) * 0.1) })) return;
  c.save(); c.globalAlpha = alpha * 0.92; c.translate(x, y); c.scale(dir * s, s);
  c.fillStyle = '#121018';
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28 + t * 2; circle(c, Math.cos(a) * 52, Math.sin(a) * 34, 34 + Math.sin(t * 5 + i) * 6); c.fill(); }
  c.beginPath(); c.moveTo(-50, -40); c.lineTo(-38, -88); c.lineTo(-14, -48); c.fill();
  c.beginPath(); c.moveTo(50, -40); c.lineTo(38, -88); c.lineTo(14, -48); c.fill();
  c.fillStyle = '#ff9a3c';
  c.beginPath(); c.ellipse(-22, -10, 11, 6, -0.3, 0, 6.28); c.fill();
  c.beginPath(); c.ellipse(22, -10, 11, 6, 0.3, 0, 6.28); c.fill();
  c.fillStyle = '#1a0a00'; c.fillRect(-23, -15, 3, 10); c.fillRect(21, -15, 3, 10);
  c.strokeStyle = 'rgba(255,140,50,0.6)'; c.lineWidth = 4;
  seg(c, -8, -50, -2, -30); seg(c, 8, -50, 2, -30); seg(c, -62, 0, -42, 4); seg(c, 62, 0, 42, 4);
  c.fillStyle = '#f2efe6';
  c.beginPath(); c.moveTo(-14, 18); c.lineTo(-8, 34); c.lineTo(-2, 18); c.fill();
  c.beginPath(); c.moveTo(14, 18); c.lineTo(8, 34); c.lineTo(2, 18); c.fill();
  c.restore();
}

// ---------------- 김선달 · 심청이 skills ----------------
class FanShot { // 김선달 평타: 부채 바람 투사체 (풍압 화살 / 초승달 풍압). pierce = 풍류의 잔상 강화탄 — 관통
  constructor(b, o, a) {
    this.b = b; this.o = o; this.a = a; this.dir = o.facing; this.t = 0; this.done = false; this.hit = new Set();
    this.x = o.x + this.dir * 46; this.x0 = this.x; this.y = o.y - o.h * 0.58;
    this.speed = a.pierce ? 1100 : a.big ? 980 : 1050; this.w = a.pierce ? 150 : a.big ? 110 : 80;
  }
  update(dt) {
    const b = this.b; this.t += dt;
    this.x += this.dir * this.speed * dt;
    const r = { x: this.x - this.w * 0.5, y: this.y - this.a.h * 0.5, w: this.w, h: this.a.h };
    for (const e of b.liveBosses()) {
      if (this.hit.has(e) || !rectsOverlap(r, e.rect())) continue;
      this.hit.add(e);
      b.damageBoss(this.o, e, { mult: this.a.mult, push: this.a.push, basic: true });
      b.fx.vfx('seondal_burst', this.x + this.dir * 10, this.y, this.a.big || this.a.pierce ? 170 : 110, { life: 0.3, s0: 0.5, s1: 1.1 });
      if (!this.a.pierce) { this.done = true; return; }
    }
    if (Math.random() < dt * 40) b.fx.part(this.x - this.dir * rand(10, 50), this.y + rand(-18, 18), { vx: -this.dir * rand(40, 120), vy: rand(-20, 20), life: 0.25, size: 2, color: '#bfeaff', shape: 'line', drag: 0.4 });
    if (Math.abs(this.x - this.x0) > this.a.range || this.x < 20 || this.x > WORLD_W - 20) {
      this.done = true;
      b.fx.part(this.x, this.y, { vx: this.dir * 60, vy: 0, life: 0.2, size: 4, color: '#bfeaff' });
    }
  }
  draw(c) {
    const al = Math.min(1, this.t / 0.04);
    if (this.a.big || this.a.pierce) { // 초승달 풍압 참격이 그대로 날아간다
      if (drawVfx(c, 'seondal_crescent', this.x, this.y, this.a.pierce ? 190 : 140, { flip: this.dir < 0, alpha: al, add: this.a.pierce })) return;
    } else if (drawVfx(c, 'seondal_blade', this.x + this.dir * 18, this.y, 130, { flip: this.dir < 0, rot: Math.PI + 0.63, ax: 0.1, ay: 0.95, alpha: al })) return;
    c.save(); c.translate(this.x, this.y); c.scale(this.dir, 1);
    c.strokeStyle = 'rgba(190,235,255,0.85)'; c.lineWidth = 4;
    c.beginPath(); c.arc(-10, 0, this.w * 0.35, -1.1, 1.1); c.stroke();
    c.restore();
  }
}
class WindGust { // 만리추풍: wind blast travels forward, pierces, then explodes and pushes enemies away
  constructor(b, o) {
    this.b = b; this.o = o; this.dir = o.facing; this.x = o.x + this.dir * 50; this.y = o.y - 60; this.t = 0; this.hitT = new Map(); this.done = false; this.exploded = false;
    b.fx.vfx('seondal_crescent', this.x + this.dir * 20, this.y, 170, { flip: this.dir < 0, life: 0.3, s0: 0.8, s1: 1.25 });
  }
  update(dt) {
    const b = this.b; this.t += dt;
    if (!this.exploded) {
      this.x += this.dir * 720 * dt;
      const r = { x: this.x - 60, y: this.y - 70, w: 120, h: 120 };
      for (const e of b.liveBosses()) {
        if (!rectsOverlap(r, e.rect()) || (this.hitT.get(e) || 0) > this.t) continue;
        this.hitT.set(e, this.t + 0.16); b.damageBoss(this.o, e, { mult: 0.55, quiet: true });
      }
      for (let i = 0; i < 3; i++) b.fx.part(this.x - this.dir * rand(0, 60), this.y + rand(-40, 40), { vx: this.dir * rand(100, 300), vy: rand(-40, 40), life: 0.3, size: 2.5, color: '#bfeaff', shape: 'line', drag: 0.3 });
      if (this.t > 0.75 || this.x < 40 || this.x > WORLD_W - 40) {
        this.exploded = true; this.t = 0;
        b.fx.ring(this.x, this.y, 150, '#9fe0ff', 0.45); b.shake(8); Sfx.play('boom');
        b.fx.vfx('seondal_burst', this.x, this.y, 300, { life: 0.55, s0: 0.6, s1: 1.3 });
        for (const e of b.liveBosses()) if (Math.abs(e.x - this.x) < 150) b.damageBoss(this.o, e, { mult: 1.3, push: 360 });
      }
    } else if (this.t > 0.3) this.done = true;
  }
  draw(c) {
    if (this.exploded) return;
    // 풍압 화살 투사체: the painted streak's tip leads, its tail trails back toward 김선달
    if (drawVfx(c, 'seondal_blade', this.x + this.dir * 30, this.y, 210, { flip: this.dir < 0, rot: Math.PI + 0.63, ax: 0.1, ay: 0.95, alpha: Math.min(1, this.t / 0.06) })) return;
    c.save(); c.translate(this.x, this.y); c.scale(this.dir, 1);
    for (let i = 0; i < 4; i++) {
      c.strokeStyle = `rgba(190,235,255,${0.75 - i * 0.15})`; c.lineWidth = 6 - i;
      c.beginPath(); c.arc(-i * 18, 0, 46 - i * 6, -1.2 + Math.sin(this.t * 20 + i) * 0.1, 1.2); c.stroke();
    }
    c.restore();
  }
}
class FanVortex { // 천풍만리: 회오리가 적을 끌어당겨 지속 피해 → 축적된 에너지 광역 방출
  constructor(b, o, x) { this.b = b; this.o = o; this.x = clamp(x, 80, WORLD_W - 80); this.y = GROUND_Y; this.t = 0; this.tick = 0; this.done = false; this.burst = false; }
  update(dt) {
    const b = this.b; this.t += dt; this.tick -= dt;
    for (const e of b.liveBosses()) if (Math.abs(e.x - this.x) < 300 && !e.superArmor) e.kbv = sign(this.x - e.x) * 220; // pull in
    if (this.t < 2.0 && this.tick <= 0) {
      this.tick = 0.2;
      for (const e of b.liveBosses()) if (Math.abs(e.x - this.x) < 150) b.damageBoss(this.o, e, { mult: 0.45, quiet: true });
      Sfx.play('wind');
    }
    for (let i = 0; i < 4; i++) { const a = rand(0, 6.28), r = rand(20, 130); b.fx.part(this.x + Math.cos(a) * r, this.y - rand(10, 220), { vx: -Math.sin(a) * 300, vy: -rand(40, 140), life: 0.4, size: 2.5, color: '#cfefff', shape: 'line', drag: 0.4 }); }
    if (!this.burst && this.t >= 2.0) {
      this.burst = true; b.shake(16); Sfx.play('boom');
      b.fx.ring(this.x, this.y - 100, 260, '#9fe0ff', 0.55); b.fx.ring(this.x, this.y, 260, '#ffffff', 0.5, true);
      b.fx.vfx('seondal_burst', this.x, this.y - 110, 480, { life: 0.65, s0: 0.6, s1: 1.3 });
      for (const e of b.liveBosses()) if (Math.abs(e.x - this.x) < 240) b.damageBoss(this.o, e, { mult: 3.0, push: 300, stun: 1 });
    }
    if (this.t > 2.3) this.done = true;
  }
  draw(c) {
    const k = this.t < 0.2 ? this.t / 0.2 : this.t > 2.0 ? Math.max(0, 1 - (this.t - 2.0) / 0.3) : 1;
    const grow = easeOut(clamp(this.t / 0.35, 0, 1));
    if (drawVfx(c, 'seondal_tornado', this.x + Math.sin(this.t * 9) * 6, this.y + 12, 300 * (1 + Math.sin(this.t * 22) * 0.04), { ay: 0.96, alpha: k, h: 330 * (0.3 + 0.7 * grow) })) return;
    c.save(); c.globalAlpha = k;
    for (let i = 0; i < 9; i++) {
      const yy = this.y - i * 26, rw = 40 + i * 14, ph = this.t * 9 + i * 0.7;
      c.strokeStyle = `rgba(${170 + i * 8},${225 + i * 3},255,${0.7 - i * 0.05})`; c.lineWidth = 4;
      c.beginPath(); c.ellipse(this.x + Math.sin(ph) * 8, yy, rw, 9 + i, 0, ph, ph + 4.6); c.stroke();
    }
    c.restore();
  }
}
class WaterSlash { // 심연수류: 검은 물줄기가 전방을 관통 — 적 이동·공격 속도 30% 감소(3초)
  constructor(b, o) { this.b = b; this.o = o; this.dir = o.facing; this.x0 = o.x + this.dir * 30; this.y = o.y - 62; this.t = 0; this.len = 0; this.hit = new Set(); this.done = false; }
  update(dt) {
    const b = this.b; this.t += dt;
    this.len = Math.min(470, this.len + 2400 * dt);
    const x1 = this.x0 + this.dir * this.len;
    const r = { x: Math.min(this.x0, x1), y: this.y - 50, w: Math.abs(x1 - this.x0), h: 100 };
    for (const e of b.liveBosses()) {
      if (this.hit.has(e) || !rectsOverlap(r, e.rect())) continue;
      this.hit.add(e); b.damageBoss(this.o, e, { mult: 1.9, yogiPart: true, push: 120 });
      e.soakT = 3; b.fx.text(e.x, e.y - e.h - 46, '둔화 30%', '#8ad8ff', 15);
    }
    for (let i = 0; i < 3; i++) b.fx.part(this.x0 + this.dir * rand(0, this.len), this.y + rand(-20, 20), { vx: this.dir * rand(60, 200), vy: rand(-90, 10), life: 0.45, size: rand(2, 4), color: Math.random() < 0.5 ? '#6ac8ff' : '#2a1a40', grav: 500 });
    if (this.t > 0.55) this.done = true;
  }
  draw(c) {
    const k = this.t < 0.4 ? 1 : Math.max(0, 1 - (this.t - 0.4) / 0.15), x1 = this.x0 + this.dir * this.len;
    // 고압 직선 수류 참격: tip of the painted stream at the front, its length follows the jet
    if (this.len > 20 && drawVfx(c, 'simcheong_stream', x1, this.y, Math.max(120, this.len * 0.93), { flip: this.dir < 0, rot: Math.PI + 0.51, ax: 0.04, ay: 0.95, alpha: k })) return;
    c.save(); c.globalAlpha = k; c.lineCap = 'round';
    c.strokeStyle = 'rgba(20,10,40,0.85)'; c.lineWidth = 34; seg(c, this.x0, this.y, x1, this.y);
    c.strokeStyle = 'rgba(80,190,255,0.85)'; c.lineWidth = 16; seg(c, this.x0, this.y, x1, this.y);
    c.strokeStyle = 'rgba(230,248,255,0.95)'; c.lineWidth = 4; seg(c, this.x0, this.y - 3, x1, this.y - 3);
    c.restore();
  }
}
class LotusField { // 흑련개화: 흑련 영역 — 끌어당김 + 지속 피해 → 야차 내려찍기(잃은 체력 비례 추가 피해 + 기절 2.5초)
  constructor(b, o, x) { this.b = b; this.o = o; this.x = clamp(x, 80, WORLD_W - 80); this.y = GROUND_Y; this.t = 0; this.tick = 0; this.done = false; this.slam = false; }
  update(dt) {
    const b = this.b; this.t += dt; this.tick -= dt;
    for (const e of b.liveBosses()) if (Math.abs(e.x - this.x) < 260 && !e.superArmor && !this.slam) e.kbv = sign(this.x - e.x) * 200;
    if (!this.slam && this.tick <= 0) {
      this.tick = 0.2;
      for (const e of b.liveBosses()) if (Math.abs(e.x - this.x) < 230) { b.damageBoss(this.o, e, { mult: 0.4, quiet: true, yogiPart: true }); e.soakT = Math.max(e.soakT || 0, 1.5); }
    }
    if (Math.random() < dt * 30) b.fx.part(this.x + rand(-200, 200), this.y - rand(0, 30), { vy: -rand(60, 160), life: 0.8, size: rand(3, 6), color: Math.random() < 0.5 ? '#ff7ab8' : '#b07cff', shape: 'puff', grow: 3 });
    if (!this.slam && this.t >= 1.3) {
      this.slam = true; b.shake(20); Sfx.play('boom');
      b.fx.ring(this.x, this.y, 260, '#ff6aa8', 0.6, true); b.fx.ring(this.x, this.y - 60, 200, '#b07cff', 0.5);
      b.fx.vfx('simcheong_descent', this.x, this.y + 12, 360, { ay: 0.93, life: 0.85, s0: 0.8, s1: 1.1 });
      for (const e of b.liveBosses()) if (Math.abs(e.x - this.x) < 240) {
        const missing = (e.maxHp - e.hp) / e.maxHp;
        b.damageBoss(this.o, e, { mult: 3.0 + missing * 4, stun: 2.5, yogiPart: true });
      }
    }
    if (this.t > 1.7) this.done = true;
  }
  draw(c) {
    const k = this.t < 0.2 ? this.t / 0.2 : this.t > 1.4 ? Math.max(0, 1 - (this.t - 1.4) / 0.3) : 1, bloom = easeOut(clamp(this.t / 0.6, 0, 1));
    if (Assets.vfxReady('simcheong_whirl') && Assets.vfxReady('simcheong_lotus')) {
      // 심해 소용돌이 견인 (flat on the ground, spinning) under the 거대 흑련 만개 영역
      drawVfx(c, 'simcheong_whirl', this.x, this.y - 4, 520 * (0.5 + 0.5 * bloom), { sy: 0.32, rot: this.t * 5, alpha: k * 0.9 });
      drawVfx(c, 'simcheong_lotus', this.x, this.y + 18, 430 * (0.3 + 0.7 * bloom), { ay: 0.78, alpha: k });
      return;
    }
    c.save(); c.globalAlpha = k * 0.9; c.translate(this.x, this.y);
    c.fillStyle = 'rgba(30,10,40,0.55)'; c.beginPath(); c.ellipse(0, 0, 240, 50, 0, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 8; i++) { // 검은 연꽃 꽃잎
      const a = -Math.PI / 2 + (i - 3.5) * 0.36;
      c.save(); c.rotate(a + Math.PI / 2); c.scale(1, bloom);
      const g = c.createLinearGradient(0, 0, 0, -150); g.addColorStop(0, 'rgba(30,8,40,0.95)'); g.addColorStop(1, 'rgba(255,100,180,0.75)');
      c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-34, -80, 0, -150); c.quadraticCurveTo(34, -80, 0, 0); c.fill();
      c.restore();
    }
    c.restore();
  }
}

// ---------------- 2인 시너지 합동기 (design doc §2-3) ----------------
class Synergy {
  constructor(b, cfg, lead, partner) {
    this.b = b; this.cfg = cfg; this.lead = lead; this.partner = partner; this.t = 0; this.tick = 0; this.done = false; this.final = false;
    this.dir = lead.facing; this.cx = clamp(lead.x + this.dir * 170, 90, WORLD_W - 90); this.px = lead.x - this.dir * 60;
    // damage source: the members' strength; 최호철's smoke part is carried by the partner (막야 still eats pure 요기)
    const keys = [lead.key, partner.key], phys = keys.filter(k => k !== 'hocheol');
    this.src = { key: 'synergy', atk: phys.reduce((a, k) => a + CHAR_DATA[k].atk, 0) / phys.length * (phys.length < 2 ? 1.2 : 1.1), yogi: false, x: lead.x, facing: this.dir, ult: 0 };
  }
  inRange(e, r) { return Math.abs(e.x - this.cx) < r; }
  update(dt) {
    const b = this.b, k = this.cfg.kind; this.t += dt; this.tick -= dt;
    const pull = (r, s) => { for (const e of b.liveBosses()) if (this.inRange(e, r) && !e.superArmor) e.kbv = sign(this.cx - e.x) * s; };
    const ticks = (r, mult, every, extra = {}) => {
      if (this.tick > 0) return; this.tick = every;
      for (const e of b.liveBosses()) if (this.inRange(e, r)) b.damageBoss(this.src, e, Object.assign({ mult, quiet: true }, extra));
    };
    const finish = (r, mult, extra = {}) => {
      if (this.final) return; this.final = true; b.shake(20); Sfx.play('boom');
      b.fx.ring(this.cx, GROUND_Y - 60, r, this.cfg.color, 0.6); b.fx.ring(this.cx, GROUND_Y, r, '#ffffff', 0.5, true);
      for (const e of b.liveBosses()) if (this.inRange(e, r)) b.damageBoss(this.src, e, Object.assign({ mult, push: 200 }, extra));
    };
    if (k === 'vortex') { // 풍혈도륙
      pull(320, 240);
      if (this.t > 0.3 && this.t < 1.5) { ticks(170, 0.5, 0.08, { guardIgnore: true }); if (Math.random() < 0.5) b.fx.slash(this.cx + rand(-60, 60), GROUND_Y - rand(30, 120), Math.random() < 0.5 ? 1 : -1, rand(40, 70), Math.random() < 0.5, Math.random() < 0.4 ? '#ff4a4a' : '#e8f4ff'); }
      if (this.t > 1.55) finish(220, 3.2, { guardIgnore: true, stun: 1.5 });
    } else if (k === 'tiger') { // 흑풍맹호격
      if (this.t > 0.3 && this.t < 1.4) { this.cx += this.dir * 420 * dt; ticks(140, 0.6, 0.14); }
      if (this.t > 0.3 && !this.bound) { this.bound = true; for (const e of b.liveBosses()) e.stun = Math.max(e.stun, 2); b.fx.text(this.cx, GROUND_Y - 200, '화면 전체 속박!', '#c9a6ff', 20); }
      if (this.t > 1.45) { finish(240, 2.4); for (const p of b.party) { p.buffAtk = 10; p.buffDef = 10; } }
    } else if (k === 'guillotine') { // 심연의 단두대
      if (this.t > 0.2 && this.t < 0.9) ticks(150, 0.7, 0.2, { defDown: 0.15, defT: 6 });
      if (this.t > 1.25 && !this.final) {
        this.final = true; b.shake(22); Sfx.play('boom');
        b.fx.ring(this.cx, GROUND_Y, 240, '#ff4a7a', 0.6, true);
        b.fx.vfx('simcheong_descent', this.cx, GROUND_Y + 12, 340, { ay: 0.93, life: 0.8, s0: 0.8, s1: 1.1 });
        for (const e of b.liveBosses()) if (this.inRange(e, 220)) { const miss = (e.maxHp - e.hp) / e.maxHp; b.damageBoss(this.src, e, { mult: 3.5 + miss * 6, stun: 2 }); }
        for (const p of b.party) if (!p.dead) { p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.05); b.fx.text(p === b.player ? p.x : this.px, GROUND_Y - 140, '+회복', '#9fffb0', 15); }
      }
    } else if (k === 'storm') { // 흑수풍운
      pull(360, 260);
      if (this.t > 0.3 && this.t < 1.5) ticks(200, 0.5, 0.12);
      for (const e of b.liveBosses()) if (this.inRange(e, 260)) e.soakT = Math.max(e.soakT || 0, 3);
      if (this.t > 1.55) finish(260, 2.8, { stun: 1.5 });
    } else if (k === 'rush') { // 용호야차진
      if (this.t > 0.25 && this.t < 1.1) { this.cx += this.dir * 900 * dt; ticks(110, 1.1, 0.1); }
      if (this.t > 1.15) { finish(160, 2.2); for (const p of b.party) p.buffDef = 8; }
    }
    if (this.t > (k === 'rush' ? 1.5 : 1.85)) this.done = true;
  }
  draw(c, t) {
    const k = this.cfg.kind, a = this.t < 0.15 ? this.t / 0.15 : this.t > 1.6 ? Math.max(0, 1 - (this.t - 1.6) / 0.25) : 1;
    c.save(); c.globalAlpha = a;
    if ((k === 'vortex' || k === 'storm') && Assets.vfxReady('seondal_tornado')) {
      if (k === 'storm') drawVfx(c, 'simcheong_whirl', this.cx, GROUND_Y - 4, 480, { sy: 0.32, rot: this.t * 6, alpha: 0.85 });
      drawVfx(c, 'seondal_tornado', this.cx + Math.sin(this.t * 9) * 6, GROUND_Y + 12, 300, { ay: 0.96, h: 330 * (0.3 + 0.7 * easeOut(clamp(this.t / 0.35, 0, 1))) });
    } else if (k === 'vortex' || k === 'storm') {
      for (let i = 0; i < 10; i++) {
        const yy = GROUND_Y - i * 24, rw = 50 + i * 16, ph = this.t * 10 + i * 0.6;
        c.strokeStyle = k === 'storm' ? `rgba(${60 + i * 10},${150 + i * 6},255,${0.75 - i * 0.05})` : `rgba(200,240,255,${0.75 - i * 0.05})`; c.lineWidth = 5;
        c.beginPath(); c.ellipse(this.cx + Math.sin(ph) * 10, yy, rw, 10 + i, 0, ph, ph + 4.8); c.stroke();
      }
    } else if (k === 'tiger') drawSmokeTiger(c, this.cx, GROUND_Y - 110, this.dir, 1.7, 1, this.t * 3);
    else if (k === 'guillotine' && this.t > 0.9) {
      const drop = easeOut(clamp((this.t - 0.9) / 0.35, 0, 1));
      c.fillStyle = 'rgba(255,90,150,0.35)'; c.fillRect(this.cx - 24, 0, 48, GROUND_Y * drop);
      c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(this.cx - 5, 0, 10, GROUND_Y * drop);
    }
    c.restore();
    // the partner joins the attack on the field (painted pose)
    const p = this.partner, F = p.d.frames;
    const frame = k === 'rush' ? F.dodge : this.t < 0.6 ? F.ready : (p.key === 'dongmin' ? 'dongmin_slash1' : F.skill);
    const x = k === 'rush' || k === 'tiger' ? this.cx - this.dir * 40 : k === 'guillotine' && p.key === 'simcheong' ? this.cx : this.px + (this.cx - this.px) * clamp(this.t / 0.5, 0, 0.6);
    const y = k === 'guillotine' && p.key === 'simcheong' ? GROUND_Y - Math.max(0, 1 - clamp((this.t - 0.9) / 0.35, 0, 1)) * 320 : GROUND_Y;
    drawFighter(c, p.key, x, y, this.dir, { t, frame, alpha: a, rim: true, lunge: 0 });
  }
}

// ---------------- 자동 어시스트: 파마해체 (破魔解體) ----------------
class Assist {
  constructor(b, dm, target) {
    this.b = b; this.dm = dm; this.e = target;
    const p = b.player;
    this.x = clamp(p.x - p.facing * 50, 40, WORLD_W - 40); this.y = GROUND_Y;
    this.facing = sign(target.x - this.x) || 1;
    this.state = 'dash'; this.st = 0; this.hits = 0; this.alpha = 1; this.walk = 0; this.done = false;
  }
  go(s) { this.state = s; this.st = 0; }
  update(dt) {
    const b = this.b, e = this.e;
    this.st += dt;
    if (!e.alive && this.state !== 'leave') this.go('leave');
    if (this.state === 'dash') {
      this.facing = sign(e.x - this.x) || this.facing;
      this.x += this.facing * 1100 * dt; this.walk += dt * 40;
      b.fx.ghost('dongmin', this.x, this.y, this.facing, 'dongmin_dash');
      if (Math.abs(e.x - this.x) < 50 || this.st > 1.2) { this.go('grab'); Sfx.play('hit'); }
    } else if (this.state === 'grab') {
      e.grabbed = 0.2; this.x = e.x - this.facing * 30;
      const times = [0.1, 0.25, 0.4];
      while (this.hits < 3 && this.st >= times[this.hits]) { this.hits++; b.damageBoss(this.dm, e, { mult: 0.8 }); b.fx.impact(e.x, e.y - 64); b.fx.vfx('dongmin_grapple', e.x - this.facing * 6, e.y - 70, 140, { flip: this.facing < 0, life: 0.26, s0: 0.8, s1: 1.1 }); }
      if (this.hits === 3 && this.st >= 0.65) {
        this.hits = 4;
        // design doc: 요기 무력화 해제 + 2초 기절 + 방어력 30% 감소
        b.damageBoss(this.dm, e, { mult: 1.4, stun: 2, defDown: 0.3, defT: 6, ignoreArmor: true });
        b.shake(12); b.fx.ring(e.x, e.y, 100, '#ffd27a', 0.4, true);
        b.fx.vfx('dongmin_slam', e.x, e.y + 6, 240, { ay: 0.88, life: 0.6, s0: 0.7, s1: 1.15 });
        b.fx.text(e.x, e.y - e.h - 44, '무기 꺾기! 방어력 -30%', '#ffd27a', 18, 1.3);
        Sfx.play('boom');
        const p = b.player;
        if (p.sealed > 0) { p.sealed = 0; b.fx.text(p.x, p.y - p.h - 24, '봉인 해제!', '#9fffb0', 18); }
      }
      if (this.st >= 0.95) { e.grabbed = 0; this.go('leave'); }
    } else if (this.state === 'leave') {
      this.alpha -= dt * 3;
      if (this.alpha <= 0) this.done = true;
    }
  }
  draw(c, t) {
    const pose = { t, alpha: this.alpha, moving: this.state === 'dash', walk: this.walk, emo: 'angry', lean: this.state === 'dash' ? 0.45 : 0 };
    if (this.state === 'grab') { pose.armFront = this.hits % 2 ? -0.2 : 0.6; pose.armBack = this.hits % 2 ? 0.6 : -0.2; pose.stance = true; pose.emo = 'shout'; }
    pose.frame = this.state === 'grab' ? 'dongmin_grab' : 'dongmin_dash';
    drawFighter(c, 'dongmin', this.x, this.y, this.facing, pose);
  }
}

// ---------------- boss projectiles ----------------
class Proj {
  constructor(o) { Object.assign(this, { x: 0, y: 0, vx: 0, vy: 0, w: 40, h: 40, life: 2, dmg: 40, kind: '', hit: false, done: false, t: 0, dir: 1 }, o); }
  rect() { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }
  update(dt, b) {
    this.t += dt; this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt;
    if (this.life <= 0 || this.x < -100 || this.x > WORLD_W + 100 || this.y > GROUND_Y + 30) this.done = true;
    if (this.kind === 'ganjang' && Math.random() < dt * 40) b.fx.part(this.x - this.dir * 20, this.y + rand(-30, 30), { vx: -this.dir * 60, vy: -rand(20, 80), life: 0.35, size: rand(3, 6), color: '#ff7a3a', shape: 'puff', grow: 3 });
    if (this.kind === 'makya' && Math.random() < dt * 30) b.fx.part(this.x, this.y, { life: 0.3, size: 3, color: '#b48cff' });
    const p = b.player;
    if (!this.hit && !p.dead && rectsOverlap(this.rect(), p.rect())) {
      const r = b.hitPlayer(this.dmg, { from: this.x - this.vx, seal: this.seal, bind: this.bind });
      if (r === 'hit') { this.hit = true; this.done = true; }
      else if (r === 'dodged') this.hit = true;
    }
  }
  draw(c) {
    c.save(); c.translate(this.x, this.y);
    c.globalAlpha = Math.min(1, this.life * 3);
    if (this.kind === 'ganjang' && drawVfx(c, 'boss_ganjang', 0, 0, 170, { flip: this.dir < 0, ax: 0.7 })) { /* 간장 연속 참격 */ }
    else if (this.kind === 'makya' && drawVfx(c, 'boss_makya', 0, 0, 150, { rot: Math.atan2(this.vy, this.vx), ax: 0.72 })) { /* 막야 구속 참격 */ }
    else if (this.kind === 'ganjang') {
      c.scale(this.dir, 1);
      c.fillStyle = 'rgba(255,80,30,0.3)'; c.beginPath(); c.ellipse(-8, 0, 34, 44, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ff5a2a'; c.beginPath(); c.arc(0, 0, 40, -1.3, 1.3); c.arc(-15, 0, 34, 1.2, -1.2, true); c.closePath(); c.fill();
      c.fillStyle = '#ffe2b0'; c.beginPath(); c.arc(0, 0, 40, -1.0, 1.0); c.arc(-6, 0, 36, 0.95, -0.95, true); c.closePath(); c.fill();
    } else if (this.kind === 'makya') {
      c.rotate(Math.atan2(this.vy, this.vx));
      c.fillStyle = 'rgba(150,90,255,0.3)'; circle(c, 0, 0, 30); c.fill();
      c.fillStyle = '#7a4dff'; c.beginPath(); c.arc(0, 0, 26, -1.4, 1.4); c.arc(-12, 0, 22, 1.25, -1.25, true); c.closePath(); c.fill();
      c.fillStyle = '#e6dcff'; c.beginPath(); c.arc(0, 0, 26, -1.0, 1.0); c.arc(-5, 0, 23.5, 0.95, -0.95, true); c.closePath(); c.fill();
      c.strokeStyle = '#c9b2ff'; c.lineWidth = 2;
      for (let i = 1; i <= 3; i++) { c.beginPath(); c.ellipse(-i * 14, Math.sin(this.t * 20 + i) * 4, 5, 3, 0, 0, Math.PI * 2); c.stroke(); }
    }
    c.restore();
  }
}

// ---------------- bosses ----------------
class Boss extends Fighter {
  constructor(b, key, x, hp) {
    super(b);
    this.key = key; this.x = x; this.maxHp = this.hp = hp; this.h = Math.round(118 * STYLES[key].scale); this.w = 38; this.facing = -1;
    this.state = 'idle'; this.st = 0; this.decide = 1; this.stun = 0; this.grabbed = 0; this.defDown = 0; this.defT = 0;
    this.atkMult = 1; this.speedMult = 1; this.guard = 1; this.guardLabel = ''; this.minHp = 0; this.subdued = false; this.dead = false;
    this.skillCd = 3; this.leapCd = 4; this.overCd = 3; this.hits = 0; this.hitDone = false; this.dmHits = 0; this.superArmor = false; this.mode = null; this.soakT = 0;
  }
  get alive() { return !this.dead && !this.subdued; }
  go(s) { this.state = s; this.st = 0; this.hits = 0; this.hitDone = false; this.superArmor = s === 'overWind'; const f = this['enter_' + s]; if (f) f.call(this); }
  takenMult() { let m = this.guard; if (this.defT > 0) m *= 1 + this.defDown; return m; }
  takeDamage(d) { this.hp = Math.max(this.minHp, this.hp - d); this.flash = 0.09; }
  tick(dt) { this.st += dt; for (const k of ['stun', 'grabbed', 'defT', 'skillCd', 'leapCd', 'flash', 'overCd', 'soakT']) if (this[k] > 0) this[k] = Math.max(0, this[k] - dt); }
  idleUpdate(dt) { this.tick(dt); this.vx = 0; this.physics(dt, false); }
  baseUpdate(dt) {
    this.tick(dt);
    if (!this.alive) { this.vx = 0; this.physics(dt, false); return false; }
    if (this.grabbed > 0) { this.vx = 0; this.physics(dt, false); return false; }
    if (this.stun > 0) { if (this.state !== 'stun') this.go('stun'); this.vx = 0; this.physics(dt, false); return false; }
    if (this.state === 'stun') { this.go('idle'); this.decide = 0.35; }
    return true;
  }
  pose(t) {
    const P = { t, flash: this.flash > 0, moving: Math.abs(this.vx) > 10 && this.onGround, walk: this.walk, air: !this.onGround, emo: 'normal' };
    const s = this.state;
    if (!this.alive) { P.kneel = true; P.emo = 'shock'; P.armFront = 1.3; P.armBack = 1.4; P.lean = 0.35; P.frame = this.key + '_p1'; return P; }
    if (s === 'stun') { P.emo = 'shock'; P.stun = true; P.lean = -0.15; P.armFront = 1.4; }
    else if (s === 'atkWind' || s === 'skillWind') { P.emo = 'angry'; P.armFront = -1.9; P.stance = true; if (s === 'skillWind') P.glow = STYLES[this.key].aura; }
    else if (s === 'atk') {
      P.emo = 'angry'; P.stance = true; P.lean = 0.15;
      P.armFront = this.hits >= 2 ? lerp(1.0, -1.6, clamp((this.st - 0.3) / 0.12, 0, 1)) : lerp(-1.9, 1.0, easeOut(clamp(this.st / 0.2, 0, 1)));
    } else if (s === 'skill') { P.emo = 'angry'; P.armFront = 0.1; P.stance = true; P.lean = 0.2; }
    else if (s === 'leap') { P.emo = 'angry'; P.armFront = this.vy < 0 ? -2.2 : 0.9; }
    else if (s === 'beamCharge' || s === 'beamFire') { P.emo = 'angry'; P.armFront = -0.4; P.stance = true; P.glow = '#ffd34d'; }
    else if (s === 'overWind') { P.emo = 'shout'; P.armFront = -2.4; P.stance = true; P.glow = '#a77bff'; }
    else if (s === 'stagger') { P.emo = 'shock'; P.stun = true; P.lean = 0.4; P.armFront = 1.5; P.armBack = 1.5; }
    else if (s === 'recover') P.armFront = 1.1;
    if (this.mode === 'opening' && s === 'idle') { P.lean = 0.35; P.emo = 'shock'; P.armFront = 1.4; }
    if (this.mode === 'frenzy' && P.emo === 'normal') P.emo = 'angry';
    if (this.grabbed > 0) { P.emo = 'shock'; P.lean = -0.25; }
    const act = ['atk', 'skill', 'leap', 'beamCharge', 'beamFire'].includes(s) && this.alive && this.grabbed <= 0;
    const wind = s === 'atkWind' || s === 'skillWind' || s === 'overWind' || s === 'beamCharge';
    const cyc = P.moving && !act && !wind ? animFrame(this.key + '_walk', this.b.real) : null; // 워크사이클
    if (cyc) { P.moving = false; P.lean = 0; }
    P.frame = cyc || this.key + (act ? '_p5' : wind ? '_p4' : '_p1');
    return P;
  }
  draw(c, t) {
    this.drawShadow(c, 24);
    if (this.soakT > 0 && this.alive) { // 심연수류 둔화 — 물에 젖음
      c.fillStyle = 'rgba(90,190,255,0.75)';
      for (let i = 0; i < 4; i++) { const yy = this.y - this.h + ((t * 90 + i * 30) % this.h); circle(c, this.x - 14 + i * 9, yy, 2.2); c.fill(); }
    }
    if (this.mode === 'frenzy' && this.alive) {
      const g = c.createRadialGradient(this.x, this.y - 64, 5, this.x, this.y - 64, 90);
      g.addColorStop(0, 'rgba(255,60,30,0.35)'); g.addColorStop(1, 'rgba(255,60,30,0)');
      c.fillStyle = g; c.fillRect(this.x - 90, this.y - 140, 180, 180);
    }
    drawFighter(c, this.key, this.x, this.y, this.facing, this.pose(t));
    if (this.defT > 0 && this.alive) {
      const x = this.x - 24, y = this.y - this.h - 34;
      c.fillStyle = 'rgba(80,140,255,0.9)'; c.beginPath(); c.moveTo(x - 7, y - 8); c.lineTo(x + 7, y - 8); c.lineTo(x + 7, y + 2); c.lineTo(x, y + 9); c.lineTo(x - 7, y + 2); c.closePath(); c.fill();
      c.fillStyle = '#fff'; c.font = `900 10px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('↓', x, y - 1);
    }
  }
}

class Haenim extends Boss { // 간장(파사검): fast melee + 연속 참격
  constructor(b, x) { super(b, 'haenim', x, 2600); this.speed = 235; this.skillCd = 3; this.modeT = 0; }
  setMode(m) {
    const b = this.b;
    this.mode = m;
    if (m === 'frenzy') {
      this.modeT = 7; this.speedMult = 1.5; this.guard = 0.55; this.guardLabel = '동요의 광기';
      b.fx.text(this.x, this.y - this.h - 40, '해님 폭주!', '#ff6a3a', 22, 1.4);
    } else {
      this.modeT = 4.2; this.speedMult = 1; this.guard = 1.7; this.guardLabel = '';
      b.fx.text(this.x, this.y - this.h - 40, '빈틈 발생! 지금이다!', '#ffd27a', 22, 1.4);
      if (this.state !== 'stun') this.go('idle');
    }
  }
  update(dt) {
    const b = this.b;
    if (b.phase === 3 && this.alive) { this.modeT -= dt; if (this.modeT <= 0) this.setMode(this.mode === 'frenzy' ? 'opening' : 'frenzy'); }
    if (!this.baseUpdate(dt)) return;
    const p = b.player, dx = p.x - this.x, adx = Math.abs(dx), fr = this.mode === 'frenzy';
    if (fr && Math.random() < dt * 20) b.fx.part(this.x + rand(-18, 18), this.y - rand(10, 90), { vy: -rand(60, 140), life: 0.5, size: rand(3, 6), color: 'rgba(255,80,40,0.8)', shape: 'puff', grow: 4 });
    switch (this.state) {
      case 'idle':
        this.vx = 0; this.face(dx);
        if (this.mode === 'opening') break;
        this.decide -= dt * (fr ? 2 : 1);
        if (this.decide <= 0) {
          if (this.skillCd <= 0 && adx < 620) this.go('skillWind');
          else if (adx < 90) this.go('atkWind');
          else if (p.y < GROUND_Y - 100 && this.leapCd <= 0 && adx < 520) this.go('leap');
          else this.go('chase');
        }
        break;
      case 'chase':
        this.face(dx); this.vx = sign(dx) * this.speed * this.speedMult;
        if (adx < 80) this.go('atkWind');
        else if (this.st > 1.6) { this.go('idle'); this.decide = 0.1; }
        break;
      case 'atkWind': this.vx = 0; if (this.st >= (fr ? 0.17 : 0.32)) this.go('atk'); break;
      case 'atk': {
        this.vx = this.st < 0.08 ? this.facing * 120 : 0;
        const times = [0.04, 0.3];
        if (this.hits < 2 && this.st >= times[this.hits]) {
          this.hits++;
          b.fx.slash(this.x + this.facing * 42, this.y - 66, this.facing, 58, this.hits === 2, '#ff5a3a');
          Sfx.play('slash');
          if (rectsOverlap(this.frontRect(100, 80, -12), p.rect())) b.hitPlayer(Math.round(50 * this.atkMult), { from: this.x, seal: true });
        }
        if (this.st >= 0.62) { this.go('idle'); this.decide = fr ? 0.12 : 0.55; }
        break;
      }
      case 'skillWind':
        this.vx = 0;
        if (Math.random() < dt * 30) b.fx.part(this.x + this.facing * rand(10, 60), this.y - rand(40, 110), { vx: -this.facing * 40, vy: -40, life: 0.4, size: 3, color: '#ff6a3a' });
        if (this.st >= (fr ? 0.35 : 0.55)) { this.go('skill'); b.skillCard('haenim', 'boss', '간장 연속 참격'); }
        break;
      case 'skill': // 간장 연속 참격
        if (this.hits < 4 && this.st >= this.hits * 0.12) {
          this.hits++;
          b.projectiles.push(new Proj({ kind: 'ganjang', x: this.x + this.facing * 40, y: this.y - 66, vx: this.facing * 560, w: 44, h: 78, life: 1.7, dmg: Math.round(40 * this.atkMult), seal: true, dir: this.facing }));
          Sfx.play('slash');
        }
        if (this.st >= 0.7) { this.skillCd = fr ? 3.2 : 7; this.go('idle'); this.decide = 0.5; }
        break;
      case 'leap':
        if (!this.hitDone && this.st > 0.1 && rectsOverlap(this.rect(), p.rect())) { this.hitDone = true; b.hitPlayer(Math.round(58 * this.atkMult), { from: this.x, seal: true }); }
        if (this.onGround && this.st > 0.15) { b.fx.ring(this.x, this.y, 80, '#ff7a4a', 0.35, true); b.fx.dust(this.x, this.y); b.shake(5); this.go('recover'); }
        break;
      case 'recover': this.vx = 0; if (this.st >= 0.45) { this.go('idle'); this.decide = 0.25; } break;
      default: this.vx = 0;
    }
    this.physics(dt, false);
  }
  enter_leap() {
    const p = this.b.player;
    this.face(p.x - this.x); this.vy = -980; this.vx = clamp((p.x - this.x) / 0.85, -720, 720); this.leapCd = 6; this.onGround = false;
  }
}

class Dalnim extends Boss { // 막야(봉마검): ranged 구속 참격 + phase-2 폭주
  constructor(b, x) { super(b, 'dalnim', x, 2200); this.speed = 215; this.skillCd = 2; this.overCd = 3; this.guardLabel = '막야의 요기 장막'; }
  update(dt) {
    const b = this.b;
    this.guard = b.phase === 2 ? (this.state === 'stagger' ? 2.0 : 0.4) : 1;
    if (!this.baseUpdate(dt)) return;
    const p = b.player, dx = p.x - this.x, adx = Math.abs(dx);
    switch (this.state) {
      case 'idle':
        this.vx = 0; this.face(dx); this.decide -= dt;
        if (this.decide <= 0) {
          if (b.phase === 2 && this.overCd <= 0) this.go('overWind');
          else if (this.skillCd <= 0 && adx < 720) this.go('skillWind');
          else if (adx < 95) this.go('atkWind');
          else if (adx < 230) this.go('retreat');
          else if (adx > 470) this.go('approach');
          else this.decide = 0.3;
        }
        break;
      case 'retreat':
        this.face(dx); this.vx = -sign(dx) * this.speed;
        if (this.x < 70 || this.x > WORLD_W - 70) this.go(adx < 130 ? 'atkWind' : 'skillWind');
        else if (this.st > 0.7 || adx > 330) { this.go('idle'); this.decide = 0.2; }
        break;
      case 'approach':
        this.face(dx); this.vx = sign(dx) * this.speed;
        if (adx < 380 || this.st > 1.3) { this.go('idle'); this.decide = 0.15; }
        break;
      case 'atkWind': this.vx = 0; if (this.st >= 0.3) this.go('atk'); break;
      case 'atk':
        this.vx = 0;
        if (!this.hitDone && this.st >= 0.05) {
          this.hitDone = true;
          b.fx.slash(this.x + this.facing * 40, this.y - 64, this.facing, 62, false, '#a77bff'); Sfx.play('slash');
          if (rectsOverlap(this.frontRect(105, 84, -12), p.rect())) b.hitPlayer(Math.round(46 * this.atkMult), { from: this.x });
        }
        if (this.st >= 0.5) { this.go('idle'); this.decide = 0.5; }
        break;
      case 'skillWind':
        this.vx = 0; this.face(dx);
        if (Math.random() < dt * 30) b.fx.part(this.x + this.facing * rand(10, 50), this.y - rand(40, 110), { vy: -50, life: 0.4, size: 3, color: '#b48cff' });
        if (this.st >= 0.45) { // 막야 구속 참격
          const sx = this.x + this.facing * 34, sy = this.y - 72, tx = p.x, ty = p.y - p.h * 0.5;
          const a = Math.atan2(ty - sy, tx - sx);
          b.projectiles.push(new Proj({ kind: 'makya', x: sx, y: sy, vx: Math.cos(a) * 430, vy: Math.sin(a) * 430, w: 46, h: 46, life: 2.2, dmg: Math.round(36 * this.atkMult), bind: 1.3, dir: this.facing }));
          Sfx.play('slash'); this.skillCd = 5.5; this.go('recover'); b.skillCard('dalnim', 'boss', '막야 구속 참격');
        }
        break;
      case 'recover': this.vx = 0; if (this.st >= 0.4) { this.go('idle'); this.decide = 0.4; } break;
      case 'overWind': // 막야 폭주 → 주화입마
        this.vx = 0;
        if (Math.random() < dt * 50) {
          const a = rand(0, 6.28), r = rand(150, 270);
          b.fx.part(this.x + Math.cos(a) * r, this.y - 64 + Math.sin(a) * r * 0.4, { vx: -Math.cos(a) * r * 1.6, vy: -Math.sin(a) * r * 0.64, life: 0.6, size: 3, color: '#b48cff', shape: 'line', drag: 1 });
        }
        if (this.st >= 1.3) {
          const ddx = p.x - this.x, ddy = ((p.y - p.h / 2) - (this.y - 40)) * 1.6;
          if (Math.hypot(ddx, ddy) < 270) b.hitPlayer(Math.round(105 * this.atkMult), { from: this.x, bind: 1.5 });
          b.fx.ring(this.x, this.y - 30, 270, '#b48cff', 0.5); b.fx.ring(this.x, this.y, 270, '#7a4dff', 0.5, true); b.fx.spark(this.x, this.y - 64, '#c9a6ff', 30, 600);
          b.shake(14); Sfx.play('boom'); this.overCd = 9; this.go('stagger');
          b.fx.text(this.x, this.y - this.h - 44, '주화입마! 빈틈이다!', '#ffd27a', 22, 1.6);
        }
        break;
      case 'stagger': this.vx = 0; if (this.st >= 4) { this.go('idle'); this.decide = 0.5; } break;
      default: this.vx = 0;
    }
    this.physics(dt, false);
  }
  draw(c, t) {
    if (this.state === 'overWind' && this.alive) {
      const k = clamp(this.st / 1.3, 0, 1);
      c.fillStyle = `rgba(122,77,255,${0.1 + k * 0.2})`; c.beginPath(); c.ellipse(this.x, this.y, 270, 60, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = `rgba(200,170,255,${0.4 + k * 0.5})`; c.lineWidth = 3; c.setLineDash([12, 8]);
      c.beginPath(); c.ellipse(this.x, this.y, 270, 60, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(this.x, this.y, 270 * k, 60 * k, 0, 0, Math.PI * 2); c.stroke();
    }
    super.draw(c, t);
  }
}

// ---------------- the battle itself ----------------
class Battle {
  constructor(partyKeys) {
    this.fx = new Effects();
    this.platforms = [{ x: 330, y: 330, w: 210 }, { x: 850, y: 292, w: 220 }, { x: 1390, y: 330, w: 210 }];
    const keys = partyKeys && partyKeys.length === 2 ? partyKeys : ['hocheol', 'dongmin'];
    this.party = keys.map(k => new Player(this, k));
    this.syn = 0; this.synergy = null; this.synCfg = SYNERGY[pairKey(keys[0], keys[1])]; this.cards = [];
    this.active = 0;
    this.party[0].x = this.party[1].x = 360;
    this.bosses = [new Haenim(this, 1250), new Dalnim(this, 1470)];
    this.projectiles = []; this.zones = []; this.assist = null;
    this.phase = 1; this.state = 'intro'; this.t = 0; this.real = 0; this.introT = 0;
    this.camX = clamp(360 - W * 0.4, 0, WORLD_W - W); this.shakeAmt = 0; this.hitstop = 0; this.timeScale = 1;
    this.tagCd = 0; this.assistCd = 0; this.blockCount = 0; this.beam = null; this.beamTimer = 16; this.forceTagT = 0;
    this.bannerObj = null; this.cine = null; this.locked = false; this.paused = false; this.endT = 0; this.ended = false; this.loser = null;
    this.stats = { time: 0, dmgTaken: 0, assists: 0, ults: 0, tags: 0 };
    this.flags = {}; this.phase3T = 0; this.resonance = false; this.hintT = 10;
    this.hasYogiTrap = keys.includes('hocheol');
    this.vbtns = [
      // D-pad: ◀ ▶ ▼ only — jumping lives on the single 점프 button (no duplicate ▲)
      { action: 'left', x: 72, y: 452, r: 36, label: '◀', pad: true },
      { action: 'right', x: 188, y: 452, r: 36, label: '▶', pad: true },
      { action: 'down', x: 130, y: 508, r: 28, label: '▼', pad: true },
      { action: 'attack', x: 868, y: 450, r: 52, label: '공격' },
      { action: 'jump', x: 768, y: 494, r: 36, label: '점프' },
      { action: 'dodge', x: 760, y: 398, r: 32, label: '회피' },
      { action: 'skill', x: 858, y: 344, r: 36, label: '스킬' },
      { action: 'ult', x: 916, y: 262, r: 34, label: '궁극기' },
      { action: 'synergy', x: 790, y: 300, r: 30, label: '합동기' },
      { action: 'tag', x: 40, y: 128, r: 30, hidden: true },
    ];
    this.banner('STAGE 1-5', '해님달님 — 원한의 끝', '#f3c66b', 1.9, true);
  }
  get player() { return this.party[this.active]; }
  liveBosses() { return this.bosses.filter(e => e.alive); }
  banner(title, sub, color = '#fff', dur = 2.2, big = false) { this.bannerObj = { title, sub, color, dur, big, t: 0 }; }
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }
  ultCinematic(p) { this.cine = { key: p.key, name: p.d.ult.name, hanja: p.d.ult.hanja, t: 0 }; this.stats.ults++; this.hitstop = 0.12; }
  // small slide-in card with the doc's skill illustration (그림 2-2 ~ 6-2)
  skillCard(key, kind, name) {
    const img = kind === 'boss' ? 'skill.' + key : 'skill.' + key + '.' + kind;
    if (kind === 'passive' && this.real - (this.lastPassiveCard || -9) < 6) return;
    if (kind === 'passive') this.lastPassiveCard = this.real;
    this.cards = this.cards.filter(cd => cd.side !== (kind === 'boss' ? 'right' : 'left'));
    this.cards.push({ img, name, key, side: kind === 'boss' ? 'right' : 'left', t: 0, dur: kind === 'passive' ? 1.3 : 1.6, kind });
  }
  addSyn(v) { // 2인 시너지 게이지 — 가득 차는 순간 한 번 알려 준다
    const was = this.syn;
    this.syn = Math.min(100, this.syn + v);
    if (was < 100 && this.syn >= 100 && !this.party.some(q => q.dead)) {
      this.banner('합동기 준비!', `「${this.synCfg.name}」 — ` + (Input.touch ? '합동기 버튼' : '[O] 키') + '로 발동', this.synCfg.color, 2.0);
      Sfx.play('ui');
    }
  }
  trySynergy() {
    const p = this.player, o = this.party[1 - this.active], cfg = this.synCfg;
    if (this.synergy || this.state !== 'fight') return;
    if (this.syn < 100 || p.dead || o.dead) { // 아직 못 쓸 때도 눌렀다는 반응은 준다
      if (this.real - (this.lastSynNag || -9) > 0.6) {
        this.lastSynNag = this.real; Sfx.play('block');
        this.fx.text(p.x, p.y - p.h - 34, o.dead ? '합동기 불가 — 파트너 전투불능' : `합동기 게이지 ${Math.floor(this.syn)}% — 공격·교대로 채우자`, '#ff9ac0', 15, 1.1);
      }
      return;
    }
    if (!['idle', 'move', 'attack', 'hurt'].includes(p.state)) return;
    this.syn = 0; this.stats.syn = (this.stats.syn || 0) + 1;
    this.cine = { kind: 'synergy', keys: [p.key, o.key], name: cfg.name, hanja: cfg.hanja, color: cfg.color, t: 0 }; this.hitstop = 0.12;
    Sfx.play('synergy');
    if (cfg.kind === 'assist') { // 최호철 + 이동민: 파마해체 즉시 발동
      let target = null, best = 1e9;
      for (const e of this.liveBosses()) { const d = Math.abs(e.x - p.x); if (d < best) { best = d; target = e; } }
      if (target) { this.assist = new Assist(this, p.key === 'dongmin' ? o : this.party.find(q => q.key === 'dongmin'), target); this.stats.assists++; }
      return;
    }
    p.setState('synergy'); p.inv = 2; p.vx = 0;
    this.synergy = new Synergy(this, cfg, p, o);
  }
  pause() { this.paused = true; Input.setButtons([]); Sfx.play('ui'); }
  resume() { this.paused = false; Input.setButtons(this.vbtns); Sfx.play('ui'); }

  // ---- combat resolution ----
  playerHit(src, rect, o) {
    let n = 0;
    for (const e of this.liveBosses()) if (rectsOverlap(rect, e.rect())) { this.damageBoss(src, e, o); n++; }
    return n;
  }
  damageBoss(src, e, o = {}) {
    if (!e.alive) return 0;
    const cx = e.x, cy = e.y - e.h * 0.6;
    if (src.yogi && !o.basic && !o.phys) {
      // 간장 burns evil energy, 막야 swallows 요기 → 최호철's smoke techniques lose half their power.
      // His fists and pipe strikes are plain physical blows and hit normally.
      o = { ...o, yogiPart: true };
      if (this.real - (e.lastNull || 0) > 0.5) {
        e.lastNull = this.real;
        this.fx.text(cx, cy - 34, '요기 반감', '#c9a6ff', 16);
        this.fx.spark(cx, cy, '#a77bff', 6, 200);
      }
      if (!o.noCount) { this.blockCount++; this.addSyn(1.5); }
      if (!this.flags.nullified) {
        this.flags.nullified = true;
        this.banner('요기 반감!', '간장·막야가 연기 술법을 절반 삼킨다 — 주먹으로 밀어붙이거나 이동민과 연계하라', '#b98cff', 3.4);
      }
      this.tryAssist();
    }
    let dmg = src.atk * (o.mult || 1), crit = false;
    if (src.buffAtk > 0) dmg *= 1.1; // 흑풍맹호격 공격력 +10%
    if (src.tigerAura) dmg *= 1.1;   // 맹호의 위압
    if (src.key === 'dongmin') { // 해체 본능: +3% per 10 hits on the same target, every 5th hit is a +30% 급소 일격
      e.dmHits++;
      dmg *= 1 + 0.03 * Math.min(10, Math.floor(e.dmHits / 10));
      if (e.dmHits % 5 === 0) { dmg *= 1.3; crit = true; this.fx.vfx('dongmin_mark', e.x, e.y - e.h * 0.55, 120, { life: 0.5, s0: 1.7, s1: 0.95, spin: 3 }); }
    }
    if (src.key === 'seondal' && o.basic) src.fanStacks = Math.min(5, src.fanStacks + 1); // 풍류의 잔상 축적
    if (src.key === 'simcheong' && src.dragon && o.basic) dmg *= 1.25; // 용 변신: 평타 피해 +25%
    if (src.key === 'simcheong') { // 인당수의 한: 체력 30% 이하 치명 피해 +20%, 젖은(심연수류) 적 타격 시 피해의 3% 회복
      if (src.hp / src.maxHp <= HAN_HP) { dmg *= 1.2; crit = true; }
      if (e.soakT > 0 && src.hp < src.maxHp) {
        src.hp = Math.min(src.maxHp, src.hp + dmg * 0.03);
        if (src.hp / src.maxHp <= HAN_HP && this.real - (src.lastRegenFx || 0) > 0.8) { src.lastRegenFx = this.real; this.fx.vfx('simcheong_regen', src.x, src.y + 6, 120, { ay: 0.96, life: 0.6, s0: 0.8, s1: 1.2 }); }
      }
    }
    if (o.yogiPart) { // 요기 술법(심청이의 수류 · 최호철의 연기) — 간장·막야가 절반을 삼킨다
      dmg *= 0.5;
      if (!src.yogi && this.real - (e.lastHalfTxt || 0) > 1.5) { e.lastHalfTxt = this.real; this.fx.text(cx, cy - 76, '막야가 요기 일부 흡수', '#c9a6ff', 13); }
    }
    let tm = e.takenMult();
    if (o.guardIgnore && tm < 1) tm = 1; // 풍혈도륙: 방어 무시
    dmg = Math.max(1, Math.round(dmg * tm * rand(0.93, 1.07)));
    e.takeDamage(dmg);
    if (o.push) e.kbv += (sign(e.x - src.x) || src.facing) * o.push * (e.superArmor ? 0.15 : 1);
    if (o.stun) {
      if (e.superArmor && !o.ignoreArmor) this.fx.text(cx, cy - 60, '슈퍼아머', '#ffd27a', 14);
      else e.stun = Math.max(e.stun, o.stun);
    }
    if (o.defDown) { e.defDown = Math.max(e.defT > 0 ? e.defDown : 0, o.defDown); e.defT = o.defT || 6; }
    const col = crit ? '#ffe066' : tm < 0.6 ? '#9aa0b5' : tm > 1.3 ? '#ff9f43' : '#ffffff';
    this.fx.text(cx, cy - 20, (crit ? '급소! ' : '') + dmg, col, crit ? 26 : tm > 1.3 ? 22 : 18);
    if (tm < 0.6 && e.guardLabel && this.real - (e.lastGuardTxt || 0) > 1.4) { e.lastGuardTxt = this.real; this.fx.text(cx, cy - 56, e.guardLabel, '#b9b4d6', 14); }
    if (e.minHp > 0 && e.hp <= e.minHp && this.real - (e.lastClampTxt || 0) > 2) {
      e.lastClampTxt = this.real;
      this.fx.text(cx, cy - 72, this.phase === 1 ? '오누이의 공명 — 쓰러지지 않는다' : '해님은 버틴다 — 달님을 먼저 제압하라!', '#ffd27a', 15, 1.4);
    }
    if (!o.quiet || Math.random() < 0.3) this.fx.impact(cx + rand(-10, 10), cy + rand(-15, 15), crit ? '#ffe066' : '#ffffff');
    if (o.basic) this.basicHitFx(src, e, cx, cy, !!o.fin, crit);
    if (!o.quiet) { this.hitstop = Math.max(this.hitstop, crit ? 0.07 : 0.035); this.shake(crit ? 6 : 3); Sfx.play(crit ? 'crit' : 'hit'); }
    const hanX = src.key === 'simcheong' && src.hp / src.maxHp <= HAN_HP ? 2 : 1; // 인당수의 한: 위기 중 궁극기 충전 2배
    src.ult = Math.min(100, src.ult + dmg / 14 * hanX);
    if (!this.synergy) this.addSyn(dmg / 15);
    return dmg;
  }
  // 평타 적중 연출 — 캐릭터마다 다른 타격감 (베인 자국 / 충격 / 물보라)
  basicHitFx(src, e, cx, cy, fin, crit) {
    const fx = this.fx, F = src.facing, x = cx + rand(-8, 8), y = cy + rand(-14, 10);
    if (src.key === 'dongmin') {
      fx.swing(x - F * 26, y, F, { r: 30, color: '#ff2a3e', core: '#ffffff', thick: 6, a0: -0.9, a1: 0.9, tilt: rand(-0.8, 0.8), life: 0.16, sweep: 0.25 });
      fx.flash(x, y, fin ? 50 : 28, 'rgba(255,60,80,0.8)', F, { life: 0.12, spikes: 5, cone: 0.5 });
      fx.spark(x, y, '#ff5a6a', fin ? 14 : 7, fin ? 420 : 300);
      if (fin) { fx.vfx('dongmin_xslash', x, y, 140, { flip: F < 0, life: 0.28, s0: 1.2, s1: 0.9, add: true, fin: 0.02 }); this.hitstop = Math.max(this.hitstop, 0.08); }
    } else if (src.key === 'hocheol') {
      fx.flash(x, y, fin ? 70 : 44, 'rgba(255,170,70,0.85)', F, { life: fin ? 0.2 : 0.14, cone: 1.6 });
      fx.ring(x, y, fin ? 70 : 42, '#ffb050', 0.22); fx.spark(x, y, '#ffc070', fin ? 14 : 8, fin ? 460 : 340);
      if (fin) fx.smoke(x, y, 4, 'rgba(110,70,160,0.3)', 30);
      if (fin) { fx.vfx('hocheol_roar', x, e.y - 30, 200, { life: 0.4, s0: 0.5, s1: 1.1, add: true, alpha: 0.8 }); this.hitstop = Math.max(this.hitstop, 0.09); this.shake(7); }
    } else if (src.key === 'simcheong') {
      const dr = src.dragon, drop = dr ? '#d9a8ff' : '#8ad8ff';
      for (let i = 0; i < (fin ? 16 : 8); i++) { const ang = -Math.PI / 2 + rand(-1.2, 1.2); const sp = rand(160, fin ? 420 : 300); fx.part(x, y, { vx: Math.cos(ang) * sp + F * 80, vy: Math.sin(ang) * sp, life: rand(0.3, 0.55), size: rand(2, 4.5), color: i % 3 ? drop : '#ffffff', grav: 900, drag: 0.3 }); }
      fx.ring(x, y, fin ? 54 : 34, dr ? '#b57cff' : '#5fd0ff', 0.24);
      if (fin) { fx.vfx(dr ? 'simcheong_lotus' : 'simcheong_whirl', x, y, 150, { life: 0.4, s0: 0.4, s1: 1.1, add: true, spin: 5 }); this.hitstop = Math.max(this.hitstop, 0.07); }
    }
  }
  hitPlayer(dmg, o = {}) {
    const p = this.player;
    if (p.dead || (this.state !== 'fight' && this.state !== 'intro')) return 'inv';
    if (p.state === 'dodge') {
      this.fx.text(p.x, p.y - p.h - 14, '회피!', '#9fe8ff', 18); Sfx.play('dodge');
      p.ult = Math.min(100, p.ult + 6);
      return 'dodged';
    }
    if (p.inv > 0) return 'inv';
    if (p.buffDef > 0) dmg = Math.round(dmg * 0.75); // 시너지 방어 버프
    if (p.tigerAura) dmg = Math.round(dmg * 0.9);    // 맹호의 위압
    p.hp -= dmg; p.flash = 0.12; p.inv = 0.7; p.ult = Math.min(100, p.ult + dmg / 7);
    if (p.key === 'simcheong' && p.hp > 0 && !p.hanAwoken && p.hp / p.maxHp <= HAN_HP) this.hanAwaken(p);
    this.stats.dmgTaken += dmg;
    const dir = sign(p.x - (o.from != null ? o.from : p.x - p.facing)) || -p.facing;
    if (!['ult', 'grab', 'grabdash'].includes(p.state)) { p.setState('hurt'); p.vx = dir * 300; p.vy = -260; p.onGround = false; }
    this.fx.text(p.x, p.y - p.h - 10, '-' + dmg, '#ff6a6a', 20);
    this.fx.spark(p.x, p.y - p.h * 0.6, '#ff6a6a', 8, 260);
    this.shake(8); this.hitstop = Math.max(this.hitstop, 0.05); Sfx.play('hurt');
    if (o.seal && p.key === 'hocheol') {
      p.sealed = 4; this.fx.text(p.x, p.y - p.h - 40, '요기 봉인!', '#c49bff', 18);
      this.tryAssist();
    }
    if (o.bind) {
      p.bound = Math.max(p.bound, o.bind); this.fx.text(p.x, p.y - p.h - 60, '속박!', '#b07cff', 18);
      this.fx.vfx('boss_seal', p.x, p.y + 10, 160, { ay: 0.82, life: o.bind + 0.2, fin: 0.12, s0: 0.7, s1: 1 }); // 봉마 구속 진
    }
    if (p.hp <= 0) this.playerDown(p);
    return 'hit';
  }
  playerDown(p) {
    p.hp = 0; p.dead = true; p.setState('dead'); p.vx = 0;
    p.sealed = 0; p.bound = 0;
    this.fx.text(p.x, p.y - p.h - 20, '전투 불능', '#ff6a6a', 22, 1.4);
    const other = this.party[1 - this.active];
    if (!other.dead) this.forceTagT = 0.8;
    else this.lose(p.key);
  }
  tag(forced) {
    if (this.state !== 'fight' && this.state !== 'intro') return;
    const cur = this.player, nxt = this.party[1 - this.active];
    if (nxt.dead) { if (!forced) this.fx.text(cur.x, cur.y - cur.h - 20, '교대 불가', '#aaa', 16); return; }
    if (!forced && (this.tagCd > 0 || !['idle', 'move', 'attack', 'hurt'].includes(cur.state))) return;
    nxt.x = cur.x; nxt.y = cur.y; nxt.vy = Math.min(cur.vy, 0); nxt.vx = 0; nxt.kbv = 0;
    nxt.facing = cur.facing; nxt.onGround = cur.onGround; nxt.setState('tagin'); nxt.inv = 0.5; nxt.bound = 0;
    if (!cur.dead) { cur.state = 'idle'; cur.vx = 0; cur.bound = 0; }
    this.active = 1 - this.active; this.tagCd = 1.5; this.stats.tags++;
    if (this.state === 'fight' && !this.synergy) this.addSyn(6); // 교대 연계도 합동기 게이지를 채운다
    this.fx.smoke(nxt.x, nxt.y - 64, 8, 'rgba(240,240,255,0.5)', 26);
    this.fx.ring(nxt.x, nxt.y - 64, 60, STYLES[nxt.key].aura, 0.3);
    this.fx.text(nxt.x, nxt.y - nxt.h - 30, nxt.d.name + ' 교대!', STYLES[nxt.key].aura, 18);
    Sfx.play('tag');
  }
  // 인당수의 한 — 죽음의 바다에서 되살아난 원한: 체력이 처음 30% 아래로 떨어지면 궁극기가 즉시 열린다 (전투당 1회).
  // 다른 인원은 게이지를 모아야 궁극기를 쓰지만, 심청이는 위기 그 자체가 궁극기의 열쇠다.
  hanAwaken(p) {
    p.hanAwoken = true; p.ult = 100; p.inv = Math.max(p.inv, 1.0);
    this.fx.vfx('simcheong_regen', p.x, p.y + 6, 220, { ay: 0.96, life: 1.1, s0: 0.6, s1: 1.4 });
    this.fx.vfx('simcheong_lotus', p.x, p.y - 40, 260, { life: 0.9, s0: 0.5, s1: 1.2, add: true });
    this.fx.text(p.x, p.y - p.h - 44, '인당수의 한 — 궁극기 개방!', '#ff7ab8', 20, 1.4);
    this.skillCard(p.key, 'passive', p.d.passive.name);
    this.banner('인당수의 한', '되살아난 원한 — 궁극기 즉시 개방 · 치명 피해 +20% · 궁극기 충전 2배', '#ff4a9a', 2.6);
    this.shake(6); Sfx.play('water');
  }
  tryAssist() {
    const cur = this.player, other = this.party[1 - this.active];
    if (cur.key !== 'hocheol' || other.key !== 'dongmin' || other.dead || this.assist || this.assistCd > 0) return;
    if (this.blockCount < 3 && cur.sealed <= 0) return;
    let target = null, best = 1e9;
    for (const e of this.liveBosses()) { const d = Math.abs(e.x - cur.x); if (d < best) { best = d; target = e; } }
    if (!target) return;
    this.blockCount = 0; this.assistCd = 14; this.stats.assists++;
    this.assist = new Assist(this, other, target);
    this.banner('자동 어시스트 — 파마해체', '破魔解體 · 요기 없는 손이 봉인을 부순다', '#ff5a5a', 2.2);
    Sfx.play('tag');
  }
  lose(key) {
    if (this.state === 'defeat' || this.state === 'victory') return;
    this.state = 'defeat'; this.loser = key; this.endT = 0; this.locked = true; Sfx.play('lose'); Music.play('defeat');
  }
  victory() {
    this.state = 'victory'; this.endT = 0; this.locked = true; this.timeScale = 0.3;
    Music.play('victory');
    this.banner('해님·달님 제압!', '의정부의 밤을 지켜냈다', '#ffd34d', 3, true);
    this.beam = null;
    Sfx.play('win');
  }

  // ---- twin-sword beam (쌍검 에너지 광선): 2.5s charge, then a ground-level beam; cooldown 25s ----
  updateBeam(dt) {
    const [h, d] = this.bosses;
    const both = h.alive && d.alive;
    const bm = this.beam;
    if (bm) {
      bm.t += dt;
      if (bm.stage === 'charge') {
        if (!both || h.state !== 'beamCharge' || d.state !== 'beamCharge' || h.grabbed > 0 || d.grabbed > 0) {
          this.beam = null;
          for (const e of [h, d]) if (e.alive && e.state === 'beamCharge') e.go('idle');
          this.banner('광선 저지!', '쌍검의 공명이 끊어졌다', '#ffd27a', 1.6);
          this.beamTimer = 18; return;
        }
        bm.x = (h.x + d.x) / 2;
        if (Math.random() < dt * 60) {
          const a = rand(0, 6.28), r = rand(60, 160);
          this.fx.part(bm.x + Math.cos(a) * r, bm.y + Math.sin(a) * r, { vx: -Math.cos(a) * r * 2, vy: -Math.sin(a) * r * 2, life: 0.45, size: 3, color: '#ffd34d', shape: 'line', drag: 1 });
        }
        if (bm.t >= 2.5) { bm.stage = 'fire'; bm.t = 0; Sfx.play('beam'); this.shake(14); h.go('beamFire'); d.go('beamFire'); }
      } else {
        if (!bm.hit && bm.t < 0.3) {
          const band = { x: bm.dir > 0 ? bm.x : 0, y: GROUND_Y - 120, w: bm.dir > 0 ? WORLD_W - bm.x : bm.x, h: 120 };
          if (rectsOverlap(band, this.player.rect())) { const r = this.hitPlayer(170, { from: bm.x }); if (r !== 'inv') bm.hit = true; }
        }
        if (bm.t >= 0.8) { this.beam = null; for (const e of [h, d]) if (e.alive) e.go('recover'); this.beamTimer = 25; }
      }
      return;
    }
    if (this.phase > 2 || !both) return;
    this.beamTimer -= dt;
    const ready = e => ['idle', 'chase', 'approach', 'retreat'].includes(e.state) && e.grabbed <= 0 && e.stun <= 0;
    if (this.beamTimer <= 0 && ready(h) && ready(d)) {
      const mx = (h.x + d.x) / 2, dir = this.player.x >= mx ? 1 : -1;
      this.beam = { stage: 'charge', t: 0, x: mx, y: GROUND_Y - 60, dir, hit: false };
      h.go('beamCharge'); d.go('beamCharge'); h.facing = d.facing = dir;
      this.banner('쌍검 에너지 광선', '지붕 위로 피하거나, 회피로 흘려라 — 해님·달님을 기절시키면 저지!', '#ffd34d', 2.4);
      this.skillCard('twin', 'boss', '쌍검 에너지 광선');
      Sfx.play('charge');
    }
  }
  updatePhase(dt) {
    const [h, d] = this.bosses;
    if (this.phase === 1) {
      h.minHp = h.maxHp * 0.55; d.minHp = d.maxHp * 0.55;
      if (h.hp <= h.maxHp * 0.7 || d.hp <= d.maxHp * 0.7) {
        this.phase = 2; Music.setIntensity(2); h.minHp = h.maxHp * 0.35; d.minHp = 0; d.overCd = 2.5;
        this.banner('PHASE 2', PHASE_NAMES[2] + ' — 달님의 폭주 뒤 빈틈을 노려라', '#b98cff', 2.6, true);
      }
    } else if (this.phase === 2) {
      if (d.hp <= 0 && !d.subdued) {
        d.subdued = true; d.go('down');
        if (this.beam) { this.beam = null; if (h.alive) h.go('idle'); }
        this.banner('달님 제압!', '막야가 손에서 떨어졌다', '#b98cff', 1.6);
        this.phase3T = 1.7;
      }
      if (this.phase3T > 0) {
        this.phase3T -= dt;
        if (this.phase3T <= 0) {
          this.phase = 3; Music.setIntensity(3); h.minHp = 0; h.setMode('frenzy');
          this.banner('PHASE 3', PHASE_NAMES[3] + ' — 폭주가 끝난 빈틈에 마지막 일격을!', '#ff6a3a', 2.6, true);
        }
      }
    } else if (this.phase === 3 && h.hp <= 0 && !h.dead) {
      h.dead = true; h.mode = null; h.go('down');
      this.victory();
    }
  }
  updateResonance() { // 1페이즈 규칙: 두 보스가 가까울수록 공격력 상승
    const [h, d] = this.bosses;
    this.resonance = this.phase <= 2 && h.alive && d.alive && Math.abs(h.x - d.x) < 240;
    h.atkMult = (this.resonance ? 1.25 : 1) * (h.mode === 'frenzy' ? 1.35 : 1);
    d.atkMult = this.resonance ? 1.25 : 1;
  }

  // ---- frame ----
  update(dt) {
    this.real += dt;
    if (this.paused) { this.updatePause(); return; }
    if (Input.pressed('pause') || Input.tapCircle(936, 28, 24)) { this.pause(); return; }
    if (this.bannerObj) { this.bannerObj.t += dt; if (this.bannerObj.t > this.bannerObj.dur) this.bannerObj = null; }
    if (this.cine) { this.cine.t += dt; if (this.cine.t > 1.1) this.cine = null; }
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 40);
    if (this.state === 'fight' && this.hintT > 0) this.hintT -= dt;
    if (this.state === 'victory' || this.state === 'defeat') {
      this.endT += dt; this.timeScale = Math.min(1, this.timeScale + dt * 0.4);
      if (!this.ended && this.endT > 3.2) {
        this.ended = true;
        if (this.state === 'victory') Flow.win(this.stats); else Flow.lose(this.loser);
      }
    }
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    const sdt = dt * this.timeScale;
    this.t += sdt;
    if (this.state === 'intro') { this.introT += dt; if (this.introT > 2.0) { this.state = 'fight'; this.banner('PHASE 1', PHASE_NAMES[1] + ' — 두 보스가 붙어 있으면 공격력 상승', '#ffb347', 2.4, true); } }
    if (this.state === 'fight') this.stats.time += sdt;
    this.tagCd = Math.max(0, this.tagCd - sdt); this.assistCd = Math.max(0, this.assistCd - sdt);
    if (!this.locked && Input.pressed('tag')) this.tag(false);
    if (!this.locked && Input.pressed('synergy')) this.trySynergy();
    for (const cd of this.cards) cd.t += dt;
    this.cards = this.cards.filter(cd => cd.t < cd.dur);
    if (this.forceTagT > 0) { this.forceTagT -= sdt; if (this.forceTagT <= 0) this.tag(true); }

    this.player.update(sdt);
    const fighting = this.state === 'fight';
    for (const e of this.bosses) { const edt = sdt * (e.soakT > 0 ? 0.7 : 1); if (fighting) e.update(edt); else e.idleUpdate(edt); } // 심연수류 둔화 30%
    for (const pr of this.projectiles) pr.update(sdt, this);
    this.projectiles = this.projectiles.filter(p => !p.done);
    for (const z of this.zones) z.update(sdt);
    this.zones = this.zones.filter(z => !z.done);
    if (this.assist) { this.assist.update(sdt); if (this.assist.done) this.assist = null; }
    if (this.synergy) { this.synergy.update(sdt); if (this.synergy.done) { this.synergy = null; if (this.player.state === 'synergy') this.player.setState('idle'); this.player.inv = 0.3; } }
    if (fighting) { this.updateBeam(sdt); this.updatePhase(sdt); this.updateResonance(); }
    this.fx.update(sdt);

    const p = this.player;
    const target = clamp(p.x - W * 0.5 + p.facing * 60, 0, WORLD_W - W);
    this.camX += (target - this.camX) * Math.min(1, dt * 4);
  }
  updatePause() {
    const bx = W / 2 - 130;
    if (Input.pressed('pause') || Input.pressed('confirm') || Input.tapIn(bx, 200, 260, 48)) this.resume();
    else if (Input.tapIn(bx, 258, 260, 48)) Flow.battle(this.party.map(p => p.key));
    else if (Input.tapIn(bx, 316, 260, 48)) Flow.map();
    else if (Input.tapIn(bx, 374, 260, 48)) Sfx.toggle();
  }

  // ---- render ----
  draw(c) {
    const sx = this.shakeAmt ? rand(-1, 1) * this.shakeAmt : 0, sy = this.shakeAmt ? rand(-1, 1) * this.shakeAmt : 0;
    BG.backdrop(c, this.camX, this.real);
    c.save();
    c.translate(-Math.round(this.camX) + sx, sy);
    BG.street(c, this.camX, this.real);
    for (const pl of this.platforms) BG.platform(c, pl, this.real);
    if (this.cine && this.cine.t < 0.9) { c.fillStyle = `rgba(0,0,0,${0.5 * (1 - this.cine.t / 0.9)})`; c.fillRect(this.camX - 20, 0, W + 40, H); }
    this.drawBeam(c, false);
    if (this.resonance) {
      const [h, d] = this.bosses;
      c.strokeStyle = `rgba(255,210,120,${0.35 + Math.sin(this.real * 8) * 0.2})`; c.lineWidth = 3; c.setLineDash([6, 6]);
      seg(c, h.x, h.y - 75, d.x, d.y - 75); c.setLineDash([]);
    }
    for (const e of this.bosses) e.draw(c, this.t);
    if (this.player.key === 'dongmin') for (const e of this.bosses) { // 해체 본능 급소 조준 표식 — 5타째가 급소
      const st = e.dmHits % 5;
      if (e.alive && e.dmHits > 0 && st >= 2) drawVfx(c, 'dongmin_markS', e.x, e.y - e.h * 0.55, 34 + st * 9, { rot: this.real * 2, alpha: 0.35 + st * 0.15 });
    }
    if (this.assist) this.assist.draw(c, this.t);
    if (this.synergy) this.synergy.draw(c, this.t);
    this.player.draw(c, this.t);
    for (const pr of this.projectiles) pr.draw(c);
    for (const z of this.zones) z.draw(c);
    this.drawBeam(c, true);
    this.fx.draw(c);
    c.restore();
    BG.foliage(c, this.real);

    const p = this.player;
    if (!p.dead && p.hp / p.maxHp < 0.3) {
      const g = c.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
      g.addColorStop(0, 'rgba(200,0,0,0)'); g.addColorStop(1, `rgba(200,0,0,${0.3 + Math.sin(this.real * 6) * 0.1})`);
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    this.drawCards(c);
    this.drawCine(c);
    this.drawHUD(c);
    this.drawControls(c);
    this.drawBanner(c);
    if (this.state === 'defeat') this.drawDefeat(c);
    if (this.paused) this.drawPause(c);
  }
  drawBeam(c, front) {
    const bm = this.beam;
    if (!bm) return;
    const x0 = bm.dir > 0 ? bm.x : 0, x1 = bm.dir > 0 ? WORLD_W : bm.x, y0 = GROUND_Y - 120;
    if (!front && bm.stage === 'charge') {
      const k = bm.t / 2.5;
      c.fillStyle = `rgba(255,211,77,${0.08 + k * 0.15 + Math.sin(this.real * 20) * 0.04})`; c.fillRect(x0, y0, x1 - x0, 120);
      c.strokeStyle = 'rgba(255,220,120,0.7)'; c.lineWidth = 2; c.setLineDash([14, 10]);
      c.strokeRect(x0, y0, x1 - x0, 120); c.setLineDash([]);
      drawVfx(c, 'boss_converge', bm.x, bm.y - 20, 110 + k * 170, { rot: this.real * 3, alpha: 0.4 + k * 0.6, add: true }); // 쌍검 에너지 수렴
      const g = c.createRadialGradient(bm.x, bm.y, 2, bm.x, bm.y, 30 + k * 40);
      g.addColorStop(0, '#fffbe6'); g.addColorStop(0.4, 'rgba(255,211,77,0.9)'); g.addColorStop(1, 'rgba(255,211,77,0)');
      c.fillStyle = g; circle(c, bm.x, bm.y, 30 + k * 40); c.fill();
    }
    if (front && bm.stage === 'fire') {
      const k = 1 - bm.t / 0.8, wob = Math.sin(this.real * 60) * 6;
      const g = c.createLinearGradient(0, y0, 0, GROUND_Y);
      g.addColorStop(0, `rgba(255,200,60,${0.2 * k})`); g.addColorStop(0.5, `rgba(255,255,230,${0.95 * k})`); g.addColorStop(1, `rgba(255,200,60,${0.2 * k})`);
      c.fillStyle = g; c.fillRect(x0, y0 - wob, x1 - x0, 120 + wob * 2);
      c.fillStyle = `rgba(255,255,255,${0.9 * k})`; c.fillRect(x0, y0 + 50, x1 - x0, 20);
      // 쌍검 에너지 광선: painted beam, muzzle (right edge of the art) at the twins
      drawVfx(c, 'boss_beam', bm.x, y0 + 60, Math.max(600, x1 - x0 + 60), { h: 230, flip: bm.dir > 0, ax: 0.97, alpha: Math.min(1, k * 1.4) });
    }
  }
  drawCards(c) { // skill-art cards (player: left under the HUD, bosses: right under the HP bars)
    for (const cd of this.cards) {
      const inK = easeOut(clamp(cd.t / 0.22, 0, 1)), outK = clamp((cd.dur - cd.t) / 0.25, 0, 1), k = Math.min(inK, outK);
      const left = cd.side === 'left', w = left ? 250 : 230, h = left ? 118 : 96;
      const x = left ? 12 - (1 - inK) * 280 : W - 64 - w + (1 - inK) * 280, y = left ? 196 : 126;
      c.save(); c.globalAlpha = k;
      const shape = () => { c.beginPath(); c.moveTo(x + 14, y); c.lineTo(x + w, y); c.lineTo(x + w - 14, y + h); c.lineTo(x, y + h); c.closePath(); };
      c.shadowColor = left ? (STYLES[cd.key] || {}).aura || '#ff6aa8' : '#ff3a5a'; c.shadowBlur = 16;
      c.fillStyle = '#12060e'; shape(); c.fill(); c.shadowBlur = 0;
      c.save(); shape(); c.clip(); drawCrop(c, cd.img, x, y, w, h, 'cover', 0.5, 0.45);
      const g = c.createLinearGradient(0, y + h * 0.45, 0, y + h); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.85)');
      c.fillStyle = g; c.fillRect(x, y, w, h); c.restore();
      c.strokeStyle = left ? '#ffb0d0' : '#ff6a7a'; c.lineWidth = 2; shape(); c.stroke();
      c.font = `800 10px ${SANS}`; c.textAlign = left ? 'left' : 'right'; c.textBaseline = 'middle';
      const tag = cd.kind === 'passive' ? '패시브' : cd.kind === 'boss' ? '보스 스킬' : '액티브';
      outlinedText(c, tag, left ? x + 18 : x + w - 18, y + 12, '#ffd0e0', '#000', 3);
      c.font = `800 18px ${SERIF}`; outlinedText(c, cd.name, left ? x + 14 : x + w - 18, y + h - 16, '#fff', '#000', 4);
      c.restore();
    }
  }
  drawCine(c) { // ultimate cut-in using the doc's skill illustration (그림 3-2 / 4-2) · synergy cut-in with both figures
    const ci = this.cine;
    if (!ci) return;
    if (ci.kind === 'synergy') {
      const k = ci.t < 0.15 ? ci.t / 0.15 : ci.t > 0.85 ? Math.max(0, 1 - (ci.t - 0.85) / 0.25) : 1;
      c.save(); c.globalAlpha = k;
      const band = () => { c.beginPath(); c.moveTo(0, 120); c.lineTo(W, 90); c.lineTo(W, 330); c.lineTo(0, 360); c.closePath(); };
      c.fillStyle = 'rgba(8,2,14,0.88)'; band(); c.fill();
      c.save(); band(); c.clip();
      const g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, ci.color + '55'); g.addColorStop(1, '#00000000');
      c.fillStyle = g; c.fillRect(0, 80, W, 300);
      drawBust(c, ci.keys[0], 610 + (1 - k) * 120, 96, 300, { glow: STYLES[ci.keys[0]].aura });
      drawBust(c, ci.keys[1], 800 + (1 - k) * 200, 110, 285, { glow: STYLES[ci.keys[1]].aura });
      c.restore();
      c.strokeStyle = ci.color; c.lineWidth = 3;
      c.beginPath(); c.moveTo(0, 120); c.lineTo(W, 90); c.stroke(); c.beginPath(); c.moveTo(0, 360); c.lineTo(W, 330); c.stroke();
      c.textAlign = 'left'; c.textBaseline = 'middle';
      c.font = `800 14px ${SANS}`; outlinedText(c, '2인 시너지 합동기', 44, 182, '#ffd0e0', '#000', 3);
      c.font = `800 54px ${SERIF}`; outlinedText(c, ci.name, 40 + (1 - k) * 60, 236, '#fff', ci.color, 7);
      c.font = `700 20px ${SERIF}`; outlinedText(c, ci.hanja + '  ·  ' + CHAR_DATA[ci.keys[0]].name + ' × ' + CHAR_DATA[ci.keys[1]].name, 46, 284, '#f3c66b', '#000', 4);
      c.restore();
      return;
    }
    const k = ci.t < 0.15 ? ci.t / 0.15 : ci.t > 0.85 ? Math.max(0, 1 - (ci.t - 0.85) / 0.25) : 1;
    const aura = STYLES[ci.key].aura;
    const band = () => { c.beginPath(); c.moveTo(0, 150); c.lineTo(W, 104); c.lineTo(W, 300); c.lineTo(0, 346); c.closePath(); };
    c.save(); c.globalAlpha = k;
    c.fillStyle = 'rgba(0,0,0,0.85)'; band(); c.fill();
    c.save(); band(); c.clip();
    drawCrop(c, 'skill.' + ci.key + '.ult', (1 - k) * -140 + ci.t * 30, 96, W, 260, 'cover', 0.5, 0.45);
    const g = c.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(0.45, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 90, W, 270);
    c.restore();
    c.strokeStyle = aura; c.lineWidth = 3;
    c.beginPath(); c.moveTo(0, 150); c.lineTo(W, 104); c.stroke();
    c.beginPath(); c.moveTo(0, 346); c.lineTo(W, 300); c.stroke();
    c.textAlign = 'left'; c.textBaseline = 'middle';
    c.font = `800 50px ${SERIF}`; outlinedText(c, ci.name, 40 + (1 - k) * 60, 226, '#fff', aura, 7);
    c.font = `700 20px ${SERIF}`; outlinedText(c, ci.hanja, 46, 270, '#f3c66b', '#000', 4);
    c.restore();
  }
  bar(c, x, y, w, h, k, col, back, label) { // slanted brush-style bar (그림 10-1)
    const sk = h * 0.6;
    const shape = (ww) => { c.beginPath(); c.moveTo(x + sk, y); c.lineTo(x + ww, y); c.lineTo(x + ww - sk, y + h); c.lineTo(x, y + h); c.closePath(); };
    c.fillStyle = 'rgba(0,0,0,0.7)'; c.beginPath(); c.moveTo(x + sk - 3, y - 3); c.lineTo(x + w + 3, y - 3); c.lineTo(x + w - sk + 3, y + h + 3); c.lineTo(x - 3, y + h + 3); c.closePath(); c.fill();
    c.fillStyle = back; shape(w); c.fill();
    const kk = clamp(k, 0, 1);
    if (kk > 0) {
      c.fillStyle = col; shape(Math.max(sk + 2, w * kk)); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.28)'; c.fillRect(x + sk, y + 1, Math.max(0, w * kk - sk - 2), Math.max(1, h * 0.22));
    }
    if (label) { c.font = `700 ${Math.max(9, h - 4)}px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle'; outlinedText(c, label, x + w / 2, y + h / 2 + 0.5, '#fff', 'rgba(0,0,0,0.8)', 3); }
  }
  portraitCircle(c, key, x, y, r, dead, emo = 'normal') {
    c.save();
    c.shadowColor = '#ff2a3a'; c.shadowBlur = 12; circle(c, x, y, r + 3); c.fillStyle = '#1a0a12'; c.fill(); c.shadowBlur = 0;
    drawFaceCircle(c, key, dead ? 'shock' : emo, x, y, r, { dim: dead });
    if (dead) { c.strokeStyle = '#ff4a4a'; c.lineWidth = 4; seg(c, x - r * 0.5, y - r * 0.5, x + r * 0.5, y + r * 0.5); seg(c, x + r * 0.5, y - r * 0.5, x - r * 0.5, y + r * 0.5); }
    c.strokeStyle = '#c81a2a'; c.lineWidth = 3; circle(c, x, y, r); c.stroke();
    c.strokeStyle = 'rgba(255,220,230,0.45)'; c.lineWidth = 1; circle(c, x, y, r + 4); c.stroke();
    c.restore();
  }
  faceEmo(p) {
    if (p.dead) return 'shock';
    if (p.state === 'ult' || p.state === 'grab') return 'shout';
    if (p.state === 'hurt') return p.key === 'dongmin' ? 'shock' : 'shout';
    if (p.state === 'attack' || p.state === 'skill' || p.state === 'grabdash') return p.key === 'dongmin' ? 'angry' : 'smirk';
    return 'normal';
  }
  drawHUD(c) {
    const p = this.player, o = this.party[1 - this.active];
    c.save();
    // active character (top-left, 그림 10-1)
    this.portraitCircle(c, p.key, 52, 52, 40, p.dead, this.faceEmo(p));
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.font = `800 15px ${SANS}`; outlinedText(c, p.d.name, 102, 22, '#fff', '#000', 3);
    const nw = c.measureText(p.d.name).width;
    c.font = `500 11px ${SANS}`; outlinedText(c, p.d.title, 110 + nw, 22, '#e0c8d8', '#000', 3);
    this.bar(c, 98, 28, 290, 17, p.hp / p.maxHp, '#e0232e', '#3a0a12', `${Math.ceil(p.hp)} / ${p.maxHp}`);
    const full = p.ult >= 100;
    this.bar(c, 98, 50, 240, 8, p.ult / 100, full ? `hsl(${45 + Math.sin(this.real * 8) * 10},100%,65%)` : '#d9a440', '#2a1a10');
    c.font = `700 10px ${SANS}`; c.textAlign = 'left';
    outlinedText(c, full ? '궁극기 준비!  ' + p.d.ult.name : '궁극기 ' + Math.floor(p.ult) + '%', 100, 72, full ? '#ffe27a' : '#d8c8b0', '#000', 3);
    // standby (tag) slot below
    const tx = 40, ty = 128;
    this.portraitCircle(c, o.key, tx, ty, 25, o.dead);
    if (this.tagCd > 0 && !o.dead) {
      c.fillStyle = 'rgba(0,0,0,0.55)'; c.beginPath(); c.moveTo(tx, ty); c.arc(tx, ty, 25, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (this.tagCd / 1.5)); c.closePath(); c.fill();
    }
    this.bar(c, tx + 32, ty + 6, 70, 6, o.hp / o.maxHp, '#e0232e', '#3a0a12');
    c.font = `800 11px ${SANS}`; c.textAlign = 'left';
    outlinedText(c, (Input.touch ? 'TAG ' : 'TAG [Q] ') + o.d.name, tx + 32, ty - 4, '#ffd27a', '#000', 3);
    // 2인 시너지 합동기 게이지
    const synFull = this.syn >= 100 && !this.party.some(q => q.dead), sx = 196, sy = ty + 4;
    this.bar(c, sx, sy, 150, 7, this.syn / 100, synFull ? `hsl(${330 + Math.sin(this.real * 8) * 12},100%,66%)` : this.synCfg.color, '#1e1424');
    c.font = `800 11px ${SANS}`; c.textAlign = 'left';
    outlinedText(c, synFull ? `합동기 준비! ${Input.touch ? '' : '[O] '}${this.synCfg.name}` : `합동기 ${this.synCfg.name} ${Math.floor(this.syn)}%`, sx, sy - 6, synFull ? '#ffd0f0' : '#e8c8e0', '#000', 3);
    // statuses
    let chipX = 12;
    const chip = (txt, col) => {
      c.font = `700 11px ${SANS}`; const w = c.measureText(txt).width + 14;
      c.fillStyle = col; roundRect(c, chipX, 166, w, 18, 9); c.fill();
      c.fillStyle = '#fff'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(txt, chipX + 7, 175.5); chipX += w + 6;
    };
    if (p.sealed > 0) chip(`요기 봉인 ${p.sealed.toFixed(1)}s`, '#6a3cb0');
    if (p.bound > 0) chip(`속박 ${p.bound.toFixed(1)}s`, '#7a4dff');
    if (p.key === 'hocheol' && o.key === 'dongmin' && !o.dead) chip(this.assistCd > 0 ? `파마해체 대기 ${Math.ceil(this.assistCd)}s` : '파마해체 준비', this.assistCd > 0 ? '#3a3a48' : '#a8242c');
    if (p.key === 'seondal') chip(`풍류의 잔상 ${p.fanStacks}/5`, p.fanStacks >= 5 ? '#2a7ab8' : '#2a3048');
    if (p.dragon) chip(`용 변신 ${Math.ceil(p.dragonT)}s — 평타 +25%`, '#6a2cc0');
    if (p.key === 'simcheong' && p.hp / p.maxHp <= HAN_HP) chip('인당수의 한 — 치명 +20% · 궁극기 충전 2배', '#8a1a4a');
    else if (p.key === 'simcheong' && !p.hanAwoken) chip('인당수의 한 — 체력 30% 이하 시 궁극기 개방', '#3a2040');
    if (p.buffAtk > 0 || p.buffDef > 0) chip('시너지 버프', '#8a5a1a');
    // bosses (top-right)
    const bx = 600, bw = 300;
    if (this.phase === 2 && this.bosses[0].hp <= this.bosses[0].minHp + 1) {
      c.font = `700 11px ${SANS}`; c.textAlign = 'right'; c.textBaseline = 'middle';
      outlinedText(c, '해님은 달님이 쓰러질 때까지 버틴다', bx + bw, 132, '#ffd27a', '#000', 3);
    }
    this.bosses.forEach((e, i) => {
      const y = 14 + i * 32;
      drawFaceCircle(c, e.key, e.alive ? (e.state === 'stun' || e.state === 'stagger' ? 'shock' : 'normal') : 'shock', bx - 18, y + 7, 13, { dim: !e.alive });
      c.strokeStyle = e.key === 'haenim' ? '#ff5a3a' : '#b47cff'; c.lineWidth = 2; circle(c, bx - 18, y + 7, 13); c.stroke();
      this.bar(c, bx, y, bw, 14, e.hp / e.maxHp, e.key === 'haenim' ? '#e0482a' : '#8a5cf0', '#1e0e22', e.alive ? '' : '제압');
      c.font = `800 10px ${SANS}`; c.textAlign = 'left'; c.textBaseline = 'middle';
      outlinedText(c, e.key === 'haenim' ? '해님 · 간장' : '달님 · 막야', bx + 14, y + 7.5, '#fff', 'rgba(0,0,0,0.8)', 3);
      if (e.alive && e.minHp > 0) { const mx = bx + bw * e.minHp / e.maxHp; c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(mx - 1, y - 2, 2, 18); }
    });
    c.font = `800 12px ${SANS}`; c.textAlign = 'right'; c.textBaseline = 'middle';
    outlinedText(c, `PHASE ${this.phase} · ${PHASE_NAMES[this.phase]}`, bx + bw, 88, '#ffb8d0', 'rgba(0,0,0,0.85)', 3);
    if (this.resonance) { c.textAlign = 'left'; outlinedText(c, '오누이 공명 — 공격력 ↑', bx - 30, 88, '#ffcf6a', 'rgba(0,0,0,0.85)', 3); }
    if (this.beam && this.beam.stage === 'charge') {
      this.bar(c, bx, 100, bw, 8, this.beam.t / 2.5, '#ffd34d', '#3a2e10');
      c.textAlign = 'right'; c.font = `700 11px ${SANS}`; outlinedText(c, '쌍검 에너지 광선 충전', bx + bw, 118, '#ffd34d', '#000', 3);
    }
    // pause (그림 10-1 top-right)
    c.fillStyle = 'rgba(10,6,16,0.75)'; circle(c, 936, 28, 19); c.fill(); c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#fff'; c.fillRect(929, 19, 5, 18); c.fillRect(938, 19, 5, 18);
    // hint
    if (this.state === 'fight' && this.hintT > 0) {
      c.globalAlpha = Math.min(1, this.hintT);
      neonPanel(c, W / 2 - 240, 296, 480, 50, { r: 8 });
      c.font = `500 13px ${SANS}`; c.fillStyle = '#f2e2ea'; c.textAlign = 'center'; c.textBaseline = 'middle';
      const l1 = this.hasYogiTrap ? '최호철의 연기 술법과 심청이의 수류는 간장·막야가 절반을 삼킨다. 주먹·칼·부채는 정상 타격.' : '간장은 사악한 기운을 태우고, 막야는 요기를 삼킨다. 심청이의 수류는 절반만 통한다.';
      const l2 = '교대: ' + (Input.touch ? '좌측 대기 초상화' : 'Q / 좌측 대기 초상화') + ' · 합동기 게이지가 차면 ' + (Input.touch ? '합동기 버튼' : 'O 키') + ' — ' + this.synCfg.name;
      c.fillText(l1, W / 2, 313);
      c.fillText(l2, W / 2, 331);
      c.globalAlpha = 1;
    }
    if (!Input.touch) {
      c.font = `500 11px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      outlinedText(c, '←→ 이동 · Space/↑ 점프 · ↓+점프 내려가기 · J 공격 · K 스킬 · U 궁극기 · O 합동기 · L/Shift 회피 · Q 교대 · M 소리 · Esc 일시정지', W / 2, H - 10, 'rgba(255,255,255,0.7)', 'rgba(0,0,0,0.6)', 3);
    }
    c.restore();
  }
  drawIcon(c, action, x, y, r) {
    c.save(); c.translate(x, y);
    c.strokeStyle = '#fff'; c.fillStyle = '#fff'; c.lineCap = 'round'; c.lineJoin = 'round';
    if (action === 'attack') { // glowing blade (그림 10-1 attack button)
      c.rotate(-0.8);
      c.shadowColor = '#ff3040'; c.shadowBlur = 12;
      c.beginPath(); c.moveTo(-r * 0.55, 2.5); c.lineTo(r * 0.5, 1.5); c.lineTo(r * 0.62, 0); c.lineTo(r * 0.5, -1.5); c.lineTo(-r * 0.55, -2.5); c.closePath(); c.fill();
      c.shadowBlur = 0; c.lineWidth = 3; seg(c, -r * 0.55, -7, -r * 0.55, 7); c.lineWidth = 4; seg(c, -r * 0.55, 0, -r * 0.75, 0);
    } else if (action === 'skill') { // triple slash streaks
      c.lineWidth = 3; c.shadowColor = '#ff3040'; c.shadowBlur = 8;
      for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(-r * 0.45, r * 0.3 + i * 7); c.quadraticCurveTo(0, i * 7, r * 0.45, -r * 0.35 + i * 7); c.stroke(); }
    } else if (action === 'ult') { // burst star
      c.shadowColor = '#ffd34d'; c.shadowBlur = 10; drawStar(c, 0, 0, r * 0.5);
    } else if (action === 'dodge') { // dash figure + speed lines
      c.lineWidth = 2.5; seg(c, -r * 0.55, -4, -r * 0.15, -4); seg(c, -r * 0.6, 3, -r * 0.2, 3);
      circle(c, r * 0.2, -r * 0.35, 3.2); c.fill();
      c.lineWidth = 3; c.beginPath(); c.moveTo(r * 0.1, -r * 0.15); c.lineTo(-r * 0.05, r * 0.15); c.lineTo(r * 0.25, r * 0.4); c.moveTo(-r * 0.05, r * 0.15); c.lineTo(-r * 0.3, r * 0.35); c.moveTo(r * 0.05, -r * 0.05); c.lineTo(r * 0.35, r * 0.05); c.stroke();
    } else if (action === 'jump') {
      c.lineWidth = 3.5; c.beginPath(); c.moveTo(-r * 0.35, r * 0.15); c.lineTo(0, -r * 0.25); c.lineTo(r * 0.35, r * 0.15); c.stroke();
      c.beginPath(); c.moveTo(-r * 0.35, r * 0.42); c.lineTo(0, r * 0.05); c.lineTo(r * 0.35, r * 0.42); c.globalAlpha = 0.5; c.stroke();
    } else { // arrows
      const ang = { left: Math.PI, right: 0, jump: -Math.PI / 2, down: Math.PI / 2 }[action] || 0;
      c.rotate(ang); c.beginPath(); c.moveTo(r * 0.4, 0); c.lineTo(-r * 0.2, -r * 0.35); c.lineTo(-r * 0.2, r * 0.35); c.closePath(); c.fill();
    }
    c.restore();
  }
  drawControls(c) {
    const p = this.player;
    c.save();
    // D-pad ring (그림 10-1 bottom-left)
    c.globalAlpha = 0.75;
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2; circle(c, 130, 452, 86); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 1; circle(c, 130, 452, 80); c.stroke(); circle(c, 130, 452, 24); c.stroke();
    c.fillStyle = 'rgba(10,6,16,0.35)'; circle(c, 130, 452, 86); c.fill();
    c.globalAlpha = 1;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const b of this.vbtns) {
      if (b.hidden) continue;
      const held = Input.held(b.action);
      const pad = b.pad;
      let ready = true;
      if (b.action === 'skill') ready = p.skillCd <= 0 && !(p.key === 'hocheol' && p.sealed > 0);
      if (b.action === 'ult') ready = p.ult >= 100;
      if (b.action === 'synergy') ready = this.syn >= 100 && !this.party.some(q => q.dead);
      if (pad) {
        c.globalAlpha = held ? 1 : 0.8;
        if (held) { c.fillStyle = 'rgba(255,80,100,0.35)'; circle(c, b.x, b.y, b.r * 0.8); c.fill(); }
        this.drawIcon(c, b.action === 'jump' ? 'jump' : b.action, b.x, b.y, b.r * 0.9);
        continue;
      }
      // red-black orb button
      c.globalAlpha = held ? 1 : 0.88;
      const g = c.createRadialGradient(b.x, b.y - b.r * 0.3, 2, b.x, b.y, b.r);
      g.addColorStop(0, held ? '#7a1a26' : '#4a0e18'); g.addColorStop(1, '#12060a');
      circle(c, b.x, b.y, b.r); c.fillStyle = g; c.fill();
      c.shadowColor = '#ff2a3a'; c.shadowBlur = ready ? 10 : 0;
      c.strokeStyle = b.action === 'ult' && ready ? '#ffd34d' : '#c81a2a'; c.lineWidth = 3; circle(c, b.x, b.y, b.r); c.stroke();
      c.shadowBlur = 0;
      c.strokeStyle = 'rgba(255,200,210,0.35)'; c.lineWidth = 1; circle(c, b.x, b.y, b.r - 5); c.stroke();
      if (b.action === 'skill' || b.action === 'ult') { // the doc's skill illustration as the button face
        c.globalAlpha = ready ? 1 : 0.4;
        drawSkillCircle(c, 'skill.' + p.key + '.' + (b.action === 'skill' ? 'active' : 'ult'), b.x, b.y, b.r - 4, 0.45, 0.4);
        c.fillStyle = 'rgba(0,0,0,0.25)'; circle(c, b.x, b.y, b.r - 4); c.fill();
      } else if (b.action === 'synergy') { // both members' faces
        const o = this.party[1 - this.active];
        c.globalAlpha = ready ? 1 : 0.45;
        c.save(); circle(c, b.x, b.y, b.r - 4); c.clip();
        drawFaceCircle(c, p.key, 'normal', b.x - 9, b.y, b.r - 6); drawFaceCircle(c, o.key, 'normal', b.x + 11, b.y, b.r - 8);
        c.restore();
        c.strokeStyle = this.synCfg.color; c.lineWidth = 4;
        c.beginPath(); c.arc(b.x, b.y, b.r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (this.syn / 100)); c.stroke();
        if (ready) { c.strokeStyle = `rgba(255,255,255,${0.4 + Math.sin(this.real * 8) * 0.4})`; c.lineWidth = 2; circle(c, b.x, b.y, b.r + 9); c.stroke(); }
      } else {
        c.globalAlpha = ready ? 1 : 0.45;
        this.drawIcon(c, b.action, b.x, b.y - (b.r > 45 ? 0 : 3), b.r);
      }
      c.globalAlpha = 1;
      if (b.action === 'skill' && p.skillCd > 0) {
        c.fillStyle = 'rgba(0,0,0,0.6)'; c.beginPath(); c.moveTo(b.x, b.y);
        c.arc(b.x, b.y, b.r - 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (p.skillCd / p.d.skill.cd)); c.closePath(); c.fill();
        c.font = `800 13px ${SANS}`; outlinedText(c, p.skillCd.toFixed(1), b.x, b.y, '#fff', '#000', 3);
      }
      if (b.action === 'ult') { c.strokeStyle = '#ffd34d'; c.lineWidth = 4; c.beginPath(); c.arc(b.x, b.y, b.r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (p.ult / 100)); c.stroke(); }
      const lab = b.action === 'skill' ? p.d.skill.name : b.action === 'ult' ? p.d.ult.name.split(':')[0] : b.action === 'synergy' ? this.synCfg.name : b.label;
      c.font = `800 ${b.action === 'skill' || b.action === 'ult' || b.action === 'synergy' ? 9 : 10}px ${SANS}`;
      outlinedText(c, lab, b.x, b.action === 'skill' || b.action === 'ult' || b.action === 'synergy' ? b.y + b.r + 9 : b.y + b.r * (b.r > 45 ? 0.62 : 0.58), '#ffe2ea', '#000', 3);
    }
    c.restore();
  }
  drawBanner(c) {
    const bn = this.bannerObj;
    if (!bn || this.cine) return;
    const k = bn.t < 0.25 ? bn.t / 0.25 : bn.t > bn.dur - 0.35 ? Math.max(0, (bn.dur - bn.t) / 0.35) : 1;
    c.save(); c.globalAlpha = k;
    const y = bn.big ? 210 : 186;
    const g = c.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.2, 'rgba(0,0,0,0.72)'); g.addColorStop(0.8, 'rgba(0,0,0,0.72)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, y - (bn.big ? 46 : 32), W, bn.big ? 100 : 72);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `800 ${bn.big ? 44 : 30}px ${SERIF}`;
    outlinedText(c, bn.title, W / 2 + (1 - k) * 40, y - 4, bn.color, '#000', 6);
    if (bn.sub) { c.font = `600 ${bn.big ? 16 : 14}px ${SANS}`; outlinedText(c, bn.sub, W / 2, y + (bn.big ? 36 : 26), '#f2ead8', '#000', 4); }
    c.restore();
  }
  drawDefeat(c) {
    const k = clamp(this.endT / 1.2, 0, 1);
    c.fillStyle = `rgba(0,0,0,${0.85 * k})`; c.fillRect(0, 0, W, H);
    if (this.loser === 'hocheol' && this.endT > 0.6) { // design doc: special defeat line for 최호철
      c.globalAlpha = clamp((this.endT - 0.6) / 0.6, 0, 1);
      c.font = `700 24px ${SERIF}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      outlinedText(c, '"크윽... 어째서 연기에 불이... 내 공격이 통하지 않는다고?"', W / 2, H / 2, '#ffd9b0', '#000', 5);
      c.globalAlpha = 1;
    }
  }
  drawPause(c) {
    c.fillStyle = 'rgba(0,0,0,0.7)'; c.fillRect(0, 0, W, H);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `800 40px ${SERIF}`; outlinedText(c, '일시정지', W / 2, 140, '#f3c66b', '#000', 6);
    const bx = W / 2 - 130;
    UI.button(c, bx, 200, 260, 48, '계속하기', { primary: true });
    UI.button(c, bx, 258, 260, 48, '처음부터 다시');
    UI.button(c, bx, 316, 260, 48, '월드맵으로');
    UI.button(c, bx, 374, 260, 48, Sfx.muted ? '🔇 소리 켜기 [M]' : '🔊 소리 끄기 [M]');
    c.font = `500 13px ${SANS}`; c.fillStyle = '#bdb3a0';
    c.fillText('최호철의 연기·심청이의 수류는 절반만 통한다. 합동기 게이지가 차면 [O] / 합동기 버튼!', W / 2, 452);
  }
}
