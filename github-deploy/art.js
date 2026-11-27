'use strict';
// ============================================================
// art.js — in-game rendering modelled on the design-doc art
// (assets/doc: character sheets 그림 2-1 ~ 6-2, HUD 그림 10-1).
//   drawFighter(): side-view anime-proportion body (origin = feet)
//   BG: battle backdrop (doc image) + procedural promenade/foreground
// Portraits, busts, cut-ins and full-screen art come from js/assets.js.
// ============================================================

// Palettes taken from each character sheet's colour swatches.
const STYLES = {
  // 이동민: 흰 셔츠(롤업), 남색 넥타이, 남색 바지, 벨트·허벅지 스트랩, 롱부츠, 핑거리스 장갑, 쌍검(붉은 술)
  dongmin: { scale: 1.0, skin: '#f2d2bc', hair: '#17121d', hair2: '#30263c', eye: '#d0303a', shirt: '#ece8f4', shirt2: '#bdb5d2', tie: '#26306a', pants: '#25213f', pants2: '#18152b', boot: '#110e14', belt: '#141016', buckle: '#c9a04a', glove: '#141016', sleeve: 'rolled', head: 'dongmin', weapon: 'twin', aura: '#ff4a5a', bootH: 15 },
  // 최호철: 호랑이 수인, 셔츠+서스펜더, 줄무늬 정장 바지, 어깨에 걸친 롱코트(붉은 안감), 꼬리, 장죽(담뱃대)
  hocheol: { scale: 1.06, skin: '#e8922e', fur: '#e8922e', fur2: '#fbf3ea', stripe: '#1a1214', eye: '#f0b020', shirt: '#e6e0ee', shirt2: '#bab2cc', tie: '#5a4630', pants: '#4e4456', pants2: '#3a3242', coat: '#5c5064', coat2: '#7a1c2c', boot: '#0e0b10', belt: '#1a1418', buckle: '#b0a090', strap: '#2a2228', sleeve: 'rolled', head: 'tiger', weapon: 'pipe', tail: true, coatLen: -36, cape: true, aura: '#b47cff', bootH: 0 },
  // 해님: 고양이 귀 후드 블랙코트(붉은 안감), 흰 머리, 노란 눈, 카고 바지, 부츠, 대검 간장(붉은 불꽃)
  haenim: { scale: 1.0, skin: '#d9c4c8', hair: '#e6e2f2', hair2: '#a8a0c8', eye: '#ffe066', shirt: '#e8e4ee', shirt2: '#bdb6cc', pants: '#1e1a22', pants2: '#141016', coat: '#1c1519', coat2: '#8a1a26', boot: '#141014', belt: '#0e0c10', buckle: '#9a9aa8', head: 'hood', weapon: 'ganjang', sleeve: 'coat', coatLen: -26, aura: '#ff5a2a', bootH: 14 },
  // 달님: 연분홍 긴 머리, 크롭 탑, 블랙 숏팬츠+타이츠, 블랙코트(붉은 안감), 부츠, 막야(보랏빛)
  dalnim: { scale: 0.95, skin: '#f2dcd8', hair: '#eec8ea', hair2: '#c696cc', eye: '#f0d040', shirt: '#f2eef6', shirt2: '#cfc6dc', pants: '#18141c', pants2: '#18141c', legs: '#2e2432', coat: '#1c1519', coat2: '#8a1a26', boot: '#141014', belt: '#0e0c10', buckle: '#9a9aa8', head: 'dalnim', weapon: 'makya', sleeve: 'coat', coatLen: -42, shorts: true, crop: true, aura: '#b47cff', bootH: 16 },
  // 김선달: 갓, 은발, 금테 안경, 남색 정장, 파란 넥타이, 접선
  seondal: { scale: 1.0, skin: '#f2d6c4', hair: '#cac7de', hair2: '#9a96b4', eye: '#4a3a6a', shirt: '#eeeaf6', shirt2: '#c8c2d8', tie: '#3846a8', pants: '#1e1f3a', pants2: '#16172c', coat: '#1e1f3a', coat2: '#2a2c50', boot: '#0c0c10', glove: '#101014', head: 'seondal', weapon: 'fan', sleeve: 'jacket', jacket: true, aura: '#7fb8ff', bootH: 0 },
  // 심청이: 챙 넓은 모자+붉은 리본, 검붉은 긴 머리(핑크 브릿지), 흰 셔츠, 검은 스커트, 롱부츠, 장검
  simcheong: { scale: 0.94, skin: '#f4dccc', hair: '#2a1622', hair2: '#d0306a', eye: '#c0306a', shirt: '#f0ecf4', shirt2: '#cfc6dc', tie: '#a02040', pants: '#1a1622', pants2: '#1a1622', legs: '#f4dccc', boot: '#141016', belt: '#141016', buckle: '#c9a04a', glove: '#141016', head: 'simcheong', weapon: 'sword', sleeve: 'short', skirt: true, aura: '#ff6aa8', bootH: 18 },
};

const _white = {};
function whiteOf(key) {
  if (!_white[key]) {
    const s = STYLES[key], o = {};
    for (const k in s) o[k] = typeof s[k] === 'string' && s[k][0] === '#' ? '#ffffff' : s[k];
    _white[key] = o;
  }
  return _white[key];
}

// ---------- limbs ----------
function drawLeg(c, st, hx, hy, fx, fy, back) {
  const L1 = 29, L2 = 28;
  const dx = fx - hx, dy = fy - hy, d = Math.min(Math.hypot(dx, dy), L1 + L2 - 0.5);
  const base = Math.atan2(dy, dx);
  const a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const ka = base - a;
  const kx = hx + Math.cos(ka) * L1, ky = hy + Math.sin(ka) * L1;
  const fa = Math.atan2(fy - ky, fx - kx);
  const ax = kx + Math.cos(fa) * L2, ay = ky + Math.sin(fa) * L2;
  const pants = back ? (st.pants2 || st.pants) : st.pants;
  const lower = st.legs || pants;
  c.lineCap = 'round';
  c.strokeStyle = st.shorts || st.skirt ? (st.legs || pants) : pants; c.lineWidth = 9.5;
  seg(c, hx, hy, kx, ky);
  c.strokeStyle = lower; c.lineWidth = 8;
  seg(c, kx, ky, ax, ay);
  if (st.stripeLegs) { /* reserved */ }
  if (st.bootH) { // tall boots
    const bx = ax + (kx - ax) * (st.bootH / L2), by = ay + (ky - ay) * (st.bootH / L2);
    c.strokeStyle = st.boot; c.lineWidth = 9; seg(c, ax, ay, bx, by);
    c.strokeStyle = st.buckle || '#555'; c.lineWidth = 1.5; seg(c, ax - 4, (ay + by) / 2, ax + 4, (ay + by) / 2 - 1);
  }
  // foot
  c.fillStyle = st.boot;
  c.beginPath(); c.moveTo(ax - 5, ay - 4); c.lineTo(ax + 4, ay - 4); c.quadraticCurveTo(ax + 12, ay - 2, ax + 12, ay + 3.5); c.lineTo(ax - 5, ay + 3.5); c.closePath(); c.fill();
  return [kx, ky];
}

