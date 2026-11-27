'use strict';
// ============================================================
// scenes.js — story data, non-battle scenes, scene flow, main loop
// Story follows the design doc §3 (배경 설정, 기승전결, STAGE 1-1 ~ 1-5 핵심 스토리, 퀘스트, 연출 방식).
// Visuals use the doc art: title = 그림 1, opening comic = 그림 7, dialogue = 그림 8 style
// (Vision cut-out full figures, never cropped), world map = 그림 9, skill art = 그림 2-2 ~ 6-2.
// ============================================================

// Speakers. NPCs the doc has no art for use the silhouette of 그림 8, washed in a colour.
const SPEAKERS = {
  dongmin: { name: '이동민', col: '#ff6a6a', bust: 'dongmin' },
  hocheol: { name: '최호철', col: '#ffb04a', bust: 'hocheol' },
  seondal: { name: '김선달', col: '#7fd8ff', bust: 'seondal' },
  simcheong: { name: '심청이', col: '#ff8ac8', bust: 'simcheong' },
  haenim: { name: '해님', col: '#ff7a4a', bust: 'haenim' },
  dalnim: { name: '달님', col: '#b98cff', bust: 'dalnim' },
  spirit: { name: '신령님', col: '#bfe8ff', bust: 'shadow', tint: 'rgba(210,236,255,0.5)', glow: '#bfe8ff' },
  mole: { name: '땅굴대장', col: '#d8a86a', bust: 'shadow', tint: 'rgba(34,22,16,0.96)', glow: '#d8a86a', small: 0.72 },
  thug: { name: '수상한 인물', col: '#c89aa8', bust: 'shadow', tint: 'rgba(30,10,18,0.96)', glow: '#c06a8a' },
  bat: { name: '박쥐 수인', col: '#e0405a', bust: 'shadow', tint: 'rgba(28,4,10,0.97)', glow: '#ff3050' },
  masked: { name: '얼굴을 가린 자', col: '#9a8aa8', bust: 'shadow', tint: 'rgba(8,6,12,1)', glow: '#7a5ac0' },
};

