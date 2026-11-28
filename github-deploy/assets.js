'use strict';
// ============================================================
// assets.js — images extracted from 조선야차_게임기획서 (1122 / 최종 — same art)
// (originals: assets/doc/, web copies: assets/img/, cut-outs: assets/sprites + assets/busts).
// ATLAS maps a name to [file, sx, sy, sw, sh] in assets/img pixel coords.
// ============================================================
const IMG_FILES = {
  title: 'fig1_title.jpg',            // 1920 wide
  seondal: 'fig2-1_seondal_sheet.jpg',
  seondalSk: 'fig2-2_seondal_skills.jpg',
  dongmin: 'fig3-1_dongmin_sheet.jpg',
  dongminSk: 'fig3-2_dongmin_skills.jpg',
  hocheol: 'fig4-1_hocheol_sheet.jpg',
  hocheolSk: 'fig4-2_hocheol_skills.jpg',
  simcheong: 'fig5-1_simcheong_sheet.jpg',
  simcheongSk: 'fig5-2_simcheong_skills.jpg',
  boss: 'fig6-1_boss_sheet.jpg',
  bossSk: 'fig6-2_boss_skills.jpg',
  opening: 'fig7_opening_cartoon.jpg',
  dialog: 'fig8_dialogue_ui.jpg',
  map: 'fig9_world_map.jpg',          // 1920 wide
  hud: 'fig10-1_battle_hud.jpg',      // 1920 wide
};

const ATLAS = {
  // --- expression faces (character sheet "표정 모음") ---
  'face.dongmin.normal': ['dongmin', 672, 42, 116, 118],
  'face.dongmin.angry': ['dongmin', 792, 42, 112, 118],
  'face.dongmin.shout': ['dongmin', 906, 42, 114, 118],
  'face.dongmin.smirk': ['dongmin', 700, 166, 140, 134],
  'face.dongmin.shock': ['dongmin', 876, 166, 144, 134],
  'face.hocheol.normal': ['hocheol', 675, 55, 112, 170],
  'face.hocheol.shout': ['hocheol', 790, 55, 112, 170],
  'face.hocheol.smirk': ['hocheol', 903, 55, 114, 170],
  'face.seondal.smirk': ['seondal', 686, 48, 108, 190],
  'face.seondal.normal': ['seondal', 797, 48, 108, 190],
  'face.seondal.smile': ['seondal', 906, 48, 108, 190],
  'face.simcheong.normal': ['simcheong', 643, 38, 104, 116],
  'face.simcheong.smirk': ['simcheong', 748, 38, 98, 116],
  'face.simcheong.smile': ['simcheong', 848, 38, 94, 116],
  'face.simcheong.shout': ['simcheong', 655, 155, 190, 98],
  'face.haenim.normal': ['boss', 781, 134, 64, 76],
  'face.haenim.angry': ['boss', 853, 134, 72, 76],
  'face.haenim.shock': ['boss', 935, 134, 64, 76],
  'face.dalnim.normal': ['boss', 781, 222, 64, 78],
  'face.dalnim.shout': ['boss', 853, 222, 72, 78],
  'face.dalnim.smirk': ['boss', 935, 222, 64, 78],
  // --- skill art (그림 2-2 / 3-2 / 4-2 / 5-2 / 6-2) ---
  'skill.dongmin.active': ['dongminSk', 8, 98, 334, 232],
  'skill.dongmin.passive': ['dongminSk', 348, 98, 332, 232],
  'skill.dongmin.ult': ['dongminSk', 684, 98, 334, 232],
  'skill.hocheol.active': ['hocheolSk', 10, 148, 320, 218],
  'skill.hocheol.passive': ['hocheolSk', 338, 148, 320, 218],
  'skill.hocheol.ult': ['hocheolSk', 666, 148, 354, 218],
  'skill.seondal.active': ['seondalSk', 8, 122, 332, 208],
  'skill.seondal.passive': ['seondalSk', 346, 122, 330, 208],
  'skill.seondal.ult': ['seondalSk', 684, 122, 334, 208],
  'skill.simcheong.active': ['simcheongSk', 8, 138, 332, 212],
  'skill.simcheong.passive': ['simcheongSk', 350, 138, 330, 212],
  'skill.simcheong.ult': ['simcheongSk', 684, 138, 334, 212],
  'skill.haenim': ['bossSk', 8, 140, 330, 230],
  'skill.dalnim': ['bossSk', 348, 140, 330, 230],
  'skill.twin': ['bossSk', 680, 140, 336, 230],
  'boss.illust': ['boss', 697, 340, 320, 225],
  'boss.full': ['boss', 30, 20, 400, 540],
  // --- opening cartoon (그림 7) shots ---
  'open.tiger': ['opening', 0, 0, 330, 150],
  'open.seondal': ['opening', 0, 150, 330, 130],
  'open.dongmin': ['opening', 0, 270, 330, 140],
  'open.simcheong': ['opening', 300, 90, 420, 360],
  'open.city': ['opening', 300, 0, 724, 330],
  'open.bottom': ['opening', 0, 400, 1024, 176],
  'open.full': ['opening', 0, 0, 1024, 576],
  'open.chapter1': ['map', 40, 290, 1450, 420],   // 월드맵(1920) 스테이지 경로 — 챕터 1 예고
  'open.moon': ['title', 430, 0, 1060, 330],      // 타이틀 그림의 달·남산타워
  'open.hanyang': ['title', 560, 0, 760, 296], // 타이틀 그림 윗부분(달·남산타워·도시) — 로고·버튼 제외
  // --- backgrounds (1920-wide screens) ---
  'bg.title': ['title', 0, 0, 1920, 1080],
  'bg.map': ['map', 0, 0, 1920, 1079],
  'bg.battle': ['hud', 763, 100, 1036, 554],
  'bg.dialog': ['dialog', 0, 0, 1024, 576],
};

