'use strict';
// ============================================================
// scenes.js — story data, non-battle scenes, scene flow, main loop
// Visuals use the design-doc art (js/assets.js ATLAS):
//   title = 그림 1, opening comic = 그림 7, dialogue = 그림 8,
//   world map = 그림 9, busts/faces/cut-ins = character sheets.
// ============================================================
const NAMES = { hocheol: '최호철', dongmin: '이동민', haenim: '해님', dalnim: '달님', seondal: '김선달', simcheong: '심청이', bat: '박쥐 수인' };

// Node positions match the diamonds painted in the world-map art (그림 9).
const STAGES = [
  { id: '1-1', name: '신령의 시험', x: 85, y: 262, enemy: '신령님', clear: '신령님의 HP를 0으로 만들기', reward: '신령님의 기억 열람 · 노데미지 시 「신령님의 신상패딩」', story: '휘모리 사태의 배경과 도깨비왕의 죽음을 확인한다.' },
  { id: '1-2', name: '땅굴대장의 부적', x: 246, y: 262, enemy: '수상한 인물(미니보스) · 하급요괴 ×4', clear: '모든 적 제압 및 부적 획득', reward: '땅굴대장 소환 부적 · 최호철 합류', story: '의정부 조사를 시작하고 조력자 땅굴대장을 얻는다.' },
  { id: '1-3', name: '인호 전쟁의 원한', x: 389, y: 312, enemy: '원귀 ×4 · 대형 원귀 ×1', clear: '원귀 전원 제압', reward: '인호 전쟁 · 해님달님의 과거 해금', story: '인호 전쟁의 비극과 오누이의 복수 동기를 알게 된다.' },
  { id: '1-4', name: '까마귀의 그림자', x: 461, y: 184, enemy: '박쥐 수인의 분신 ×3', clear: '분신 3체 모두 제압', reward: '박쥐 수인 · 까마귀 조직의 실체', story: '최호철의 만취 미끼 작전으로 배후를 확인한다.' },
  { id: '1-5', name: '해님달님 — 원한의 끝', x: 643, y: 262, enemy: '해님(간장) · 달님(막야) — 3페이즈', clear: '이동민을 활용해 해님과 달님 모두 제압', reward: '「증오의 붉은 구슬」 · CHAPTER 1 CLEAR', story: '최종 결전. 요기를 삼키는 쌍검 앞에서 요기 0%의 이동민이 열쇠가 된다.', playable: true, boss: true },
];