// Node positions match the diamonds painted in the world-map art (그림 9).
const STAGES = [
  { id: '1-1', name: '신령의 시험', x: 85, y: 262, enemy: '신령님', clear: '신령님의 HP를 0으로 만들기 (자질 시험)', reward: '신령님의 기억 열람 · 노데미지 시 「신령님의 신상패딩」', story: '휘모리 사태의 배경과 도깨비왕의 죽음을 확인한다.', script: 'STORY_11', bg: 'title' },
  { id: '1-2', name: '땅굴대장의 부적', x: 246, y: 262, enemy: '수상한 인물(미니보스) · 하급요괴 ×4', clear: '모든 적 제압 및 부적 획득', reward: '땅굴대장 소환 부적 · 조력자 땅굴대장 · 최호철 합류', story: '의정부 조사를 시작하고 땅굴대장 소환 부적을 얻는다.', script: 'STORY_12', bg: 'battle' },
  { id: '1-3', name: '인호 전쟁의 원한', x: 389, y: 312, enemy: '원귀 ×4 · 대형 원귀 ×1', clear: '원귀 전원 제압', reward: '인호 전쟁 · 해님달님의 과거 해금 · 배후 확인', story: '최호철의 연기 술법, 인호 전쟁의 비극과 오누이의 복수 동기, 배후(까마귀·박쥐 수인)를 알게 된다.', script: 'STORY_13', bg: 'img:skill.hocheol.active' },
  { id: '1-4', name: '까마귀의 그림자', x: 461, y: 184, enemy: '박쥐 수인의 분신 ×3', clear: '분신 3체 모두 제압', reward: '박쥐 수인 · 까마귀 조직의 실체', story: '최호철의 만취 미끼 작전으로 박쥐 수인과 까마귀 조직의 실체를 확인한다.', script: 'STORY_14', bg: 'battle' },
  { id: '1-5', name: '해님달님 — 원한의 끝', x: 643, y: 262, enemy: '해님(간장) · 달님(막야) — 3페이즈', clear: '해님과 달님 모두 제압 (추천: 이동민 편성)', reward: '「증오의 붉은 구슬」 · CHAPTER 1 CLEAR · 열흘간의 훈련 해금', story: '최종 결전. 요기를 삼키는 쌍검 앞에서 요기 0%의 이동민이 열쇠가 된다.', playable: true, boss: true },
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
function panelBust(bgName, key, fy = 0.12, scale = 1.9) { // skill-art background + full cut-out figure (no square crop)
  return (c, w, h, t) => {
    panelImg(bgName, 0.5, 0.5, 'rgba(10,0,20,0.55)')(c, w, h, t);
    drawBust(c, key, w * 0.32, -h * fy, h * scale, { glow: STYLES[key].aura });
  };
}
// 보스 등장 첫 컷: 고해상도 달빛 배경 위에 해님·달님 전신 누끼 (저해상도 일러스트 확대 대신)
function panelTwins(c, w, h, t) {
  panelImg('open.moon', 0.5, 0.45, 'rgba(26,4,36,0.45)')(c, w, h, t);
  const g = c.createLinearGradient(0, h * 0.35, 0, h); g.addColorStop(0, 'rgba(10,0,16,0)'); g.addColorStop(1, 'rgba(10,0,16,0.85)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  const rise = easeOut(clamp(t / 0.8, 0, 1)) * 14;
  drawBust(c, 'dalnim', w * 0.71, h * 0.06 - rise + 14, h * 1.75, { glow: '#b98cff', alpha: clamp(t / 0.5, 0, 1) });
  drawBust(c, 'haenim', w * 0.58, h * 0.02 - rise + 14, h * 1.85, { glow: '#ff7a4a', alpha: clamp(t / 0.4, 0, 1) });
}
function caption(c, x, y, w, text) {
  c.font = `700 15px ${SANS}`;
  const lines = wrapText(c, text, w - 24);
  const h = lines.length * 21 + 14;
  c.fillStyle = 'rgba(20,8,24,0.88)'; c.fillRect(x, y, w, h);
  c.strokeStyle = '#ff6aa8'; c.lineWidth = 1.5; c.strokeRect(x, y, w, h);
  c.fillStyle = '#ffe8f2'; c.textAlign = 'left'; c.textBaseline = 'top';
  lines.forEach((l, i) => c.fillText(l, x + 12, y + 8 + i * 21));
}
// Speech bubble: translucent ink panel with the speaker's colour as a neon rim, a tapered tail and an
// optional name tab — the same language as the captions and the visual-novel text box.
// o: { who: speaker key (name + colour), col, k: 0..1 pop-in }
function bubble(c, x, y, w, text, tail, o = {}) {
  const sp = o.who ? SPEAKERS[o.who] : null, col = o.col || (sp && sp.col) || '#ff8ab8', k = o.k != null ? o.k : 1;
  c.save();
  c.font = `700 15px ${SANS}`;
  const lines = wrapText(c, text, w - 30), lh = 21, h = lines.length * lh + 22, r = 12;
  const cx = x + w / 2, cy = y + h / 2, s = 0.9 + 0.1 * easeOut(k);
  c.globalAlpha *= clamp(k * 1.6, 0, 1);
  c.translate(cx, cy); c.scale(s, s); c.translate(-cx, -cy);
  // tail: tapered wedge from the bubble's lower edge toward the speaker
  let tb = null;
  if (tail) {
    const bx = clamp(tail[0], x + 26, x + w - 26), half = 11;
    tb = [bx - half, bx + half];
    c.beginPath(); c.moveTo(tb[0], y + h - 1); c.quadraticCurveTo(bx - 2, y + h + 10, tail[0], tail[1]); c.quadraticCurveTo(bx + 4, y + h + 8, tb[1], y + h - 1); c.closePath();
    c.fillStyle = 'rgba(22,8,30,0.92)'; c.fill();
    c.shadowColor = col; c.shadowBlur = 8; c.strokeStyle = col; c.lineWidth = 1.8; c.stroke(); c.shadowBlur = 0;
  }
  roundRect(c, x, y, w, h, r);
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(44,14,52,0.94)'); g.addColorStop(1, 'rgba(18,6,26,0.94)');
  c.fillStyle = g; c.fill();
  c.shadowColor = col; c.shadowBlur = 14; c.strokeStyle = col; c.lineWidth = 2; c.stroke(); c.shadowBlur = 0;
  roundRect(c, x + 4, y + 4, w - 8, h - 8, r - 4); c.strokeStyle = 'rgba(255,255,255,0.10)'; c.lineWidth = 1; c.stroke();
  if (tb) { c.strokeStyle = 'rgba(28,10,36,0.98)'; c.lineWidth = 4; seg(c, tb[0] + 2.5, y + h - 1, tb[1] - 2.5, y + h - 1); } // open the rim where the tail joins
  c.fillStyle = '#fff4fa'; c.textAlign = 'center'; c.textBaseline = 'top';
  lines.forEach((l, i) => c.fillText(l, cx, y + 12 + i * lh));
  if (sp) { // name tab
    c.font = `800 12px ${SANS}`;
    const nw = c.measureText(sp.name).width + 20, nx = x + 14, ny = y - 11;
    roundRect(c, nx, ny, nw, 20, 6); c.fillStyle = 'rgba(60,10,44,0.97)'; c.fill();
    c.strokeStyle = col; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = col; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(sp.name, nx + 10, ny + 10.5);
  }
  c.restore();
}
function drawSceneBG(c, kind, t) {
  if (kind && kind.startsWith('img:')) {
    const z = 1.04 + Math.sin(t * 0.2) * 0.02;
    c.save(); c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2);
    c.filter = 'blur(3px)';
    if (!drawCrop(c, kind.slice(4), 0, 0, W, H, 'cover')) { c.fillStyle = '#100818'; c.fillRect(0, 0, W, H); }
    c.filter = 'none';
    c.restore();
    c.fillStyle = 'rgba(12,4,20,0.35)'; c.fillRect(0, 0, W, H);
  } else if (kind === 'title') {
    drawCrop(c, 'bg.title', 0, 0, W, H, 'cover', 0.5, 0.15);
  } else {
    BG.backdrop(c, 600, t);
    c.save(); c.translate(-600, 0); BG.street(c, 600, t); c.restore();
  }
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

// ---------- story scripts (설정·시나리오는 기획서, 대사는 그에 맞춘 오리지널) ----------
// 오프닝 튜토리얼 카툰 컷신 (기획서 §3-2, 그림 7): 휘모리 배경 + 월광대 주요 인물 4인 + 사건의 시작
const PROLOGUE = [
  { panels: [
    { rect: [30, 30, 560, 230], caption: '2026년 한양. 인간왕과 도깨비왕의 합의로, 인간과 요괴(수인)가 함께 살아온 도시.', draw: panelImg('open.hanyang', 0.5, 0.5) },
    { rect: [610, 30, 320, 230], caption: '도깨비왕이 숨을 거두자, 칠정의 구슬 일곱 개가 전국으로 흩어졌다.',
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
    { rect: [30, 280, 900, 230], caption: '일부 요괴들의 반란 — 서울 전역을 덮친 대재난, 「휘모리」. 그리고 10년 전, 호랑이 수인의 우두머리 흑호와 인간이 맞선 「인호 전쟁」의 원한도 아직 남아 있다.', draw: panelImg('open.bottom', 0.5, 0.5, 'rgba(90,0,20,0.25)') },
  ] },
  { panels: [
    { rect: [30, 30, 430, 150], caption: '월광대 의정부지부 팀장 · 호랑이 수인 — 최호철', draw: panelImg('open.tiger', 0.3, 0.4) },
    { rect: [30, 195, 430, 150], caption: '월광대 반장 · 첨단 접선의 전략가 — 김선달', draw: panelImg('open.seondal', 0.4, 0.5) },
    { rect: [30, 360, 430, 150], caption: '월광대 전투부원 344기 · 요기 0%의 쌍검사 — 이동민', draw: panelImg('open.dongmin', 0.3, 0.5) },
    { rect: [480, 30, 450, 480], caption: '그리고 용왕의 핏줄, 심청이. 요괴를 소탕하는 자들 — 월광대(月光隊).', draw: panelImg('open.simcheong', 0.5, 0.3) },
  ] },
  { panels: [
    { rect: [30, 30, 900, 276], caption: '그리고 지금 — 의정부에서 호랑이 수인들이 하나둘 살해당하고 있다.', draw: panelImg('skill.hocheol.passive', 0.5, 0.4) },
    { rect: [30, 322, 900, 192], caption: '월광대가 왜 싸우는지, 그 답은 「신령의 시험」에서 시작된다. (CHAPTER 1 · 의정부 — 호랑이를 사냥하는 오누이)', draw: panelImg('open.chapter1', 0.5, 0.55, 'rgba(20,0,30,0.25)') },
  ] },
];

// STAGE 1-1 ~ 1-4: 기획서 §3-2 스테이지 표 + §3-3 퀘스트를 대화로 풀어낸 스토리 (맵에서 「스토리 보기」)
const STORY_11 = [
  { narr: true, text: 'STAGE 1-1 · 신령의 시험 — 휘모리의 뿌리를 쫓던 월광대 앞에, 초월적인 존재가 모습을 드러낸다.' },
  { who: 'seondal', side: 'left', emo: 'smirk', text: '의정부 사건 전에 꼭 들러야 할 데가 있다더니… 여기야? 분위기 한번 고약하네.' },
  { who: 'dongmin', side: 'left', emo: 'normal', text: '반장님, 기운이 이상합니다. 사람도 요괴도 아닌 게 있어요.' },
  { who: 'spirit', side: 'right', text: '월광대인가. 조선의 비밀을 알고 싶다면, 그 자격부터 증명해라.' },
  { who: 'seondal', side: 'left', emo: 'smile', text: '자격이라… 일단 이거라도 드시면서 얘기하시죠. 초코바인데.' },
  { who: 'spirit', side: 'right', text: '거래는 그렇게 하는 게 아니다. 내 환영과 기운, 순간이동을 견뎌 내라. 그것이 시험이다.' },
  { narr: true, text: '퀘스트 — 신령님의 HP를 0으로 만들기. 죽이기 위한 싸움이 아닌, 자질을 확인하는 시험이다.' },
  { narr: true, text: '환영이 흩어지고 원거리 기운이 잦아들었다. 시험 종료.' },
  { who: 'spirit', side: 'right', text: '합격이다. 약속대로 내 기억을 보여 주마. …도깨비왕이 숨을 거두던 그날을.' },
  { narr: true, text: '도깨비왕의 죽음, 전국으로 흩어지는 일곱 개의 칠정 구슬. 휘모리는 그날 시작되었다.' },
  { who: 'spirit', side: 'right', text: '상처 하나 없이 시험을 마친 자에게는 이것을 주지. 「신령님의 신상패딩」 — 체력이 덜 닳을 것이다.' },
  { narr: true, text: '보상 — 신령님의 기억 열람, STAGE 1-2 해금. (노데미지 특별 클리어: 보조 아이템 「신령님의 신상패딩」)' },
];
const STORY_12 = [
  { narr: true, text: 'STAGE 1-2 · 땅굴대장의 부적 — 의정부 조사가 시작된다.' },
  { who: 'thug', side: 'right', text: '어이, 월광대 양반들. 땅굴대장 부르는 부적을 찾는다며? 공짜는 없지. 값은 좀 쳐 주셔야겠는데.' },
  { who: 'dongmin', side: 'left', emo: 'angry', text: '협박이면, 대가가 좀 셀 텐데.' },
  { who: 'thug', side: 'right', text: '얘들아, 손님들 주머니 좀 털어 드려라!' },
  { narr: true, text: '퀘스트 — 하급요괴 4마리를 처치한 뒤 미니보스 「수상한 인물」 제압.' },
  { narr: true, text: '요괴들이 흩어지고, 수상한 인물의 손에서 낡은 부적이 떨어졌다.' },
  { who: 'seondal', side: 'left', emo: 'smirk', text: '부적 하나 받자고 이 난리라니. 자, 불러 보자고.' },
  { who: 'mole', side: 'right', text: '부르셨슈? 땅 밑 구멍이면 어디든 들어가서 엿듣고 오는 게 제 일이쥬. 위치든 대화든 다 물어 오겄슈.' },
  { who: 'hocheol', side: 'right', emo: 'smirk', text: '그 부적, 의정부에서 쓸 거라면 나한테 먼저 말했어야지.' },
  { who: 'hocheol', side: 'right', emo: 'normal', text: '의정부지부 팀장 최호철이다. 요즘 이 동네 호랑이 수인들이 하나씩 사라지고 있어. 여기서부터는 나도 같이 간다.' },
  { narr: true, text: '보상 — 땅굴대장 소환 부적 획득, 조력자 땅굴대장 등장, 최호철 합류, STAGE 1-3 해금.' },
];
const STORY_13 = [
  { narr: true, text: 'STAGE 1-3 · 인호 전쟁의 원한 — 인호 전쟁에서 희생된 이들의 원한이 원귀가 되어 몰려든다.' },
  { who: 'dongmin', side: 'left', emo: 'normal', text: '저 구슬… 맞으면 그냥 다치는 게 아니라 원한이 들러붙는 느낌입니다.' },
  { who: 'hocheol', side: 'right', emo: 'shout', text: '물러서 있어라. 한꺼번에 묶는다 — 흑연호박!' },
  { narr: true, text: '최호철의 담뱃대에서 검은 요기가 피어올라, 호랑이 형상의 연기가 원귀들을 휘감았다.' },
  { narr: true, text: '퀘스트 — 「원한 구슬」을 쏘는 원귀 4마리와 대형 원귀 1마리 제압.' },
  { who: 'mole', side: 'right', text: '조사 끝났슈. 범인은 「해님·달님」이라 불리는 해결사 남매여유. 돈만 주면 사람도 죽여 준다는 악질이유.' },
  { who: 'mole', side: 'right', text: '10년 전 인호 전쟁 때, 배고프다는 이유로 그 남매 어머니를 잡아먹은 게… 흑호였대유.' },
  { who: 'dongmin', side: 'left', emo: 'shock', text: '그래서 호랑이 수인만 노린다… 복수라는 겁니까.' },
  { who: 'mole', side: 'right', text: '근데 그 뒤에 「까마귀」라는 조직이 있슈. 박쥐 수인이 남매를 부추기고 있다고 하더만유.' },
  { who: 'hocheol', side: 'right', emo: 'shout', text: '흑호의 죄를 내 동네 사람들한테 묻게 둘 순 없다.' },
  { narr: true, text: '보상 — 인호 전쟁과 해님달님의 과거 해금, 범행 동기 및 박쥐 수인·까마귀 조직 존재 확인, STAGE 1-4 해금.' },
];
const STORY_14 = [
  { narr: true, text: 'STAGE 1-4 · 까마귀의 그림자 — 배후를 끌어내기 위한 미끼 작전.' },
  { who: 'seondal', side: 'left', emo: 'smirk', text: '작전은 간단해. 호랑이가 술에 취해 비틀거리면, 사냥꾼은 반드시 나타난다.' },
  { who: 'hocheol', side: 'right', emo: 'normal', text: '…그래서 내가 마셔야 한다는 거냐.' },
  { who: 'seondal', side: 'left', emo: 'smile', text: '전통주로 준비했어. 취향은 존중해야지.' },
  { narr: true, text: '만취한 척 비틀거리는 최호철 앞에, 박쥐 수인의 분신 셋이 소리 없이 내려앉았다.' },
  { who: 'bat', side: 'right', text: '미끼치고는 너무 큰 고기군. 남매의 사냥감을 가로챌 순 없지.' },
  { narr: true, text: '퀘스트 — 순간이동·돌진·공중 낙하를 쓰는 박쥐 수인의 분신 3체 모두 제압.' },
  { narr: true, text: '분신은 모두 베어 냈지만 본체는 없었다. 대신, 얼굴을 요술로 가린 누군가의 목소리가 들렸다.' },
  { who: 'masked', side: 'right', text: '……남매가 쓰러지면, 칼만 회수해라. 나머지는 필요 없다.' },
  { who: 'dongmin', side: 'left', emo: 'angry', text: '…이 살기. 놈들이다!' },
  { narr: true, text: '화면 가장자리에 붉은 살기가 드리운다. 이동민이 어둠 속으로 달려 나간다 — STAGE 1-5, 최종 결전으로.' },
];

// STAGE 1-5 보스 등장 카툰 컷신 (기획서 §3-3: 해님·달님의 등장과 호랑이 가죽 도발 대사)
const BOSS_INTRO = [
  { panels: [
    { rect: [30, 30, 900, 220], caption: '의정부, 자정. 두 자루의 검이 달빛 아래에서 울었다.', draw: panelTwins },
    { rect: [30, 270, 440, 240], bubble: { who: 'haenim', x: 214, y: 26, w: 210, text: '이 호랑이 가죽, 제법 따뜻하더라. 다음은 네 차례야, 팀장님.', tail: [160, 132] }, draw: panelBust('skill.haenim', 'haenim', 0.02, 2.0) },
    { rect: [490, 270, 440, 240], bubble: { who: 'dalnim', x: 214, y: 26, w: 210, text: '간장이 태우고, 막야가 삼킨다. 호랑이는 하나도 남기지 않아.', tail: [150, 132] }, draw: panelBust('skill.dalnim', 'dalnim', 0.02, 2.0) },
  ] },
];

const PRE_BATTLE = [
  { narr: true, text: 'STAGE 1-5 · 해님달님 — 원한의 끝. 이동민의 추격 끝, 오누이가 기다리고 있었다.' },
  { who: 'hocheol', side: 'left', emo: 'shout', text: '네놈들이 의정부 수인들을 사냥해 온 오누이냐.' },
  { who: 'haenim', side: 'right', emo: 'angry', text: '사냥? 아니, 복수지. 10년 전 인호 전쟁 때, 흑호가 우리 어머니를 삼켰으니까.' },
  { who: 'hocheol', side: 'left', emo: 'shout', text: '흑호의 죄를 이 동네 호랑이들 목숨으로 갚게 하겠다는 거냐!' },
  { who: 'dalnim', side: 'right', emo: 'smirk', text: '호랑이는 다 똑같아. 간장이 사악한 기운을 태우고, 막야가 요기를 삼키면 끝이야.' },
  { who: 'dongmin', side: 'left', emo: 'normal', text: '팀장님, 저 칼들… 요기를 먹어 치웁니다. 연기 술법은 안 통할 거예요.' },
  { who: 'hocheol', side: 'left', emo: 'smirk', text: '알고 있다. 그래도 여긴 내 구역이다. 이동민 — 요기 한 방울 없는 네 손이 열쇠다.' },
  { narr: true, text: 'TIP · 최호철의 연기 술법과 심청이의 수류 술법은 간장·막야가 절반을 삼킨다. 최호철의 주먹, 요기 0%의 이동민, 원거리 부채 바람의 김선달은 정상 타격. 1페이즈 오누이 협공 → 2페이즈 달님 주화입마의 빈틈 → 3페이즈 해님의 동요.' },
];

const POST_BATTLE = [
  { who: 'haenim', side: 'right', emo: 'shock', text: '말도 안 돼... 요기가 한 방울도 없는 놈한테...' },
  { who: 'dongmin', side: 'left', emo: 'smirk', text: '순도 100%, 자연산 근육이라서 말이야.' },
  { narr: true, text: '그때, 어둠 속에서 날갯짓 소리가 울렸다.' },
  { who: 'bat', side: 'right', text: '쓸모를 다했군. 간장과 막야는 우리 「까마귀」가 회수해 가지.' },
  { who: 'dongmin', side: 'left', emo: 'angry', text: '누구 마음대로.' },
  { narr: true, text: '이동민의 칼날이 박쥐 수인의 날개를 그었다. 놈은 명검을 끝내 손에 넣지 못한 채 밤하늘로 물러났다.' },
  { who: 'hocheol', side: 'left', emo: 'normal', text: '…이 구슬. 「증오의 붉은 구슬」이다. 도깨비왕이 남긴 칠정 구슬 중 하나.' },
  { who: 'seondal', side: 'right', emo: 'smirk', text: '수고했어. 다음 임무까지 열흘. 그동안 제대로 굴러 줄 사람들을 소개하지.' },
  { who: 'simcheong', side: 'right', emo: 'smile', text: '열흘이면 충분하죠! 아버지랑 같이 봐 드릴게요. 일단 저 절벽부터 맨손으로 올라가 볼까요?' },
  { narr: true, text: 'CHAPTER 1 CLEAR — 다음 챕터 「열흘간의 훈련」이 해금되었다.' },
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
    if (Input.tapCircle(W - 30, 30, 22) || Input.pressed('mute')) { Sfx.toggle(); return; }
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
      if (this.fill >= 1) { // glow pulse on the painted start button
        const b = TITLE_BTN, a = 0.25 + Math.sin(t * 3) * 0.15;
        c.save(); c.shadowColor = '#ff4a8a'; c.shadowBlur = 24; c.strokeStyle = `rgba(255,170,200,${a})`; c.lineWidth = 3;
        c.beginPath(); c.moveTo(b.x + 12, b.y); c.lineTo(b.x + b.w - 12, b.y); c.lineTo(b.x + b.w, b.y + b.h / 2); c.lineTo(b.x + b.w - 12, b.y + b.h); c.lineTo(b.x + 12, b.y + b.h); c.lineTo(b.x, b.y + b.h / 2); c.closePath(); c.stroke(); c.restore();
      }
    }
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
    drawMuteButton(c, W - 30, 30);
    c.font = `500 11px ${SANS}`; c.textAlign = 'left'; c.textBaseline = 'middle';
    outlinedText(c, 'TEAM 5 · AI를 활용한 창의적 게임 디자인 · CHAPTER 1 의정부', 12, H - 14, 'rgba(255,240,250,0.8)', 'rgba(0,0,0,0.7)', 3);
  }
}
function drawMuteButton(c, x, y) {
  c.save();
  c.fillStyle = 'rgba(10,6,16,0.75)'; circle(c, x, y, 18); c.fill(); c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 2; c.stroke();
  c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - 9, y - 4); c.lineTo(x - 4, y - 4); c.lineTo(x + 2, y - 9); c.lineTo(x + 2, y + 9); c.lineTo(x - 4, y + 4); c.lineTo(x - 9, y + 4); c.closePath(); c.fill();
  c.strokeStyle = '#fff'; c.lineWidth = 1.8;
  if (Sfx.muted) { seg(c, x + 5, y - 5, x + 11, y + 5); seg(c, x + 11, y - 5, x + 5, y + 5); }
  else { c.beginPath(); c.arc(x + 3, y, 5, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(x + 3, y, 9, -0.9, 0.9); c.stroke(); }
  c.restore();
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
      if (pn.bubble) bubble(c, pn.bubble.x, pn.bubble.y, pn.bubble.w, pn.bubble.text, pn.bubble.tail, { who: pn.bubble.who, k: clamp((lt - 0.25) / 0.25, 0, 1) });
      c.restore();
    }
    neonButton(c, W - 130, 6, 124, 34, 'SKIP ▶▶', { size: 13 });
    c.globalAlpha = 0.5 + Math.sin(this.t * 4) * 0.3;
    c.font = `600 13px ${SANS}`; c.fillStyle = '#ffb8d8'; c.textAlign = 'right'; c.textBaseline = 'middle';
    c.fillText('화면을 터치하여 계속 ▶', W - 30, H - 14);
    c.globalAlpha = 1;
  }
}

