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

// Full standing figures (assets/busts, Vision cut-outs) for dialogue and cut-ins.
// rel = on-screen height relative to a 180cm character; 'shadow' is the unnamed silhouette of 그림 8,
// tinted per speaker for characters the doc has no art for (신령님, 박쥐 수인, 땅굴대장 …).
const BUSTS = { dongmin: 1.0, hocheol: 1.04, seondal: 1.0, simcheong: 0.95, haenim: 1.0, dalnim: 0.95, shadow: 0.9 };

const Assets = {
  imgs: {}, sprites: {}, busts: {}, white: {}, tinted: {}, loaded: 0, failed: [],
  total: Object.keys(IMG_FILES).length + Object.keys(SPRITES).length + Object.keys(BUSTS).length,
  load(onDone) {
    const done = () => { if (this.loaded + this.failed.length === this.total) onDone && onDone(); };
    const add = (store, key, src) => {
      const im = new Image();
      im.onload = () => { this.loaded++; done(); };
      im.onerror = () => { this.failed.push(src); done(); };
      im.src = src; store[key] = im;
    };
    for (const [k, f] of Object.entries(IMG_FILES)) add(this.imgs, k, f + '?v=2');
    for (const k of Object.keys(SPRITES)) add(this.sprites, k, k + '.png?v=2');
    for (const k of Object.keys(BUSTS)) add(this.busts, k, k + '.png?v=2');
  },
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