// ---------- comic helpers ----------
function panelImg(name, fx = 0.5, fy = 0.5, tint) {
  return (c, w, h, t) => {
    const z = 1 + Math.min(t, 6) * 0.012; // slow Ken Burns zoom
    c.save(); c.translate(w / 2, h / 2); c.scale(z, z); c.translate(-w / 2, -h / 2);
    if (!drawCrop(c, name, 0, 0, w, h, 'cover', fx, fy)) { c.fillStyle = '#1a1026'; c.fillRect(0, 0, w, h); }
    c.restore();
    if (tint) { c.fillStyle = tint; c.fillRect(0, 0, w, h); }
  };
}
function caption(c, x, y, w, text) {
  c.font = `700 15px ${SANS}`;
  const lines = wrapText(c, text, w - 24);
  const h = lines.length * 21 + 14;
  c.fillStyle = 'rgba(20,8,24,0.86)'; c.fillRect(x, y, w, h);
  c.strokeStyle = '#ff6aa8'; c.lineWidth = 1.5; c.strokeRect(x, y, w, h);
  c.fillStyle = '#ffe8f2'; c.textAlign = 'left'; c.textBaseline = 'top';
  lines.forEach((l, i) => c.fillText(l, x + 12, y + 8 + i * 21));
}
function bubble(c, x, y, w, text, tail) {
  c.font = `700 16px ${SANS}`;
  const lines = wrapText(c, text, w - 32);
  const h = lines.length * 22 + 20;
  c.fillStyle = '#fff'; c.strokeStyle = '#111'; c.lineWidth = 2.5;
  if (tail) { c.beginPath(); c.moveTo(x + w * 0.4, y + h - 4); c.lineTo(tail[0], tail[1]); c.lineTo(x + w * 0.55, y + h - 4); c.closePath(); c.fill(); c.stroke(); }
  c.beginPath(); c.ellipse(x + w / 2, y + h / 2, w / 2 + 8, h / 2 + 6, 0, 0, Math.PI * 2); c.fill(); c.stroke();
  if (tail) { c.beginPath(); c.moveTo(x + w * 0.4 + 2, y + h - 8); c.lineTo(x + w * 0.55 - 2, y + h - 8); c.strokeStyle = '#fff'; c.lineWidth = 4; c.stroke(); }
  c.fillStyle = '#111'; c.textAlign = 'center'; c.textBaseline = 'top';
  lines.forEach((l, i) => c.fillText(l, x + w / 2, y + 10 + i * 22));
}
function drawSceneBG(c, kind, t) {
  if (kind === 'battle') {
    BG.backdrop(c, 600, t);
    c.save(); c.translate(-600, 0); BG.street(c, 600, t); c.restore();
  } else { c.fillStyle = '#05060a'; c.fillRect(0, 0, W, H); }
}
function neonButton(c, x, y, w, h, label, opt = {}) { // 그림 1·9 style crimson button
  c.save();
  const sk = 14;
  c.beginPath(); c.moveTo(x + sk, y); c.lineTo(x + w - sk, y); c.lineTo(x + w, y + h / 2); c.lineTo(x + w - sk, y + h); c.lineTo(x + sk, y + h); c.lineTo(x, y + h / 2); c.closePath();
  const g = c.createLinearGradient(0, y, 0, y + h);
  if (opt.disabled) { g.addColorStop(0, '#3a2a3a'); g.addColorStop(1, '#1e141e'); }
  else if (opt.primary) { g.addColorStop(0, '#c8203e'); g.addColorStop(1, '#5a0a1c'); }
  else { g.addColorStop(0, '#3a1a3e'); g.addColorStop(1, '#180a1c'); }
  c.fillStyle = g; c.fill();
  c.shadowColor = '#ff4a8a'; c.shadowBlur = opt.disabled ? 0 : 14;
  c.strokeStyle = opt.disabled ? '#6a5a6a' : '#ffb0c8'; c.lineWidth = 2; c.stroke();
  c.shadowBlur = 0;
  c.fillStyle = opt.disabled ? '#9a8a9a' : '#fff'; c.font = `700 ${opt.size || 18}px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(label, x + w / 2, y + h / 2 + 1);
  c.restore();
}

// ---------- story scripts (원작 설정 기반 오리지널 대사) ----------
const PROLOGUE = [
  { panels: [
    { rect: [30, 30, 560, 230], caption: '2026년, 한양. 인간왕과 도깨비왕의 약조 아래, 인간과 요괴는 함께 살아왔다.', draw: panelImg('bg.battle', 0.5, 0.3) },
    { rect: [610, 30, 320, 230], caption: '그러나 도깨비왕이 숨을 거두자, 일곱 개의 칠정 구슬이 전국으로 흩어졌다.',
      draw(c, w, h, t) {
        panelImg('open.city', 0.8, 0.2, 'rgba(20,0,30,0.55)')(c, w, h, t);
        const cols = ['#ff4040', '#ff9a3c', '#ffe066', '#5fe08a', '#4fd2ff', '#7a7aff', '#d070ff'];
        cols.forEach((col, i) => {
          const a = i / 7 * Math.PI * 2 + 0.3, r = 30 + Math.min(1, t * 1.2) * 95;
          const x = w / 2 + Math.cos(a) * r, y = h / 2 + 30 + Math.sin(a) * r * 0.55;
          const g = c.createRadialGradient(x, y, 1, x, y, 18); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
          c.fillStyle = g; circle(c, x, y, 18); c.fill(); c.fillStyle = col; circle(c, x, y, 7); c.fill();
        });
      } },
    { rect: [30, 280, 900, 230], caption: '요괴들의 반란 — 서울 전역을 덮친 대재난, 「휘모리」의 시작이었다.', draw: panelImg('open.bottom', 0.5, 0.5, 'rgba(90,0,20,0.25)') },
  ] },
  { panels: [
    { rect: [30, 30, 430, 150], caption: '월광대 의정부지부 팀장 — 최호철', draw: panelImg('open.tiger', 0.3, 0.4) },
    { rect: [30, 195, 430, 150], caption: '월광대 반장 — 김선달', draw: panelImg('open.seondal', 0.4, 0.5) },
    { rect: [30, 360, 430, 150], bubble: { x: 228, y: 40, w: 186, text: '요기? 그딴 거 없어도 칼 두 자루면 충분해.', tail: [210, 120] }, draw: panelImg('open.dongmin', 0.3, 0.5) },
    { rect: [480, 30, 450, 480], caption: '요괴를 소탕하는 자들 — 월광대(月光隊).', draw: panelImg('open.simcheong', 0.5, 0.3) },
  ] },
  { panels: [
    { rect: [30, 30, 900, 300], caption: '그리고 지금 — 의정부에서 호랑이 수인들이 하나둘 살해당하고 있다.', draw: panelImg('skill.hocheol.active', 0.5, 0.45) },
    { rect: [30, 350, 900, 160], caption: '범인은 호랑이를 사냥하는 오누이, 해님과 달님.', draw: panelImg('boss.illust', 0.5, 0.35) },
  ] },
];

const BOSS_INTRO = [
  { panels: [
    { rect: [30, 30, 900, 220], caption: '의정부, 자정. 두 자루의 검이 달빛 아래에서 울었다.', draw: panelImg('boss.illust', 0.5, 0.3) },
    { rect: [30, 270, 440, 240], bubble: { x: 226, y: 22, w: 200, text: '이 호랑이 가죽, 제법 따뜻하더라. 다음은 네 차례야, 팀장님.', tail: [170, 150] }, draw: panelImg('bust.haenim', 0.5, 0.15) },
    { rect: [490, 270, 440, 240], bubble: { x: 18, y: 22, w: 196, text: '간장이 태우고, 막야가 삼킨다. 호랑이는 하나도 남기지 않아.', tail: [270, 140] }, draw: panelImg('bust.dalnim', 0.5, 0.12) },
  ] },
];

const PRE_BATTLE = [
  { who: 'hocheol', side: 'left', emo: 'shout', text: '네놈들이 의정부 수인들을 사냥해 온 오누이냐.' },
  { who: 'haenim', side: 'right', emo: 'angry', text: '사냥? 아니, 복수지. 10년 전 인호 전쟁 때, 흑호가 우리 어머니를 삼켰으니까.' },
  { who: 'hocheol', side: 'left', emo: 'shout', text: '흑호의 죄를 이 동네 호랑이들 목숨으로 갚게 하겠다는 거냐!' },
  { who: 'dalnim', side: 'right', emo: 'smirk', text: '호랑이는 다 똑같아. 간장이 태우고, 막야가 삼키면 끝이야.' },
  { who: 'dongmin', side: 'left', emo: 'normal', text: '팀장님, 저 칼들 기운이 이상합니다. 요기를 먹어치우는 것 같은데요.' },
  { who: 'hocheol', side: 'left', emo: 'smirk', text: '알고 있다. 하지만 여긴 내 구역이다. 내가 먼저 나간다. 이동민, 뒤를 맡아라.' },
  { narr: true, text: 'TIP · 최호철의 연기 술법은 요기 기반이라 간장·막야에 무력화된다. 공격이 막히거나 요기가 봉인되면, 대기 중인 이동민이 자동으로 난입한다(파마해체). 언제든 교대해 이동민으로 직접 싸울 수 있다.' },
];

const POST_BATTLE = [
  { who: 'haenim', side: 'right', emo: 'shock', text: '말도 안 돼... 요기가 한 방울도 없는 놈한테...' },
  { who: 'dongmin', side: 'left', emo: 'smirk', text: '순도 100%, 자연산 근육이라서 말이야.' },
  { narr: true, text: '그때, 어둠 속에서 날갯짓 소리가 울렸다.' },
  { who: 'bat', side: 'right', emo: 'normal', text: '쓸모를 다했군. 칼은 우리 「까마귀」가 회수해 가지.' },
  { who: 'dongmin', side: 'left', emo: 'angry', text: '누구 마음대로.' },
  { narr: true, text: '이동민의 칼날이 박쥐 수인의 날개를 그었다. 놈은 간장과 막야를 끝내 손에 넣지 못한 채 밤하늘로 사라졌다.' },
  { who: 'hocheol', side: 'left', emo: 'normal', text: '...이 구슬. 증오의 붉은 구슬이다. 도깨비왕이 남긴 칠정 구슬 중 하나.' },
  { who: 'seondal', side: 'right', emo: 'smirk', text: '수고했어. 다음 임무까지 열흘. 그동안 제대로 굴러 줄 사람을 소개하지.' },
  { who: 'simcheong', side: 'right', emo: 'smile', text: '열흘이면 충분하죠! 일단 저 절벽부터 맨손으로 올라가 볼까요?' },
];

// ---------- scenes ----------
// Title (그림 1): the "게임 시작" button and loading bar are part of the art; we add hotspots + effects.
const TITLE_BTN = { x: 368, y: 390, w: 243, h: 54 };
class TitleScene {
  constructor() { this.t = 0; this.fill = 0; }
  get ready() { return Assets.progress >= 1; }
  update(dt) {
    this.t += dt;
    this.fill = Math.min(this.ready ? 1 : Assets.progress * 0.95, this.fill + dt * 1.5);
    if (!this.ready || this.fill < 1) return;
    if (Input.tapIn(TITLE_BTN.x, TITLE_BTN.y, TITLE_BTN.w, TITLE_BTN.h) || Input.pressed('confirm')) { Sfx.play('ui'); Flow.start(); }
    else if (Input.tapIn(W - 150, H - 46, 138, 34)) { Sfx.play('ui'); Flow.prologue(); }
  }
  draw(c) {
    const t = this.t;
    c.fillStyle = '#07040c'; c.fillRect(0, 0, W, H);
    if (Assets.ready('bg.title')) {
      const z = 1.02 + Math.sin(t * 0.25) * 0.015;
      c.save(); c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2);
      drawCrop(c, 'bg.title', 0, 0, W, H, 'cover');
      c.restore();
      BG.foliage(c, t, true);
      // glow pulse on the painted start button
      if (this.fill >= 1) {
        const b = TITLE_BTN, a = 0.25 + Math.sin(t * 3) * 0.15;
        c.save(); c.shadowColor = '#ff4a8a'; c.shadowBlur = 24; c.strokeStyle = `rgba(255,170,200,${a})`; c.lineWidth = 3;
        c.beginPath(); c.moveTo(b.x + 12, b.y); c.lineTo(b.x + b.w - 12, b.y); c.lineTo(b.x + b.w, b.y + b.h / 2); c.lineTo(b.x + b.w - 12, b.y + b.h); c.lineTo(b.x + 12, b.y + b.h); c.lineTo(b.x, b.y + b.h / 2); c.closePath(); c.stroke(); c.restore();
      }
    }
    // loading bar fill (over the painted bar)
    c.fillStyle = 'rgba(255,150,220,0.9)'; c.shadowColor = '#ff6ad0'; c.shadowBlur = 10;
    c.fillRect(262, 487, 438 * this.fill, 3); c.shadowBlur = 0;
    if (this.fill >= 1) {
      c.fillStyle = 'rgba(14,6,22,0.92)'; c.fillRect(350, 457, 260, 28);
      c.globalAlpha = 0.6 + Math.sin(t * 4) * 0.35;
      c.font = `600 13px ${SERIF}`; c.fillStyle = '#f6e6ff'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(Input.touch ? 'TOUCH TO START' : 'CLICK / ENTER TO START', W / 2, 472);
      c.globalAlpha = 1;
      neonButton(c, W - 150, H - 46, 138, 34, '프롤로그 보기', { size: 13 });
    }
    c.font = `500 11px ${SANS}`; c.textAlign = 'left'; c.textBaseline = 'middle';
    outlinedText(c, 'TEAM 5 · AI를 활용한 창의적 게임 디자인 · 플레이어블 프로토타입 (STAGE 1-5)', 12, H - 14, 'rgba(255,240,250,0.8)', 'rgba(0,0,0,0.7)', 3);
  }
}

class CutsceneScene {
  constructor(pages, onDone) { this.pages = pages; this.onDone = onDone; this.pi = 0; this.shown = 1; this.t = 0; this.pt = [0]; this.done = false; }
  update(dt) {
    this.t += dt;
    if (this.done) return;
    if (Input.tapIn(W - 130, 6, 124, 34)) { this.finish(); return; }
    if (Input.pressed('confirm') || Input.pressed('attack') || Input.anyTap()) this.advance();
  }
  advance() {
    const pg = this.pages[this.pi];
    if (this.shown < pg.panels.length) { this.pt[this.shown] = this.t; this.shown++; Sfx.play('page'); }
    else if (this.pi < this.pages.length - 1) { this.pi++; this.shown = 1; this.pt = [this.t]; Sfx.play('page'); }
    else this.finish();
  }
  finish() { if (this.done) return; this.done = true; this.onDone(); }
  draw(c) {
    c.fillStyle = '#0b0610'; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,120,200,0.035)';
    for (let y = 0; y < H; y += 10) for (let x = (y / 10) % 2 * 5; x < W; x += 10) c.fillRect(x, y, 2, 2);
    const pg = this.pages[this.pi];
    for (let i = 0; i < this.shown; i++) {
      const pn = pg.panels[i], [x, y, w, h] = pn.rect, lt = this.t - (this.pt[i] || 0), k = easeOut(clamp(lt / 0.35, 0, 1));
      c.save(); c.globalAlpha = k; c.translate(x, y + (1 - k) * 18);
      c.save(); c.beginPath(); c.rect(0, 0, w, h); c.clip(); pn.draw(c, w, h, lt); c.restore();
      c.lineWidth = 4; c.strokeStyle = '#f6eef6'; c.strokeRect(0, 0, w, h);
      if (pn.caption) caption(c, 10, 10, Math.min(w - 20, 440), pn.caption);
      if (pn.bubble) bubble(c, pn.bubble.x, pn.bubble.y, pn.bubble.w, pn.bubble.text, pn.bubble.tail);
      c.restore();
    }
    neonButton(c, W - 130, 6, 124, 34, 'SKIP ▶▶', { size: 13 });
    c.globalAlpha = 0.5 + Math.sin(this.t * 4) * 0.3;
    c.font = `600 13px ${SANS}`; c.fillStyle = '#ffb8d8'; c.textAlign = 'right'; c.textBaseline = 'middle';
    c.fillText('화면을 터치하여 계속 ▶', W - 30, H - 14);
    c.globalAlpha = 1;
  }
}

// Visual-novel dialogue (그림 8): feathered character busts + neon-magenta text box
class DialogueScene {
  constructor(lines, onDone, bg = 'battle') { this.lines = lines; this.onDone = onDone; this.bg = bg; this.i = 0; this.t = 0; this.left = null; this.right = null; this.done = false; this.prep(); }
  prep() {
    const L = this.lines[this.i];
    if (L.who) { if (L.side === 'right') this.right = L.who; else this.left = L.who; }
    this.chars = 0; this.lt = 0; this.wrapped = null;
  }
  update(dt) {
    this.t += dt; this.lt += dt; this.chars += dt * 40;
    if (this.done) return;
    if (Input.tapIn(W - 120, 8, 112, 32)) { this.finish(); return; }
    if (Input.pressed('confirm') || Input.pressed('attack') || Input.anyTap()) {
      const total = this.lines[this.i].text.length;
      if (this.chars < total) this.chars = total;
      else if (this.i < this.lines.length - 1) { this.i++; this.prep(); Sfx.play('ui'); }
      else this.finish();
    }
  }
  finish() { if (this.done) return; this.done = true; this.onDone(); }
  draw(c) {
    drawSceneBG(c, this.bg, this.t);
    const vg = c.createLinearGradient(0, 0, 0, H); vg.addColorStop(0, 'rgba(30,0,40,0.35)'); vg.addColorStop(1, 'rgba(10,0,16,0.75)');
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
    const L = this.lines[this.i];
    for (const [key, x] of [[this.left, 230], [this.right, 730]]) {
      if (!key) continue;
      const active = !L.narr && L.who === key;
      const bounce = active ? -Math.max(0, 1 - this.lt * 5) * 10 : 0;
      drawBust(c, key, x, 18 + bounce + (active ? 0 : 14), active ? 470 : 450, { alpha: active ? 1 : 0.38 });
      if (active && L.emo && L.emo !== 'normal' && ATLAS[`face.${key}.${L.emo}`]) { // expression inset (표정 모음)
        const fx = x + (x < W / 2 ? 120 : -120), fy = 92;
        c.save(); c.shadowColor = '#ff4a9a'; c.shadowBlur = 14; circle(c, fx, fy, 46); c.fillStyle = '#1a0a1e'; c.fill(); c.restore();
        drawFaceCircle(c, key, L.emo, fx, fy, 44, { fy: 0.3 });
        c.strokeStyle = '#ff8ab8'; c.lineWidth = 2.5; circle(c, fx, fy, 44); c.stroke();
      }
    }
    const bx = 34, by = 382, bw = 892, bh = 140;
    neonPanel(c, bx, by, bw, bh, { r: 6, fill: 'rgba(24,8,28,0.82)' });
    if (!L.narr) {
      const nm = NAMES[L.who];
      c.font = `700 18px ${SANS}`;
      const nw = c.measureText(nm).width + 70;
      neonPanel(c, bx + 24, by - 20, nw, 36, { r: 4, fill: 'rgba(60,10,40,0.95)' });
      c.fillStyle = '#ff8ab8'; drawStar(c, bx + 46, by - 2, 7);
      c.fillStyle = '#fff'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(nm, bx + 60, by - 1);
    }
    c.font = L.narr ? `500 19px ${SANS}` : `500 21px ${SANS}`;
    if (!this.wrapped) this.wrapped = wrapText(c, L.text, bw - 90);
    let remain = Math.floor(this.chars), yy = by + 44;
    c.fillStyle = L.narr ? '#f0d6e4' : '#fff'; c.textAlign = 'left'; c.textBaseline = 'middle';
    for (const line of this.wrapped) {
      if (remain <= 0) break;
      c.fillText(line.slice(0, remain), bx + 42, yy);
      remain -= line.length; yy += L.narr ? 28 : 32;
    }
    if (this.chars >= L.text.length) {
      c.globalAlpha = 0.7 + Math.sin(this.t * 5) * 0.3;
      neonPanel(c, bx + bw - 120, by + bh - 40, 100, 30, { r: 14, fill: 'rgba(90,10,50,0.95)' });
      c.font = `700 14px ${SANS}`; c.fillStyle = '#fff'; c.textAlign = 'center';
      c.fillText(this.i < this.lines.length - 1 ? '다음 ▶' : '닫기 ▶', bx + bw - 70, by + bh - 25);
      c.globalAlpha = 1;
    }
    neonButton(c, W - 120, 8, 112, 32, 'SKIP ▶▶', { size: 13 });
  }
}

class ChaseScene { // STAGE 1-4 종료 후 → 보스 추격 연출
  constructor(onDone) { this.t = 0; this.onDone = onDone; this.done = false; }
  update(dt) {
    this.t += dt;
    if (this.done) return;
    if ((Input.anyTap() || Input.pressed('confirm')) && this.t > 0.6) this.finish();
    if (this.t > 4.6) this.finish();
  }
  finish() { if (this.done) return; this.done = true; this.onDone(); }
  draw(c) {
    const t = this.t, cam = 100 + t * 190;
    BG.backdrop(c, cam, t);
    c.save(); c.translate(-cam, 0); BG.street(c, cam, t); c.restore();
    const run = { t, moving: true, walk: t * 20, lean: 0.35, emo: 'angry', armFront: 2.2, armBack: 2.4 };
    drawFighter(c, 'hocheol', 330, GROUND_Y, 1, Object.assign({}, run, { walk: t * 18 + 1, frame: 'hocheol_dash', lean: 0 }));
    drawFighter(c, 'dongmin', 480, GROUND_Y, 1, Object.assign({}, run, { frame: 'dongmin_dash', lean: 0 }));
    c.strokeStyle = 'rgba(255,220,240,0.2)'; c.lineWidth = 2;
    const R = mulberry32(Math.floor(t * 20));
    for (let i = 0; i < 14; i++) { const y = 120 + R() * 360, x = R() * W; seg(c, x, y, x + 120 + R() * 120, y); }
    const pulse = 0.45 + Math.sin(t * 6) * 0.15;
    const g = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.9);
    g.addColorStop(0, 'rgba(160,0,0,0)'); g.addColorStop(1, `rgba(170,0,20,${pulse})`);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    BG.foliage(c, t);
    caption(c, 20, 20, 420, 'STAGE 1-4 CLEAR — 박쥐 수인의 분신을 모두 물리쳤다. 그 순간...');
    if (t > 0.7) bubble(c, 480, 200, 220, '...이 살기. 놈들이다!', [490, 320]);
    if (t > 2.3) bubble(c, 140, 180, 230, '쫓아라! 놓치면 또 한 명 죽는다!', [320, 320]);
    c.globalAlpha = 0.5 + Math.sin(t * 4) * 0.3; c.font = `600 13px ${SANS}`; c.fillStyle = '#ffb8d8'; c.textAlign = 'right'; c.textBaseline = 'middle';
    c.fillText('터치하여 건너뛰기 ▶', W - 24, H - 14); c.globalAlpha = 1;
  }
}

// World map (그림 9): painted map + live stage nodes/info panel over the painted ones
const MAP_PANEL = { x: 752, y: 78, w: 198, h: 362 };
const MAP_BTN = { x: 764, y: 463, w: 184, h: 48 };
class MapScene {
  constructor() { this.t = 0; this.sel = 4; this.msgT = 0; }
  update(dt) {
    this.t += dt; this.msgT = Math.max(0, this.msgT - dt);
    if (Input.tapIn(8, 6, 70, 44) || Input.pressed('pause')) { Sfx.play('ui'); Flow.title(); return; }
    STAGES.forEach((s, i) => { if (Input.tapCircle(s.x, s.y, s.boss ? 42 : 34)) { this.sel = i; Sfx.play('ui'); } });
    if (Input.pressed('left')) { this.sel = Math.max(0, this.sel - 1); Sfx.play('ui'); }
    if (Input.pressed('right')) { this.sel = Math.min(STAGES.length - 1, this.sel + 1); Sfx.play('ui'); }
    const st = STAGES[this.sel];
    if (Input.tapIn(MAP_BTN.x, MAP_BTN.y, MAP_BTN.w, MAP_BTN.h) || Input.pressed('confirm')) {
      if (st.playable) { Sfx.play('ui'); Flow.stage15(); }
      else { this.msgT = 2.2; Sfx.play('block'); }
    }
  }
  draw(c) {
    const t = this.t;
    if (!drawCrop(c, 'bg.map', 0, 0, W, H, 'cover')) { c.fillStyle = '#140a1e'; c.fillRect(0, 0, W, H); }
    const cleared = Save.get('clear15', 0);
    STAGES.forEach((s, i) => {
      const sel = i === this.sel, r = s.boss ? 34 : 28;
      if (sel) {
        c.save(); c.shadowColor = '#ff4a8a'; c.shadowBlur = 20;
        c.strokeStyle = `rgba(255,170,210,${0.6 + Math.sin(t * 5) * 0.3})`; c.lineWidth = 3;
        c.beginPath(); c.moveTo(s.x, s.y - r - 6); c.lineTo(s.x + r + 6, s.y); c.lineTo(s.x, s.y + r + 6); c.lineTo(s.x - r - 6, s.y); c.closePath(); c.stroke();
        c.restore();
      }
      if (!s.playable) {
        c.font = `700 10px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle';
        outlinedText(c, '프로토타입 미구현', s.x, s.y + r + 26, '#e8d8e8', 'rgba(0,0,0,0.85)', 3);
      } else {
        c.font = `800 12px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle';
        outlinedText(c, '해님달님 — 원한의 끝', s.x, s.y + r + 28, '#ffd0e0', 'rgba(0,0,0,0.85)', 3);
        if (cleared) { c.save(); c.translate(s.x + 30, s.y - 30); c.rotate(-0.3); c.strokeStyle = '#ff4a6a'; c.lineWidth = 2; c.strokeRect(-24, -10, 48, 20); c.font = `900 11px ${SANS}`; c.fillStyle = '#ff4a6a'; c.fillText('CLEAR', 0, 1); c.restore(); }
      }
    });
    // info panel drawn over the painted one
    const s = STAGES[this.sel], P = MAP_PANEL;
    neonPanel(c, P.x, P.y, P.w, P.h, { r: 6, fill: 'rgba(40,8,26,0.96)' });
    c.textAlign = 'left'; c.textBaseline = 'top';
    c.font = `800 11px ${SANS}`; c.fillStyle = '#ff8ab8'; c.fillText('STAGE ' + s.id, P.x + 12, P.y + 10);
    c.font = `800 16px ${SERIF}`; c.fillStyle = '#fff';
    const tl = wrapText(c, s.name, P.w - 24); tl.forEach((l, i) => c.fillText(l, P.x + 12, P.y + 26 + i * 20));
    let yy = P.y + 30 + tl.length * 20;
    if (s.playable) {
      c.save(); roundRect(c, P.x + 10, yy, P.w - 20, 62, 4); c.clip(); drawCrop(c, 'boss.illust', P.x + 10, yy, P.w - 20, 62, 'cover', 0.5, 0.35); c.restore();
      yy += 68;
    }
    const row = (label, val) => {
      c.font = `700 11px ${SANS}`; c.fillStyle = '#ff9ac0'; c.fillText(label, P.x + 12, yy); yy += 15;
      c.font = `500 11px ${SANS}`; c.fillStyle = '#f2e6ee';
      for (const l of wrapText(c, val, P.w - 24)) { c.fillText(l, P.x + 12, yy); yy += 15; }
      yy += 5;
    };
    row('적 정보', s.enemy); row('클리어 조건', s.clear); row('보상', s.reward);
    if (s.playable) {
      c.font = `700 11px ${SANS}`; c.fillStyle = '#ff9ac0'; c.fillText('편성', P.x + 12, yy); yy += 16;
      [['hocheol', '최호철'], ['dongmin', '이동민']].forEach(([k, n], i) => {
        const cx = P.x + 30 + i * 90;
        drawFaceCircle(c, k, 'normal', cx, yy + 18, 18);
        c.strokeStyle = '#c81a2a'; c.lineWidth = 2; circle(c, cx, yy + 18, 18); c.stroke();
        c.font = `700 11px ${SANS}`; c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.fillText(n, cx + 22, yy + 12);
        if (k === 'dongmin') { c.fillStyle = '#c8203e'; roundRect(c, cx + 22, yy + 21, 28, 13, 4); c.fill(); c.fillStyle = '#fff'; c.font = `800 9px ${SANS}`; c.fillText('필수', cx + 27, yy + 28); }
        c.textBaseline = 'top';
      });
    } else {
      c.font = `500 11px ${SANS}`; c.fillStyle = '#c8b0c0';
      for (const l of wrapText(c, s.story, P.w - 24)) { c.fillText(l, P.x + 12, yy); yy += 15; }
    }
    // battle-ready button over the painted one
    if (!s.playable) { neonButton(c, MAP_BTN.x, MAP_BTN.y, MAP_BTN.w, MAP_BTN.h, '미구현 스테이지', { disabled: true, size: 15 }); }
    else { c.save(); c.shadowColor = '#ff4a8a'; c.shadowBlur = 10 + Math.sin(t * 4) * 8; c.strokeStyle = 'rgba(255,180,210,0.7)'; c.lineWidth = 2; c.strokeRect(MAP_BTN.x + 6, MAP_BTN.y + 4, MAP_BTN.w - 12, MAP_BTN.h - 8); c.restore(); }
    if (this.msgT > 0) {
      c.globalAlpha = Math.min(1, this.msgT * 2);
      neonPanel(c, 160, 470, 420, 44, { r: 8 });
      c.font = `600 14px ${SANS}`; c.fillStyle = '#ffe0ec'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('이 프로토타입에서는 STAGE 1-5만 플레이할 수 있습니다.', 370, 492);
      c.globalAlpha = 1;
    }
  }
}

class BattleScene {
  constructor() { this.battle = new Battle(); }
  enter() { Input.setButtons(this.battle.vbtns); }
  exit() { Input.setButtons([]); }
  update(dt) { this.battle.update(dt); }
  draw(c) { this.battle.draw(c); }
}

class ResultScene {
  constructor(stats) {
    this.s = stats; this.t = 0;
    const tm = stats.time, dmg = stats.dmgTaken;
    this.rank = tm < 150 && dmg < 500 ? 'S' : tm < 240 && dmg < 1100 ? 'A' : 'B';
  }
  update(dt) {
    this.t += dt;
    if (this.t < 0.6) return;
    if (Input.tapIn(W / 2 - 270, 462, 250, 50)) { Sfx.play('ui'); Flow.battle(); }
    else if (Input.tapIn(W / 2 + 20, 462, 250, 50) || Input.pressed('confirm')) { Sfx.play('ui'); Flow.map(); }
  }
  draw(c) {
    const t = this.t;
    drawCrop(c, 'bg.title', 0, 0, W, H, 'cover', 0.5, 0.2);
    c.fillStyle = 'rgba(10,2,16,0.78)'; c.fillRect(0, 0, W, H);
    BG.foliage(c, t, true);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `800 52px ${SERIF}`; outlinedText(c, 'CHAPTER 1 CLEAR', W / 2, 70, '#ffe0ee', '#a0103a', 8);
    c.font = `700 16px ${SANS}`; c.fillStyle = '#f2e0ea'; c.fillText('STAGE 1-5 · 해님달님 — 원한의 끝', W / 2, 116);
    neonPanel(c, 70, 150, 380, 290, { r: 10 });
    c.save(); roundRect(c, 78, 158, 150, 274, 6); c.clip(); drawCrop(c, 'bust.dongmin', 78, 158, 150, 274, 'cover', 0.5, 0.1); c.restore();
    const k = clamp((t - 0.3) / 0.4, 0, 1);
    c.font = `900 ${Math.round(96 + (1 - k) * 80)}px ${SERIF}`; c.globalAlpha = k;
    outlinedText(c, this.rank, 154, 360, this.rank === 'S' ? '#ffd34d' : this.rank === 'A' ? '#ff9ac0' : '#d8d4ee', '#000', 8);
    c.globalAlpha = 1;
    const m = Math.floor(this.s.time / 60), sec = Math.floor(this.s.time % 60);
    const rows = [['클리어 시간', `${m}분 ${String(sec).padStart(2, '0')}초`], ['받은 피해', Math.round(this.s.dmgTaken)], ['파마해체 발동', this.s.assists + '회'], ['궁극기 사용', this.s.ults + '회'], ['교대', this.s.tags + '회']];
    c.textAlign = 'left';
    rows.forEach(([a, b], i) => { c.font = `600 13px ${SANS}`; c.fillStyle = '#d8b8c8'; c.fillText(a, 250, 182 + i * 50); c.font = `800 18px ${SANS}`; c.fillStyle = '#fff'; c.fillText(String(b), 250, 204 + i * 50); });
    neonPanel(c, 490, 150, 400, 290, { r: 10, stroke: '#ff5a6a', glow: '#ff2a3a' });
    c.textAlign = 'center';
    c.font = `700 13px ${SANS}`; c.fillStyle = '#ff9a9a'; c.fillText('획득 · 퀘스트 아이템', 690, 176);
    drawOrb(c, 690, 245, 40, t);
    c.font = `800 22px ${SERIF}`; c.fillStyle = '#fff'; c.fillText('증오의 붉은 구슬', 690, 318);
    c.font = `600 12px ${SANS}`; c.fillStyle = '#ffb0c8'; c.fillText('칠정 구슬 · 아티팩트 슬롯 장착', 690, 342);
    c.font = `500 13px ${SANS}`; c.fillStyle = '#f2e6ee';
    c.fillText('장착 시: 적 처치 시 공격력 일시 증가', 690, 372);
    c.fillText('보스 대상 피해량 +5%', 690, 394);
    c.font = `600 12px ${SANS}`; c.fillStyle = '#c8b0ff'; c.fillText('NEXT · CHAPTER 2 「열흘간의 훈련」 해금 (준비 중)', 690, 424);
    neonButton(c, W / 2 - 270, 462, 250, 50, '다시 도전');
    neonButton(c, W / 2 + 20, 462, 250, 50, '월드맵으로', { primary: true });
  }
}

class LoseScene {
  constructor(key) { this.key = key || 'hocheol'; this.t = 0; }
  update(dt) {
    this.t += dt;
    if (this.t < 0.5) return;
    if (Input.tapIn(W / 2 - 270, 430, 250, 54) || Input.pressed('confirm')) { Sfx.play('ui'); Flow.battle(); }
    else if (Input.tapIn(W / 2 + 20, 430, 250, 54)) { Sfx.play('ui'); Flow.map(); }
  }
  draw(c) {
    c.fillStyle = '#030204'; c.fillRect(0, 0, W, H);
    drawBust(c, this.key, W / 2, 20, 480, { alpha: 0.28 });
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `900 96px ${SERIF}`; outlinedText(c, 'LOSE', W / 2, 150, '#d02040', '#000', 8);
    if (this.key === 'hocheol') { c.font = `700 22px ${SERIF}`; outlinedText(c, '"크윽... 어째서 연기에 불이... 내 공격이 통하지 않는다고?"', W / 2, 250, '#ffd9e0', '#000', 4); }
    c.font = `500 15px ${SANS}`; c.fillStyle = '#e0c8d4';
    c.fillText('TIP · 간장은 사악한 기운을 태우고 막야는 요기를 삼킨다. 요기 0%의 이동민으로 교대해 싸우자.', W / 2, 320);
    c.fillText('2페이즈에서는 달님의 폭주가 끝난 뒤 빈틈(주화입마)을, 쌍검 광선은 지붕 위나 회피로 피하자.', W / 2, 346);
    neonButton(c, W / 2 - 270, 430, 250, 54, '재도전', { primary: true, size: 20 });
    neonButton(c, W / 2 + 20, 430, 250, 54, '월드맵으로', { size: 18 });
  }
}

// ---------- scene manager & flow ----------
const Game = {
  scene: null, fade: 0, fadeDir: 0, pending: null,
  go(s) { if (this.fadeDir === 1) return; this.pending = s; this.fadeDir = 1; },
  setNow(s) { if (this.scene && this.scene.exit) this.scene.exit(); this.scene = s; Input.setButtons([]); if (s.enter) s.enter(); },
  update(dt) {
    if (this.fadeDir === 1) {
      this.fade += dt * 4;
      if (this.fade >= 1) { this.fade = 1; this.setNow(this.pending); this.pending = null; this.fadeDir = -1; }
    } else if (this.fadeDir === -1) {
      this.fade -= dt * 4;
      if (this.fade <= 0) { this.fade = 0; this.fadeDir = 0; }
    }
    if (this.fadeDir !== 1 && this.scene) this.scene.update(dt);
  },
  draw(c) {
    if (this.scene) this.scene.draw(c);
    if (this.fade > 0) { c.fillStyle = `rgba(0,0,0,${this.fade})`; c.fillRect(0, 0, W, H); }
  },
};

const Flow = {
  title() { Game.go(new TitleScene()); },
  prologue(next) { Game.go(new CutsceneScene(PROLOGUE, () => { Save.set('seenPrologue', 1); next ? next() : Flow.title(); })); },
  start() { if (!Save.get('seenPrologue', 0)) Flow.prologue(() => Flow.map()); else Flow.map(); },
  map() { Game.go(new MapScene()); },
  stage15() {
    Game.go(new ChaseScene(() =>
      Game.go(new CutsceneScene(BOSS_INTRO, () =>
        Game.go(new DialogueScene(PRE_BATTLE, () => Flow.battle(), 'battle'))))));
  },
  battle() { Game.go(new BattleScene()); },
  win(stats) { Save.set('clear15', 1); Game.go(new DialogueScene(POST_BATTLE, () => Game.go(new ResultScene(stats)), 'battle')); },
  lose(key) { Game.go(new LoseScene(key)); },
};

// ---------- main loop ----------
(function boot() {
  Assets.load();
  const q = new URLSearchParams(location.search).get('scene');
  const first = q === 'battle' ? new BattleScene() : q === 'map' ? new MapScene() : new TitleScene();
  Game.setNow(first);
  window.__game = Game; // debug handle
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    Input.poll();
    Game.update(dt);
    ctx.setTransform(VIEW.ratio, 0, 0, VIEW.ratio, 0, 0);
    Game.draw(ctx);
    Input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
