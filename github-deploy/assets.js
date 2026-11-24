'use strict';
// ============================================================
// assets.js — images extracted from 조선야차_게임기획서_최종.docx
// (originals: assets/doc/, web copies: assets/img/).
// ATLAS maps a name to [file, sx, sy, sw, sh] in assets/img pixel coords.
// ============================================================
const IMG_FILES = {
  title: 'fig1_title.jpg',
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
  map: 'fig9_world_map.jpg',
  hud: 'fig10-1_battle_hud.jpg',
  growth: 'fig10-2_growth_ui.jpg',
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
  // --- busts for dialogue (front standing figure, head → waist) ---
  'bust.dongmin': ['dongmin', 150, 15, 200, 290],
  'bust.hocheol': ['hocheol', 150, 30, 220, 300],
  'bust.seondal': ['seondal', 165, 0, 175, 285],
  'bust.simcheong': ['growth', 355, 68, 500, 462],
  'bust.haenim': ['boss', 78, 30, 178, 300],
  'bust.dalnim': ['boss', 222, 50, 150, 290],
  'bust.bat': ['dialog', 600, 30, 320, 400],
  // --- skill / cut-in art ---
  'skill.dongmin.ult': ['dongminSk', 684, 98, 334, 232],
  'skill.dongmin.active': ['dongminSk', 8, 98, 334, 232],
  'skill.hocheol.ult': ['hocheolSk', 666, 148, 354, 218],
  'skill.hocheol.active': ['hocheolSk', 10, 148, 320, 218],
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
  // --- backgrounds ---
  'bg.title': ['title', 0, 0, 1600, 900],
  'bg.map': ['map', 0, 0, 1600, 899],
  'bg.battle': ['hud', 636, 83, 863, 462],
  'bg.dialog': ['dialog', 0, 0, 1024, 576],
};


// Character pose sprites cut out of the doc sheets by tools/cutout_sprites.py (macOS Vision).
// s = draw scale (sprite px → game px, normalises frames taken from different sheets),
// f = which way the painted pose faces (1 right, 0 front), ax = horizontal anchor (0..1) at the feet.
const SPRITES = {
  dongmin_idle: { s: 0.5, f: 1, ax: 0.5 },
  dongmin_slash1: { s: 0.52, f: 1, ax: 0.42 },
  dongmin_slash2: { s: 0.52, f: 1, ax: 0.45 },
  dongmin_dash: { s: 0.52, f: 1, ax: 0.45 },
  dongmin_grab: { s: 0.35, f: 1, ax: 0.5 },
  dongmin_lunge: { s: 0.33, f: 1, ax: 0.45 },
  dongmin_ult: { s: 0.29, f: 0, ax: 0.5 },
  hocheol_idle: { s: 0.63, f: 1, ax: 0.5 },
  hocheol_pipe: { s: 0.63, f: 1, ax: 0.5 },
  hocheol_stance: { s: 0.63, f: 1, ax: 0.5 },
  hocheol_punch: { s: 0.63, f: 1, ax: 0.5 },
  hocheol_dash: { s: 0.63, f: 1, ax: 0.5 },
  hocheol_cast: { s: 0.58, f: 1, ax: 0.42 },
  hocheol_aura: { s: 0.53, f: 0, ax: 0.5 },
  hocheol_ult: { s: 0.62, f: 1, ax: 0.42 },
  haenim_idle: { s: 0.34, f: 0, ax: 0.5 },
  haenim_slash: { s: 0.34, f: 1, ax: 0.36 },
  dalnim_idle: { s: 0.35, f: 0, ax: 0.5 },
  dalnim_slash: { s: 0.37, f: 1, ax: 0.4 },
};

const Assets = {
  imgs: {}, sprites: {}, white: {}, loaded: 0, total: Object.keys(IMG_FILES).length + Object.keys(SPRITES).length, failed: [],
  load(onDone) {
    for (const [k, f] of Object.entries(IMG_FILES)) {
      const im = new Image();
      im.onload = () => { this.loaded++; if (this.loaded + this.failed.length === this.total) onDone && onDone(); };
      im.onerror = () => { this.failed.push(f); if (this.loaded + this.failed.length === this.total) onDone && onDone(); };
      im.src = f;
      this.imgs[k] = im;
    }
    for (const k of Object.keys(SPRITES)) {
      const im = new Image();
      im.onload = () => { this.loaded++; if (this.loaded + this.failed.length === this.total) onDone && onDone(); };
      im.onerror = () => { this.failed.push(k); if (this.loaded + this.failed.length === this.total) onDone && onDone(); };
      im.src = k + '.png';
      this.sprites[k] = im;
    }
  },
  spriteReady(name) { const im = this.sprites[name]; return !!(im && im.complete && im.naturalWidth); },
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

// Bust with feathered edges (no hard rectangle) — used by dialogue & cut-ins
const _feather = { canvas: null };
function drawBust(c, key, cx, top, h, opts = {}) {
  const name = 'bust.' + key, a = ATLAS[name];
  if (!a || !Assets.ready(name)) return;
  const w = h * a[3] / a[4];
  if (!_feather.canvas) _feather.canvas = document.createElement('canvas');
  const fc = _feather.canvas, fw = Math.ceil(w), fh = Math.ceil(h);
  if (fc.width !== fw || fc.height !== fh) { fc.width = fw; fc.height = fh; }
  const f = fc.getContext('2d');
  f.globalCompositeOperation = 'source-over';
  f.clearRect(0, 0, fw, fh);
  drawCrop(f, name, 0, 0, fw, fh, 'stretch');
  if (opts.flip) { /* handled by caller transform */ }
  f.globalCompositeOperation = 'destination-in';
  const gx = f.createLinearGradient(0, 0, fw, 0);
  gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(0.16, 'rgba(0,0,0,1)'); gx.addColorStop(0.84, 'rgba(0,0,0,1)'); gx.addColorStop(1, 'rgba(0,0,0,0)');
  f.fillStyle = gx; f.fillRect(0, 0, fw, fh);
  const gy = f.createLinearGradient(0, 0, 0, fh);
  gy.addColorStop(0, 'rgba(0,0,0,0.4)'); gy.addColorStop(0.08, 'rgba(0,0,0,1)'); gy.addColorStop(0.8, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,0)');
  f.fillStyle = gy; f.fillRect(0, 0, fw, fh);
  c.save();
  if (opts.alpha != null) c.globalAlpha *= opts.alpha;
  if (opts.flip) { c.translate(cx, 0); c.scale(-1, 1); c.drawImage(fc, -w / 2, top); }
  else c.drawImage(fc, cx - w / 2, top);
  c.restore();
}
