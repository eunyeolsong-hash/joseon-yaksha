'use strict';
// ============================================================
// battle.js — STAGE 1-5 「해님달님 — 원한의 끝」
//   2-character tag party (최호철 + 이동민), 요기 matchup rule
//   (간장·막야 nullify 요기 attacks; 이동민 has 0% 요기),
//   auto-assist 파마해체, twin-sword beam, 3 boss phases.
// ============================================================
const NO_INPUT = { held: () => false, pressed: () => false };
const PHASE_NAMES = { 1: '오누이의 협동 공격', 2: '막야의 주화입마', 3: '해님의 동요' };

// Numbers follow the design doc (조선야차_게임기획서_최종.docx, §2 and §4-2) where it gives them.
const CHAR_DATA = {
  hocheol: {
    name: '최호철', title: '월광대 의정부지부 팀장', hp: 1100, atk: 58, speed: 255, yogi: true,
    combo: [
      { dur: 0.34, hitAt: 0.11, range: 80, height: 60, mult: 1.0, push: 140, lunge: 120, arm: 'punch' },
      { dur: 0.34, hitAt: 0.11, range: 80, height: 60, mult: 1.0, push: 140, lunge: 120, arm: 'punch2' },
      { dur: 0.5, hitAt: 0.2, range: 106, height: 72, mult: 1.7, push: 320, lunge: 260, arm: 'pipe' },
    ],
    skill: { name: '흑연호박', hanja: '黑煙虎縛', cd: 8 },
    ult: { name: '흑연호왕', hanja: '黑煙虎王' },
  },
  dongmin: {
    name: '이동민', title: '월광대 전투부원 · 344기', hp: 920, atk: 42, speed: 305, yogi: false,
    combo: [
      { dur: 0.22, hitAt: 0.07, range: 72, height: 58, mult: 0.9, push: 60, lunge: 140, arm: 'slash1' },
      { dur: 0.22, hitAt: 0.07, range: 72, height: 58, mult: 0.9, push: 60, lunge: 140, arm: 'slash2' },
      { dur: 0.24, hitAt: 0.08, range: 76, height: 58, mult: 1.0, push: 80, lunge: 160, arm: 'slash1' },
      { dur: 0.4, hitAt: 0.14, range: 94, height: 72, mult: 1.8, push: 240, lunge: 240, arm: 'slash3' },
    ],
    skill: { name: '해체자의 악력', hanja: '解體者握力', cd: 7 },
    ult: { name: '광인의 해체식', hanja: '狂人의 解體式' },
  },
};