// Character pose sprites cut out of the doc art by tools/cutout_sprites.py (macOS Vision).
// s = draw scale (sprite px → game px; normalises frames taken from paintings of different sizes),
// f = which way the painted pose faces (1 right, 0 front). The anchor is the body's centre of
// mass from js/sprite_meta.js, so switching frames doesn't make the character jump sideways.
const SPRITES = {
  dongmin_side: { s: 0.45, f: 1 },
  dongmin_idle: { s: 0.52, f: 1 },
  dongmin_slash1: { s: 0.54, f: 1 },
  dongmin_slash2: { s: 0.54, f: 1 },
  dongmin_dash: { s: 0.54, f: 1 },
  dongmin_grab: { s: 0.36, f: 1 },
  dongmin_lunge: { s: 0.34, f: 1 },
  dongmin_ult: { s: 0.3, f: 0 },
  hocheol_side: { s: 0.45, f: 1 },
  hocheol_idle: { s: 0.66, f: 1 },
  hocheol_pipe: { s: 0.66, f: 1 },
  hocheol_stance: { s: 0.66, f: 1 },
  hocheol_punch: { s: 0.66, f: 1 },
  hocheol_dash: { s: 0.66, f: 1 },
  hocheol_cast: { s: 0.6, f: 1 },
  hocheol_aura: { s: 0.55, f: 0 },
  hocheol_ult: { s: 0.64, f: 1 },
  seondal_side: { s: 0.43, f: 1 },
  seondal_idle: { s: 0.37, f: 0 },
  seondal_push: { s: 0.34, f: 1 },
  seondal_throw: { s: 0.4, f: 1 },
  simcheong_side: { s: 0.4, f: 1 },
  simcheong_idle: { s: 0.58, f: 1 },
  simcheong_raise: { s: 0.58, f: 1 },
  simcheong_thrust: { s: 0.58, f: 1 },
  simcheong_lunge: { s: 0.58, f: 1 },
  simcheong_slash: { s: 0.58, f: 1 },
  simcheong_water: { s: 0.4, f: 1 },
  haenim_idle: { s: 0.34, f: 0 },
  haenim_slash: { s: 0.34, f: 1 },
  dalnim_idle: { s: 0.35, f: 0 },
  dalnim_slash: { s: 0.37, f: 1 },
};