function drawWeapon(c, st, hx, hy, a, which, pose) {
  const w = st.weapon, t = pose.t || 0;
  if (w !== 'twin' && which !== 'front') return;
  c.save(); c.translate(hx, hy); c.rotate(a - 0.2);
  c.lineCap = 'round';
  if (w === 'twin') { // 쌍검: 흰 칼날 + 보랏빛 문양, 금빛 코등이, 붉은 술
    c.strokeStyle = '#5a1420'; c.lineWidth = 4; seg(c, -9, 0, 2, 0);
    c.strokeStyle = '#c9a04a'; c.lineWidth = 3; seg(c, 3, -5, 3, 5);
    c.fillStyle = pose.flash ? '#fff' : '#eef0fa';
    c.beginPath(); c.moveTo(4, -2.4); c.lineTo(40, -1.2); c.lineTo(45, 0); c.lineTo(40, 1.6); c.lineTo(4, 2.4); c.closePath(); c.fill();
    c.strokeStyle = '#6a5ad8'; c.lineWidth = 1; seg(c, 6, 0, 36, 0);
    c.strokeStyle = '#d0202c'; c.lineWidth = 1.6; // tassel
    const sw = Math.sin(t * 6 + (which === 'back' ? 1 : 0)) * 3;
    c.beginPath(); c.moveTo(-9, 0); c.quadraticCurveTo(-12, 6, -12 + sw, 12); c.stroke();
    c.beginPath(); c.moveTo(-9, 0); c.quadraticCurveTo(-9, 6, -8 + sw, 13); c.stroke();
  } else if (w === 'pipe') { // 장죽: 검은 대, 금 장식, 붉은 술, 보랏빛 연기
    c.strokeStyle = '#141014'; c.lineWidth = 3.2; seg(c, -10, 0, 34, 0);
    c.strokeStyle = '#c9a04a'; c.lineWidth = 3.6; seg(c, -12, 0, -8, 0); seg(c, 14, 0, 17, 0);
    c.fillStyle = '#c9a04a'; c.beginPath(); c.moveTo(32, -1.5); c.lineTo(38, -7); c.lineTo(42, -7); c.lineTo(40, 1.5); c.closePath(); c.fill();
    c.strokeStyle = '#b01a2a'; c.lineWidth = 1.5; seg(c, 15, 1, 15 + Math.sin(t * 4) * 2, 10);
    c.fillStyle = 'rgba(170,120,230,0.45)';
    for (let i = 0; i < 3; i++) { const k = (t * 0.7 + i / 3) % 1; circle(c, 40 + k * 7, -9 - k * 28, 2.5 + k * 6); c.fill(); }
  } else if (w === 'ganjang') { // 간장: 톱날 대검 + 붉은 불꽃
    c.strokeStyle = 'rgba(255,80,40,0.35)'; c.lineWidth = 16; seg(c, 8, 0, 60, 0);
    c.strokeStyle = '#2a1c20'; c.lineWidth = 4; seg(c, -9, 0, 3, 0);
    c.fillStyle = '#7a1a22'; c.fillRect(2, -6, 4, 12);
    c.fillStyle = '#3a3036';
    c.beginPath(); c.moveTo(6, -5); for (let i = 0; i <= 8; i++) c.lineTo(10 + i * 6.5, -5 - (i % 2 ? 3 : 0)); c.lineTo(66, 0); c.lineTo(8, 4.5); c.closePath(); c.fill();
    c.strokeStyle = '#ff5a30'; c.lineWidth = 1.6; seg(c, 9, 3.5, 64, 0.5);
    c.strokeStyle = 'rgba(255,140,80,0.9)'; c.lineWidth = 1; seg(c, 16, -1, 24, 1); seg(c, 30, -2, 38, 1); seg(c, 44, -1, 52, 1);
  } else if (w === 'makya') { // 막야: 가는 도, 보랏빛 기운
    c.strokeStyle = 'rgba(180,124,255,0.45)'; c.lineWidth = 11; seg(c, 6, 0, 58, 0);
    c.strokeStyle = '#1a1420'; c.lineWidth = 3.5; seg(c, -10, 0, 3, 0);
    c.strokeStyle = '#c9a04a'; c.lineWidth = 2.6; seg(c, 3, -4, 3, 4);
    c.fillStyle = '#e4dcf6'; c.beginPath(); c.moveTo(4, -1.8); c.quadraticCurveTo(34, -3.5, 60, -1); c.lineTo(4, 1.8); c.closePath(); c.fill();
    c.strokeStyle = '#8a5ae0'; c.lineWidth = 0.9; seg(c, 8, 0, 54, -1);
  } else if (w === 'fan') {
    if (pose.fanOpen) {
      c.fillStyle = '#2a3060'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 26, -0.95, 0.95); c.closePath(); c.fill();
      c.strokeStyle = '#8aa0e8'; c.lineWidth = 1; for (let i = -3; i <= 3; i++) seg(c, 0, 0, Math.cos(i * 0.3) * 26, Math.sin(i * 0.3) * 26);
    } else { c.strokeStyle = '#2a3060'; c.lineWidth = 5; seg(c, 0, 0, 20, 0); }
    c.strokeStyle = '#3a40a0'; c.lineWidth = 1.5; seg(c, -2, 1, -3, 12);
  } else if (w === 'sword') {
    c.strokeStyle = '#a01a30'; c.lineWidth = 3.5; seg(c, -10, 0, 3, 0);
    c.strokeStyle = '#c9a04a'; c.lineWidth = 2.5; seg(c, 3, -4, 3, 4);
    c.strokeStyle = '#e8eef8'; c.lineWidth = 2.6; seg(c, 4, 0, 56, 0);
  }
  c.restore();
}