// Visual-novel dialogue (그림 8): full cut-out figures (sharp, never cropped) + neon-magenta text box
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
    const vg = c.createLinearGradient(0, 0, 0, H); vg.addColorStop(0, 'rgba(30,0,40,0.4)'); vg.addColorStop(1, 'rgba(10,0,16,0.8)');
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
    const L = this.lines[this.i];
    for (const [key, x] of [[this.left, 230], [this.right, 730]]) {
      if (!key) continue;
      const sp = SPEAKERS[key], active = !L.narr && L.who === key;
      const bounce = active ? -Math.max(0, 1 - this.lt * 5) * 10 : 0;
      const h = 560 * (sp.small || 1), top = 22 + (560 - h) + bounce + (active ? 0 : 16);
      drawBust(c, sp.bust, x, top, active ? h : h * 0.97, { alpha: active ? 1 : 0.35, tint: sp.tint, glow: active || sp.tint ? (sp.glow || (STYLES[key] || {}).aura) : null });
    }
    const bx = 34, by = 382, bw = 892, bh = 140;
    neonPanel(c, bx, by, bw, bh, { r: 6, fill: 'rgba(24,8,28,0.86)' });
    if (!L.narr) {
      const sp = SPEAKERS[L.who];
      c.font = `700 18px ${SANS}`;
      const nw = c.measureText(sp.name).width + 70;
      neonPanel(c, bx + 24, by - 20, nw, 36, { r: 4, fill: 'rgba(60,10,40,0.95)' });
      c.fillStyle = sp.col; drawStar(c, bx + 46, by - 2, 7);
      c.fillStyle = '#fff'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(sp.name, bx + 60, by - 1);
    }
    c.font = L.narr ? `500 18px ${SANS}` : `500 21px ${SANS}`;
    if (!this.wrapped) this.wrapped = wrapText(c, L.text, bw - 90);
    let remain = Math.floor(this.chars), yy = by + 40;
    c.fillStyle = L.narr ? '#f0d6e4' : '#fff'; c.textAlign = 'left'; c.textBaseline = 'middle';
    for (const line of this.wrapped) {
      if (remain <= 0) break;
      c.fillText(line.slice(0, remain), bx + 42, yy);
      remain -= line.length; yy += L.narr ? 27 : 32;
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

class ChaseScene { // STAGE 1-4 종료 후 → 붉은 살기 + 자동 추격 연출 → 1-5 카툰 컷신
  constructor(onDone, party) { this.t = 0; this.onDone = onDone; this.done = false; this.party = party || ['dongmin', 'hocheol']; }
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
    this.party.forEach((k, i) => {
      const F = CHAR_DATA[k].frames;
      const cyc = animFrame(k + '_run', t + i * 0.13) || animFrame(k + '_walk', t * 1.6 + i * 0.13);
      drawFighter(c, k, 330 + i * 150, GROUND_Y, 1, cyc ? { t, frame: cyc } : { t, moving: true, walk: t * 20 + i, frame: F.dodge, lean: 0.1 });
    });
    c.strokeStyle = 'rgba(255,220,240,0.2)'; c.lineWidth = 2;
    const R = mulberry32(Math.floor(t * 20));
    for (let i = 0; i < 14; i++) { const y = 120 + R() * 360, x = R() * W; seg(c, x, y, x + 120 + R() * 120, y); }
    const pulse = 0.45 + Math.sin(t * 6) * 0.15;
    const g = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.9);
    g.addColorStop(0, 'rgba(160,0,0,0)'); g.addColorStop(1, `rgba(170,0,20,${pulse})`);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    BG.foliage(c, t);
    caption(c, 20, 20, 440, 'STAGE 1-4 CLEAR — 박쥐 수인의 분신을 모두 물리쳤다. 그 순간, 스산한 기운이…');
    const [p0, p1] = this.party;
    if (t > 0.7) bubble(c, 170, 214, 220, '…이 살기. 놈들이다!', [326, 330], { who: p0, k: clamp((t - 0.7) / 0.2, 0, 1) });
    if (t > 2.3) bubble(c, 450, 186, 250, '쫓아라! 놓치면 또 한 명 죽는다!', [478, 326], { who: p1 || p0, k: clamp((t - 2.3) / 0.2, 0, 1) });
    if (t > 0.3) { // 느낌표 감각 아이콘 (기획서 대안 연출)
      c.save(); c.globalAlpha = Math.min(1, (t - 0.3) * 3); c.fillStyle = '#ff3a3a'; c.shadowColor = '#ff3a3a'; c.shadowBlur = 16;
      c.font = `900 46px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', 480 + 150 * (this.party.length - 1) * 0.5, 300 - Math.abs(Math.sin(t * 6)) * 8); c.restore();
    }
    c.globalAlpha = 0.5 + Math.sin(t * 4) * 0.3; c.font = `600 13px ${SANS}`; c.fillStyle = '#ffb8d8'; c.textAlign = 'right'; c.textBaseline = 'middle';
    c.fillText('터치하여 건너뛰기 ▶', W - 24, H - 14); c.globalAlpha = 1;
  }
}

// World map (그림 9): painted map + live stage nodes/info panel over the painted ones
const MAP_PANEL = { x: 752, y: 78, w: 198, h: 362 };
const MAP_BTN = { x: 764, y: 463, w: 184, h: 48 };
class MapScene {
  constructor() { this.t = 0; this.sel = 4; }
  update(dt) {
    this.t += dt;
    if (Input.tapIn(8, 6, 70, 44) || Input.pressed('pause')) { Sfx.play('ui'); Flow.title(); return; }
    STAGES.forEach((s, i) => { if (Input.tapCircle(s.x, s.y, s.boss ? 42 : 34)) { this.sel = i; Sfx.play('ui'); } });
    if (Input.pressed('left')) { this.sel = Math.max(0, this.sel - 1); Sfx.play('ui'); }
    if (Input.pressed('right')) { this.sel = Math.min(STAGES.length - 1, this.sel + 1); Sfx.play('ui'); }
    const st = STAGES[this.sel];
    if (Input.tapIn(MAP_BTN.x, MAP_BTN.y, MAP_BTN.w, MAP_BTN.h) || Input.pressed('confirm')) {
      Sfx.play('ui');
      if (st.playable) Flow.party();
      else Flow.story(st);
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
        c.strokeStyle = `rgba(255,170,210,${0.6 + Math.sin(t * 5) * 0.3})`; c.lineWidth = 4;
        c.beginPath(); c.moveTo(s.x, s.y - r - 7); c.lineTo(s.x + r + 7, s.y); c.lineTo(s.x, s.y + r + 7); c.lineTo(s.x - r - 7, s.y); c.closePath(); c.stroke();
        c.restore();
      }
      c.font = `800 11px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      if (!s.playable) outlinedText(c, '📖 스토리 보기', s.x, s.y + r + 26, '#ffe6f2', 'rgba(0,0,0,0.85)', 3);
      else {
        outlinedText(c, '⚔ 해님달님 — 원한의 끝', s.x, s.y + r + 28, '#ffd0e0', 'rgba(0,0,0,0.85)', 3);
        if (cleared) { c.save(); c.translate(s.x + 30, s.y - 30); c.rotate(-0.3); c.strokeStyle = '#ff4a6a'; c.lineWidth = 2; c.strokeRect(-24, -10, 48, 20); c.font = `900 11px ${SANS}`; c.fillStyle = '#ff4a6a'; c.fillText('CLEAR', 0, 1); c.restore(); }
      }
    });
    // info panel drawn over the painted one
    const s = STAGES[this.sel], P = MAP_PANEL;
    neonPanel(c, P.x, P.y, P.w, P.h, { r: 6, fill: 'rgba(40,8,26,0.96)' });
    c.textAlign = 'left'; c.textBaseline = 'top';
    c.font = `800 11px ${SANS}`; c.fillStyle = '#ff8ab8'; c.fillText('STAGE ' + s.id + (s.playable ? ' · 보스전' : ' · 스토리'), P.x + 12, P.y + 10);
    c.font = `800 16px ${SERIF}`; c.fillStyle = '#fff';
    const tl = wrapText(c, s.name, P.w - 24); tl.forEach((l, i) => c.fillText(l, P.x + 12, P.y + 26 + i * 20));
    let yy = P.y + 30 + tl.length * 20;
    c.save(); roundRect(c, P.x + 10, yy, P.w - 20, 62, 4); c.clip();
    drawCrop(c, s.playable ? 'boss.illust' : (s.bg && s.bg.startsWith('img:') ? s.bg.slice(4) : s.bg === 'title' ? 'bg.title' : 'bg.battle'), P.x + 10, yy, P.w - 20, 62, 'cover', 0.5, 0.35);
    c.restore();
    yy += 68;
    const row = (label, val) => {
      c.font = `700 11px ${SANS}`; c.fillStyle = '#ff9ac0'; c.fillText(label, P.x + 12, yy); yy += 15;
      c.font = `500 11px ${SANS}`; c.fillStyle = '#f2e6ee';
      for (const l of wrapText(c, val, P.w - 24)) { c.fillText(l, P.x + 12, yy); yy += 15; }
      yy += 5;
    };
    row('핵심 스토리', s.story); row('적 정보', s.enemy); row('클리어 조건', s.clear); row('보상', s.reward);
    neonButton(c, MAP_BTN.x, MAP_BTN.y, MAP_BTN.w, MAP_BTN.h, s.playable ? '⚔ 전투 준비' : '📖 스토리 보기', { primary: true, size: 16 });
  }
}