// 「조선야차_캐릭터_애셋_모음_완성본」 인게임 동작 5종 — <key>_p1 … _p5, all painted facing right and stored
// so the p1 standing pose is 360px tall. s = standing height in game px / 360.
// p1 대기 · p2 걷기(최호철: 파이프 대기, 심청이: 술법) · p3 달리기(최호철: 전투 자세, 심청이: 겨누기) · p4 전투 준비 · p5 공격
const DOC_POSES = { simcheong: 0.344, seondal: 0.358, hocheol: 0.403, dongmin: 0.375, haenim: 0.347, dalnim: 0.328 };
DOC_POSES.simdragon = 0.367; // 심청이 용 변신 (동작 5종: 대기 · 걷기 · 도약 · 흑련 · 용 참격)
for (const [k, s] of Object.entries(DOC_POSES)) for (let i = 1; i <= 5; i++) SPRITES[`${k}_p${i}`] = { s, f: 1 };

// Full standing figures (assets/busts, Vision cut-outs) for dialogue and cut-ins.
// rel = on-screen height relative to a 180cm character; 'shadow' is the unnamed silhouette of 그림 8,
// tinted per speaker for characters the doc has no art for (신령님, 박쥐 수인, 땅굴대장 …).
// Walk / run cycles (frame sequences). name → { n: frame count, fps, s: draw scale, f: 1 = painted facing right }.
// Files: <name>_0.png … <name>_<n-1>.png (transparent, same canvas size, feet on the bottom edge).
// '<key>_walk' is used while moving in battle, '<key>_run' (or _walk) in the chase scene.
// Walk cycles: 캐릭터 워크플로우 sheets (Contact → Down → Passing → Up → Contact, frames 1–9; frame 10 repeats 1).
// Frames are trimmed per pose; the airborne Up frames keep their lift as empty rows under the feet.
const ANIMS = {
  simcheong_walk: { n: 9, fps: 12, s: 0.425 },
  seondal_walk: { n: 9, fps: 12, s: 0.442 },
  hocheol_walk: { n: 9, fps: 11, s: 0.953 },
  dongmin_walk: { n: 9, fps: 13, s: 0.571 },
  haenim_walk: { n: 9, fps: 11, s: 0.429 },
  dalnim_walk: { n: 9, fps: 12, s: 0.405 },
  simdragon_walk: { n: 9, fps: 11, s: 0.457 }, // 심청이 용 변신 워크플로우
};
for (const [k, a] of Object.entries(ANIMS)) for (let i = 0; i < a.n; i++) SPRITES[`${k}_${i}`] = { s: a.s, f: a.f != null ? a.f : 1 };
function animFrame(name, t) { const a = ANIMS[name]; return a ? `${name}_${Math.floor(t * a.fps) % a.n}` : null; }

const BUSTS = { dongmin: 1.0, hocheol: 1.04, seondal: 1.0, simcheong: 0.95, haenim: 1.0, dalnim: 0.95, shadow: 0.9 };

// Skill VFX cut out of 「캐릭터 스킬 VFX 에셋 시트」 (5 sheets × 5 effects, checkerboard keyed to alpha).
// File = 'vfx_<name>.webp'. Comments name the doc entry each one illustrates.
const VFX = [
  'seondal_aura',      // 풍류의 잔상 — 기운 축적 오라 (Gathering Aura)
  'seondal_blade',     // 만리추풍 — 풍압 화살 투사체 (Wind Blade Projectile)
  'seondal_crescent',  // 만리추풍 — 초승달 풍압 참격 (Crescent Slash)
  'seondal_burst',     // 만리추풍 — 방사형 풍압 폭발 (Explosive Burst)
  'seondal_tornado',   // 천풍만리 — 거대 에너지 회오리 (Tornado Vortex)
  'dongmin_mark', 'dongmin_markS', // 해체 본능 — 급소 조준 표식 (Weakpoint Target Mark)
  'dongmin_grapple',   // 해체자의 악력 — 악력 제압 (Grapple)
  'dongmin_slam',      // 해체자의 악력 — 지면 내리꽂기 (Ground Slam)
  'dongmin_xslash',    // 광인의 해체식 — 쌍검 X자 돌진 참격
  'dongmin_frenzy',    // 광인의 해체식 — 광기 연속 난도질 파동
  'dongmin_cleave',    // 광인의 해체식 — 수직 내려베기 지면 파쇄
  'hocheol_eyes',      // 맹호의 위압 — 맹호 안광 및 위압 파동
  'hocheol_chains',    // 흑연호박 — 검은 연기 사슬 속박
  'hocheol_head',      // 흑연호박 — 흑호 형상 연기 투사체
  'hocheol_claw',      // 흑연호왕 — 흑연 맹호 발톱 할퀴기
  'hocheol_roar',      // 흑연호왕 — 거대 흑호 포효 광역 폭발
  'simcheong_regen',   // 인당수의 한 — 심해 수류 재생 오라
  'simcheong_stream',  // 심연수류 — 고압 직선 수류 참격
  'simcheong_whirl',   // 흑련개화 — 심해 소용돌이 견인
  'simcheong_lotus',   // 흑련개화 — 거대 흑련 만개 영역
  'simcheong_descent', // 야차강림 — 수면 내려찍기 파멸 폭발
  'boss_ganjang',      // 해님 — 간장 연속 참격
  'boss_makya',        // 달님 — 막야 구속 참격
  'boss_seal',         // 달님 — 봉마 구속 진
  'boss_converge',     // 합동 — 쌍검 에너지 수렴
  'boss_beam',         // 합동 — 쌍검 에너지 광선
];