// ---------------- effects ----------------
class Effects {
  constructor() { this.p = []; this.txt = []; this.sl = []; this.rg = []; this.gh = []; this.t = 0; this.lastGhost = 0; }
  update(dt) {
    this.t += dt;
    for (const p of this.p) {
      p.life -= dt;
      const d = Math.pow(p.drag, dt);
      p.vx *= d; p.vy = p.vy * d + p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    this.p = this.p.filter(p => p.life > 0);
    for (const a of [this.txt, this.sl, this.rg, this.gh]) for (const e of a) e.life -= dt;
    this.txt = this.txt.filter(e => e.life > 0);
    this.sl = this.sl.filter(e => e.life > 0);
    this.rg = this.rg.filter(e => e.life > 0);
    this.gh = this.gh.filter(e => e.life > 0);
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
  }
  setState(s) { this.state = s; this.st = 0; this.hitDone = false; }
  update(dt) {
    const b = this.b, I = b.locked ? NO_INPUT : Input;
    this.st += dt;
    for (const k of ['inv', 'skillCd', 'sealed', 'bound', 'dodgeCd', 'flash', 'dropT']) if (this[k] > 0) this[k] = Math.max(0, this[k] - dt);
    if (this.dead) { this.vx *= Math.pow(0.05, dt); this.physics(dt); return; }
    // design doc: HP slowly drains over time (신상패딩 slows this)
    if (b.state === 'fight') this.hp = Math.max(1, this.hp - this.maxHp * 0.0012 * dt);
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
    this.setState('attack'); this.comboIdx = i; this.queued = false;
    this.vx = this.facing * a.lunge;
    Sfx.play(this.key === 'dongmin' ? 'slash' : 'swing');
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
        b.fx.ghost(this.key, this.x, this.y, this.facing, this.spriteFrame(this.b.t));
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
          b.playerHit(this, this.frontRect(96, 80, -10), { mult: 1.2, push: 200 });
        }
        if (this.st >= 0.3) { this.state = 'idle'; this.vx = 0; }
        break;
      case 'skill': this.updateSmokeSkill(); break;
      case 'grabdash': this.updateGrabDash(); break;
      case 'grab': this.updateGrab(); break;
      case 'ult': this.updateUlt(dt); break;
    }
  }
  doAttackHit(a) {
    const fx = this.b.fx, cy = this.y - this.h * 0.55;
    if (this.key === 'dongmin') fx.slash(this.x + this.facing * 36, cy, this.facing, a.arm === 'slash3' ? 64 : 46, a.arm === 'slash2', a.arm === 'slash3' ? '#ff5a5a' : '#e8eef8');
    else {
      fx.ring(this.x + this.facing * 58, cy, a.arm === 'pipe' ? 46 : 28, '#ffa040', 0.2);
      fx.smoke(this.x + this.facing * 60, cy, a.arm === 'pipe' ? 6 : 2, 'rgba(25,22,32,0.7)', 16);
    }
    this.b.playerHit(this, this.frontRect(a.range, a.height, -10), { mult: a.mult, push: a.push });
  }
  trySkill() {
    if (this.skillCd > 0) return;
    if (this.key === 'hocheol' && this.sealed > 0) {
      this.b.fx.text(this.x, this.y - this.h - 20, '요기 봉인 — 술법 불가!', '#c49bff', 17); Sfx.play('block');
      this.b.tryAssist(); return;
    }
    this.skillCd = this.d.skill.cd;
    this.b.fx.text(this.x, this.y - this.h - 34, this.d.skill.name, STYLES[this.key].aura, 20);
    if (this.key === 'dongmin') { this.setState('grabdash'); this.inv = 0.35; Sfx.play('dash'); }
    else { this.setState('skill'); this.vx = 0; Sfx.play('smoke'); }
  }
  updateSmokeSkill() { // 흑연호박
    this.vx = 0;
    if (!this.hitDone && this.st >= 0.18) { this.hitDone = true; this.b.zones.push(new SmokeTiger(this.b, this, this.x + this.facing * 140, this.y)); }
    if (this.st >= 0.55) this.state = 'idle';
  }
  updateGrabDash() { // 해체자의 악력 — dash & grab
    const b = this.b;
    this.vx = this.facing * 980;
    b.fx.ghost(this.key, this.x, this.y, this.facing, this.spriteFrame(this.b.t));
    for (const e of b.liveBosses()) {
      if (!rectsOverlap(this.rect(), e.rect())) continue;
      if (e.superArmor) {
        b.damageBoss(this, e, { mult: 0.8 }); b.fx.text(e.x, e.y - e.h - 30, '슈퍼아머 — 잡기 실패', '#ffd27a', 15);
        this.state = 'idle'; this.vx = -this.facing * 200; return;
      }
      this.setState('grab'); this.grabTarget = e; this.grabHits = 0; this.vx = 0; this.inv = 1.0;
      e.grabbed = 1.0; this.x = e.x - this.facing * 30;
      Sfx.play('hit'); return;
    }
    if (this.st >= 0.3) { this.state = 'idle'; this.vx *= 0.2; }
  }
  updateGrab() {
    const b = this.b, e = this.grabTarget;
    this.vx = 0;
    if (!e || !e.alive) { this.state = 'idle'; this.grabTarget = null; return; }
    e.grabbed = 0.2;
    this.x = e.x - this.facing * 30;
    const times = [0.12, 0.3, 0.48];
    while (this.grabHits < 3 && this.st >= times[this.grabHits]) {
      this.grabHits++;
      b.damageBoss(this, e, { mult: 0.75 }); b.fx.impact(e.x, e.y - 64);
    }
    if (this.grabHits === 3 && this.st >= 0.7) {
      this.grabHits = 4;
      // design doc: 단일 대상 연속 피해 + 방어력 15% 감소 + 2초간 기절
      b.damageBoss(this, e, { mult: 1.6, stun: 2, defDown: 0.15, defT: 6 });
      b.shake(10); b.fx.ring(e.x, e.y, 90, '#ffd27a', 0.35, true); b.fx.dust(e.x, e.y);
      b.fx.text(e.x, e.y - e.h - 40, '방어력 -15% · 기절', '#ffd27a', 16, 1.2);
      Sfx.play('boom');
    }
    if (this.st >= 0.9) { this.state = 'idle'; e.grabbed = 0; this.grabTarget = null; this.inv = 0.25; }
  }
  tryUlt() {
    if (this.ult < 100) return;
    this.ult = 0; this.setState('ult'); this.ultStage = 0; this.ultHit = new Set(); this.ultTick = 0; this.inv = 99;
    this.b.ultCinematic(this);
    Sfx.play('ult');
  }
  updateUlt(dt) {
    const b = this.b, s = this.st;
    if (this.key === 'hocheol') { // 흑연호왕
      this.vx = 0;
      if (this.ultStage === 0 && s >= 0.35) { this.ultStage = 1; b.zones.push(new TigerRush(b, this)); Sfx.play('smoke'); }
      if (s >= 0.9) { this.state = 'idle'; this.inv = 0.3; }
      return;
    }
    // 광인의 해체식: dash → flurry → overhead finisher
    if (s < 0.35) {
      this.vx = this.facing * 950; b.fx.ghost(this.key, this.x, this.y, this.facing, this.spriteFrame(this.b.t));
      for (const e of b.liveBosses()) {
        if (this.ultHit.has(e) || !rectsOverlap(this.frontRect(90, 100, -40), e.rect())) continue;
        this.ultHit.add(e); b.damageBoss(this, e, { mult: 1.2 }); b.fx.slash(e.x, e.y - 64, this.facing, 70, false, '#ff4a4a');
      }
    } else if (s < 1.25) {
      this.vx = 0; this.ultTick -= dt;
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
      b.shake(18); Sfx.play('boom');
    } else if (s >= 1.9) { this.state = 'idle'; this.inv = 0.3; }
  }
  pose(t) {
    const P = { t, flash: this.flash > 0, moving: this.state === 'move' && this.onGround, walk: this.walk, air: !this.onGround, emo: 'normal' };
    const s = this.state;
    if (s === 'attack') {
      const a = this.d.combo[this.comboIdx], k = clamp(this.st / a.dur, 0, 1);
      P.emo = 'angry'; P.stance = this.onGround;
      if (a.arm === 'punch' || a.arm === 'punch2') {
        const ext = this.st >= a.hitAt - 0.05 && this.st < a.hitAt + 0.13;
        if (a.arm === 'punch') P.armFront = ext ? -0.1 : 0.9; else { P.armBack = ext ? -0.1 : 1.2; P.armFront = 0.9; }
        P.lean = ext ? 0.15 : 0;
      } else if (a.arm === 'pipe') { P.armFront = lerp(-2.0, 0.9, easeOut(clamp((this.st - 0.05) / 0.25, 0, 1))); P.lean = 0.15; }
      else if (a.arm === 'slash2') P.armBack = lerp(-1.8, 0.9, easeOut(clamp(k * 1.6, 0, 1)));
      else if (a.arm === 'slash3') { const e = easeOut(clamp(k * 1.5, 0, 1)); P.armFront = lerp(-2.2, 1.0, e); P.armBack = lerp(-2.0, 1.1, e); P.lean = 0.2; }
      else P.armFront = lerp(-1.8, 0.9, easeOut(clamp(k * 1.6, 0, 1)));
    } else if (s === 'dodge') { P.lean = 0.45; P.armFront = 2.4; P.armBack = 2.6; }
    else if (s === 'hurt') { P.emo = 'shock'; P.lean = -0.3; P.armFront = 0.2; P.armBack = 0.4; }
    else if (s === 'skill') { P.emo = 'angry'; P.armFront = -0.6; P.stance = true; }
    else if (s === 'grabdash') { P.emo = 'angry'; P.lean = 0.5; P.armFront = -0.1; }
    else if (s === 'grab') { P.emo = 'shout'; P.stance = true; P.armFront = this.grabHits % 2 ? -0.2 : 0.6; P.armBack = this.grabHits % 2 ? 0.6 : -0.2; }
    else if (s === 'tagin') { P.emo = 'angry'; P.lean = 0.2; P.armFront = -0.2; }
    else if (s === 'ult') {
      P.emo = 'shout';
      if (this.key === 'hocheol') { P.armFront = -1.0; P.stance = true; }
      else if (this.st < 0.35) { P.lean = 0.5; P.armFront = 2.3; P.armBack = 2.5; }
      else if (this.st < 1.25) { P.stance = true; P.armFront = Math.sin(t * 40) * 1.4; P.armBack = Math.cos(t * 40) * 1.4; }
      else { P.armFront = this.ultStage >= 2 ? 1.1 : -2.3; P.armBack = this.ultStage >= 2 ? 1.2 : -2.1; }
    } else if (s === 'dead') { P.emo = 'shock'; P.rot = -1.45; P.armFront = 1.4; }
    if (this.bound > 0 && (s === 'idle' || s === 'move')) { P.armFront = 1.45; P.armBack = 1.45; P.emo = 'angry'; }
    P.frame = this.spriteFrame(t);
    return P;
  }
  spriteFrame(t) { // which doc-art pose to show for the current state
    const s = this.state;
    if (this.key === 'dongmin') {
      if (s === 'attack') return ['dongmin_slash1', 'dongmin_slash2', 'dongmin_slash1', 'dongmin_lunge'][this.comboIdx];
      if (s === 'dodge') return 'dongmin_dash';
      if (s === 'grabdash' || s === 'tagin') return 'dongmin_lunge';
      if (s === 'grab') return 'dongmin_grab';
      if (s === 'ult') return this.st < 0.35 ? 'dongmin_dash' : this.st < 1.25 ? 'dongmin_ult' : 'dongmin_slash2';
      if (!this.onGround && s !== 'dead') return 'dongmin_slash2';
      return 'dongmin_idle';
    }
    if (s === 'attack') return ['hocheol_punch', 'hocheol_stance', 'hocheol_cast'][this.comboIdx];
    if (s === 'dodge') return 'hocheol_dash';
    if (s === 'skill') return 'hocheol_cast';
    if (s === 'tagin') return 'hocheol_punch';
    if (s === 'ult') return this.st < 0.35 ? 'hocheol_aura' : 'hocheol_ult';
    if (!this.onGround && s !== 'dead') return 'hocheol_stance';
    if (s === 'idle' && Math.floor((t || 0) / 3) % 3 === 2) return 'hocheol_pipe';
    return 'hocheol_idle';
  }
  draw(c, t) {
    this.drawShadow(c);
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
  constructor(b, owner, x, y) { this.b = b; this.o = owner; this.x = x; this.y = y; this.dir = owner.facing; this.t = 0; this.ticks = 0; this.done = false; this.r = 130; }
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
        b.fx.ring(this.x, this.y - 70, 220, '#ff9a3c', 0.5); b.fx.smoke(this.x, this.y - 70, 14, 'rgba(18,16,24,0.85)', 90);
        b.shake(12); Sfx.play('boom');
        for (const e of b.liveBosses()) if (Math.abs(e.x - this.x) < 220) b.damageBoss(this.o, e, { mult: 2.0, push: 200, noCount: true });
      }
    } else if (this.t > 0.3) this.done = true;
  }
  draw(c) {
    if (this.exploded) return;
    drawSmokeTiger(c, this.x, this.y - 100, this.dir, 1.25, 1, this.t * 3);
  }
}
function drawSmokeTiger(c, x, y, dir, s, alpha, t) {
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
      while (this.hits < 3 && this.st >= times[this.hits]) { this.hits++; b.damageBoss(this.dm, e, { mult: 0.8 }); b.fx.impact(e.x, e.y - 64); }
      if (this.hits === 3 && this.st >= 0.65) {
        this.hits = 4;
        // design doc: 요기 무력화 해제 + 2초 기절 + 방어력 30% 감소
        b.damageBoss(this.dm, e, { mult: 1.4, stun: 2, defDown: 0.3, defT: 6, ignoreArmor: true });
        b.shake(12); b.fx.ring(e.x, e.y, 100, '#ffd27a', 0.4, true);
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
    if (this.kind === 'ganjang') {
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
    this.skillCd = 3; this.leapCd = 4; this.overCd = 3; this.hits = 0; this.hitDone = false; this.dmHits = 0; this.superArmor = false; this.mode = null;
  }
  get alive() { return !this.dead && !this.subdued; }
  go(s) { this.state = s; this.st = 0; this.hits = 0; this.hitDone = false; this.superArmor = s === 'overWind'; const f = this['enter_' + s]; if (f) f.call(this); }
  takenMult() { let m = this.guard; if (this.defT > 0) m *= 1 + this.defDown; return m; }
  takeDamage(d) { this.hp = Math.max(this.minHp, this.hp - d); this.flash = 0.09; }
  tick(dt) { this.st += dt; for (const k of ['stun', 'grabbed', 'defT', 'skillCd', 'leapCd', 'flash', 'overCd']) if (this[k] > 0) this[k] = Math.max(0, this[k] - dt); }
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
    if (!this.alive) { P.kneel = true; P.emo = 'shock'; P.armFront = 1.3; P.armBack = 1.4; P.lean = 0.35; P.frame = this.key + '_idle'; return P; }
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
    P.frame = this.key + (act ? '_slash' : '_idle');
    return P;
  }
  draw(c, t) {
    this.drawShadow(c, 24);
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
        if (this.st >= (fr ? 0.35 : 0.55)) this.go('skill');
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
          Sfx.play('slash'); this.skillCd = 5.5; this.go('recover');
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
  constructor() {
    this.fx = new Effects();
    this.platforms = [{ x: 330, y: 330, w: 210 }, { x: 850, y: 292, w: 220 }, { x: 1390, y: 330, w: 210 }];
    this.party = [new Player(this, 'hocheol'), new Player(this, 'dongmin')];
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
    this.vbtns = [
      { action: 'left', x: 72, y: 452, r: 36, label: '◀', pad: true },
      { action: 'right', x: 188, y: 452, r: 36, label: '▶', pad: true },
      { action: 'jump', x: 130, y: 396, r: 30, label: '▲', pad: true },
      { action: 'down', x: 130, y: 508, r: 28, label: '▼', pad: true },
      { action: 'attack', x: 868, y: 450, r: 52, label: '공격' },
      { action: 'jump', x: 768, y: 494, r: 36, label: '점프' },
      { action: 'dodge', x: 760, y: 398, r: 32, label: '회피' },
      { action: 'skill', x: 858, y: 344, r: 36, label: '스킬' },
      { action: 'ult', x: 916, y: 262, r: 34, label: '궁극기' },
      { action: 'tag', x: 40, y: 128, r: 30, hidden: true },
    ];
    this.banner('STAGE 1-5', '해님달님 — 원한의 끝', '#f3c66b', 1.9, true);
  }
  get player() { return this.party[this.active]; }
  liveBosses() { return this.bosses.filter(e => e.alive); }
  banner(title, sub, color = '#fff', dur = 2.2, big = false) { this.bannerObj = { title, sub, color, dur, big, t: 0 }; }
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }
  ultCinematic(p) { this.cine = { key: p.key, name: p.d.ult.name, hanja: p.d.ult.hanja, t: 0 }; this.stats.ults++; this.hitstop = 0.12; }
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
    if (src.yogi) {
      // 간장 burns evil energy, 막야 seals/absorbs 요기 → 최호철's smoke techniques do nothing.
      if (this.real - (e.lastNull || 0) > 0.18) {
        e.lastNull = this.real;
        this.fx.text(cx, cy - 30, '무효', '#c9a6ff', 20);
        this.fx.spark(cx, cy, '#a77bff', 6, 200);
        Sfx.play('block');
      }
      if (!o.noCount) this.blockCount++;
      if (!this.flags.nullified) {
        this.flags.nullified = true;
        this.banner('요기 무력화!', '간장이 연기를 태우고 막야가 요기를 삼킨다 — 이동민으로 교대하라', '#b98cff', 3.4);
      }
      this.tryAssist();
      return 0;
    }
    let dmg = src.atk * (o.mult || 1), crit = false;
    if (src.key === 'dongmin') { // 해체 본능: +3% per 10 hits on the same target, every 5th hit is a +30% 급소 일격
      e.dmHits++;
      dmg *= 1 + 0.03 * Math.min(10, Math.floor(e.dmHits / 10));
      if (e.dmHits % 5 === 0) { dmg *= 1.3; crit = true; }
    }
    const tm = e.takenMult();
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
    if (!o.quiet) { this.hitstop = Math.max(this.hitstop, crit ? 0.07 : 0.035); this.shake(crit ? 6 : 3); Sfx.play(crit ? 'crit' : 'hit'); }
    src.ult = Math.min(100, src.ult + dmg / 14);
    return dmg;
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
    p.hp -= dmg; p.flash = 0.12; p.inv = 0.7; p.ult = Math.min(100, p.ult + dmg / 7);
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
    if (o.bind) { p.bound = Math.max(p.bound, o.bind); this.fx.text(p.x, p.y - p.h - 60, '속박!', '#b07cff', 18); }
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
    this.fx.smoke(nxt.x, nxt.y - 64, 8, 'rgba(240,240,255,0.5)', 26);
    this.fx.ring(nxt.x, nxt.y - 64, 60, STYLES[nxt.key].aura, 0.3);
    this.fx.text(nxt.x, nxt.y - nxt.h - 30, nxt.d.name + ' 교대!', STYLES[nxt.key].aura, 18);
    Sfx.play('tag');
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
    this.state = 'defeat'; this.loser = key; this.endT = 0; this.locked = true; Sfx.play('lose');
  }
  victory() {
    this.state = 'victory'; this.endT = 0; this.locked = true; this.timeScale = 0.3;
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
      Sfx.play('charge');
    }
  }
  updatePhase(dt) {
    const [h, d] = this.bosses;
    if (this.phase === 1) {
      h.minHp = h.maxHp * 0.55; d.minHp = d.maxHp * 0.55;
      if (h.hp <= h.maxHp * 0.7 || d.hp <= d.maxHp * 0.7) {
        this.phase = 2; h.minHp = h.maxHp * 0.35; d.minHp = 0; d.overCd = 2.5;
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
          this.phase = 3; h.minHp = 0; h.setMode('frenzy');
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
    if (this.forceTagT > 0) { this.forceTagT -= sdt; if (this.forceTagT <= 0) this.tag(true); }

    this.player.update(sdt);
    const fighting = this.state === 'fight';
    for (const e of this.bosses) { if (fighting) e.update(sdt); else e.idleUpdate(sdt); }
    for (const pr of this.projectiles) pr.update(sdt, this);
    this.projectiles = this.projectiles.filter(p => !p.done);
    for (const z of this.zones) z.update(sdt);
    this.zones = this.zones.filter(z => !z.done);
    if (this.assist) { this.assist.update(sdt); if (this.assist.done) this.assist = null; }
    if (fighting) { this.updateBeam(sdt); this.updatePhase(sdt); this.updateResonance(); }
    this.fx.update(sdt);

    const p = this.player;
    const target = clamp(p.x - W * 0.5 + p.facing * 60, 0, WORLD_W - W);
    this.camX += (target - this.camX) * Math.min(1, dt * 4);
  }
  updatePause() {
    const bx = W / 2 - 130;
    if (Input.pressed('pause') || Input.pressed('confirm') || Input.tapIn(bx, 220, 260, 50)) this.resume();
    else if (Input.tapIn(bx, 284, 260, 50)) Flow.battle();
    else if (Input.tapIn(bx, 348, 260, 50)) Flow.map();
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
    if (this.assist) this.assist.draw(c, this.t);
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
    }
  }
  drawCine(c) { // ultimate cut-in using the doc's skill illustration (그림 3-2 / 4-2)
    const ci = this.cine;
    if (!ci) return;
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
    // statuses
    let chipX = 12;
    const chip = (txt, col) => {
      c.font = `700 11px ${SANS}`; const w = c.measureText(txt).width + 14;
      c.fillStyle = col; roundRect(c, chipX, 166, w, 18, 9); c.fill();
      c.fillStyle = '#fff'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(txt, chipX + 7, 175.5); chipX += w + 6;
    };
    if (p.sealed > 0) chip(`요기 봉인 ${p.sealed.toFixed(1)}s`, '#6a3cb0');
    if (p.bound > 0) chip(`속박 ${p.bound.toFixed(1)}s`, '#7a4dff');
    if (p.key === 'hocheol' && !o.dead) chip(this.assistCd > 0 ? `파마해체 대기 ${Math.ceil(this.assistCd)}s` : '파마해체 준비', this.assistCd > 0 ? '#3a3a48' : '#a8242c');
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
      c.fillText('최호철의 연기 술법은 간장·막야 앞에서 무력화된다.', W / 2, 313);
      c.fillText('막히면 대기 중인 이동민이 자동 난입 — 직접 교대는 ' + (Input.touch ? '좌측 대기 초상화' : 'Q 키 / 좌측 대기 초상화'), W / 2, 331);
      c.globalAlpha = 1;
    }
    if (!Input.touch) {
      c.font = `500 11px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      outlinedText(c, '←→ 이동 · ↑/Space 점프 · ↓+점프 내려가기 · J 공격 · K 스킬 · U 궁극기 · L/Shift 회피 · Q 교대 · Esc 일시정지', W / 2, H - 10, 'rgba(255,255,255,0.7)', 'rgba(0,0,0,0.6)', 3);
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
      c.globalAlpha = ready ? 1 : 0.45;
      this.drawIcon(c, b.action, b.x, b.y - (b.r > 45 ? 0 : 3), b.r);
      c.globalAlpha = 1;
      if (b.action === 'skill' && p.skillCd > 0) {
        c.fillStyle = 'rgba(0,0,0,0.6)'; c.beginPath(); c.moveTo(b.x, b.y);
        c.arc(b.x, b.y, b.r - 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (p.skillCd / p.d.skill.cd)); c.closePath(); c.fill();
        c.font = `800 13px ${SANS}`; outlinedText(c, p.skillCd.toFixed(1), b.x, b.y, '#fff', '#000', 3);
      }
      if (b.action === 'ult') { c.strokeStyle = '#ffd34d'; c.lineWidth = 4; c.beginPath(); c.arc(b.x, b.y, b.r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (p.ult / 100)); c.stroke(); }
      const lab = b.action === 'skill' ? p.d.skill.name : b.action === 'ult' ? p.d.ult.name : b.label;
      c.font = `700 ${b.action === 'skill' || b.action === 'ult' ? 9 : 10}px ${SANS}`;
      outlinedText(c, lab, b.x, b.y + b.r * (b.r > 45 ? 0.62 : 0.58), '#ffe2ea', '#000', 3);
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
    c.font = `800 40px ${SERIF}`; outlinedText(c, '일시정지', W / 2, 150, '#f3c66b', '#000', 6);
    const bx = W / 2 - 130;
    UI.button(c, bx, 220, 260, 50, '계속하기', { primary: true });
    UI.button(c, bx, 284, 260, 50, '처음부터 다시');
    UI.button(c, bx, 348, 260, 50, '월드맵으로');
    c.font = `500 13px ${SANS}`; c.fillStyle = '#bdb3a0';
    c.fillText('이동민(요기 0%)만이 간장·막야에 정상 타격을 줄 수 있다. 1페이즈 → 2페이즈(달님 주화입마) → 3페이즈(해님 동요)', W / 2, 440);
  }
}