function drawArm(c, st, sx, sy, a, which, pose) {
  const L1 = 16, L2 = 15;
  const bend = a < 0.3 && a > -0.6 ? 0.08 : 0.5;
  const ex = sx + Math.cos(a) * L1, ey = sy + Math.sin(a) * L1;
  const a2 = a + bend;
  const hx = ex + Math.cos(a2) * L2, hy = ey + Math.sin(a2) * L2;
  const back = which === 'back';
  const sleeveCol = st.sleeve === 'jacket' ? (back ? st.coat : st.coat2) : st.sleeve === 'coat' ? st.coat : (back ? st.shirt2 : st.shirt);
  const foreCol = st.sleeve === 'rolled' || st.sleeve === 'short' ? (st.fur || st.skin) : sleeveCol;
  c.lineCap = 'round';
  c.strokeStyle = sleeveCol; c.lineWidth = 7.5; seg(c, sx, sy, ex, ey);
  if (st.sleeve === 'short') { c.strokeStyle = st.skin; c.lineWidth = 5.5; seg(c, sx + (ex - sx) * 0.55, sy + (ey - sy) * 0.55, ex, ey); }
  c.strokeStyle = foreCol; c.lineWidth = 6; seg(c, ex, ey, hx, hy);
  if (st.sleeve === 'rolled') { c.strokeStyle = back ? st.shirt2 : st.shirt; c.lineWidth = 8; seg(c, ex - Math.cos(a) * 1.5, ey - Math.sin(a) * 1.5, ex + Math.cos(a2) * 2, ey + Math.sin(a2) * 2); }
  if (st.sleeve === 'coat') { c.strokeStyle = st.coat2; c.lineWidth = 7.5; seg(c, ex + Math.cos(a2) * 9, ey + Math.sin(a2) * 9, ex + Math.cos(a2) * 11, ey + Math.sin(a2) * 11); }
  if (st.fur && !pose.flash) { c.strokeStyle = st.stripe; c.lineWidth = 1.2; const mx = (ex + hx) / 2, my = (ey + hy) / 2; seg(c, mx - 2, my - 2, mx + 1, my + 2); }
  drawWeapon(c, st, hx, hy, a2, which, pose);
  c.fillStyle = st.glove || st.fur || st.skin; circle(c, hx, hy, 3.8); c.fill();
}

// ---------- heads (local origin = head centre, facing right) ----------
function drawHairBack(c, st, t, sway) {
  if (st.head === 'dalnim') {
    c.fillStyle = st.hair;
    c.beginPath(); c.moveTo(-2, -116); c.quadraticCurveTo(-22, -104, -18 + sway, -60);
    c.lineTo(-24 + sway, -52); c.lineTo(-12 + sway, -58); c.lineTo(-14 + sway, -48); c.lineTo(-4 + sway * 0.6, -62);
    c.quadraticCurveTo(-2, -90, 6, -100); c.closePath(); c.fill();
    c.strokeStyle = st.hair2; c.lineWidth = 1.2; seg(c, -10, -100, -15 + sway, -64); seg(c, -5, -98, -9 + sway, -66);
  } else if (st.head === 'simcheong') {
    c.fillStyle = st.hair;
    c.beginPath(); c.moveTo(-2, -116); c.quadraticCurveTo(-24, -100, -20 + sway, -54); c.lineTo(-8 + sway, -60); c.quadraticCurveTo(-4, -90, 6, -102); c.closePath(); c.fill();
    c.strokeStyle = st.hair2; c.lineWidth = 2; seg(c, -12, -102, -17 + sway, -62); seg(c, -6, -100, -10 + sway, -66);
    c.strokeStyle = '#c81a3a'; c.lineWidth = 2.4; // hat ribbons
    c.beginPath(); c.moveTo(-6, -122); c.quadraticCurveTo(-22, -116, -26 + sway * 1.5, -100); c.stroke();
  }
}