const Assets = {
  imgs: {}, sprites: {}, busts: {}, vfx: {}, white: {}, tinted: {}, loaded: 0, failed: [],
  total: Object.keys(IMG_FILES).length + Object.keys(SPRITES).length + Object.keys(BUSTS).length + VFX.length,
  load(onDone) {
    const done = () => { if (this.loaded + this.failed.length === this.total) onDone && onDone(); };
    const add = (store, key, src) => {
      const im = new Image();
      im.onload = () => { this.loaded++; done(); };
      im.onerror = () => { this.failed.push(src); done(); };
      im.src = src; store[key] = im;
    };
    for (const [k, f] of Object.entries(IMG_FILES)) add(this.imgs, k, f + '?v=3');
    for (const k of Object.keys(SPRITES)) add(this.sprites, k, k + '.png?v=5');
    for (const k of Object.keys(BUSTS)) add(this.busts, k, k + '.png?v=5');
    for (const k of VFX) add(this.vfx, k, 'vfx_' + k + '.webp?v=4');
  },
  vfxReady(name) { const im = this.vfx[name]; return !!(im && im.complete && im.naturalWidth); },
  spriteReady(name) { const im = this.sprites[name]; return !!(im && im.complete && im.naturalWidth); },
  bustReady(key) { const im = this.busts[key]; return !!(im && im.complete && im.naturalWidth); },
  // white silhouette of a sprite (hit flash / dodge afterimages), built once on demand
  whiteSprite(name) {
    if (!this.white[name]) {
      const im = this.sprites[name], cv = document.createElement('canvas');
      cv.width = im.naturalWidth; cv.height = im.naturalHeight;
      const g = cv.getContext('2d');
      g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#ffffff'; g.fillRect(0, 0, cv.width, cv.height);
      this.white[name] = cv;
    }
    return this.white[name];
  },
  // colour-washed bust (silhouette speakers), cached per key+tint
  tintedBust(key, tint) {
    const id = key + tint;
    if (!this.tinted[id]) {
      const im = this.busts[key], cv = document.createElement('canvas');
      cv.width = im.naturalWidth; cv.height = im.naturalHeight;
      const g = cv.getContext('2d');
      g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = tint; g.fillRect(0, 0, cv.width, cv.height);
      this.tinted[id] = cv;
    }
    return this.tinted[id];
  },
  get progress() { return (this.loaded + this.failed.length) / this.total; },
  ready(name) { const a = ATLAS[name]; if (!a) return false; const im = this.imgs[a[0]]; return !!(im && im.complete && im.naturalWidth); },
};