// 출전 편성 (기획서 §4-2: 2인 편성 + 관계성 기반 시너지): 4명 중 아무 2명
class PartyScene {
  constructor() {
    const saved = Save.get('party', null);
    this.sel = Array.isArray(saved) && saved.length === 2 && saved.every(k => PLAYABLE.includes(k)) ? saved.slice() : ['hocheol', 'dongmin'];
    this.cursor = 0; this.t = 0;
  }
  toggle(k) {
    const i = this.sel.indexOf(k);
    if (i >= 0) this.sel.splice(i, 1);
    else { if (this.sel.length >= 2) this.sel.shift(); this.sel.push(k); }
    Sfx.play('ui');
  }
  cardRect(i) { return { x: 28 + i * 228, y: 66, w: 212, h: 330 }; }
  update(dt) {
    this.t += dt;
    if (Input.tapIn(8, 6, 120, 40) || Input.pressed('pause')) { Sfx.play('ui'); Flow.map(); return; }
    PLAYABLE.forEach((k, i) => { const r = this.cardRect(i); if (Input.tapIn(r.x, r.y, r.w, r.h)) { this.cursor = i; this.toggle(k); } });
    if (Input.pressed('left')) { this.cursor = (this.cursor + 3) % 4; Sfx.play('ui'); }
    if (Input.pressed('right')) { this.cursor = (this.cursor + 1) % 4; Sfx.play('ui'); }
    if (Input.pressed('attack') || Input.pressed('skill')) this.toggle(PLAYABLE[this.cursor]);
    const ok = this.sel.length === 2;
    if (ok && (Input.tapIn(W - 250, H - 70, 230, 52) || Input.pressed('confirm'))) { Save.set('party', this.sel); Sfx.play('ui'); Flow.stage15(this.sel.slice()); }
  }
  draw(c) {
    const t = this.t;
    drawSceneBG(c, 'battle', t);
    c.fillStyle = 'rgba(10,2,16,0.72)'; c.fillRect(0, 0, W, H);
    neonButton(c, 8, 6, 120, 40, '◀ 월드맵', { size: 14 });
    c.textAlign = 'left'; c.textBaseline = 'middle';
    c.font = `800 22px ${SERIF}`; outlinedText(c, '출전 편성 — 2인을 선택하세요', 148, 27, '#ffe0ee', '#000', 4);
    c.font = `600 12px ${SANS}`; outlinedText(c, '먼저 고른 캐릭터가 선봉으로 출전합니다 · 추천: 이동민(요기 0% — 간장·막야에 정상 타격)', 148, 50, '#d8c0d0', '#000', 3);
    PLAYABLE.forEach((k, i) => {
      const r = this.cardRect(i), d = CHAR_DATA[k], si = this.sel.indexOf(k), on = si >= 0, cur = i === this.cursor;
      c.save();
      neonPanel(c, r.x, r.y, r.w, r.h, { r: 8, fill: on ? 'rgba(70,14,40,0.95)' : 'rgba(24,10,30,0.92)', stroke: on ? '#ffd0e0' : cur ? '#ff8ab8' : '#6a4a6a', glow: on ? STYLES[k].aura : '#ff4a9a' });
      c.save(); roundRect(c, r.x + 4, r.y + 4, r.w - 8, r.h - 96, 6); c.clip();
      const g = c.createRadialGradient(r.x + r.w / 2, r.y + 150, 10, r.x + r.w / 2, r.y + 150, 160); g.addColorStop(0, STYLES[k].aura + '55'); g.addColorStop(1, '#00000000');
      c.fillStyle = g; c.fillRect(r.x, r.y, r.w, r.h);
      drawBust(c, k, r.x + r.w / 2, r.y + 10, 300, { alpha: on ? 1 : 0.75 });
      c.restore();
      c.textAlign = 'left'; c.textBaseline = 'middle';
      c.font = `800 17px ${SERIF}`; c.fillStyle = '#fff'; c.fillText(d.name, r.x + 12, r.y + r.h - 76);
      c.font = `600 10px ${SANS}`; c.fillStyle = '#e0b8cc'; c.fillText(d.title, r.x + 12, r.y + r.h - 58);
      c.font = `600 10px ${SANS}`; c.fillStyle = '#cfe8ff';
      c.fillText('스킬 ' + d.skill.name + ' · 궁극기 ' + d.ult.name.split(':')[0], r.x + 12, r.y + r.h - 40);
      c.fillStyle = k === 'hocheol' ? '#c9a6ff' : k === 'simcheong' ? '#9fd8ff' : '#9fffb0';
      c.fillText(k === 'hocheol' ? '연기 술법 절반 흡수 · 주먹은 정상 타격' : k === 'simcheong' ? '수류 술법 — 막야가 절반 흡수' : k === 'dongmin' ? '요기 0% — 정상 타격 (추천)' : '원거리 부채 바람 — 정상 타격', r.x + 12, r.y + r.h - 22);
      if (on) {
        c.fillStyle = '#c8203e'; circle(c, r.x + r.w - 22, r.y + 22, 16); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke();
        c.fillStyle = '#fff'; c.font = `900 15px ${SANS}`; c.textAlign = 'center'; c.fillText(si === 0 ? '선봉' : '2', r.x + r.w - 22, r.y + 23);
      }
      c.restore();
    });
    // synergy preview
    const by = 410;
    neonPanel(c, 28, by, 660, 116, { r: 8, fill: 'rgba(24,8,28,0.92)' });
    c.textAlign = 'left'; c.textBaseline = 'middle';
    if (this.sel.length === 2) {
      const cfg = SYNERGY[pairKey(this.sel[0], this.sel[1])];
      this.sel.forEach((k, i) => { drawFaceCircle(c, k, 'normal', 70 + i * 52, by + 58, 24); c.strokeStyle = STYLES[k].aura; c.lineWidth = 2; circle(c, 70 + i * 52, by + 58, 24); c.stroke(); });
      c.font = `700 12px ${SANS}`; c.fillStyle = '#ff9ac0'; c.fillText(cfg.kind === 'assist' ? '2인 시너지 · 자동 어시스트' : '2인 시너지 합동기', 160, by + 26);
      c.font = `800 22px ${SERIF}`; outlinedText(c, cfg.name + '  ' + cfg.hanja, 160, by + 54, '#fff', cfg.color, 4);
      c.font = `500 12px ${SANS}`; c.fillStyle = '#f2e6ee';
      wrapText(c, cfg.desc, 510).forEach((l, i) => c.fillText(l, 160, by + 82 + i * 16));
    } else {
      c.font = `600 15px ${SANS}`; c.fillStyle = '#d8c0d0'; c.fillText('캐릭터 2명을 선택하면 두 사람의 합동기가 표시됩니다.', 50, by + 58);
    }
    neonButton(c, W - 250, H - 70, 230, 52, this.sel.length === 2 ? '⚔ 출전' : '2명을 선택하세요', { primary: this.sel.length === 2, disabled: this.sel.length !== 2, size: 19 });
    if (!Input.touch) { c.font = `500 11px ${SANS}`; c.textAlign = 'right'; c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillText('←→ 선택 · J 편성/해제 · Enter 출전', W - 24, H - 84); }
  }
}

