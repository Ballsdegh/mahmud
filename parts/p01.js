/* ============================================================
   FALLEN — Tower of Fortune
   game.js — main game (single-file build)
   parts/p01.js — utils, config, zones, skins, perks, upgrades
   ============================================================ */
(function () {
'use strict';

var IS_DEV = false;
try { IS_DEV = /[?&]dev(=|&|$)/.exec(location.search) !== null; } catch (e) {}

function showFatal() {
  try {
    var f = document.getElementById('fatal');
    if (f) f.classList.add('on');
    var h = f.querySelector('h2');
    var p = f.querySelector('p');
    try {
      if (h && typeof I18N !== 'undefined' && I18N.t) h.textContent = I18N.t('fatal_title');
      if (p && typeof I18N !== 'undefined' && I18N.t) p.textContent = I18N.t('fatal_sub');
    } catch (e2) {}
  } catch (e) {}
}
window.__fallenShowFatal = showFatal;

/* ---------------- utils ---------------- */
var U = {
  clamp: function (v, a, b) { return v < a ? a : (v > b ? b : v); },
  lerp: function (a, b, k) { return a + (b - a) * k; },
  dist2: function (ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; },
  segDist: function (px, py, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    var l2 = dx * dx + dy * dy;
    var t = l2 ? U.clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1) : 0;
    return Math.sqrt(U.dist2(px, py, x1 + t * dx, y1 + t * dy));
  },
  pad: function (n, w) {
    var s = String(n);
    while (s.length < w) s = '0' + s;
    return s;
  },
  el: function (tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  },
  fmt: function (n) {
    n = Math.floor(Math.abs(n));
    var s = String(n), out = '';
    while (s.length > 3) { out = ' ' + s.slice(-3) + out; s = s.slice(0, -3); }
    return s + out;
  }
};

/* ---------------- config ---------------- */
var CFG = {
  W: 420,            // logical play-field width
  FLOOR_H: 520,      // world units per floor
  R: 13,             // player radius
  WALL: 16,          // wall thickness
  GRAV: 1500,
  MAXFALL_BASE: 235, MAXFALL_GROW: 0.85, MAXFALL_CAP: 620,
  BOUNCE: 265,
  MAXVX: 430, ACCEL: 2600,
  CHUNKS_AHEAD: 3, CHUNKS_BEHIND: 3,
  FLOOR_COINS: 10,
  MILESTONE10: 150, MILESTONE50: 500,
  GATE_EVERY: 25, GATE_FROM: 25,
  SAFE_REWARD: 500, RISK_REWARD: 3000,
  PERK_EVERY: 20, PERK_FROM: 20,
  BOSS_EVERY: 100, BOSS_H: 640, BOSS_REWARD: 1500,
  CHEST_BASE: 0.10, CHEST_LUCK: 0.011, CHEST_CAP: 0.22,
  FRAG_VALUE: 200,
  COST_POW: 1.18,
  OFFLINE_MIN: 600,        // seconds away before offline reward
  OFFLINE_PER_SEC: 0.05,   // coins per second away
  OFFLINE_CAP: 10800,
  INTER_COOLDOWN: 100000,  // ms between interstitials
  INTER_MIN_SESSION: 25000,
  MAXDT: 0.05
};

var QUALITY = {
  high:   { parts: 420, dpr: 2,   glow: true,  trail: 26 },
  medium: { parts: 240, dpr: 1.5, glow: true,  trail: 16 },
  low:    { parts: 110, dpr: 1,   glow: false, trail: 8 }
};

/* ---------------- zones ---------------- */
var ZONES = [
  { id: 'neon',    bg0: '#070b1c', bg1: '#0d1638', line: '#1b2c66', acc: '#4dd8ff', acc2: '#ff4dd8', part: '#7ce7ff', bpm: 112, scale: [0, 3, 5, 7, 10],  bass: 45, style: 'city' },
  { id: 'ind',     bg0: '#120d08', bg1: '#241609', line: '#3a2712', acc: '#ffb84d', acc2: '#ff6b35', part: '#ffcf8a', bpm: 120, scale: [0, 2, 4, 7, 9],  bass: 43, style: 'ind' },
  { id: 'lava',    bg0: '#160505', bg1: '#2b0a06', line: '#471408', acc: '#ff5e3d', acc2: '#ffd75e', part: '#ff9a5e', bpm: 116, scale: [0, 3, 5, 7, 10], bass: 41, style: 'lava' },
  { id: 'frozen',  bg0: '#06121f', bg1: '#0b2038', line: '#12395c', acc: '#9fe8ff', acc2: '#ffffff', part: '#d8f4ff', bpm: 100, scale: [0, 2, 4, 7, 9],  bass: 45, style: 'ice' },
  { id: 'cyber',   bg0: '#0a0618', bg1: '#170b2e', line: '#2a1752', acc: '#b06bff', acc2: '#4dffc4', part: '#cf9dff', bpm: 124, scale: [0, 3, 6, 8, 11], bass: 43, style: 'cyber' },
  { id: 'crystal', bg0: '#071310', bg1: '#0c241e', line: '#134034', acc: '#4dffc4', acc2: '#7ce7ff', part: '#a8ffe0', bpm: 104, scale: [0, 2, 5, 7, 10], bass: 45, style: 'crystal' },
  { id: 'space',   bg0: '#03040c', bg1: '#0a1024', line: '#14204a', acc: '#7c9dff', acc2: '#ffffff', part: '#c8d8ff', bpm: 96,  scale: [0, 4, 5, 7, 11], bass: 41, style: 'space' },
  { id: 'dark',    bg0: '#0a0510', bg1: '#160a24', line: '#2a1444', acc: '#ffd75e', acc2: '#b06bff', part: '#ffe9a8', bpm: 108, scale: [0, 1, 4, 6, 10], bass: 40, style: 'dark' }
];
var BOSS_TYPES = ['laser', 'crusher', 'void', 'magnet', 'rocks'];

/* ---------------- skins ---------------- */
var SKINS = [
  { id: 'classic', cost: 0,     core: '#ffffff', mid: '#9fd8ff', glow: '#4dd8ff', trail: '#4dd8ff', fx: 'none' },
  { id: 'neon',    cost: 500,   core: '#ffffff', mid: '#ff9df0', glow: '#ff4dd8', trail: '#ff4dd8', fx: 'ring' },
  { id: 'fire',    cost: 800,   core: '#fff6d8', mid: '#ffd75e', glow: '#ff6b35', trail: '#ff9a3d', fx: 'fire' },
  { id: 'ice',     cost: 800,   core: '#ffffff', mid: '#d8f4ff', glow: '#7ce7ff', trail: '#a8ecff', fx: 'frost' },
  { id: 'galaxy',  cost: 1500,  core: '#ffffff', mid: '#cf9dff', glow: '#6c3bff', trail: '#b06bff', fx: 'stars' },
  { id: 'gold',    cost: 2500,  core: '#fff8e0', mid: '#ffd75e', glow: '#ffb300', trail: '#ffd75e', fx: 'shimmer' },
  { id: 'cyber',   cost: 1500,  core: '#eafff4', mid: '#4dffc4', glow: '#0fbf9f', trail: '#4dffc4', fx: 'hex' },
  { id: 'toxic',   cost: 1500,  core: '#f4ffe0', mid: '#a8ff4d', glow: '#57e31c', trail: '#8dff4d', fx: 'toxic' },
  { id: 'void',    cost: 2500,  core: '#3a2f58', mid: '#6c3bff', glow: '#b06bff', trail: '#8a5cff', fx: 'void' },
  { id: 'crystal', cost: 3000,  core: '#ffffff', mid: '#a8ffe0', glow: '#4dffc4', trail: '#7cffe0', fx: 'facet' },
  { id: 'rainbow', cost: 4000,  core: '#ffffff', mid: '#ffffff', glow: '#ffffff', trail: '#ffffff', fx: 'rainbow' },
  { id: 'shadow',  cost: 3000,  core: '#4a5470', mid: '#141a2c', glow: '#8fa3c8', trail: '#5a6a94', fx: 'shadow' },
  { id: 'solar',   cost: 5000,  core: '#fffdf2', mid: '#ffe14d', glow: '#ff9f1c', trail: '#ffd75e', fx: 'rays' },
  { id: 'plasma',  cost: 6000,  core: '#ffffff', mid: '#ff9df0', glow: '#4d8aff', trail: '#ff9df0', fx: 'plasma' },
  { id: 'legend',  cost: 10000, core: '#ffffff', mid: '#ffe9a8', glow: '#ffd75e', trail: '#ffd75e', fx: 'legend' }
];
function skinById(id) {
  for (var i = 0; i < SKINS.length; i++) if (SKINS[i].id === id) return SKINS[i];
  return SKINS[0];
}

/* ---------------- in-run perks (last for one run only) ---------------- */
var PERKS = [
  { id: 'magnet',   rar: 'common',    icon: 'magnet', dur: 20,  w: 30 },
  { id: 'double',   rar: 'common',    icon: 'coin',   dur: 20,  w: 30 },
  { id: 'shield2',   rar: 'rare',      icon: 'shield', dur: 0,   w: 20 },
  { id: 'slow',     rar: 'rare',      icon: 'pause',  dur: 8,   w: 18 },
  { id: 'lucky',    rar: 'rare',      icon: 'luck',   dur: 15,  w: 18 },
  { id: 'ghost',    rar: 'epic',      icon: 'star',   dur: 8,   w: 10 },
  { id: 'blaze',    rar: 'epic',      icon: 'speed',  dur: 6,   w: 10 },
  { id: 'feather',  rar: 'epic',      icon: 'safe',   dur: 10,  w: 9  },
  { id: 'golden',   rar: 'legendary', icon: 'crown',  dur: 10,  w: 4  },
  { id: 'over',     rar: 'legendary', icon: 'star',   dur: 10,  w: 3  }
];

/* ---------------- permanent upgrades ---------------- */
var UPGRADES = [
  { id: 'magnet', icon: 'magnet', name: 'up_magnet', base: 300 },
  { id: 'boost',  icon: 'speed',  name: 'up_boost',  base: 250 },
  { id: 'shield', icon: 'shield', name: 'up_shield', base: 400 },
  { id: 'luck',   icon: 'luck',   name: 'up_luck',   base: 350 },
  { id: 'coin',   icon: 'coin',   name: 'up_coin',   base: 500 },
  { id: 'revive', icon: 'revive', name: 'up_revive', base: 600 }
];
var UPG_MAX = 20;
function upgById(id) {
  for (var i = 0; i < UPGRADES.length; i++) if (UPGRADES[i].id === id) return UPGRADES[i];
  return null;
}
function upCost(id, lvl) {
  var u = upgById(id);
  if (!u) return 0;
  return Math.round(u.base * Math.pow(CFG.COST_POW, lvl));
}

/* ---------------- chest rarities ---------------- */
var CHEST_RARS = [
  { id: 'wood',      w: 55, coins: [80, 220],    frag: 0.3,  fragN: 1,      skin: 0    },
  { id: 'rare',      w: 30, coins: [220, 550],   frag: 0.55, fragN: [1, 2], skin: 0.02 },
  { id: 'epic',      w: 12, coins: [550, 1300],  frag: 0.85, fragN: [2, 4], skin: 0.06 },
  { id: 'legendary', w: 3,  coins: [1300, 3200], frag: 1,    fragN: [4, 8], skin: 0.15 }
];
function rarById(id) {
  for (var i = 0; i < CHEST_RARS.length; i++) if (CHEST_RARS[i].id === id) return CHEST_RARS[i];
  return CHEST_RARS[0];
}