// Draw an atlas crop into (dx,dy,dw,dh). mode: 'cover' (crop to fill), 'contain', or 'stretch'.
// fx/fy (0..1) choose which part survives when 'cover' trims (default center).
function drawCrop(c, name, dx, dy, dw, dh, mode = 'cover', fx = 0.5, fy = 0.5) {
  const a = ATLAS[name];
  if (!a || !Assets.ready(name)) return false;
  const im = Assets.imgs[a[0]];
  let [, sx, sy, sw, sh] = a;
  if (mode === 'cover') {
    const s = Math.max(dw / sw, dh / sh), nw = dw / s, nh = dh / s;
    sx += (sw - nw) * fx; sy += (sh - nh) * fy; sw = nw; sh = nh;
  } else if (mode === 'contain') {
    const s = Math.min(dw / sw, dh / sh), nw = sw * s, nh = sh * s;
    dx += (dw - nw) / 2; dy += (dh - nh) / 2; dw = nw; dh = nh;
  }
  c.drawImage(im, sx, sy, sw, sh, dx, dy, dw, dh);
  return true;
}

// Draw a VFX sprite centred on (x, y) at width w (height keeps the aspect unless o.h is given).
// o: alpha, rot (radians), flip (mirror horizontally, applied before rot), ax/ay (anchor 0..1, default
// centre), sy (extra vertical squash, e.g. to lay a swirl flat on the ground), add (additive glow).
// Returns false when the image isn't loaded so callers can fall back to the old vector drawing.
function drawVfx(c, name, x, y, w, o = {}) {
  if (!Assets.vfxReady(name)) return false;
  const im = Assets.vfx[name], h = o.h || w * im.naturalHeight / im.naturalWidth;
  c.save();
  if (o.alpha != null) c.globalAlpha *= clamp(o.alpha, 0, 1);
  if (o.add) c.globalCompositeOperation = 'lighter';
  c.translate(x, y);
  if (o.flip) c.scale(-1, 1);
  if (o.sy) c.scale(1, o.sy);
  if (o.rot) c.rotate(o.rot);
  c.drawImage(im, -w * (o.ax != null ? o.ax : 0.5), -h * (o.ay != null ? o.ay : 0.5), w, h);
  c.restore();
  return true;
}

// Face crop clipped to a circle (HUD / map / small portraits)
function drawFaceCircle(c, key, emo, x, y, r, opts = {}) {
  let name = `face.${key}.${emo}`;
  if (!ATLAS[name]) name = `face.${key}.normal`;
  c.save();
  circle(c, x, y, r); c.fillStyle = '#1a1022'; c.fill();
  circle(c, x, y, r); c.clip();
  if (!drawCrop(c, name, x - r, y - r, r * 2, r * 2, 'cover', 0.5, opts.fy != null ? opts.fy : 0.35)) {
    c.fillStyle = '#2a1a3a'; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  if (opts.dim) { c.fillStyle = 'rgba(10,0,20,0.55)'; c.fillRect(x - r, y - r, r * 2, r * 2); }
  c.restore();
}

// Skill art clipped to a circle (skill buttons / cards)
function drawSkillCircle(c, name, x, y, r, fx = 0.5, fy = 0.5) {
  c.save(); circle(c, x, y, r); c.clip();
  const ok = drawCrop(c, name, x - r * 1.6, y - r, r * 3.2, r * 2, 'cover', fx, fy);
  c.restore();
  return ok;
}

// Full-figure cut-out (no rectangle, nothing cropped). (cx, top) = top centre, h = height of a 180cm figure.
// opts: alpha, tint (css colour washed over a silhouette), flip, fade (fraction of the bottom to fade out).
function drawBust(c, key, cx, top, h, opts = {}) {
  if (!Assets.bustReady(key)) return 0;
  const im = opts.tint ? Assets.tintedBust(key, opts.tint) : Assets.busts[key];
  const iw = opts.tint ? im.width : im.naturalWidth, ih = opts.tint ? im.height : im.naturalHeight;
  const hh = h * (BUSTS[key] || 1), ww = hh * iw / ih;
  c.save();
  if (opts.alpha != null) c.globalAlpha *= opts.alpha;
  if (opts.glow) { c.shadowColor = opts.glow; c.shadowBlur = 24; }
  c.translate(cx, 0);
  if (opts.flip) c.scale(-1, 1);
  c.drawImage(im, -ww / 2, top + (h - hh), ww, hh);
  c.restore();
  return ww;
}