function drawHead(c, st, emo, t) {
  const h = st.head;
  const blink = (t % 3.7) < 0.11 && emo !== 'shock';
  if (h === 'tiger') {
    c.fillStyle = st.fur;
    // ears
    c.beginPath(); c.moveTo(-9, -6); c.quadraticCurveTo(-9, -17, -2, -12); c.fill();
    c.beginPath(); c.moveTo(-1, -9); c.quadraticCurveTo(2, -19, 7, -10); c.fill();
    c.fillStyle = st.fur2; circle(c, -5, -10, 2.2); c.fill(); circle(c, 3, -12, 2.2); c.fill();
    // skull + muzzle
    c.fillStyle = st.fur; c.beginPath(); c.ellipse(0, 0, 11, 10.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = st.fur2;
    c.beginPath(); c.ellipse(9, 4, 7, 5.5, 0.1, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(-6, 4); c.lineTo(-2, 12); c.lineTo(2, 8); c.lineTo(5, 13); c.lineTo(9, 8); c.lineTo(4, 2); c.closePath(); c.fill();
    c.fillStyle = '#d27a8a'; c.beginPath(); c.ellipse(14.5, 1.5, 2.2, 1.6, 0, 0, Math.PI * 2); c.fill();
    if (!st.flashOnly) {
      c.strokeStyle = st.stripe; c.lineWidth = 1.6;
      seg(c, -2, -9, 0, -4); seg(c, 3, -10, 3.5, -5); seg(c, -8, -2, -3, 0); seg(c, -9, 3, -4, 4); seg(c, 0, 7, 3, 4);
    }
    // eye
    c.fillStyle = blink ? st.stripe : st.eye;
    c.beginPath(); c.ellipse(6, -2.5, 2.6, blink ? 0.6 : (emo === 'angry' || emo === 'shout' ? 1.4 : 2), -0.2, 0, Math.PI * 2); c.fill();
    if (!blink) { c.fillStyle = '#140c08'; c.fillRect(5.6, -4, 1, 3); }
    if (emo === 'shout' || emo === 'shock') { // open jaw with fangs
      c.fillStyle = '#5a1418'; c.beginPath(); c.moveTo(6, 6); c.lineTo(15, 5); c.lineTo(13, 11); c.lineTo(6, 10); c.closePath(); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(12, 5); c.lineTo(13, 8); c.lineTo(14, 5); c.fill();
    } else { c.strokeStyle = st.stripe; c.lineWidth = 0.9; seg(c, 8, 7, 14, 6); }
    return;
  }
  if (h === 'hood') { // 해님
    c.fillStyle = st.coat; c.beginPath(); c.ellipse(-1, -1, 12, 12.5, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(-10, -6); c.lineTo(-9, -19); c.lineTo(-2, -11); c.fill();
    c.beginPath(); c.moveTo(-1, -11); c.lineTo(5, -20); c.lineTo(8, -8); c.fill();
    c.fillStyle = st.coat2; c.beginPath(); c.moveTo(-7, -14); c.lineTo(-7.5, -10); c.lineTo(-4, -11); c.fill();
    c.fillStyle = st.skin; c.beginPath(); c.ellipse(4.5, 2, 6.5, 8.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = st.hair;
    c.beginPath(); c.moveTo(-3, -9); c.lineTo(10, -6); c.lineTo(11, 0); c.lineTo(8.5, -2); c.lineTo(8, 3); c.lineTo(5, -1); c.lineTo(3, 4); c.lineTo(1, -1); c.lineTo(-2, 2); c.closePath(); c.fill();
    c.strokeStyle = st.coat2; c.lineWidth = 1.6; c.beginPath(); c.arc(3, 1, 10, -2.0, -0.7); c.stroke();
    c.fillStyle = st.eye; c.beginPath(); c.ellipse(7, 1.2, 2, blink ? 0.4 : 0.9, -0.15, 0, Math.PI * 2); c.fill();
    if (emo === 'shout' || emo === 'angry') { c.fillStyle = '#3a1418'; c.fillRect(6, 7, 4, 1.8); c.fillStyle = '#fff'; c.fillRect(6.5, 7, 1, 1); c.fillRect(8.5, 7, 1, 1); }
    else { c.strokeStyle = '#6a4a50'; c.lineWidth = 0.9; seg(c, 6, 7.5, 9.5, 7); }
    return;
  }
  // human heads — anime 3/4 profile facing right
  const hairCap = () => {
    c.fillStyle = st.hair;
    c.beginPath(); c.ellipse(-1.5, -2.5, 10.5, 10, 0, Math.PI * 0.55, Math.PI * 2.08); c.fill();
  };
  // cranium + face profile
  c.fillStyle = st.skin;
  c.beginPath(); c.ellipse(-0.5, -1, 9.5, 10, 0, 0, Math.PI * 2); c.fill();
  c.beginPath();
  c.moveTo(2, -9); c.quadraticCurveTo(8.5, -6, 8.4, -1.5); c.lineTo(10.2, 2.2); c.lineTo(8.3, 3.2);
  c.quadraticCurveTo(8.6, 5.6, 7.6, 6.4); c.quadraticCurveTo(6.6, 9.6, 3.2, 10.2); c.quadraticCurveTo(-2, 9.5, -5, 5); c.closePath(); c.fill();
  // ear
  c.beginPath(); c.ellipse(-3.2, 1.5, 1.7, 2.6, 0.1, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(120,60,60,0.35)'; c.lineWidth = 0.6; seg(c, -3.5, 0.5, -3, 2.5);
  hairCap();
  c.fillStyle = st.hair;
  if (h === 'dongmin') { // messy black hair, strands falling over the eyes
    c.beginPath(); c.moveTo(-10, 2); c.lineTo(-13, -4); c.lineTo(-11, -8); c.lineTo(-15, -10); c.lineTo(-9, -12); c.lineTo(-8, -16);
    c.lineTo(-3, -13); c.lineTo(0, -17); c.lineTo(3, -12.5); c.lineTo(8, -14); c.lineTo(8, -9); c.lineTo(11.5, -7);
    c.lineTo(9, -4.5); c.lineTo(10, -1); c.lineTo(7, -3); c.lineTo(6.5, 1.5); c.lineTo(4.5, -2.5); c.lineTo(2.5, 2); c.lineTo(1.5, -3); c.lineTo(-1, 3); c.lineTo(-2, -2); c.lineTo(-5, 4); c.closePath(); c.fill();
    c.strokeStyle = st.hair2; c.lineWidth = 0.7; seg(c, -6, -11, -2, -6); seg(c, 1, -12, 3, -6); seg(c, 5, -10, 6, -5);
  } else if (h === 'dalnim') { // wild lavender-pink hair
    c.beginPath(); c.moveTo(-10, 6); c.lineTo(-12, -4); c.lineTo(-9, -11); c.lineTo(-3, -14); c.lineTo(4, -13.5); c.lineTo(10, -9); c.lineTo(11.5, -4);
    c.lineTo(8.5, -5); c.lineTo(9.5, 0); c.lineTo(6.5, -3); c.lineTo(5, 1.5); c.lineTo(3, -3); c.lineTo(1, 2); c.lineTo(-1, -3); c.lineTo(-4, 8); c.closePath(); c.fill();
    c.strokeStyle = st.hair2; c.lineWidth = 0.8; seg(c, -6, -10, -2, -4); seg(c, 2, -12, 4, -5); seg(c, -9, -3, -7, 5);
    c.fillStyle = st.hair; c.beginPath(); c.moveTo(-10, -6); c.quadraticCurveTo(-19, -4, -17, 6); c.lineTo(-12, 0); c.closePath(); c.fill(); // side tail
  } else if (h === 'seondal') { // fluffy silver hair
    c.beginPath(); c.moveTo(-10, 3); c.lineTo(-12, -5); c.lineTo(-8, -11); c.lineTo(0, -12.5); c.lineTo(8, -10); c.lineTo(11, -5);
    c.lineTo(8.5, -4); c.lineTo(8.5, 0); c.lineTo(5.5, -3); c.lineTo(4, 1); c.lineTo(1.5, -3); c.lineTo(-1, 1); c.lineTo(-4, 4); c.closePath(); c.fill();
    c.strokeStyle = st.hair2; c.lineWidth = 0.7; seg(c, -5, -9, -1, -4); seg(c, 3, -10, 5, -4);
  } else if (h === 'simcheong') { // long dark hair with pink streaks
    c.beginPath(); c.moveTo(-10, 8); c.lineTo(-11, -5); c.lineTo(-5, -11); c.lineTo(5, -11); c.lineTo(10, -6); c.lineTo(9, -2);
    c.lineTo(6, -4); c.lineTo(5.5, 1); c.lineTo(3, -3); c.lineTo(1, 2); c.lineTo(-2, -2); c.lineTo(-4, 9); c.closePath(); c.fill();
    c.strokeStyle = st.hair2; c.lineWidth = 1.2; seg(c, -8, -4, -7, 7); seg(c, 2, -8, 3, -2);
  }
  // anime eye
  const ex = 5.2, ey = 0.2;
  if (blink) { c.strokeStyle = '#1a1010'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(ex - 2.6, ey); c.quadraticCurveTo(ex, ey + 1.2, ex + 2.4, ey - 0.2); c.stroke(); }
  else {
    const hh = emo === 'angry' ? 2.2 : emo === 'shock' ? 3.8 : 3.2;
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ex, ey, 2.5, hh * 0.85, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = st.eye; c.beginPath(); c.ellipse(ex + 0.5, ey + 0.3, 1.6, hh * 0.75, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#120a10'; c.beginPath(); c.ellipse(ex + 0.6, ey + 0.4, 0.8, hh * 0.45, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff'; circle(c, ex + 1.2, ey - hh * 0.35, 0.7); c.fill();
    c.strokeStyle = '#140c12'; c.lineWidth = 1.4; // upper lash
    c.beginPath(); c.moveTo(ex - 2.8, ey - hh * 0.55 + (emo === 'angry' ? -0.6 : 0)); c.quadraticCurveTo(ex, ey - hh * 0.95, ex + 2.9, ey - hh * 0.65 + (emo === 'angry' ? 1 : 0)); c.stroke();
  }
  // brow
  c.strokeStyle = st.hair2 || st.hair; c.lineWidth = 1;
  if (emo === 'angry' || emo === 'shout') seg(c, ex - 2.8, ey - 5.2, ex + 2.8, ey - 3.6); else seg(c, ex - 2.8, ey - 5, ex + 2.8, ey - 5.3);
  // mouth only when expressive
  if (emo === 'shout' || emo === 'shock') { c.fillStyle = '#5a1a1e'; c.beginPath(); c.ellipse(6.8, 6.6, 1.4, 1.3, 0, 0, Math.PI * 2); c.fill(); }
  else if (emo === 'smirk' || emo === 'smile') { c.strokeStyle = '#8a4040'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(5.6, 6.6); c.quadraticCurveTo(6.8, 7.2, 7.8, 6.2); c.stroke(); }
  if (h === 'seondal') { // gold glasses + 갓
    c.strokeStyle = '#d4a640'; c.lineWidth = 0.9; c.strokeRect(ex - 2.9, ey - 2.2, 5.8, 4.2); seg(c, ex - 2.9, ey - 0.5, -2, -0.5);
    c.fillStyle = '#0c0b12'; c.beginPath(); c.ellipse(1, -10, 17, 3, -0.05, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(-6, -10); c.lineTo(-5, -22); c.lineTo(6, -22); c.lineTo(7, -10); c.closePath(); c.fill();
    c.strokeStyle = '#3a40a0'; c.lineWidth = 0.8; seg(c, 6, -10, 9, 9);
  }
  if (h === 'simcheong') {
    c.fillStyle = '#0c0b12'; c.beginPath(); c.ellipse(1, -10, 18, 3.6, -0.08, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(0, -14, 8, 5.5, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#c81a3a'; c.fillRect(-8, -13.5, 16, 2.4); circle(c, -7, -12, 2.5); c.fill();
  }
}

// ---------- full body ----------
function drawFighter(c, key, x, y, facing, pose = {}) {
  if (pose.frame && Assets.spriteReady(pose.frame)) return drawSprite(c, pose.frame, x, y, facing, pose);
  const base = STYLES[key];
  const st = pose.flash ? whiteOf(key) : base;
  const s = base.scale * (pose.scale || 1);
  const t = pose.t || 0;
  c.save();
  c.translate(x, y);
  if (pose.alpha != null) c.globalAlpha *= clamp(pose.alpha, 0, 1);
  if (pose.rot) c.rotate(pose.rot * facing);
  c.scale(facing * s, s);
  c.lineCap = 'round'; c.lineJoin = 'round';

  if (pose.glow) {
    const g = c.createRadialGradient(0, -64, 4, 0, -64, 95);
    g.addColorStop(0, pose.glow + 'aa'); g.addColorStop(1, pose.glow + '00');
    c.fillStyle = g; c.fillRect(-95, -160, 190, 190);
  }

  const mv = pose.moving ? 1 : 0, ph = pose.walk || 0;
  const bob = pose.kneel ? 22 : mv ? -Math.abs(Math.sin(ph)) * 3 : Math.sin(t * 2.4) * 1.0;
  const hipY = -58 + bob;
  const sway = (mv ? Math.sin(ph) * 3 - 4 : Math.sin(t * 2) * 2) + (pose.air ? -6 : 0) - (pose.lean || 0) * 18;

  let fB, fF;
  if (pose.kneel) { fB = [-22, -4]; fF = [14, -4]; }
  else if (pose.air) { fB = [-12, -20]; fF = [10, -28]; }
  else if (pose.stance) { fB = [-19, -4]; fF = [18, -4]; }
  else {
    const sw = Math.sin(ph) * 17 * mv;
    fB = [-3 - sw, -4 - (mv ? Math.max(0, -Math.cos(ph)) * 6 : 0)];
    fF = [3 + sw, -4 - (mv ? Math.max(0, Math.cos(ph)) * 6 : 0)];
  }
  if (pose.kneel) fB = [-24, -3];

  const lean = pose.lean || 0;
  const upper = () => { c.translate(0, hipY); c.rotate(lean); c.translate(0, -hipY + bob); };

  // tail (최호철)
  if (st.tail) {
    const tw = Math.sin(t * 3) * 5 + sway;
    c.strokeStyle = st.fur; c.lineWidth = 6.5;
    c.beginPath(); c.moveTo(-6, hipY + 2); c.quadraticCurveTo(-26 + tw, hipY + 10, -24 + tw, hipY + 44); c.stroke();
    if (!pose.flash) { c.strokeStyle = st.stripe; c.lineWidth = 6.6; c.setLineDash([3, 5]); c.beginPath(); c.moveTo(-6, hipY + 2); c.quadraticCurveTo(-26 + tw, hipY + 10, -24 + tw, hipY + 44); c.stroke(); c.setLineDash([]); }
    c.fillStyle = st.stripe; circle(c, -24 + tw, hipY + 45, 3.4); c.fill();
  }
  // long hair behind body
  c.save(); upper(); drawHairBack(c, st, t, sway); c.restore();
  // coat back panel
  if (st.coatLen) {
    c.save(); upper();
    const hem = st.coatLen, hx = -16 + sway;
    c.fillStyle = st.coat2;
    c.beginPath(); c.moveTo(-10, -95); c.quadraticCurveTo(-18, -70, hx - 3, hem); c.lineTo(hx + 18, hem + 4); c.lineTo(6, -80); c.closePath(); c.fill();
    c.fillStyle = st.coat;
    c.beginPath(); c.moveTo(-10, -96); c.quadraticCurveTo(-15, -70, hx + 1, hem); c.lineTo(hx + 20, hem + 4); c.lineTo(8, -88); c.closePath(); c.fill();
    c.restore();
  }
  // back leg
  drawLeg(c, st, -3, hipY, fB[0], fB[1], true);
  // back arm
  c.save(); upper();
  drawArm(c, st, -4, -90, pose.armBack != null ? pose.armBack : 1.3 + Math.sin(ph) * 0.55 * mv, 'back', pose);
  c.restore();
  // hips / shorts / skirt
  c.fillStyle = st.pants;
  c.beginPath(); c.moveTo(-9, hipY - 6); c.lineTo(9, hipY - 6); c.lineTo(8, hipY + 6); c.lineTo(-8, hipY + 6); c.closePath(); c.fill();
  // front leg
  const knee = drawLeg(c, st, 3, hipY, fF[0], fF[1], false);
  if (st.shorts) { c.fillStyle = st.pants; c.beginPath(); c.moveTo(-10, hipY - 6); c.lineTo(11, hipY - 6); c.lineTo(13, hipY + 12); c.lineTo(-11, hipY + 12); c.closePath(); c.fill(); }
  if (st.skirt) { c.fillStyle = st.pants; c.beginPath(); c.moveTo(-9, hipY - 6); c.lineTo(10, hipY - 6); c.lineTo(17, hipY + 16); c.lineTo(-15, hipY + 16); c.closePath(); c.fill(); }
  if (key === 'dongmin' && !pose.flash) { c.strokeStyle = st.belt; c.lineWidth = 2.2; const mx = (3 + knee[0]) / 2, my = (hipY + knee[1]) / 2; seg(c, mx - 5, my - 1, mx + 5, my + 1); }

  // torso
  c.save(); upper();
  c.fillStyle = st.shirt;
  c.beginPath(); c.moveTo(-10, -96); c.quadraticCurveTo(-13, -80, -8, -62); c.lineTo(9, -62); c.quadraticCurveTo(13, -80, 11, -96); c.closePath(); c.fill();
  c.fillStyle = st.shirt2 || st.shirt;
  c.beginPath(); c.moveTo(-10, -96); c.quadraticCurveTo(-13, -80, -8, -62); c.lineTo(-3, -62); c.quadraticCurveTo(-6, -80, -4, -96); c.closePath(); c.fill();
  if (st.crop) { c.fillStyle = st.skin; c.fillRect(-8.5, -76, 17.5, 14); }
  if (st.jacket) {
    c.fillStyle = st.coat;
    c.beginPath(); c.moveTo(-11, -96); c.quadraticCurveTo(-14, -78, -10, -54); c.lineTo(1, -54); c.lineTo(2, -78); c.lineTo(5, -96); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(9, -96); c.lineTo(5, -80); c.lineTo(10, -54); c.lineTo(13, -60); c.quadraticCurveTo(13, -80, 11, -96); c.closePath(); c.fill();
  }
  if (st.tie) { c.fillStyle = st.tie; c.beginPath(); c.moveTo(3, -94); c.lineTo(5.5, -94); c.lineTo(6, -72); c.lineTo(4, -69); c.lineTo(2.5, -72); c.closePath(); c.fill(); }
  c.fillStyle = st.shirt; c.beginPath(); c.moveTo(-1, -97); c.lineTo(4, -92); c.lineTo(8, -97); c.closePath(); c.fill(); // collar
  if (st.strap) { c.strokeStyle = st.strap; c.lineWidth = 2; seg(c, -5, -96, -4, -63); seg(c, 7, -96, 7, -63); }
  if (st.belt && !st.crop) { c.fillStyle = st.belt; c.fillRect(-9, -65, 19, 4); c.fillStyle = st.buckle; c.fillRect(4, -65, 3.5, 4); }
  if (st.crop) { c.fillStyle = st.belt; c.fillRect(-9, -63, 19, 3); }
  // open coat front flap / cape over the shoulder
  if (st.coatLen) {
    c.fillStyle = st.coat;
    if (st.cape) { c.beginPath(); c.moveTo(-12, -97); c.lineTo(4, -97); c.lineTo(2, -84); c.lineTo(-13, -80); c.closePath(); c.fill(); }
    else {
      c.beginPath(); c.moveTo(-11, -97); c.quadraticCurveTo(-14, -80, -10, -60); c.lineTo(-4, -60); c.lineTo(-3, -96); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(9, -97); c.lineTo(12, -96); c.quadraticCurveTo(15, -70, 14, st.coatLen + 6); c.lineTo(9, st.coatLen + 8); c.lineTo(6, -82); c.closePath(); c.fill();
      c.strokeStyle = st.coat2; c.lineWidth = 1.3; seg(c, 9.5, -90, 9.5, st.coatLen + 8);
    }
  }
  // neck + head
  c.fillStyle = st.fur || st.skin; c.fillRect(-1, -101, 5, 7);
  c.save(); c.translate(2, -108); drawHead(c, st, pose.emo || 'normal', t); c.restore();
  if (st.head === 'hood') { c.fillStyle = st.coat; c.beginPath(); c.moveTo(-11, -100); c.lineTo(6, -97); c.lineTo(-4, -92); c.closePath(); c.fill(); }
  // front arm + weapon
  drawArm(c, st, 4, -90, pose.armFront != null ? pose.armFront : 1.05 - Math.sin(ph) * 0.55 * mv, 'front', pose);
  c.restore();

  if (pose.stun) for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.09; c.fillStyle = '#ffe066'; drawStar(c, Math.cos(a) * 18, -134 + Math.sin(a) * 5, 5); }
  c.restore();
}

// Doc-art sprite (origin = feet). Each pose is a single painting, so motion comes from
// a short crossfade between frames (pose.prevFrame / pose.blend), stride bob + squash while
// moving, attack squash (pose.squash) and a small forward push (pose.lunge).
function spriteSize(name, pose) {
  const sp = SPRITES[name], im = Assets.sprites[name], s = sp.s * ((pose && pose.scale) || 1);
  return [im.naturalWidth * s, im.naturalHeight * s];
}
function drawSpriteImage(c, name, facing, pose, sx, sy, alpha) {
  const sp = SPRITES[name], im = Assets.sprites[name];
  const meta = (typeof SPRITE_META !== 'undefined' && SPRITE_META[name]) || {};
  const [w, h] = spriteSize(name, pose);
  const ax = sp.ax != null ? sp.ax : meta.mid != null ? meta.mid : 0.5;
  const dir = sp.f === 0 ? (facing < 0 ? -1 : 1) : facing * sp.f;
  c.save();
  c.globalAlpha *= alpha;
  c.scale(dir * sx, sy);
  const src = pose.flash ? Assets.whiteSprite(name) : im;
  if (!pose.flash && pose.rim !== false) { // soft rim light so dark outfits read against the night scene
    const base = name.split('_')[0], aura = base === 'simdragon' ? '#b57cff' : (STYLES[base] || {}).aura || '#ffffff';
    c.shadowColor = aura + 'a0'; c.shadowBlur = 8;
  }
  c.drawImage(src, -w * ax, -h, w, h);
  c.restore();
  return h;
}
function drawSprite(c, name, x, y, facing, pose = {}) {
  const t = pose.t || 0, mv = pose.moving ? 1 : 0, ph = pose.walk || 0;
  const k = pose.prevFrame && pose.prevFrame !== name && pose.blend != null && Assets.spriteReady(pose.prevFrame) ? clamp(pose.blend, 0, 1) : 1;
  const h = spriteSize(name, pose)[1];
  c.save();
  c.translate(x, y);
  if (pose.alpha != null) c.globalAlpha *= clamp(pose.alpha, 0, 1);
  if (pose.rot) c.rotate(pose.rot * facing);
  if (pose.lean) c.rotate(pose.lean * 0.3 * facing);
  if (pose.kneel) c.scale(1, 0.8);
  if (pose.glow) {
    const g = c.createRadialGradient(0, -h * 0.5, 4, 0, -h * 0.5, h * 0.8);
    g.addColorStop(0, pose.glow + 'aa'); g.addColorStop(1, pose.glow + '00');
    c.fillStyle = g; c.fillRect(-h * 0.8, -h * 1.3, h * 1.6, h * 1.6);
  }
  const sq = pose.squash || 0;
  const bob = mv ? -Math.abs(Math.sin(ph)) * 3.5 : 0;
  const sx = 1 + sq + (mv ? Math.abs(Math.cos(ph)) * 0.025 : 0);
  const sy = (mv ? 1 - Math.abs(Math.cos(ph)) * 0.02 : 1 + Math.sin(t * 2.2) * 0.01) - sq * 0.6;
  c.translate((pose.lunge || 0) * facing, bob);
  if (k < 1) drawSpriteImage(c, pose.prevFrame, facing, pose, sx, sy, 1 - k);
  drawSpriteImage(c, name, facing, pose, sx, sy, k);
  if (pose.stun) for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.09; c.fillStyle = '#ffe066'; drawStar(c, Math.cos(a) * 18, -h - 12 + Math.sin(a) * 5, 5); }
  c.restore();
}

function drawStar(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fill();
}

// ---------- backgrounds (그림 10-1 style: purple night, N Seoul Tower, river promenade) ----------
const BG = (() => {
  const R = mulberry32(20261122);
  const leaves = Array.from({ length: 26 }, () => ({ x: R() * W, y: R() * H, s: 4 + R() * 5, v: 20 + R() * 30, p: R() * 6.28, col: R() < 0.6 ? '#d0283a' : '#ff6a8a' }));
  const mapleClusters = [[40, 10, 70], [120, -10, 80], [200, 20, 55], [290, -5, 60], [380, 15, 40]];

  // far layer: the doc's own skyline art (fallback: gradient)
  function backdrop(c, camX, t, opt = {}) {
    const pan = opt.pan != null ? opt.pan : 1;
    const ok = Assets.ready('bg.battle');
    if (ok) {
      const dw = 1040, dh = dw * 462 / 863;
      drawCrop(c, 'bg.battle', -camX * (dw - W) / (WORLD_W - W) * pan, opt.y != null ? opt.y : -40, dw, dh, 'stretch');
    } else {
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#120c2a'); g.addColorStop(1, '#3a1f4a');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    // haze over the river so the foreground reads
    const g2 = c.createLinearGradient(0, 300, 0, GROUND_Y);
    g2.addColorStop(0, 'rgba(30,16,50,0)'); g2.addColorStop(1, 'rgba(30,16,50,0.55)');
    c.fillStyle = g2; c.fillRect(0, 300, W, GROUND_Y - 300);
  }
  function roof(c, x, y, w, h, col) {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(x - w * 0.06, y - h * 0.15);
    c.quadraticCurveTo(x + w * 0.2, y + h * 0.1, x + w * 0.5, y + h * 0.1);
    c.quadraticCurveTo(x + w * 0.8, y + h * 0.1, x + w * 1.06, y - h * 0.15);
    c.lineTo(x + w * 0.84, y - h); c.lineTo(x + w * 0.16, y - h);
    c.closePath(); c.fill();
  }
  function lamp(c, lx, t) {
    const top = GROUND_Y - 190;
    const fl = 0.9 + Math.sin(t * 7 + lx) * 0.05;
    const g = c.createRadialGradient(lx, top + 18, 4, lx, top + 18, 120);
    g.addColorStop(0, `rgba(255,190,120,${0.5 * fl})`); g.addColorStop(1, 'rgba(255,150,90,0)');
    c.fillStyle = g; c.fillRect(lx - 120, top - 100, 240, 240);
    c.fillStyle = '#0e0a14'; c.fillRect(lx - 3, top + 30, 6, GROUND_Y - top - 30);
    c.fillRect(lx - 7, GROUND_Y - 14, 14, 14);
    c.beginPath(); c.moveTo(lx - 10, top + 8); c.lineTo(lx + 10, top + 8); c.lineTo(lx + 6, top - 2); c.lineTo(lx - 6, top - 2); c.closePath(); c.fill();
    c.fillStyle = `rgba(255,214,150,${fl})`; c.fillRect(lx - 7, top + 8, 14, 18);
    c.fillStyle = '#0e0a14'; c.fillRect(lx - 9, top + 26, 18, 5); c.fillRect(lx - 1, top + 8, 2, 18);
  }
  function maple(c, x, t) { // red maple tree on the promenade
    c.fillStyle = '#1a0e16'; c.beginPath(); c.moveTo(x - 6, GROUND_Y); c.quadraticCurveTo(x - 2, GROUND_Y - 120, x + 18, GROUND_Y - 210); c.lineTo(x + 26, GROUND_Y - 206); c.quadraticCurveTo(x + 8, GROUND_Y - 120, x + 8, GROUND_Y); c.closePath(); c.fill();
    const Rm = mulberry32(Math.floor(x));
    for (let i = 0; i < 9; i++) { // soft canopy volume
      const a = Rm() * 6.28, r = Rm() * 60;
      c.fillStyle = 'rgba(90,10,30,0.55)'; circle(c, x + 20 + Math.cos(a) * r * 1.3, GROUND_Y - 228 + Math.sin(a) * r * 0.5, 20 + Rm() * 16); c.fill();
    }
    for (let i = 0; i < 90; i++) { // individual maple leaves
      const a = Rm() * 6.28, r = Math.sqrt(Rm()) * 88, cx = x + 20 + Math.cos(a) * r * 1.3, cy = GROUND_Y - 228 + Math.sin(a) * r * 0.55;
      c.fillStyle = ['#8a1424', '#b81c30', '#e02a40', '#ff6a7a'][Math.floor(Rm() * 4)];
      c.globalAlpha = 0.95; drawStar(c, cx, cy + Math.sin(t * 1.5 + i) * 1.2, 4 + Rm() * 4);
    }
    c.globalAlpha = 1;
  }
  // world-space promenade (call inside translate(-camX))
  function street(c, camX, t) {
    const x0 = camX - 80, x1 = camX + W + 80;
    // trees behind the railing
    for (let mx = 300; mx < WORLD_W + 400; mx += 760) if (mx > x0 - 200 && mx < x1 + 100) maple(c, mx, t);
    // stone railing (돌난간)
    const ry = GROUND_Y - 46;
    c.fillStyle = '#1c1426'; c.fillRect(x0, ry, x1 - x0, 8);
    c.fillStyle = '#2c2238'; c.fillRect(x0, ry, x1 - x0, 3);
    for (let px = Math.floor(x0 / 96) * 96; px < x1; px += 96) {
      c.fillStyle = '#1a1224'; c.fillRect(px - 6, ry - 10, 12, 56);
      c.fillStyle = '#2e2440'; c.fillRect(px - 6, ry - 10, 12, 3); c.fillRect(px - 8, ry - 14, 16, 5);
      c.fillStyle = '#150f1d'; c.fillRect(px + 20, ry + 12, 56, 4);
    }
    for (let lx = 140; lx < WORLD_W + 200; lx += 430) if (lx > x0 - 140 && lx < x1 + 140) lamp(c, lx, t);
    // wet stone floor
    const g = c.createLinearGradient(0, GROUND_Y, 0, H);
    g.addColorStop(0, '#2a2036'); g.addColorStop(1, '#100b16');
    c.fillStyle = g; c.fillRect(x0, GROUND_Y, x1 - x0, H - GROUND_Y);
    c.fillStyle = '#4a3a5e'; c.fillRect(x0, GROUND_Y, x1 - x0, 2);
    c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1.5;
    for (let row = 0; row < 3; row++) {
      const yy = GROUND_Y + 8 + row * 24; seg(c, x0, yy, x1, yy);
      for (let px = Math.floor(x0 / 90) * 90 + (row % 2) * 45; px < x1; px += 90) seg(c, px, yy, px, yy + 24);
    }
    // reflections of lamps / neon on the wet floor
    for (let lx = 140; lx < WORLD_W + 200; lx += 430) {
      if (lx < x0 - 60 || lx > x1 + 60) continue;
      const rg = c.createLinearGradient(0, GROUND_Y, 0, H);
      rg.addColorStop(0, 'rgba(255,190,130,0.28)'); rg.addColorStop(1, 'rgba(255,190,130,0)');
      c.fillStyle = rg; c.fillRect(lx - 8, GROUND_Y + 2, 16, H - GROUND_Y);
    }
    c.fillStyle = 'rgba(190,120,255,0.07)';
    for (let px = Math.floor(x0 / 160) * 160; px < x1; px += 160) c.fillRect(px + 40, GROUND_Y + 10, 30, 60);
    // fallen maple leaves
    const Rl = mulberry32(7);
    for (let i = 0; i < 60; i++) { const lx = Rl() * WORLD_W, ly = GROUND_Y + 6 + Rl() * 66; if (lx < x0 || lx > x1) continue; c.fillStyle = Rl() < 0.5 ? '#8a1826' : '#c0283a'; drawStar(c, lx, ly, 3 + Rl() * 2); }
  }
  // hanok rooftop platform (보라빛 기와 + 붉은 등)
  function platform(c, p, t) {
    c.fillStyle = '#140e1c';
    c.fillRect(p.x + 16, p.y + 16, 8, GROUND_Y - p.y - 16);
    c.fillRect(p.x + p.w - 24, p.y + 16, 8, GROUND_Y - p.y - 16);
    c.fillStyle = '#4a1a26'; c.fillRect(p.x + 8, p.y + 14, p.w - 16, 7);
    c.fillStyle = '#2a6a6a'; c.fillRect(p.x + 12, p.y + 16, p.w - 24, 2);
    const fl = 0.85 + Math.sin((t || 0) * 5 + p.x) * 0.1;
    for (const lx of [p.x + 40, p.x + p.w - 40]) {
      const g = c.createRadialGradient(lx, p.y + 34, 2, lx, p.y + 34, 40);
      g.addColorStop(0, `rgba(255,90,120,${0.45 * fl})`); g.addColorStop(1, 'rgba(255,90,120,0)');
      c.fillStyle = g; c.fillRect(lx - 40, p.y - 6, 80, 80);
      c.fillStyle = '#e04a6a'; roundRect(c, lx - 6, p.y + 24, 12, 18, 5); c.fill();
    }
    c.fillStyle = '#241c34';
    c.beginPath(); c.moveTo(p.x - 20, p.y - 8);
    c.quadraticCurveTo(p.x + 10, p.y + 15, p.x + p.w / 2, p.y + 15);
    c.quadraticCurveTo(p.x + p.w - 10, p.y + 15, p.x + p.w + 20, p.y - 8);
    c.lineTo(p.x + p.w, p.y); c.lineTo(p.x, p.y); c.closePath(); c.fill();
    c.fillStyle = '#5a4a78'; c.fillRect(p.x, p.y - 2, p.w, 4);
    c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 2;
    for (let x = p.x + 8; x < p.x + p.w; x += 11) seg(c, x, p.y + 3, x, p.y + 12);
  }
  // screen-space foreground: maple branches top-left + drifting leaves
  function foliage(c, t, leavesOnly) {
    if (!leavesOnly) {
      const Rf = mulberry32(99);
      c.strokeStyle = '#1a0a12'; c.lineWidth = 4; c.beginPath(); c.moveTo(-10, 6); c.quadraticCurveTo(200, 40, 420, 4); c.stroke();
      for (const [x, y, r] of mapleClusters) for (let i = 0; i < 22; i++) {
        const a = Rf() * 6.28, rr = Math.sqrt(Rf()) * r;
        c.fillStyle = ['#6a0e1c', '#9a1828', '#c8243a', '#ff5a6a'][Math.floor(Rf() * 4)];
        c.globalAlpha = 0.9; drawStar(c, x + Math.cos(a) * rr, y + 10 + Math.sin(a) * rr * 0.45 + Math.sin(t + i) * 1, 5 + Rf() * 5);
      }
    }
    c.globalAlpha = 1;
    for (const l of leaves) {
      const yy = (l.y + t * l.v) % (H + 20) - 10, xx = (l.x + Math.sin(t * 0.8 + l.p) * 30 - t * 12 + W * 4) % W;
      c.save(); c.translate(xx, yy); c.rotate(t * 1.5 + l.p); c.fillStyle = l.col; c.globalAlpha = 0.8; drawStar(c, 0, 0, l.s); c.restore();
    }
    c.globalAlpha = 1;
  }
  return { backdrop, street, platform, roof, foliage, lamp };
})();

// red "칠정 구슬" orb icon
function drawOrb(c, x, y, r, t = 0) {
  const g = c.createRadialGradient(x, y, 2, x, y, r * 2.2);
  g.addColorStop(0, 'rgba(255,60,60,0.55)'); g.addColorStop(1, 'rgba(255,0,0,0)');
  c.fillStyle = g; c.fillRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
  const g2 = c.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  g2.addColorStop(0, '#ffb3a8'); g2.addColorStop(0.35, '#e0242c'); g2.addColorStop(1, '#4a0508');
  c.fillStyle = g2; circle(c, x, y, r); c.fill();
  c.strokeStyle = 'rgba(255,200,190,0.5)'; c.lineWidth = r * 0.08;
  c.beginPath(); c.arc(x, y, r * 0.55, t * 2, t * 2 + 2.2); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.8)'; circle(c, x - r * 0.35, y - r * 0.4, r * 0.14); c.fill();
}

// Neon-magenta panel frame used across UI (그림 8·9 style)
function neonPanel(c, x, y, w, h, opt = {}) {
  c.save();
  roundRect(c, x, y, w, h, opt.r || 10);
  c.fillStyle = opt.fill || 'rgba(26,10,28,0.88)'; c.fill();
  c.shadowColor = opt.glow || '#ff4a9a'; c.shadowBlur = 12;
  c.strokeStyle = opt.stroke || '#ff6aa8'; c.lineWidth = 2; c.stroke();
  c.shadowBlur = 0;
  c.strokeStyle = 'rgba(255,140,190,0.25)'; c.lineWidth = 1; roundRect(c, x + 5, y + 5, w - 10, h - 10, Math.max(2, (opt.r || 10) - 4)); c.stroke();
  c.restore();
}