class BattleScene {
  constructor(party) { this.battle = new Battle(party); }
  enter() { Input.setButtons(this.battle.vbtns); }
  exit() { Input.setButtons([]); }
  update(dt) { this.battle.update(dt); }
  draw(c) { this.battle.draw(c); }
}

class ResultScene {
  constructor(stats, party) {
    this.s = stats; this.t = 0; this.party = party || ['hocheol', 'dongmin'];
    const tm = stats.time, dmg = stats.dmgTaken;
    this.rank = tm < 150 && dmg < 500 ? 'S' : tm < 240 && dmg < 1100 ? 'A' : 'B';
  }
  update(dt) {
    this.t += dt;
    if (this.t < 0.6) return;
    if (Input.tapIn(W / 2 - 270, 462, 250, 50)) { Sfx.play('ui'); Flow.battle(this.party); }
    else if (Input.tapIn(W / 2 + 20, 462, 250, 50) || Input.pressed('confirm')) { Sfx.play('ui'); Flow.map(); }
  }
  draw(c) {
    const t = this.t;
    drawCrop(c, 'bg.title', 0, 0, W, H, 'cover', 0.5, 0.2);
    c.fillStyle = 'rgba(10,2,16,0.78)'; c.fillRect(0, 0, W, H);
    BG.foliage(c, t, true);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `800 52px ${SERIF}`; outlinedText(c, 'CHAPTER 1 CLEAR', W / 2, 70, '#ffe0ee', '#a0103a', 8);
    c.font = `700 16px ${SANS}`; c.fillStyle = '#f2e0ea'; c.fillText('STAGE 1-5 · 해님달님 — 원한의 끝  ·  ' + this.party.map(k => CHAR_DATA[k].name).join(' × '), W / 2, 116);
    neonPanel(c, 70, 150, 380, 290, { r: 10 });
    c.save(); roundRect(c, 78, 158, 160, 274, 6); c.clip();
    drawBust(c, this.party[0], 158, 166, 300); c.restore();
    const k = clamp((t - 0.3) / 0.4, 0, 1);
    c.font = `900 ${Math.round(96 + (1 - k) * 80)}px ${SERIF}`; c.globalAlpha = k;
    outlinedText(c, this.rank, 158, 380, this.rank === 'S' ? '#ffd34d' : this.rank === 'A' ? '#ff9ac0' : '#d8d4ee', '#000', 8);
    c.globalAlpha = 1;
    const m = Math.floor(this.s.time / 60), sec = Math.floor(this.s.time % 60);
    const rows = [['클리어 시간', `${m}분 ${String(sec).padStart(2, '0')}초`], ['받은 피해', Math.round(this.s.dmgTaken)], ['합동기 · 파마해체', ((this.s.syn || 0) + this.s.assists) + '회'], ['궁극기 사용', this.s.ults + '회'], ['교대', this.s.tags + '회']];
    c.textAlign = 'left';
    rows.forEach(([a, b], i) => { c.font = `600 13px ${SANS}`; c.fillStyle = '#d8b8c8'; c.fillText(a, 256, 182 + i * 50); c.font = `800 18px ${SANS}`; c.fillStyle = '#fff'; c.fillText(String(b), 256, 204 + i * 50); });
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
  constructor(key, party) { this.key = key || 'hocheol'; this.party = party; this.t = 0; }
  update(dt) {
    this.t += dt;
    if (this.t < 0.5) return;
    if (Input.tapIn(W / 2 - 270, 430, 250, 54) || Input.pressed('confirm')) { Sfx.play('ui'); Flow.battle(this.party); }
    else if (Input.tapIn(W / 2 + 20, 430, 250, 54)) { Sfx.play('ui'); Flow.party(); }
  }
  draw(c) {
    c.fillStyle = '#030204'; c.fillRect(0, 0, W, H);
    drawBust(c, this.key, W / 2, 10, 540, { alpha: 0.28 });
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `900 96px ${SERIF}`; outlinedText(c, 'LOSE', W / 2, 150, '#d02040', '#000', 8);
    if (this.key === 'hocheol') { c.font = `700 22px ${SERIF}`; outlinedText(c, '"크윽... 어째서 연기에 불이... 내 공격이 통하지 않는다고?"', W / 2, 250, '#ffd9e0', '#000', 4); }
    c.font = `500 15px ${SANS}`; c.fillStyle = '#e0c8d4';
    c.fillText('TIP · 간장·막야는 요기 술법을 절반 삼킨다. 주먹·칼·부채 바람은 정상 타격.', W / 2, 320);
    c.fillText('2페이즈에서는 달님의 폭주 뒤 빈틈(주화입마)을, 쌍검 광선은 지붕 위나 회피로 피하자. 합동기도 잊지 말 것!', W / 2, 346);
    neonButton(c, W / 2 - 270, 430, 250, 54, '재도전', { primary: true, size: 20 });
    neonButton(c, W / 2 + 20, 430, 250, 54, '편성 바꾸기', { size: 18 });
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

const STORIES = { STORY_11, STORY_12, STORY_13, STORY_14 };
const Flow = {
  curParty: null,
  title() { Game.go(new TitleScene()); },
  prologue(next) { Game.go(new CutsceneScene(PROLOGUE, () => { Save.set('seenPrologue', 1); next ? next() : Flow.title(); })); },
  start() { if (!Save.get('seenPrologue', 0)) Flow.prologue(() => Flow.map()); else Flow.map(); },
  map() { Game.go(new MapScene()); },
  story(st) { Game.go(new DialogueScene(STORIES[st.script], () => Flow.map(), st.bg)); },
  party() { Game.go(new PartyScene()); },
  stage15(party) {
    this.curParty = party;
    const pre = PRE_BATTLE.concat([{ narr: true, text: `출전 — ${party.map(k => CHAR_DATA[k].name).join(' × ')}  ·  합동기 「${SYNERGY[pairKey(party[0], party[1])].name}」` }]);
    Game.go(new ChaseScene(() =>
      Game.go(new CutsceneScene(BOSS_INTRO, () =>
        Game.go(new DialogueScene(pre, () => Flow.battle(party), 'battle')))), party));
  },
  battle(party) { this.curParty = party || this.curParty || Save.get('party', null); Game.go(new BattleScene(this.curParty)); },
  win(stats) { Save.set('clear15', 1); const party = this.curParty; Game.go(new DialogueScene(POST_BATTLE, () => Game.go(new ResultScene(stats, party)), 'battle')); },
  lose(key) { Game.go(new LoseScene(key, this.curParty)); },
};

// ---------- main loop ----------
(function boot() {
  Assets.load();
  const q = new URLSearchParams(location.search).get('scene');
  const qp = new URLSearchParams(location.search).get('party');
  const party = qp ? qp.split(',').filter(k => PLAYABLE.includes(k)).slice(0, 2) : null;
  const first = q === 'battle' ? new BattleScene(party && party.length === 2 ? party : null) : q === 'map' ? new MapScene() : q === 'party' ? new PartyScene() : new TitleScene();
  Game.setNow(first);
  window.__game = Game; // debug handle
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    Input.poll();
    if (Input.pressed('mute') && !(Game.scene instanceof TitleScene)) Sfx.toggle();
    Game.update(dt);
    ctx.setTransform(VIEW.ratio, 0, 0, VIEW.ratio, 0, 0);
    ctx.imageSmoothingQuality = 'high';
    Game.draw(ctx);
    Input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
